import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { dataSourceId, filePath } = await request.json()

    if (!dataSourceId) {
      return NextResponse.json(
        { error: "dataSourceId is required" },
        { status: 400 }
      )
    }

    // Verify data source belongs to user's org
    const { data: dataSource } = await supabase
      .from("data_sources")
      .select("id, organization_id")
      .eq("id", dataSourceId)
      .single()

    if (!dataSource) {
      return NextResponse.json(
        { error: "Data source not found" },
        { status: 404 }
      )
    }

    const { data: job, error } = await supabase
      .from("ingestion_jobs")
      .insert({
        organization_id: dataSource.organization_id,
        data_source_id: dataSourceId,
        file_path: filePath || null,
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

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error("Ingestion job error:", error)
    return NextResponse.json(
      { error: "Failed to create ingestion job" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    const { data: jobs, error } = await supabase
      .from("ingestion_jobs")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("List jobs error:", error)
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
