import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Get the conference name from the request body
    const body = await request.json()
    const { conferenceName, clientIdentity } = body

    if (!conferenceName) {
      return NextResponse.json({ error: "Conference name is required" }, { status: 400 })
    }

    console.log(`Generating TwiML for conference: ${conferenceName}, client: ${clientIdentity || "unknown"}`)

    // Generate TwiML for joining a conference
    const twiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Dial>
          <Conference waitUrl="" startConferenceOnEnter="false" endConferenceOnExit="false" muted="true">
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>
    `

    // Return the TwiML with the correct content type
    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    })
  } catch (error) {
    console.error("Error generating TwiML:", error)
    return NextResponse.json(
      { error: `Failed to generate TwiML: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
