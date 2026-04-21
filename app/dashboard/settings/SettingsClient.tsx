"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { MemberRole } from "@/lib/supabase/database.types"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, UserPlus, Trash2 } from "lucide-react"

interface MemberRecord {
  id: string
  user_id: string
  role: MemberRole
  created_at: string
  auth_users: { email: Record<string, unknown> | null } | null
}

interface SettingsClientProps {
  orgId: string
  orgName: string
  slackWebhookUrl: string
  members: MemberRecord[]
  currentRole: MemberRole
}

export function SettingsClient({
  orgId,
  orgName,
  slackWebhookUrl,
  members,
  currentRole,
}: SettingsClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(orgName)
  const [savingOrg, setSavingOrg] = useState(false)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<MemberRole>("analyst")
  const [inviting, setInviting] = useState(false)

  const [webhookUrl, setWebhookUrl] = useState(slackWebhookUrl)
  const [savingNotif, setSavingNotif] = useState(false)

  const isAdmin = currentRole === "admin"

  async function saveOrgName() {
    setSavingOrg(true)
    await supabase
      .from("organizations")
      .update({ name })
      .eq("id", orgId)
    setSavingOrg(false)
    router.refresh()
  }

  async function inviteMember() {
    if (!inviteEmail) return
    setInviting(true)
    // In production, this would send an invite email and create a pending membership
    // For now, we just show the intent
    setInviting(false)
    setInviteEmail("")
    router.refresh()
  }

  async function removeMember(membershipId: string) {
    await supabase.from("memberships").delete().eq("id", membershipId)
    router.refresh()
  }

  async function saveNotifications() {
    setSavingNotif(true)
    await supabase
      .from("organizations")
      .update({ slack_webhook_url: webhookUrl || null })
      .eq("id", orgId)
    setSavingNotif(false)
    router.refresh()
  }

  return (
    <Tabs defaultValue="organization">
      <TabsList>
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      <TabsContent value="organization">
        <Card>
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
            <CardDescription>
              Update your organization name and general settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 max-w-md">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            {isAdmin && (
              <Button onClick={saveOrgName} disabled={savingOrg}>
                <Save className="size-4 mr-1.5" />
                {savingOrg ? "Saving..." : "Save"}
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="team">
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage who has access to your AgentWatch organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {isAdmin && (
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-medium">Invite Member</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="email@example.com"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="max-w-xs"
                  />
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as MemberRole)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={inviteMember} disabled={inviting}>
                    <UserPlus className="size-4 mr-1.5" />
                    {inviting ? "Inviting..." : "Invite"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-0 rounded-lg border">
              {members.map((member) => {
                const email =
                  member.auth_users?.email &&
                  typeof member.auth_users.email === "object"
                    ? String(
                        Object.values(member.auth_users.email)[0] ?? "Unknown"
                      )
                    : member.user_id.slice(0, 8) + "..."

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between border-b px-4 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{email}</span>
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {member.role}
                      </Badge>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                )
              })}
              {members.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No team members.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Configure how you receive alerts and notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 max-w-md">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
              <Input
                id="slack-webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Receive alert notifications in your Slack channel.
              </p>
            </div>
            {isAdmin && (
              <Button onClick={saveNotifications} disabled={savingNotif}>
                <Save className="size-4 mr-1.5" />
                {savingNotif ? "Saving..." : "Save Preferences"}
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
