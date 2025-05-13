import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Received request to join-conference endpoint")

    // First, try to get parameters from URL
    const url = new URL(request.url)
    let conferenceName = url.searchParams.get("conferenceName") || undefined
    let clientIdentity = url.searchParams.get("clientIdentity") || undefined

    console.log(
      `URL parameters: conferenceName=${conferenceName || "undefined"}, clientIdentity=${clientIdentity || "undefined"}`,
    )

    // If not in URL, try to get from body
    if (!conferenceName) {
      // Get the content type from the request
      const contentType = request.headers.get("content-type") || ""
      console.log(`Content-Type: ${contentType}`)

      if (contentType.includes("application/json")) {
        try {
          // Parse JSON body
          const body = await request.json()
          conferenceName = body.conferenceName
          clientIdentity = clientIdentity || body.clientIdentity
          console.log(`Parsed JSON body: ${JSON.stringify(body)}`)
        } catch (parseError) {
          console.error("Error parsing JSON body:", parseError)
          // Try to get the raw text to see what's being sent
          const text = await request.text()
          console.log(`Raw request body: ${text}`)
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        // Parse form data
        const formData = await request.formData()
        conferenceName = formData.get("conferenceName")?.toString()
        clientIdentity = clientIdentity || formData.get("clientIdentity")?.toString()
        console.log(`Parsed form data: conferenceName=${conferenceName}, clientIdentity=${clientIdentity}`)
      } else {
        // For any other content type, try to get the raw text
        try {
          const text = await request.text()
          console.log(`Raw request body: ${text}`)
        } catch (error) {
          console.error("Error reading request body:", error)
        }
      }
    }

    // Validate conference name
    if (!conferenceName) {
      console.error("Missing conference name in request")
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

    console.log("Generated TwiML successfully")

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
