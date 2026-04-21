import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PLAN_LIMITS, type PlanType } from "@/lib/plans"

function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret")

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceRoleClient()

  const { data: orgs, error: orgError } = await supabase
    .from("organizations")
    .select("id, plan")

  if (orgError || !orgs) {
    console.error("Failed to fetch organizations:", orgError)
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    )
  }

  let totalDeleted = 0

  for (const org of orgs) {
    const plan = org.plan as PlanType
    const retentionDays = PLAN_LIMITS[plan]?.retentionDays ?? 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const { count, error: deleteError } = await supabase
      .from("agent_events")
      .delete({ count: "exact" })
      .eq("organization_id", org.id)
      .lt("timestamp", cutoffDate.toISOString())

    if (deleteError) {
      console.error(
        `Retention cleanup failed for org ${org.id}:`,
        deleteError
      )
      continue
    }

    totalDeleted += count ?? 0
  }

  return NextResponse.json({
    message: "Retention cleanup complete",
    organizations_processed: orgs.length,
    events_deleted: totalDeleted,
  })
}
