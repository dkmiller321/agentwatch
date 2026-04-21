"use client"

import { useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import type { AgentRow, AgentStatus } from "@/lib/supabase/database.types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AgentFilters, type AgentFilterValues } from "./AgentFilters"
import { formatDate } from "@/lib/utils"
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react"

interface AgentsTableProps {
  initialData: AgentRow[]
  totalCount: number
}

function RiskBadge({ score }: { score: number }) {
  if (score > 75) {
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/25">
        {score}
      </Badge>
    )
  }
  if (score >= 25) {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25">
        {score}
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
      {score}
    </Badge>
  )
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, string> = {
    new: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    reviewed: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    sanctioned: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    blocked: "bg-red-500/15 text-red-400 border-red-500/25",
  }
  return <Badge className={styles[status]}>{status}</Badge>
}

function ProviderBadge({ provider }: { provider: string | null }) {
  if (!provider) return <span className="text-muted-foreground">--</span>
  return <Badge variant="secondary">{provider}</Badge>
}

export function AgentsTable({ initialData, totalCount }: AgentsTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [filters, setFilters] = useState<AgentFilterValues>({
    search: "",
    provider: "all",
    riskLevel: "all",
    status: "all",
  })

  const columns = useMemo<ColumnDef<AgentRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            Name <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => <ProviderBadge provider={row.original.provider} />,
      },
      {
        accessorKey: "first_seen_at",
        header: "First Seen",
        cell: ({ row }) =>
          row.original.first_seen_at
            ? formatDate(row.original.first_seen_at)
            : "--",
      },
      {
        accessorKey: "last_seen_at",
        header: "Last Seen",
        cell: ({ row }) =>
          row.original.last_seen_at
            ? formatDate(row.original.last_seen_at)
            : "--",
      },
      {
        accessorKey: "event_count_7d",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            Events (7d) <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => row.original.event_count_7d.toLocaleString(),
      },
      {
        accessorKey: "associated_identity",
        header: "Identity",
        cell: ({ row }) =>
          row.original.associated_identity ? (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {row.original.associated_identity}
            </code>
          ) : (
            <span className="text-muted-foreground">--</span>
          ),
      },
      {
        accessorKey: "risk_score",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            Risk <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => <RiskBadge score={row.original.risk_score} />,
      },
      {
        accessorKey: "owner",
        header: "Owner",
        cell: ({ row }) =>
          row.original.owner || (
            <span className="text-muted-foreground">Unassigned</span>
          ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    []
  )

  const filteredData = useMemo(() => {
    let data = initialData
    if (filters.search) {
      const q = filters.search.toLowerCase()
      data = data.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.associated_identity?.toLowerCase().includes(q) ||
          a.owner?.toLowerCase().includes(q)
      )
    }
    if (filters.provider !== "all") {
      data = data.filter(
        (a) => a.provider?.toLowerCase() === filters.provider
      )
    }
    if (filters.riskLevel !== "all") {
      data = data.filter((a) => {
        if (filters.riskLevel === "low") return a.risk_score < 25
        if (filters.riskLevel === "medium")
          return a.risk_score >= 25 && a.risk_score <= 75
        return a.risk_score > 75
      })
    }
    if (filters.status !== "all") {
      data = data.filter((a) => a.status === filters.status)
    }
    return data
  }, [initialData, filters])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  })

  const exportCsv = useCallback(() => {
    const headers = [
      "name",
      "provider",
      "first_seen_at",
      "last_seen_at",
      "event_count_7d",
      "associated_identity",
      "risk_score",
      "owner",
      "status",
    ]
    const rows = filteredData.map((a) =>
      headers.map((h) => {
        const val = a[h as keyof AgentRow]
        return typeof val === "string" ? `"${val}"` : String(val ?? "")
      })
    )
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "agents-export.csv"
    link.click()
    URL.revokeObjectURL(url)
  }, [filteredData])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <AgentFilters filters={filters} onFiltersChange={setFilters} />
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="size-4 mr-1.5" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-9 text-xs">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="h-9 cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/agents/${row.original.id}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-1.5 text-xs">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No agents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing{" "}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}
          -
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            filteredData.length
          )}{" "}
          of {filteredData.length} agents
          {filteredData.length !== totalCount && ` (${totalCount} total)`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
