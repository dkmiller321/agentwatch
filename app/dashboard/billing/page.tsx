"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PLAN_LIMITS, type PlanType } from "@/lib/plans"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface OrgData {
  id: string
  plan: PlanType
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export default function BillingPage() {
  const [org, setOrg] = useState<OrgData | null>(null)
  const [dataSourceCount, setDataSourceCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  })
  const [contactLoading, setContactLoading] = useState(false)
  const [contactSent, setContactSent] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: membership } = await supabase
        .from("memberships")
        .select("organization_id")
        .eq("user_id", user.id)
        .single()

      if (!membership) return

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, plan, stripe_customer_id, stripe_subscription_id")
        .eq("id", membership.organization_id)
        .single()

      if (orgData) setOrg(orgData as OrgData)

      const { count } = await supabase
        .from("data_sources")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)

      setDataSourceCount(count ?? 0)
      setLoading(false)
    }

    load()
  }, [])

  async function handleUpgrade() {
    setUpgradeLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      console.error("Failed to start checkout")
    } finally {
      setUpgradeLoading(false)
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      console.error("Failed to open portal")
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setContactLoading(true)
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      })
      setContactSent(true)
    } catch {
      console.error("Failed to send message")
    } finally {
      setContactLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading billing info...</p>
      </div>
    )
  }

  const plan = org?.plan ?? "free"
  const limits = PLAN_LIMITS[plan]
  const isPaid = plan === "pro" || plan === "enterprise"

  const planBadgeVariant =
    plan === "enterprise"
      ? "default"
      : plan === "pro"
        ? "secondary"
        : "outline"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing details.
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Plan
            <Badge variant={planBadgeVariant}>{plan.toUpperCase()}</Badge>
          </CardTitle>
          <CardDescription>
            {plan === "free"
              ? "You are on the free tier. Upgrade for more data sources, longer retention, and advanced features."
              : plan === "pro"
                ? "You have access to pro features including compliance exports and Slack alerts."
                : "You have full enterprise access with unlimited data sources and scans."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Data Sources Used</p>
              <p className="text-lg font-medium">
                {dataSourceCount} /{" "}
                {limits.maxDataSources === Infinity
                  ? "Unlimited"
                  : limits.maxDataSources}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Event Retention</p>
              <p className="text-lg font-medium">{limits.retentionDays} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scans / Month</p>
              <p className="text-lg font-medium">
                {limits.maxScansPerMonth === Infinity
                  ? "Unlimited"
                  : limits.maxScansPerMonth.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Compliance Export
              </p>
              <p className="text-lg font-medium">
                {limits.hasComplianceExport ? "Enabled" : "Not available"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {plan === "free" && (
            <Button
              onClick={handleUpgrade}
              disabled={upgradeLoading}
            >
              {upgradeLoading ? "Redirecting..." : "Upgrade to Pro"}
            </Button>
          )}
          {isPaid && org?.stripe_customer_id && (
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? "Redirecting..." : "Manage Subscription"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Enterprise Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Enterprise</CardTitle>
          <CardDescription>
            Need unlimited data sources, custom retention, SSO, or dedicated
            support? Contact our sales team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contactSent ? (
            <p className="text-sm text-muted-foreground">
              Thank you! Our team will be in touch shortly.
            </p>
          ) : (
            <form onSubmit={handleContactSubmit} className="grid gap-4 max-w-md">
              <input
                type="text"
                placeholder="Name"
                required
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <input
                type="email"
                placeholder="Work email"
                required
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Company"
                required
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={contactForm.company}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, company: e.target.value }))
                }
              />
              <textarea
                placeholder="Tell us about your needs..."
                required
                rows={3}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={contactForm.message}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, message: e.target.value }))
                }
              />
              <Button type="submit" disabled={contactLoading} className="w-fit">
                {contactLoading ? "Sending..." : "Contact Sales"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
