import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = getServiceRoleClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const organizationId = session.metadata?.organization_id

        if (!organizationId) break

        await supabase
          .from("organizations")
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan: "pro",
          })
          .eq("id", organizationId)

        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .single()

        if (!org) break

        const plan =
          subscription.status === "active" ||
          subscription.status === "trialing"
            ? "pro"
            : "free"

        await supabase
          .from("organizations")
          .update({ plan })
          .eq("id", org.id)

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await supabase
          .from("organizations")
          .update({
            plan: "free",
            stripe_subscription_id: null,
          })
          .eq("stripe_subscription_id", subscription.id)

        break
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
