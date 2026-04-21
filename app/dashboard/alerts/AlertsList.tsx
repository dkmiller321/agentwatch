"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { AlertRow, AlertSeverity } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateTime } from "@/lib/utils"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type AlertWithAgent = AlertRow & {
  agents: { name: string } | null
}

interface AlertsListProps {
  initialAlerts: AlertWithAgent[]
}

const severityStyles: Record<AlertSeverity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/25",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/25",
}

export function AlertsList({ initialAlerts }: AlertsListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [severityFilter, setSeverityFilter] = useState("all")
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  const filtered =
    severityFilter === "all"
      ? initialAlerts
      : initialAlerts.filter((a) => a.severity === severityFilter)

  async function acknowledge(alertId: string) {
    setAcknowledging(alertId)
    await supabase
      .from("alerts")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", alertId)
    setAcknowledging(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select value={severityFilter} onValueChange={(val) => setSeverityFilter(val ?? "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No alerts to display.
          </p>
        ) : (
          <div className="flex flex-col">
            {filtered.map((alert) => {
              const isAcked = !!alert.acknowledged_at
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center justify-between border-b px-4 py-3 last:border-0",
                    isAcked && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={severityStyles[alert.severity]}>
                      {alert.severity}
                    </Badge>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate">{alert.message}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{alert.type.replace("_", " ")}</span>
                        <span>-</span>
                        <Link
                          href={`/dashboard/agents/${alert.agent_id}`}
                          className="hover:text-foreground transition-colors"
                        >
                          {alert.agents?.name ?? "Unknown Agent"}
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(alert.created_at)}
                    </span>
                    {!isAcked && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => acknowledge(alert.id)}
                        disabled={acknowledging === alert.id}
                      >
                        <Check className="size-3 mr-1" />
                        {acknowledging === alert.id ? "..." : "Ack"}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
