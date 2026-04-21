"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Lock, Loader2 } from "lucide-react"

interface ReportsClientProps {
  plan: string
}

const templates = [
  {
    id: "general",
    name: "General Inventory Report",
    description: "Full agent inventory with risk scores and status.",
    requiredPlan: "free",
  },
  {
    id: "eu-ai-act",
    name: "EU AI Act Compliance",
    description: "Compliance report aligned to the EU AI Act framework.",
    requiredPlan: "pro",
  },
  {
    id: "soc2",
    name: "SOC 2 AI Controls",
    description: "AI agent controls mapping for SOC 2 audits.",
    requiredPlan: "enterprise",
  },
]

function planLevel(plan: string): number {
  if (plan === "enterprise") return 3
  if (plan === "pro") return 2
  return 1
}

function requiredLevel(template: string): number {
  if (template === "enterprise") return 3
  if (template === "pro") return 2
  return 1
}

export function ReportsClient({ plan }: ReportsClientProps) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("general")
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<
    "idle" | "generating" | "ready" | "error"
  >("idle")

  const currentPlanLevel = planLevel(plan)

  async function handleGenerate() {
    const template = templates.find((t) => t.id === selectedTemplate)
    if (!template) return

    if (requiredLevel(template.requiredPlan) > currentPlanLevel) return

    setGenerating(true)
    setStatus("generating")

    // Simulate PDF generation
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setGenerating(false)
    setStatus("ready")
  }

  function handleDownload() {
    // In production, this would download the actual PDF from storage
    const element = document.createElement("a")
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," +
        encodeURIComponent("AgentWatch Report - " + selectedTemplate)
    )
    element.setAttribute(
      "download",
      `agentwatch-report-${selectedTemplate}.pdf`
    )
    element.click()
    setStatus("idle")
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>
            Select a date range and template to generate a PDF report.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Template</Label>
            <Select
              value={selectedTemplate}
              onValueChange={(val) => setSelectedTemplate(val ?? "general")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={
              generating ||
              !startDate ||
              !endDate ||
              requiredLevel(
                templates.find((t) => t.id === selectedTemplate)
                  ?.requiredPlan ?? "free"
              ) > currentPlanLevel
            }
          >
            {generating ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="size-4 mr-1.5" />
                Generate PDF
              </>
            )}
          </Button>

          {status === "ready" && (
            <div className="flex items-center justify-between rounded-lg border bg-emerald-500/10 p-3">
              <span className="text-sm text-emerald-400">
                Report ready for download
              </span>
              <Button size="sm" onClick={handleDownload}>
                Download PDF
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-lg border bg-red-500/10 p-3">
              <span className="text-sm text-red-400">
                Failed to generate report. Please try again.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Available Templates
        </h3>
        {templates.map((t) => {
          const locked = requiredLevel(t.requiredPlan) > currentPlanLevel
          return (
            <Card
              key={t.id}
              className={locked ? "opacity-60" : undefined}
            >
              <CardContent className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.name}</span>
                    {locked && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 gap-0.5"
                      >
                        <Lock className="size-2.5" />
                        {t.requiredPlan}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
