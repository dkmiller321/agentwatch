import { createClient } from "@/lib/supabase/server"
import { AgentsTable } from "@/components/inventory/AgentsTable"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { Unplug } from "lucide-react"

export const metadata = {
  title: "Agent Inventory | AgentWatch",
}

export default async function AgentsPage() {
  const supabase = await createClient()

  const { data: agents, count } = await supabase
    .from("agents")
    .select("*", { count: "exact" })
    .order("last_seen_at", { ascending: false })
    .limit(500)

  const totalCount = count ?? 0
  const rows = agents ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agent Inventory"
        description="All AI agents detected across your environment."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Unplug}
          title="No agents discovered yet"
          description="Connect a data source to find your AI agents."
          actionLabel="Connect a Source"
          actionHref="/dashboard/connections"
        />
      ) : (
        <AgentsTable initialData={rows} totalCount={totalCount} />
      )}
    </div>
  )
}
