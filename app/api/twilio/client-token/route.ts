import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import twilio from "twilio"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the identity from the query params (or use user ID)
    const identity = request.nextUrl.searchParams.get("identity") || `user_${session.user.id}`

    // Log the token generation attempt
    console.log(`Generating Twilio Client token for identity: ${identity}`)

    // Validate Twilio credentials are available
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error("Missing Twilio credentials")
      return NextResponse.json({ error: "Missing Twilio credentials" }, { status: 500 })
    }

    if (!process.env.TWILIO_TWIML_APP_SID) {
      console.error("Missing TWILIO_TWIML_APP_SID")
      return NextResponse.json({ error: "Missing TWILIO_TWIML_APP_SID" }, { status: 500 })
    }

    // Generate client-side capability token
    const ClientCapability = twilio.jwt.ClientCapability
    const capability = new ClientCapability({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      ttl: 3600, // 1 hour
    })

    // Allow the client to listen to incoming calls
    capability.addScope(new ClientCapability.IncomingClientScope(identity))

    // Allow the client to make outgoing calls
    capability.addScope(
      new ClientCapability.OutgoingClientScope({
        applicationSid: process.env.TWILIO_TWIML_APP_SID,
        clientName: identity,
      }),
    )

    // Generate the token
    const token = capability.toJwt()

    console.log(`Successfully generated token for ${identity}`)

    return NextResponse.json({
      token,
      identity,
    })
  } catch (error) {
    console.error("Error generating Twilio client token:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
