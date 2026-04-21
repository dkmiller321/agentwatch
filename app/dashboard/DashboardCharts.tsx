"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { createClient } from "@/lib/supabase/client"

interface ChartPoint {
  date: string
  count: number
}

export function DashboardCharts() {
  const [data, setData] = useState<ChartPoint[]>([])

  useEffect(() => {
    async function fetchChartData() {
      const supabase = createClient()
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString()

      const { data: agents } = await supabase
        .from("agents")
        .select("first_seen_at")
        .gte("first_seen_at", thirtyDaysAgo)
        .order("first_seen_at", { ascending: true })

      if (!agents || agents.length === 0) {
        // Generate placeholder data
        const points: ChartPoint[] = []
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          points.push({
            date: d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            count: 0,
          })
        }
        setData(points)
        return
      }

      // Bucket agents by day
      const buckets: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().split("T")[0]
        buckets[key] = 0
      }
      for (const agent of agents) {
        if (agent.first_seen_at) {
          const key = agent.first_seen_at.split("T")[0]
          if (key in buckets) buckets[key]++
        }
      }

      // Cumulate
      let running = 0
      const points: ChartPoint[] = Object.entries(buckets).map(
        ([dateKey, count]) => {
          running += count
          const d = new Date(dateKey + "T00:00:00")
          return {
            date: d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            count: running,
          }
        }
      )
      setData(points)
    }

    fetchChartData()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agents Discovered (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
