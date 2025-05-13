import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { callDetails, callRecords } from "@/lib/db/schema"
import { authOptions } from "@/auth"
import { eq } from "drizzle-orm"
import twilioService from "@/lib/services/twilio"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const records = await db.query.callRecords.findMany({
      where: eq(callRecords.userId, session.user.id),
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

    return NextResponse.json(records)
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

    const { contactIds, scriptId, configId } = await request.json()

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "Contact IDs are required" }, { status: 400 })
    }

    if (!scriptId) {
      return NextResponse.json({ error: "Script ID is required" }, { status: 400 })
    }

    // Verify script exists and belongs to user
    const script = await db.query.scripts.findFirst({
      where: (scripts, { and, eq }) => and(eq(scripts.id, scriptId), eq(scripts.userId, session.user.id)),
    })

    if (!script) {
      return NextResponse.json({ error: "Script not found or not authorized" }, { status: 404 })
    }

    // Verify contacts exist and belong to user
    const selectedContacts = await db.query.contacts.findMany({
      where: (contacts, { and, inArray, eq }) =>
        and(inArray(contacts.id, contactIds), eq(contacts.userId, session.user.id)),
    })

    if (selectedContacts.length !== contactIds.length) {
      return NextResponse.json({ error: "One or more contacts not found or not authorized" }, { status: 404 })
    }

    // Get configuration if provided
    let selectedConfig = null
    if (configId) {
      selectedConfig = await db.query.configs.findFirst({
        where: (configs, { and, eq }) => and(eq(configs.humeConfigId, configId), eq(configs.userId, session.user.id)),
      })

      if (!selectedConfig) {
        return NextResponse.json({ error: "Configuration not found or not authorized" }, { status: 404 })
      }
    }

    // Create call record
    const [callRecord] = await db
      .insert(callRecords)
      .values({
        userId: session.user.id,
        scriptId: scriptId,
        status: "in-progress",
        startTime: new Date(),
        metadata: {
          contactCount: contactIds.length,
          configId: selectedConfig?.humeConfigId || null,
        },
      })
      .returning()

    if (!callRecord) {
      return NextResponse.json({ error: "Failed to create call record" }, { status: 500 })
    }

    // Create call details and initiate calls
    const callDetailsPromises = selectedContacts.map(async (contact) => {
      // Create call detail record
      const [callDetail] = await db
        .insert(callDetails)
        .values({
          callRecordId: callRecord.id,
          contactId: contact.id,
          status: "queued",
        })
        .returning()

      if (!callDetail) {
        throw new Error(`Failed to create call detail for contact ${contact.id}`)
      }

      // Initiate call via Twilio
      const twilioResponse = await twilioService.initiateCall({
        to: contact.phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER || "",
        callDetailId: callDetail.id,
        humeConfigId: selectedConfig?.humeConfigId || process.env.HUME_CONFIG_ID || "",
        humeApiKey: process.env.HUME_API_KEY || "",
        recordingEnabled: true,
      })

      console.log(twilioResponse)

      if (!twilioResponse.success) {
        // Update call detail status to failed
        await db
          .update(callDetails)
          .set({
            status: "failed",
            notes: `Failed to initiate call: ${twilioResponse.error}`,
          })
          .where(eq(callDetails.id, callDetail.id))

        return {
          contactId: contact.id,
          callDetailId: callDetail.id,
          success: false,
          error: twilioResponse.error,
        }
      }

      // Update call detail with Twilio SID
      await db
        .update(callDetails)
        .set({
          twilioSid: twilioResponse.sid,
          status: twilioResponse.status,
          startTime: new Date(),
        })
        .where(eq(callDetails.id, callDetail.id))

      return {
        contactId: contact.id,
        callDetailId: callDetail.id,
        success: true,
        twilioSid: twilioResponse.sid,
        status: twilioResponse.status,
      }
    })

    const callDetailsResults = await Promise.all(callDetailsPromises)

    // Check if any calls failed to initiate
    const failedCalls = callDetailsResults.filter((result) => !result.success)
    if (failedCalls.length === callDetailsResults.length) {
      // All calls failed, update call record status to failed
      await db
        .update(callRecords)
        .set({
          status: "failed",
          endTime: new Date(),
        })
        .where(eq(callRecords.id, callRecord.id))

      return NextResponse.json(
        {
          success: false,
          callRecordId: callRecord.id,
          error: "All calls failed to initiate",
          details: callDetailsResults,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      callRecordId: callRecord.id,
      details: callDetailsResults,
    })
  } catch (error) {
    console.error("Error initiating calls:", error)
    return NextResponse.json({ error: "Failed to initiate calls" }, { status: 500 })
  }
}
