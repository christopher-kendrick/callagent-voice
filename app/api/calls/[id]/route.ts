import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/auth"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const callRecordId = Number.parseInt(params.id)

    if (isNaN(callRecordId)) {
      return NextResponse.json({ error: "Invalid call record ID" }, { status: 400 })
    }

    const callRecord = await db.query.callRecords.findFirst({
      where: (callRecords, { eq, and }) =>
        and(eq(callRecords.id, callRecordId), eq(callRecords.userId, session.user.id)),
      with: {
        script: true,
        callDetails: {
          with: {
            contact: true,
          },
        },
      },
    })

    if (!callRecord) {
      return NextResponse.json({ error: "Call record not found" }, { status: 404 })
    }

    return NextResponse.json(callRecord)
  } catch (error) {
    console.error("Error fetching call record:", error)
    return NextResponse.json({ error: "Failed to fetch call record" }, { status: 500 })
  }
}
