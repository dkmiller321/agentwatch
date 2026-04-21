"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import type { DataSourceRow } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Upload,
  Cloud,
  Activity,
  Server,
  Loader2,
  CheckCircle2,
} from "lucide-react"

interface ConnectionsClientProps {
  dataSources: DataSourceRow[]
}

const connectors = [
  {
    id: "file_upload" as const,
    name: "File Upload",
    description: "Upload proxy logs, firewall logs, or CSV exports.",
    icon: Upload,
    available: true,
  },
  {
    id: "splunk" as const,
    name: "Splunk",
    description: "Connect to Splunk for continuous log monitoring.",
    icon: Activity,
    available: false,
  },
  {
    id: "datadog" as const,
    name: "Datadog",
    description: "Stream logs from Datadog for agent detection.",
    icon: Cloud,
    available: false,
  },
  {
    id: "aws_cloudtrail" as const,
    name: "AWS CloudTrail",
    description: "Monitor API calls via AWS CloudTrail.",
    icon: Server,
    available: false,
  },
]

export function ConnectionsClient({ dataSources }: ConnectionsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistSubmitted, setWaitlistSubmitted] = useState<string | null>(
    null
  )

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      setUploading(true)
      setUploadProgress(0)
      setUploadComplete(false)

      const file = acceptedFiles[0]

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 300)

      // Upload to Supabase Storage
      const filePath = `uploads/${Date.now()}-${file.name}`
      const { error } = await supabase.storage
        .from("log-uploads")
        .upload(filePath, file)

      clearInterval(interval)

      if (!error) {
        setUploadProgress(100)
        setUploadComplete(true)
        router.refresh()
      }

      setUploading(false)
    },
    [supabase, router]
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

  function handleWaitlist(connectorId: string) {
    if (!waitlistEmail) return
    setWaitlistSubmitted(connectorId)
    setWaitlistEmail("")
  }

  const connectedIds = new Set(dataSources.map((ds) => ds.type))

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {connectors.map((connector) => {
        const Icon = connector.icon
        const isConnected = connectedIds.has(connector.id)

        return (
          <Card key={connector.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-muted-foreground" />
                  <CardTitle className="text-base">{connector.name}</CardTitle>
                </div>
                {isConnected && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                    Connected
                  </Badge>
                )}
                {!connector.available && !isConnected && (
                  <Badge variant="secondary">Coming Soon</Badge>
                )}
              </div>
              <CardDescription>{connector.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {connector.id === "file_upload" && (
                <div className="flex flex-col gap-3">
                  <div
                    {...getRootProps()}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                      isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input {...getInputProps()} />
                    {uploading ? (
                      <>
                        <Loader2 className="size-8 text-muted-foreground animate-spin mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Uploading... {uploadProgress}%
                        </p>
                        <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </>
                    ) : uploadComplete ? (
                      <>
                        <CheckCircle2 className="size-8 text-emerald-400 mb-2" />
                        <p className="text-sm text-emerald-400">
                          Upload complete
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="size-8 text-muted-foreground mb-2" />
                        <p className="text-sm">
                          {isDragActive
                            ? "Drop the file here"
                            : "Drag and drop a log file, or click to browse"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          CSV, JSON, LOG, or TXT files supported
                        </p>
                      </>
                    )}
                  </div>

                  {dataSources
                    .filter((ds) => ds.type === "file_upload")
                    .map((ds) => (
                      <div
                        key={ds.id}
                        className="flex items-center justify-between text-sm rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <span>{ds.name}</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {ds.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}

              {!connector.available && connector.id !== "file_upload" && (
                <div className="flex flex-col gap-2">
                  {waitlistSubmitted === connector.id ? (
                    <p className="text-sm text-emerald-400">
                      Added to waitlist. We will notify you when available.
                    </p>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="your@email.com"
                        type="email"
                        value={
                          waitlistSubmitted === null ? waitlistEmail : ""
                        }
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWaitlist(connector.id)}
                      >
                        Join Waitlist
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
