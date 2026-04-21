import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    _stripe = new Stripe(key, { typescript: true })
  }
  return _stripe
}

// For backwards compatibility with `import { stripe } from "@/lib/stripe"`
export const stripe = {
  get checkout() { return getStripe().checkout },
  get customers() { return getStripe().customers },
  get subscriptions() { return getStripe().subscriptions },
  get billingPortal() { return getStripe().billingPortal },
  get webhooks() { return getStripe().webhooks },
  get prices() { return getStripe().prices },
} as unknown as Stripe
