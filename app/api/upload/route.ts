import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB
const ALLOWED_TYPES = ["text/csv", "application/jsonl", "text/plain"]
const ALLOWED_EXTENSIONS = [".csv", ".jsonl", ".txt"]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 500MB limit" },
        { status: 400 }
      )
    }

    const extension = "." + file.name.split(".").pop()?.toLowerCase()
    if (
      !ALLOWED_EXTENSIONS.includes(extension) &&
      !ALLOWED_TYPES.includes(file.type)
    ) {
      return NextResponse.json(
        { error: "File type not allowed. Accepted: csv, jsonl, txt" },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("logs")
      .upload(filePath, file)

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      )
    }

    return NextResponse.json({ filePath, fileName })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    )
  }
}
