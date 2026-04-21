import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { AlertsList } from "./AlertsList"

export const metadata = {
  title: "Alerts | AgentWatch",
}

export default async function AlertsPage() {
  const supabase = await createClient()

  const { data: alerts } = await supabase
    .from("alerts")
    .select("*, agents(name)")
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts"
        description="Security alerts from your AI agent monitoring."
      />
      <AlertsList initialAlerts={alerts ?? []} />
    </div>
  )
}
