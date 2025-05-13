import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { callDetails, callRecords, type NewCallRecord } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: Request) {
  try {
    // Get the URL to extract query parameters
    const url = new URL(request.url)
    const callDetailId = url.searchParams.get("callDetailId")
    
    // Get form data for Twilio parameters
    const formData = await request.formData()
    const callSid = formData.get("CallSid")
    const callStatus = formData.get("CallStatus")
    const callDuration = formData.get("CallDuration")
    const recordingUrl = formData.get("RecordingUrl")
    
    console.log("Status callback received:", {
      callDetailId,
      callSid,
      callStatus,
      callDuration,
      recordingUrl,
      url: request.url
    })

    if (!callDetailId) {
      console.error("Missing callDetailId in query parameters:", url.toString())
      return NextResponse.json({ error: "Missing required parameters callDetailId" }, { status: 400 })
    }
    
    if (!callSid) {
      return NextResponse.json({ error: "Missing required parameters callSid" }, { status: 400 })
    }
    
    if (!callStatus) {
      return NextResponse.json({ error: "Missing required parameters callStatus" }, { status: 400 })
    }

    const callDetailIdNum = Number.parseInt(callDetailId as string)

    if (isNaN(callDetailIdNum)) {
      return NextResponse.json({ error: "Invalid call detail ID" }, { status: 400 })
    }

    console.log(`Updating call detail ${callDetailIdNum} with status ${callStatus}`)
    
    // Update call detail
    await db
      .update(callDetails)
      .set({
        status: callStatus as string,
        duration: callDuration ? Number.parseInt(callDuration as string) : undefined,
        recordingUrl: (recordingUrl as string) || undefined,
        endTime: ["completed", "failed", "busy", "no-answer"].includes(callStatus as string) ? new Date() : undefined,
      })
      .where(eq(callDetails.id, callDetailIdNum))

    // If call is completed, check if all calls in the record are completed
    if (["completed", "failed", "busy", "no-answer"].includes(callStatus as string)) {
      const callDetail = await db.query.callDetails.findFirst({
        where: eq(callDetails.id, callDetailIdNum),
        with: {
          callRecord: true,
          contact: true,
        },
      })

      if (callDetail) {
        const allCallDetails = await db.query.callDetails.findMany({
          where: eq(callDetails.callRecordId, callDetail.callRecordId),
        })

        const allCompleted = allCallDetails.every((detail) =>
          ["completed", "failed", "busy", "no-answer"].includes(detail.status),
        )

        if (allCompleted) {
          // Update the original call record as completed
          await db
            .update(callRecords)
            .set({
              status: "completed",
              endTime: new Date(),
            })
            .where(eq(callRecords.id, callDetail.callRecordId))

          // Create a new call record with completed status
          if (callDetail.callRecord && callDetail.callRecord.userId && callDetail.callRecord.scriptId) {
            const newCallRecord: NewCallRecord = {
              userId: callDetail.callRecord.userId,
              scriptId: callDetail.callRecord.scriptId,
              status: "completed",
              startTime: new Date(),
              endTime: new Date(),
              createdAt: new Date(),
              metadata: {
                originalCallRecordId: callDetail.callRecordId,
                contactId: callDetail.contactId,
                contactName: callDetail.contact?.name || "Unknown",
                callDuration: callDuration ? Number.parseInt(callDuration as string) : 0,
                callStatus: callStatus as string,
                twilioSid: callSid as string,
                recordingUrl: (recordingUrl as string) || null,
              },
            }

            await db.insert(callRecords).values(newCallRecord)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Twilio status callback:", error)
    return NextResponse.json({ error: "Failed to process status callback" }, { status: 500 })
  }
}
