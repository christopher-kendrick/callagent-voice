import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function GET(request: NextRequest, { params }: { params: { recordingId: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const recordingId = params.recordingId
    if (!recordingId) {
      return new NextResponse("Recording ID is required", { status: 400 })
    }

    console.log(`Fetching recording: ${recordingId}`)

    // Initialize Twilio client
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    // Get recording URI
    const recording = await client.recordings(recordingId).fetch()
    if (!recording) {
      console.error(`Recording not found: ${recordingId}`)
      return new NextResponse("Recording not found", { status: 404 })
    }

    console.log(`Recording found: ${JSON.stringify(recording)}`)

    // Construct the media URL
    const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recordingId}`

    // Fetch the recording content with authentication
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
        ).toString("base64")}`,
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch recording: ${response.status} ${response.statusText}`)
      return new NextResponse(`Failed to fetch recording: ${response.statusText}`, {
        status: response.status,
      })
    }

    // Get the content type from the response
    const contentType = response.headers.get("content-type") || "audio/wav"

    // Get the recording data
    const recordingData = await response.arrayBuffer()

    // Return the recording data with the appropriate content type
    return new NextResponse(recordingData, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": recordingData.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error) {
    console.error("Error fetching recording:", error)
    return new NextResponse(`Error fetching recording: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500,
    })
  }
}
