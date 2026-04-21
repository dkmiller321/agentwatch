"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Upload,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Eye,
} from "lucide-react"

type Step = "upload" | "processing" | "results"

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>("upload")
  const [uploading, setUploading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [agentCount, setAgentCount] = useState(0)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      setUploading(true)

      const file = acceptedFiles[0]
      const filePath = `onboarding/${Date.now()}-${file.name}`

      await supabase.storage.from("log-uploads").upload(filePath, file)

      // Create ingestion job via API
      const res = await fetch("/api/ingestion-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath }),
      })

      if (res.ok) {
        const job = await res.json()
        setJobId(job.id)
        setStep("processing")
      }

      setUploading(false)
    },
    [supabase]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".log", ".txt"],
      "application/json": [".json"],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  // Poll job status during processing step
  useEffect(() => {
    if (step !== "processing" || !jobId) return

    const interval = setInterval(async () => {
      const res = await fetch(`/api/ingestion-jobs?id=${jobId}`)
      if (!res.ok) return

      const job = await res.json()

      if (job.status === "running") {
        setProgress((prev) => Math.min(prev + 15, 85))
      } else if (job.status === "completed") {
        setProgress(100)
        setAgentCount(job.agent_count ?? 0)
        clearInterval(interval)
        setTimeout(() => setStep("results"), 500)
      } else if (job.status === "failed") {
        clearInterval(interval)
        setStep("upload")
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [step, jobId])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Eye className="size-7 text-primary" />
          <span className="text-xl font-semibold tracking-tight">
            AgentWatch
          </span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["upload", "processing", "results"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : (["upload", "processing", "results"].indexOf(step) >
                        i)
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {["upload", "processing", "results"].indexOf(step) > i ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div className="h-px w-12 bg-border" />
              )}
            </div>
          ))}
        </div>

        {step === "upload" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Upload Your Logs</CardTitle>
              <CardDescription>
                Upload proxy logs, firewall logs, or API gateway logs to
                discover AI agents in your environment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                } ${uploading ? "pointer-events-none opacity-60" : ""}`}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <>
                    <Loader2 className="size-10 text-muted-foreground animate-spin mb-3" />
                    <p className="text-sm">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="size-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">
                      {isDragActive
                        ? "Drop the file here"
                        : "Drag and drop a log file"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      or click to browse - CSV, JSON, LOG, TXT
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === "processing" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Analyzing Your Logs</CardTitle>
              <CardDescription>
                We are scanning your logs for AI agent signatures. This may take
                a moment.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Loader2 className="size-10 text-primary animate-spin" />
              <div className="w-full max-w-xs">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {progress}% complete
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "results" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>
                <CheckCircle2 className="size-10 text-emerald-400 mx-auto mb-3" />
                We found {agentCount} agent{agentCount !== 1 ? "s" : ""}!
              </CardTitle>
              <CardDescription>
                {agentCount > 0
                  ? "Your AI agent inventory is ready. Review and manage your agents in the dashboard."
                  : "No agents were detected in this file. Try uploading a different log source."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <Button onClick={() => router.push("/dashboard/agents")}>
                View Agent Inventory
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
              {agentCount === 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("upload")
                    setProgress(0)
                    setJobId(null)
                  }}
                >
                  Upload Another File
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
