import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { v4 as uuidv4 } from "uuid"

// Get Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

export async function GET(request: NextRequest) {
  try {
    // Basic validation of Twilio credentials
    if (!accountSid || !authToken || !twimlAppSid) {
      console.error("Missing Twilio credentials or TwiML App SID")
      return NextResponse.json(
        { error: "Server configuration error: Missing Twilio credentials or TwiML App SID" },
        { status: 500 },
      )
    }

    // Create a unique identity for this client
    const identity = `listener-${uuidv4()}`

    // Create a capability token
    const AccessToken = twilio.jwt.AccessToken
    const VoiceGrant = AccessToken.VoiceGrant

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    })

    // Create an access token which we will sign and return to the client
    const token = new AccessToken(accountSid, authToken, identity)
    token.addGrant(voiceGrant)

    // Generate the token
    const tokenString = token.toJwt()

    console.log(`Generated token for identity: ${identity}`)

    return NextResponse.json({ token: tokenString, identity })
  } catch (error) {
    console.error("Error generating token:", error)
    return NextResponse.json(
      { error: `Failed to generate token: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
