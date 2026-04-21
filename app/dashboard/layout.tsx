import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar, MobileSidebar } from "@/components/dashboard/Sidebar"
import { UserMenu } from "@/components/dashboard/UserMenu"
import {
  CommandPaletteProvider,
  CommandPaletteTrigger,
} from "@/components/dashboard/CommandPalette"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <CommandPaletteProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
            <MobileSidebar />
            <CommandPaletteTrigger />

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" className="relative">
                <Bell className="size-4" />
                <span className="sr-only">Notifications</span>
              </Button>
              <UserMenu
                email={user.email}
                avatarUrl={user.user_metadata?.avatar_url}
              />
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </CommandPaletteProvider>
  )
}
