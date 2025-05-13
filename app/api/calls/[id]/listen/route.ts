import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { callDetails } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error("Unauthorized access attempt to listen to call")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const callDetailId = Number.parseInt(params.id)
    if (isNaN(callDetailId)) {
      return NextResponse.json({ error: "Invalid call ID" }, { status: 400 })
    }

    console.log(`Getting call details for ID: ${callDetailId}`)

    // Get call details from database using drizzle ORM
    const callDetail = await db.query.callDetails.findFirst({
      where: eq(callDetails.id, callDetailId),
      with: {
        contact: true,
      },
    })

    if (!callDetail) {
      console.error(`Call detail not found for ID: ${callDetailId}`)
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    console.log(
      `Found call detail:`,
      JSON.stringify({
        id: callDetail.id,
        twilioSid: callDetail.twilioSid,
        status: callDetail.status,
        contactName: callDetail.contact?.name,
      }),
    )

    // Check if the call has a Twilio SID
    if (!callDetail.twilioSid) {
      return NextResponse.json({ error: "Call has no Twilio SID" }, { status: 400 })
    }

    // Generate a unique conference name based on the call SID
    const conferenceName = `listen_${callDetail.twilioSid}_${uuidv4().substring(0, 8)}`

    console.log(`Setting up conference ${conferenceName} for call ${callDetail.twilioSid}`)

    // Return the conference name to the client
    return NextResponse.json({
      conferenceName,
      callSid: callDetail.twilioSid,
      status: callDetail.status,
      contactName: callDetail.contact?.name,
    })
  } catch (error) {
    console.error("Error setting up call listening:", error)
    return NextResponse.json(
      { error: `Failed to set up call listening: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
