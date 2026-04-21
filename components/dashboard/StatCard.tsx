import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  label: string
  value: number | string
  trend?: { value: number; label: string }
}

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 text-xs">
            {trend.value > 0 ? (
              <TrendingUp className="size-3 text-emerald-500" />
            ) : trend.value < 0 ? (
              <TrendingDown className="size-3 text-red-500" />
            ) : (
              <Minus className="size-3 text-muted-foreground" />
            )}
            <span
              className={cn(
                trend.value > 0
                  ? "text-emerald-500"
                  : trend.value < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
