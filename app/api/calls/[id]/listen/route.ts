import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import twilioService from "@/lib/services/twilio"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const callId = Number.parseInt(params.id)
    if (isNaN(callId)) {
      return NextResponse.json({ error: "Invalid call ID" }, { status: 400 })
    }

    // Get the call details from the database
    const call = await db.query.callDetails.findFirst({
      where: (fields, { eq }) => eq(fields.id, callId),
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Check if the call has a Twilio SID
    if (!call.twilioSid) {
      return NextResponse.json({ error: "Call has no Twilio SID" }, { status: 400 })
    }

    // Check if the call is in progress
    if (call.status !== "in-progress" && call.status !== "ringing" && call.status !== "queued") {
      return NextResponse.json(
        {
          error: "Call is not in progress",
          status: call.status,
        },
        { status: 400 },
      )
    }

    // Generate a unique conference name based on the call ID
    const conferenceName = `call_${callId}_${Date.now()}`

    console.log(`Setting up conference for call ${callId} with SID ${call.twilioSid}`)

    // Update the call to join the conference
    const result = await twilioService.updateCallToJoinConference(call.twilioSid, conferenceName)

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Failed to update call to join conference",
          details: result.error,
        },
        { status: 500 },
      )
    }

    console.log(`Successfully set up conference: ${conferenceName}`)

    // Return the conference name
    return NextResponse.json({
      success: true,
      conferenceName,
      callSid: call.twilioSid,
    })
  } catch (error) {
    console.error("Error setting up call listening:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
