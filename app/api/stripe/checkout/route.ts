import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
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

    const { data: org } = await supabase
      .from("organizations")
      .select("id, stripe_customer_id")
      .eq("id", membership.organization_id)
      .single()

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_PRO!, quantity: 1 }],
      success_url: `${request.nextUrl.origin}/dashboard/billing?success=true`,
      cancel_url: `${request.nextUrl.origin}/dashboard/billing`,
      customer: org.stripe_customer_id || undefined,
      metadata: {
        organization_id: org.id,
        user_id: user.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
