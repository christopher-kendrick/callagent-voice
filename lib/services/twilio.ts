import twilio from "twilio"

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export interface CallParams {
  to: string
  from: string
  webhookUrl: string
  statusCallback?: string
  recordingEnabled?: boolean
}

export const twilioService = {
  // Initiate a call
  initiateCall: async (params: CallParams) => {
    try {
      const call = await client.calls.create({
        to: params.to,
        from: params.from,
        url: params.webhookUrl,
        statusCallback: params.statusCallback,
        record: params.recordingEnabled ? "record-from-answer" : "do-not-record",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
      })

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
      }
    } catch (error) {
      console.error("Error initiating Twilio call:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  // Get call status
  getCallStatus: async (callSid: string) => {
    try {
      const call = await client.calls(callSid).fetch()
      return {
        success: true,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
      }
    } catch (error) {
      console.error("Error getting Twilio call status:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },
}
