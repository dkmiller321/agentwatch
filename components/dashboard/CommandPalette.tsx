"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  Bot,
  Plug,
  Bell,
  FileText,
  CreditCard,
  Settings,
  Search,
} from "lucide-react"

const pages = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agents", href: "/dashboard/agents", icon: Bot },
  { label: "Connections", href: "/dashboard/connections", icon: Plug },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

const CommandPaletteContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({ open: false, setOpen: () => {} })

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function navigateTo(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search agents, alerts, pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {pages.map((page) => (
              <CommandItem
                key={page.href}
                onSelect={() => navigateTo(page.href)}
              >
                <page.icon className="mr-2 size-4 text-muted-foreground" />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  )
}

export function CommandPaletteTrigger() {
  const { setOpen } = useContext(CommandPaletteContext)

  return (
    <button
      className="hidden items-center gap-2 rounded-lg border border-input bg-input/30 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-input/50 md:flex"
      onClick={() => setOpen(true)}
    >
      <Search className="size-4" />
      <span>Search...</span>
      <kbd className="ml-6 inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  )
}
