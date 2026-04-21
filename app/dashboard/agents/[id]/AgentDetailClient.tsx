"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AgentRow, AgentEventRow, AgentStatus } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateTime } from "@/lib/utils"
import { Save, ChevronLeft, ChevronRight } from "lucide-react"

function RiskScoreDisplay({
  score,
  factors,
}: {
  score: number
  factors: Record<string, unknown>
}) {
  const color =
    score > 75
      ? "text-red-400"
      : score >= 25
        ? "text-amber-400"
        : "text-emerald-400"

  return (
    <div className="flex flex-col gap-3">
      <p className={`text-5xl font-bold tracking-tight ${color}`}>{score}</p>
      {Object.keys(factors).length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Risk Factors
          </p>
          {Object.entries(factors).map(([key, val]) => (
            <div
              key={key}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{key}</span>
              <span className="font-mono text-xs">{String(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface AgentDetailClientProps {
  agent: AgentRow
  initialEvents: AgentEventRow[]
}

export function AgentDetailClient({
  agent,
  initialEvents,
}: AgentDetailClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(agent.name)
  const [owner, setOwner] = useState(agent.owner ?? "")
  const [status, setStatus] = useState<AgentStatus>(agent.status)
  const [notes, setNotes] = useState(agent.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [eventsPage, setEventsPage] = useState(0)

  const eventsPerPage = 10
  const paginatedEvents = initialEvents.slice(
    eventsPage * eventsPerPage,
    (eventsPage + 1) * eventsPerPage
  )
  const totalEventPages = Math.ceil(initialEvents.length / eventsPerPage)

  async function handleSave() {
    setSaving(true)
    await supabase
      .from("agents")
      .update({ name, owner: owner || null, status, notes: notes || null })
      .eq("id", agent.id)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* Left column: metadata */}
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Provider</span>
              {agent.provider ? (
                <Badge variant="secondary">{agent.provider}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Unknown</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-owner">Owner</Label>
              <Input
                id="agent-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Assign an owner..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as AgentStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="sanctioned">Sanctioned</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-notes">Notes</Label>
              <Textarea
                id="agent-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this agent..."
                rows={3}
              />
            </div>

            <Button onClick={handleSave} disabled={saving}>
              <Save className="size-4 mr-1.5" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskScoreDisplay
              score={agent.risk_score}
              factors={agent.risk_factors}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right column: event timeline */}
      <Card>
        <CardHeader>
          <CardTitle>
            Recent Events
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({initialEvents.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No events recorded for this agent.
            </p>
          ) : (
            <div className="flex flex-col gap-0">
              {paginatedEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-1 border-b py-3 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(event.timestamp)}
                    </span>
                    {event.http_method && (
                      <Badge variant="outline" className="text-[10px] h-4">
                        {event.http_method}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">
                    {event.destination_host}
                    {event.destination_path}
                  </p>
                  {event.identity && (
                    <code className="text-xs font-mono text-muted-foreground">
                      {event.identity}
                    </code>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalEventPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t text-sm text-muted-foreground">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setEventsPage((p) => p - 1)}
                disabled={eventsPage === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span>
                Page {eventsPage + 1} of {totalEventPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setEventsPage((p) => p + 1)}
                disabled={eventsPage >= totalEventPages - 1}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
