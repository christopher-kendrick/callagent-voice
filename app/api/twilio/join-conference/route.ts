import { type NextRequest, NextResponse } from "next/server"
import { VoiceResponse } from "twilio/lib/twiml/VoiceResponse"

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    let conferenceName: string | null = null
    let clientIdentity: string | null = null
    let muted: string | null = "false" // Default to false (not muted)

    // Handle different content types
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      // Handle JSON request
      const body = await request.json()
      conferenceName = body.conferenceName || null
      clientIdentity = body.clientIdentity || null
      muted = body.muted !== undefined ? String(body.muted) : "false"
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      // Handle form data
      const formData = await request.formData()
      conferenceName = formData.get("conferenceName") as string | null
      clientIdentity = formData.get("clientIdentity") as string | null
      muted = formData.has("muted") ? String(formData.get("muted")) : "false"
    } else {
      // Try to get from URL params
      const url = new URL(request.url)
      conferenceName = url.searchParams.get("conferenceName")
      clientIdentity = url.searchParams.get("clientIdentity")
      muted = url.searchParams.has("muted") ? url.searchParams.get("muted") : "false"
    }

    // Validate required parameters
    if (!conferenceName) {
      return NextResponse.json({ error: "Conference name is required" }, { status: 400 })
    }

    // Generate TwiML response
    const twiml = new VoiceResponse()
    const dial = twiml.dial()

    // Add the conference with the muted attribute
    dial.conference(
      {
        waitUrl: "",
        startConferenceOnEnter: "true",
        endConferenceOnExit: "false",
        muted: muted, // Include the muted attribute
      },
      conferenceName,
    )

    // Return TwiML as XML
    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    })
  } catch (error) {
    console.error("Error generating TwiML:", error)
    return NextResponse.json({ error: "Failed to generate TwiML" }, { status: 500 })
  }
}
