import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const VALID_TEMPLATES = ["general", "eu-ai-act", "soc2"] as const

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const template = searchParams.get("template")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (
      !template ||
      !VALID_TEMPLATES.includes(template as (typeof VALID_TEMPLATES)[number])
    ) {
      return NextResponse.json(
        { error: "Invalid template. Must be: general, eu-ai-act, or soc2" },
        { status: 400 }
      )
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

    let query = supabase
      .from("agents")
      .select("*")
      .eq("organization_id", membership.organization_id)

    if (startDate) {
      query = query.gte("created_at", startDate)
    }
    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    query = query.order("created_at", { ascending: false })

    const { data: agents, error } = await query

    if (error) {
      console.error("Export query error:", error)
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      template,
      generatedAt: new Date().toISOString(),
      organization_id: membership.organization_id,
      dateRange: { startDate, endDate },
      agents,
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    )
  }
}
