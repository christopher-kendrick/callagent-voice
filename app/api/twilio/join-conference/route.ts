import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conferenceName } = await request.json()

    if (!conferenceName) {
      return NextResponse.json({ error: "Conference name is required" }, { status: 400 })
    }

    // Generate TwiML to join the conference
    const twiml = `
      <Response>
        <Dial>
          <Conference startConferenceOnEnter="false" endConferenceOnExit="false" muted="true">
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>
    `

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
      </Response>
    `

    return new NextResponse(errorTwiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    })
  }
}
