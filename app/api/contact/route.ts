import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, message } = await request.json()

    if (!name || !email || !company || !message) {
      return NextResponse.json(
        { error: "All fields are required: name, email, company, message" },
        { status: 400 }
      )
    }

    await getResend().emails.send({
      from: "AgentWatch <noreply@agentwatch.dev>",
      to: process.env.CONTACT_EMAIL || "sales@agentwatch.dev",
      subject: `Enterprise inquiry from ${company}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Company: ${company}`,
        ``,
        `Message:`,
        message,
      ].join("\n"),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
