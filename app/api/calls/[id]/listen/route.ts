import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { callDetails } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import twilio from "twilio"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const callDetailId = Number.parseInt(params.id)
    if (isNaN(callDetailId)) {
      return NextResponse.json({ error: "Invalid call detail ID" }, { status: 400 })
    }

    // Get the call detail
    const callDetail = await db.query.callDetails.findFirst({
      where: eq(callDetails.id, callDetailId),
      with: {
        callRecord: true,
      },
    })

    if (!callDetail) {
      return NextResponse.json({ error: "Call detail not found" }, { status: 404 })
    }

    // Verify the call record belongs to the user
    if (callDetail.callRecord.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized to access this call" }, { status: 403 })
    }

    // Check if the call is in progress
    if (callDetail.status !== "in-progress" && callDetail.status !== "ringing" && callDetail.status !== "queued") {
      return NextResponse.json({ error: "Call is not in progress" }, { status: 400 })
    }

    // Check if we have a Twilio SID
    if (!callDetail.twilioSid) {
      return NextResponse.json({ error: "No Twilio call SID available" }, { status: 400 })
    }

    // Initialize Twilio client
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    // Create a conference name based on the call detail ID
    const conferenceName = `listen_${callDetailId}_${Date.now()}`

    // Update the in-progress call to join a conference
    await client.calls(callDetail.twilioSid).update({
      twiml: `
        <Response>
          <Dial>
            <Conference startConferenceOnEnter="true" endConferenceOnExit="false">
              ${conferenceName}
            </Conference>
          </Dial>
        </Response>
      `,
    })

    // Generate client-side capability token for listening
    const ClientCapability = twilio.jwt.ClientCapability
    const capability = new ClientCapability({
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
    })

    // Allow the client to receive calls
    capability.addScope(new ClientCapability.IncomingClientScope("browser_listener"))

    // Generate the token
    const token = capability.toJwt()

    return NextResponse.json({
      success: true,
      token,
      conferenceName,
      callSid: callDetail.twilioSid,
    })
  } catch (error) {
    console.error("Error initiating live call listening:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
