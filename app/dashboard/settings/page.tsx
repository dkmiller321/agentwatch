import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { SettingsClient } from "./SettingsClient"

export const metadata = {
  title: "Settings | AgentWatch",
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(*)")
    .limit(1)
    .single()

  const org =
    membership?.organizations &&
    typeof membership.organizations === "object"
      ? (membership.organizations as unknown as {
          id: string
          name: string
          slack_webhook_url: string | null
        })
      : null

  const { data: members } = await supabase
    .from("memberships")
    .select("*, auth_users:user_id(email:raw_user_meta_data)")
    .eq("organization_id", membership?.organization_id ?? "")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your organization, team, and notification preferences."
      />
      <SettingsClient
        orgId={membership?.organization_id ?? ""}
        orgName={org?.name ?? ""}
        slackWebhookUrl={org?.slack_webhook_url ?? ""}
        members={members ?? []}
        currentRole={membership?.role ?? "viewer"}
      />
    </div>
  )
}
