import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Check } from "lucide-react"

export const metadata = {
  title: "Pricing | AgentWatch",
}

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with a free scan of your environment.",
    features: [
      "One-time agent scan",
      "1 data source",
      "30-day data retention",
      "Basic agent inventory",
      "Community support",
    ],
    cta: "Start Free Scan",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$4,000",
    period: "/month",
    description: "Continuous monitoring and compliance for growing teams.",
    features: [
      "Up to 5 data sources",
      "Continuous scanning",
      "90-day data retention",
      "Real-time alerts",
      "General compliance reports",
      "Slack notifications",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Full governance suite for regulated environments.",
    features: [
      "Unlimited data sources",
      "Continuous scanning",
      "Unlimited retention",
      "EU AI Act & SOC 2 reports",
      "SSO / SAML",
      "On-premises deployment",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "mailto:sales@agentwatch.ai",
    highlighted: false,
  },
]

export default function PricingPage() {
  return (
    <div className="flex flex-col items-center px-4 py-20">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Simple, transparent pricing
      </h1>
      <p className="mt-4 max-w-lg text-center text-muted-foreground">
        Start free and scale as your AI governance needs grow.
      </p>

      <div className="mt-12 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={
              tier.highlighted
                ? "ring-2 ring-primary relative"
                : undefined
            }
          >
            {tier.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                Most Popular
              </div>
            )}
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold tracking-tight">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm text-muted-foreground">
                    {tier.period}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="flex flex-col gap-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={tier.highlighted ? "default" : "outline"}
                className="w-full mt-4"
                render={<Link href={tier.href} />}
              >
                {tier.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
