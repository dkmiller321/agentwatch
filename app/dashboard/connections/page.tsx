import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { ConnectionsClient } from "./ConnectionsClient"

export const metadata = {
  title: "Connections | AgentWatch",
}

export default async function ConnectionsPage() {
  const supabase = await createClient()

  const { data: sources } = await supabase
    .from("data_sources")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Connections"
        description="Connect data sources to discover AI agents in your environment."
      />
      <ConnectionsClient dataSources={sources ?? []} />
    </div>
  )
}
