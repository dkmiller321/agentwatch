import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
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

      <main className="flex-1">{children}</main>

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
