import { type NextRequest, NextResponse } from "next/server"

// Get Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

export async function POST(request: NextRequest) {
  try {
    // Basic validation of Twilio credentials
    if (!accountSid || !authToken) {
      console.error("Missing Twilio credentials")
      return NextResponse.json({ error: "Server configuration error: Missing Twilio credentials" }, { status: 500 })
    }

    // Parse the request body
    const body = await request.json().catch(() => ({}))
    const { conferenceName, clientIdentity } = body

    if (!conferenceName) {
      console.error("Missing conference name in request")
      return NextResponse.json({ error: "Conference name is required" }, { status: 400 })
    }

    console.log(`Generating TwiML to join conference: ${conferenceName} for client: ${clientIdentity || "unknown"}`)

    // Generate TwiML to join the conference
    // Note: We're using waitUrl="" to prevent the default hold music
    const twiml = `
      <Response>
        <Dial>
          <Conference waitUrl="" startConferenceOnEnter="false" endConferenceOnExit="false" muted="true">
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>
    `

    console.log(`Generated TwiML for conference: ${conferenceName}`)

    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    })
  } catch (error) {
    console.error("Error joining conference:", error)

    // Return error as TwiML
    const errorTwiml = `
      <Response>
        <Say>Sorry, there was an error joining the conference.</Say>
        <Say>${error instanceof Error ? error.message : "Unknown error"}</Say>
      </Response>
    `

    return new NextResponse(errorTwiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    })
  }
}
