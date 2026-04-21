import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { StatCard } from "@/components/dashboard/StatCard"
import { DashboardCharts } from "./DashboardCharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils"

export const metadata = {
  title: "Dashboard | AgentWatch",
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalAgents },
    { count: newThisWeek },
    { count: highRisk },
    { count: openAlerts },
    { data: recentAlerts },
  ] = await Promise.all([
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .gte(
        "first_seen_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
    supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .gt("risk_score", 75),
    supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .is("acknowledged_at", null),
    supabase
      .from("alerts")
      .select("*, agents(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Overview of AI agent activity across your environment."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Agents" value={totalAgents ?? 0} />
        <StatCard label="New This Week" value={newThisWeek ?? 0} />
        <StatCard label="High Risk" value={highRisk ?? 0} />
        <StatCard label="Open Alerts" value={openAlerts ?? 0} />
      </div>

      <DashboardCharts />

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentAlerts || recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No alerts yet.
            </p>
          ) : (
            <div className="flex flex-col gap-0">
              {recentAlerts.map((alert) => {
                const severityStyles: Record<string, string> = {
                  critical: "bg-red-500/15 text-red-400 border-red-500/25",
                  warning:
                    "bg-amber-500/15 text-amber-400 border-amber-500/25",
                  info: "bg-blue-500/15 text-blue-400 border-blue-500/25",
                }
                const agentName =
                  alert.agents &&
                  typeof alert.agents === "object" &&
                  "name" in alert.agents
                    ? (alert.agents as { name: string }).name
                    : "Unknown"

                return (
                  <Link
                    key={alert.id}
                    href={`/dashboard/agents/${alert.agent_id}`}
                    className="flex items-center justify-between border-b py-3 last:border-0 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          severityStyles[alert.severity] ?? severityStyles.info
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <div className="flex flex-col">
                        <span className="text-sm">{alert.message}</span>
                        <span className="text-xs text-muted-foreground">
                          {agentName}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(alert.created_at)}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
