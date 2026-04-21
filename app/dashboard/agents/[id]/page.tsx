import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { AgentDetailClient } from "./AgentDetailClient"

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .single()

  if (!agent) notFound()

  const { data: events } = await supabase
    .from("agent_events")
    .select("*")
    .eq("agent_id", id)
    .order("timestamp", { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/dashboard/agents"
          className="hover:text-foreground transition-colors"
        >
          Agent Inventory
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{agent.name}</span>
      </nav>

      <AgentDetailClient agent={agent} initialEvents={events ?? []} />
    </div>
  )
}
