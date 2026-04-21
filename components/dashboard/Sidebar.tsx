"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Bot,
  Plug,
  Bell,
  FileText,
  CreditCard,
  Settings,
  Eye,
  Menu,
} from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agents", href: "/dashboard/agents", icon: Bot },
  { label: "Connections", href: "/dashboard/connections", icon: Plug },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

function NavItems({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="grid gap-1 px-2">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarLogo() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Eye className="size-6 text-primary" />
      <span className="text-base font-semibold tracking-tight">AgentWatch</span>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card/50 md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-border">
        <SidebarLogo />
      </div>
      <ScrollArea className="flex-1 py-4">
        <NavItems pathname={pathname} />
      </ScrollArea>
    </aside>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b border-border">
            <SheetTitle>
              <SidebarLogo />
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 py-4">
            <NavItems pathname={pathname} onNavigate={() => setOpen(false)} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
