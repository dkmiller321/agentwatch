"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User } from "lucide-react"

interface UserMenuProps {
  email?: string | null
  avatarUrl?: string | null
}

export function UserMenu({ email, avatarUrl }: UserMenuProps) {
  const router = useRouter()
  const supabase = createClient()

  const initials = email
    ? email
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase()
    : "?"

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar size="sm">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={email ?? "User"} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/settings")}
        >
          <User className="mr-2 size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
