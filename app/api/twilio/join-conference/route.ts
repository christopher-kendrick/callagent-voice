import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Received request to join-conference endpoint")

    // First, try to get parameters from URL
    const url = new URL(request.url)
    let conferenceName = url.searchParams.get("conferenceName") || undefined
    let clientIdentity = url.searchParams.get("clientIdentity") || undefined
    let muted = url.searchParams.get("muted") === "true"

    console.log(
      `URL parameters: conferenceName=${conferenceName || "undefined"}, clientIdentity=${
        clientIdentity || "undefined"
      }, muted=${muted}`,
    )

    // Clone the request for multiple reads
    const clonedRequest = request.clone()

    // Get the content type
    const contentType = request.headers.get("content-type") || ""
    console.log(`Content-Type: ${contentType}`)

    // If not in URL, try to get from body
    if (!conferenceName) {
      if (contentType.includes("application/json")) {
        try {
          // Parse JSON body
          const body = await request.json()
          conferenceName = body.conferenceName
          clientIdentity = clientIdentity || body.clientIdentity
          muted = body.muted === true
          console.log(`Parsed JSON body: ${JSON.stringify(body)}`)
        } catch (parseError) {
          console.error("Error parsing JSON body:", parseError)
        }
      } else if (
        contentType.includes("multipart/form-data") ||
        contentType.includes("application/x-www-form-urlencoded")
      ) {
        try {
          // Parse form data
          const formData = await request.formData()

          // Log all form data entries for debugging
          console.log("Form data entries:")
          for (const [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value}`)
          }

          conferenceName = formData.get("conferenceName")?.toString()
          clientIdentity = clientIdentity || formData.get("clientIdentity")?.toString()
          muted = formData.get("muted") === "true"

          // If no conferenceName, try to get it from the To parameter (Twilio webhook format)
          if (!conferenceName && formData.has("To")) {
            conferenceName = formData.get("To")?.toString()
            console.log(`Using To parameter as conference name: ${conferenceName}`)
          }

          console.log(
            `Parsed form data: conferenceName=${conferenceName || "undefined"}, clientIdentity=${
              clientIdentity || "undefined"
            }, muted=${muted}`,
          )
        } catch (formError) {
          console.error("Error parsing form data:", formError)
        }
      } else {
        // For any other content type, try to get the raw text
        try {
          const text = await clonedRequest.text()
          console.log(`Raw request body: ${text}`)

          // Try to parse as URL-encoded form data
          if (text.includes("=")) {
            const params = new URLSearchParams(text)

            // Log all parameters for debugging
            console.log("URL-encoded parameters:")
            for (const [key, value] of params.entries()) {
              console.log(`  ${key}: ${value}`)
            }

            conferenceName = params.get("conferenceName") || undefined
            clientIdentity = clientIdentity || params.get("clientIdentity") || undefined
            muted = params.get("muted") === "true"

            // If no conferenceName, try to get it from the To parameter (Twilio webhook format)
            if (!conferenceName && params.has("To")) {
              conferenceName = params.get("To")
              console.log(`Using To parameter as conference name: ${conferenceName}`)
            }

            console.log(
              `Parsed from raw text: conferenceName=${conferenceName || "undefined"}, clientIdentity=${
                clientIdentity || "undefined"
              }, muted=${muted}`,
            )
          }
        } catch (error) {
          console.error("Error reading request body:", error)
        }
      }
    }

    // If we still don't have a conference name, use a default for testing
    if (!conferenceName) {
      conferenceName = `default_conference_${Date.now()}`
      console.log(`Using default conference name: ${conferenceName}`)
    }

    console.log(
      `Generating TwiML for conference: ${conferenceName}, client: ${clientIdentity || "unknown"}, muted: ${muted}`,
    )

    // Generate TwiML for joining a conference with proper formatting
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference 
      waitUrl=""
      startConferenceOnEnter="true" 
      endConferenceOnExit="false"
      muted="false"
    >
      ${conferenceName}
    </Conference>
  </Dial>
</Response>`

    console.log("Generated TwiML successfully")
    console.log(`Final TwiML: ${twiml}`)

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
