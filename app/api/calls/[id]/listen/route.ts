import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { neon } from "@neondatabase/serverless"
import { v4 as uuidv4 } from "uuid"

const sql = neon(process.env.DATABASE_URL!)

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

    // Get call details from database
    const callDetails = await sql`
      SELECT id, call_sid, status, contact_name
      FROM call_details
      WHERE id = ${callDetailId}
    `

    if (!callDetails || callDetails.length === 0) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    const call = callDetails[0]

    // Generate a unique conference name based on the call SID
    const conferenceName = `listen_${call.call_sid}_${uuidv4().substring(0, 8)}`

    console.log(`Setting up conference ${conferenceName} for call ${call.call_sid}`)

    // Return the conference name to the client
    return NextResponse.json({
      conferenceName,
      callSid: call.call_sid,
      status: call.status,
      contactName: call.contact_name,
    })
  } catch (error) {
    console.error("Error setting up call listening:", error)
    return NextResponse.json(
      { error: `Failed to set up call listening: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
