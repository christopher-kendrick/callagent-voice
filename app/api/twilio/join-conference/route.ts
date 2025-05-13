import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Received request to join-conference endpoint")

    // Get the content type from the request
    const contentType = request.headers.get("content-type") || ""
    console.log(`Content-Type: ${contentType}`)

    let conferenceName: string | undefined
    let clientIdentity: string | undefined

    // Handle different content types
    if (contentType.includes("application/json")) {
      try {
        // Parse JSON body
        const body = await request.json()
        conferenceName = body.conferenceName
        clientIdentity = body.clientIdentity
        console.log(`Parsed JSON body: ${JSON.stringify(body)}`)
      } catch (parseError) {
        console.error("Error parsing JSON body:", parseError)
        // Try to get the raw text to see what's being sent
        const text = await request.text()
        console.log(`Raw request body: ${text}`)
        return NextResponse.json(
          {
            error: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          },
          { status: 400 },
        )
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // Parse form data
      const formData = await request.formData()
      conferenceName = formData.get("conferenceName")?.toString()
      clientIdentity = formData.get("clientIdentity")?.toString()
      console.log(`Parsed form data: conferenceName=${conferenceName}, clientIdentity=${clientIdentity}`)
    } else {
      // For any other content type, try to get the raw text
      try {
        const text = await request.text()
        console.log(`Raw request body: ${text}`)

        // Try to extract parameters from the URL if they're not in the body
        const url = new URL(request.url)
        conferenceName = url.searchParams.get("conferenceName") || undefined
        clientIdentity = url.searchParams.get("clientIdentity") || undefined
        console.log(`Extracted from URL: conferenceName=${conferenceName}, clientIdentity=${clientIdentity}`)
      } catch (error) {
        console.error("Error reading request body:", error)
      }
    }

    // If we still don't have a conference name, check URL parameters
    if (!conferenceName) {
      const url = new URL(request.url)
      conferenceName = url.searchParams.get("conferenceName") || undefined
      if (!clientIdentity) {
        clientIdentity = url.searchParams.get("clientIdentity") || undefined
      }
      console.log(`Checked URL parameters: conferenceName=${conferenceName}, clientIdentity=${clientIdentity}`)
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
