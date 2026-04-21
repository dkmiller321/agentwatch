import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service-role"
import { processIngestionJob } from "@/lib/detection/pipeline"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { filePath } = await request.json()

    if (!filePath) {
      return NextResponse.json(
        { error: "filePath is required" },
        { status: 400 }
      )
    }

    // Get user's org
    const { data: membership } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      )
    }

    const orgId = membership.organization_id

    // Auto-create a file_upload data source if none exists
    let { data: dataSource } = await supabase
      .from("data_sources")
      .select("id")
      .eq("organization_id", orgId)
      .eq("type", "file_upload")
      .limit(1)
      .single()

    if (!dataSource) {
      const { data: newDs } = await supabase
        .from("data_sources")
        .insert({
          organization_id: orgId,
          type: "file_upload",
          name: "Log Upload",
          status: "connected",
        })
        .select("id")
        .single()
      dataSource = newDs
    }

    if (!dataSource) {
      return NextResponse.json(
        { error: "Failed to create data source" },
        { status: 500 }
      )
    }

    // Create the ingestion job
    const { data: job, error } = await supabase
      .from("ingestion_jobs")
      .insert({
        organization_id: orgId,
        data_source_id: dataSource.id,
        file_path: filePath,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Create job error:", error)
      return NextResponse.json(
        { error: "Failed to create ingestion job" },
        { status: 500 }
      )
    }

    // Trigger processing immediately (don't wait for cron)
    processInBackground(job.id).catch((err) =>
      console.error("Background processing failed:", err)
    )

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error("Ingestion job error:", error)
    return NextResponse.json(
      { error: "Failed to create ingestion job" },
      { status: 500 }
    )
  }
}

async function processInBackground(jobId: string) {
  try {
    await processIngestionJob(jobId)
  } catch (err) {
    console.error("processIngestionJob error:", err)
    const svc = createServiceClient()
    await svc
      .from("ingestion_jobs")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("id")

    const { data: membership } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      )
    }

    // If specific job ID requested, return that job
    if (jobId) {
      const { data: job } = await supabase
        .from("ingestion_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("organization_id", membership.organization_id)
        .single()

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 })
      }

      // Also count agents for the results step
      const { count } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)

      return NextResponse.json({ ...job, agent_count: count ?? 0 })
    }

    // Otherwise list all jobs
    const { data: jobs, error } = await supabase
      .from("ingestion_jobs")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: "Failed to list jobs" },
        { status: 500 }
      )
    }

    return NextResponse.json(jobs)
  } catch (error) {
    console.error("List jobs error:", error)
    return NextResponse.json(
      { error: "Failed to list jobs" },
      { status: 500 }
    )
  }
}
