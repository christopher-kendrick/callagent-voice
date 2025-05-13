import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest) {
  try {
    console.log("Generating Twilio client token")

    // Get Twilio credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

    // Validate required credentials
    if (!accountSid || !authToken) {
      console.error("Missing Twilio credentials")
      return NextResponse.json({ error: "Server configuration error: Missing Twilio credentials" }, { status: 500 })
    }

    if (!twimlAppSid) {
      console.error("Missing Twilio TwiML App SID")
      return NextResponse.json({ error: "Server configuration error: Missing Twilio TwiML App SID" }, { status: 500 })
    }

    // Generate a unique identity for this client
    const identity = `listener_${uuidv4().substring(0, 8)}`
    console.log(`Generated identity: ${identity}`)

    // Create a capability token
    const ClientCapability = twilio.jwt.ClientCapability
    const capability = new ClientCapability({
      accountSid,
      authToken,
    })

    // Allow the client to make outgoing calls
    capability.addScope(
      new ClientCapability.OutgoingClientScope({
        applicationSid: twimlAppSid,
        clientName: identity,
      }),
    )

    // Generate the token with a 1 hour TTL
    const token = capability.toJwt({
      ttl: 3600,
    })

    console.log("Generated Twilio client token successfully")

    // Return the token and identity
    return NextResponse.json({
      token,
      identity,
    })
  } catch (error) {
    console.error("Error generating Twilio client token:", error)
    return NextResponse.json(
      { error: `Failed to generate token: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
