import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { callRecords, callDetails, type NewCallRecord, type NewCallDetail } from "@/lib/db/schema"
import { authOptions } from "@/auth"
import { twilioService } from "@/lib/services/twilio"
import { humeAIService } from "@/lib/services/hume-ai"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCallRecords = await db.query.callRecords.findMany({
      where: (callRecords, { eq }) => eq(callRecords.userId, session.user.id),
      orderBy: (callRecords, { desc }) => [desc(callRecords.createdAt)],
      with: {
        script: true,
        callDetails: {
          with: {
            contact: true,
          },
        },
      },
    })

    return NextResponse.json(userCallRecords)
  } catch (error) {
    console.error("Error fetching call records:", error)
    return NextResponse.json({ error: "Failed to fetch call records" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { scriptId, contactIds } = body

    if (!scriptId || !contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "Invalid request. Script ID and contact IDs are required." }, { status: 400 })
    }

    // Get the script
    const script = await db.query.scripts.findFirst({
      where: (scripts, { eq, and }) => and(eq(scripts.id, scriptId), eq(scripts.userId, session.user.id)),
    })

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 })
    }

    // Create a new call record
    const newCallRecord: NewCallRecord = {
      userId: session.user.id,
      scriptId: script.id,
      status: "pending",
      createdAt: new Date(),
      metadata: { contactCount: contactIds.length },
    }

    const [callRecord] = await db.insert(callRecords).values(newCallRecord).returning()

    // Get contacts
    const selectedContacts = await db.query.contacts.findMany({
      where: (contacts, { inArray, eq, and }) =>
        and(inArray(contacts.id, contactIds), eq(contacts.userId, session.user.id)),
    })

    if (selectedContacts.length === 0) {
      return NextResponse.json({ error: "No valid contacts found" }, { status: 404 })
    }

    // Create Hume AI agent with the script
    const humeAgent = await humeAIService.createAgent({
      configId: process.env.HUME_CONFIG_ID || "",
      apiKey: process.env.HUME_API_KEY || "",
    })

    if (!humeAgent.success) {
      return NextResponse.json({ error: "Failed to create Hume AI agent" }, { status: 500 })
    }

    // Create call details and initiate calls for each contact
    const callDetailsPromises = selectedContacts.map(async (contact) => {
      // Create call detail record
      const newCallDetail: NewCallDetail = {
        callRecordId: callRecord.id,
        contactId: contact.id,
        status: "pending",
        createdAt: new Date(),
      }

      const [callDetail] = await db.insert(callDetails).values(newCallDetail).returning()

      // Initiate Twilio call
      const twilioCall = await twilioService.initiateCall({
        to: contact.phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        webhookUrl: humeAgent.webhookUrl,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status-callback?callDetailId=${callDetail.id}`,
        recordingEnabled: true,
      })

      // Update call detail with Twilio SID
      if (twilioCall.success) {
        await db
          .update(callDetails)
          .set({
            twilioSid: twilioCall.callSid,
            status: twilioCall.status,
          })
          .where(eq(callDetails.id, callDetail.id))
      } else {
        await db
          .update(callDetails)
          .set({
            status: "failed",
            notes: `Failed to initiate call: ${twilioCall.error}`,
          })
          .where(eq(callDetails.id, callDetail.id))
      }

      return {
        contactId: contact.id,
        callDetailId: callDetail.id,
        twilioCallSid: twilioCall.success ? twilioCall.callSid : null,
        status: twilioCall.success ? twilioCall.status : "failed",
      }
    })

    const callDetailsResults = await Promise.all(callDetailsPromises)

    // Update call record status
    await db
      .update(callRecords)
      .set({
        status: "in-progress",
        startTime: new Date(),
      })
      .where(eq(callRecords.id, callRecord.id))

    return NextResponse.json({
      callRecordId: callRecord.id,
      status: "in-progress",
      callDetails: callDetailsResults,
    })
  } catch (error) {
    console.error("Error initiating calls:", error)
    return NextResponse.json({ error: "Failed to initiate calls" }, { status: 500 })
  }
}
