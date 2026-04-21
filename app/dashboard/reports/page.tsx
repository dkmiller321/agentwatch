import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { ReportsClient } from "./ReportsClient"

export const metadata = {
  title: "Reports | AgentWatch",
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id, organizations(plan)")
    .limit(1)
    .single()

  const plan =
    memberships?.organizations &&
    typeof memberships.organizations === "object" &&
    "plan" in memberships.organizations
      ? (memberships.organizations as { plan: string }).plan
      : "free"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Generate compliance and governance reports."
      />
      <ReportsClient plan={plan} />
    </div>
  )
}
