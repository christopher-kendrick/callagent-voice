import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { callDetails, callRecords } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const callDetailId = formData.get("callDetailId")
    const callSid = formData.get("CallSid")
    const callStatus = formData.get("CallStatus")
    const callDuration = formData.get("CallDuration")
    const recordingUrl = formData.get("RecordingUrl")

    if (!callDetailId || !callSid || !callStatus) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const callDetailIdNum = Number.parseInt(callDetailId as string)

    if (isNaN(callDetailIdNum)) {
      return NextResponse.json({ error: "Invalid call detail ID" }, { status: 400 })
    }

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
      })

      if (callDetail) {
        const allCallDetails = await db.query.callDetails.findMany({
          where: eq(callDetails.callRecordId, callDetail.callRecordId),
        })

        const allCompleted = allCallDetails.every((detail) =>
          ["completed", "failed", "busy", "no-answer"].includes(detail.status),
        )

        if (allCompleted) {
          await db
            .update(callRecords)
            .set({
              status: "completed",
              endTime: new Date(),
            })
            .where(eq(callRecords.id, callDetail.callRecordId))
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Twilio status callback:", error)
    return NextResponse.json({ error: "Failed to process status callback" }, { status: 500 })
  }
}
