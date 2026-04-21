import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Eye, Search, Server, Shield } from "lucide-react"

export const metadata = {
  title: "AgentWatch - See Every AI Agent in Your Environment",
  description:
    "Discover, inventory, and govern AI agents operating in your environment. Detect shadow AI before it becomes a risk.",
}

const features = [
  {
    icon: Search,
    title: "Discovery",
    description:
      "Automatically detect AI agents by analyzing network logs, API calls, and traffic patterns. No endpoint agents required.",
  },
  {
    icon: Server,
    title: "Inventory",
    description:
      "Maintain a live inventory of every AI agent with risk scores, ownership tracking, and behavioral profiling.",
  },
  {
    icon: Shield,
    title: "Governance",
    description:
      "Enforce policies, generate compliance reports, and get alerted when new or high-risk agents appear.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Eye className="size-5 text-primary" />
            <span className="font-semibold tracking-tight">AgentWatch</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/security"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Security
            </Link>
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>
              Log In
            </Button>
            <Button size="sm" render={<Link href="/signup" />}>
              Sign Up
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center lg:py-36">
        <div className="flex items-center gap-2 mb-6">
          <Eye className="size-8 text-primary" />
          <span className="text-sm font-medium tracking-wider uppercase text-muted-foreground">
            AgentWatch
          </span>
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          See Every AI Agent in Your Environment
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
          Shadow AI agents are already operating across your network. AgentWatch
          discovers, inventories, and governs them before they become a risk.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" render={<Link href="/signup" />}>
            Start Free Scan
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/pricing" />}>
            See Pricing
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight mb-12">
            Full Lifecycle AI Agent Governance
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="flex flex-col items-center text-center gap-4 p-6"
                >
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight mb-4">
          Ready to uncover your shadow AI?
        </h2>
        <p className="text-muted-foreground mb-8">
          Upload your first log file and see results in minutes.
        </p>
        <Button size="lg" render={<Link href="/signup" />}>
          Get Started Free
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AgentWatch. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/security"
              className="hover:text-foreground transition-colors"
            >
              Security
            </Link>
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
