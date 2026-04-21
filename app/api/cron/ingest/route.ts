import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service-role"
import { processIngestionJob } from "@/lib/detection/pipeline"

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret")

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Pick the oldest pending job
  const { data: job, error: fetchError } = await supabase
    .from("ingestion_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (fetchError || !job) {
    return NextResponse.json({ message: "No pending jobs" })
  }

  try {
    const result = await processIngestionJob(job.id)

    return NextResponse.json({
      message: "Job completed",
      job_id: job.id,
      total_events: result.total_events,
      agents_upserted: result.agents_upserted,
      alerts_created: result.alerts_created,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"

    await supabase
      .from("ingestion_jobs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", job.id)

    console.error("Ingestion job failed:", error)
    return NextResponse.json(
      { error: "Job failed", message: errorMessage },
      { status: 500 }
    )
  }
}
