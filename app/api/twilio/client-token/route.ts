import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

export async function GET(request: NextRequest) {
  try {
    // Check if we have the required environment variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_TWIML_APP_SID) {
      console.error("Missing required Twilio environment variables")
      return NextResponse.json(
        { error: "Missing required Twilio configuration. Please check your environment variables." },
        { status: 500 },
      )
    }

    // Generate a unique identity for this client
    const identity = `listener_${Date.now()}`

    // Create a Twilio Capability Token
    const ClientCapability = twilio.jwt.ClientCapability
    const capability = new ClientCapability({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
    })

    // Allow the client to receive calls
    capability.addScope(new ClientCapability.IncomingClientScope(identity))

    // Allow the client to make outgoing calls
    capability.addScope(
      new ClientCapability.OutgoingClientScope({
        applicationSid: process.env.TWILIO_TWIML_APP_SID,
        clientName: identity,
      }),
    )

    // Generate the token with a 1 hour TTL
    const token = capability.toJwt({
      ttl: 3600,
    })

    console.log(`Generated Twilio Client token for identity: ${identity}`)

    // Return the token
    return NextResponse.json({
      token,
      identity,
    })
  } catch (error) {
    console.error("Error generating Twilio Client token:", error)
    return NextResponse.json(
      { error: `Failed to generate token: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
