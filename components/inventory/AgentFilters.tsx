"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"

export interface AgentFilterValues {
  search: string
  provider: string
  riskLevel: string
  status: string
}

interface AgentFiltersProps {
  filters: AgentFilterValues
  onFiltersChange: (filters: AgentFilterValues) => void
}

export function AgentFilters({ filters, onFiltersChange }: AgentFiltersProps) {
  function update(key: keyof AgentFilterValues, value: string) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="pl-8"
        />
      </div>

      <Select value={filters.provider} onValueChange={(v) => update("provider", v ?? "all")}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Providers</SelectItem>
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="anthropic">Anthropic</SelectItem>
          <SelectItem value="google">Google</SelectItem>
          <SelectItem value="cohere">Cohere</SelectItem>
          <SelectItem value="unknown">Unknown</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.riskLevel} onValueChange={(v) => update("riskLevel", v ?? "all")}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Risk Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Risk</SelectItem>
          <SelectItem value="low">Low (&lt;25)</SelectItem>
          <SelectItem value="medium">Medium (25-75)</SelectItem>
          <SelectItem value="high">High (&gt;75)</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => update("status", v ?? "all")}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="reviewed">Reviewed</SelectItem>
          <SelectItem value="sanctioned">Sanctioned</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
