import twilio from "twilio"

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const client = twilio(accountSid, authToken)

interface InitiateCallParams {
  to: string
  from: string
  callDetailId: number
  humeConfigId: string
  humeApiKey: string
  recordingEnabled?: boolean
}

interface JoinConferenceParams {
  conferenceName: string
  from: string
  to: string
  muted?: boolean
}

const twilioService = {
  initiateCall: async (params: InitiateCallParams) => {
    try {
      // Construct the Hume AI webhook URL with config_id
      const humeWebhookUrl = `https://api.hume.ai/v0/evi/twilio?config_id=${params.humeConfigId}&api_key=${params.humeApiKey}`

      // Construct the status callback URL with callDetailId as a query parameter
      const statusCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status-callback?callDetailId=${params.callDetailId}`

      console.log(`Initiating call with Hume config ID: ${params.humeConfigId}`)

      // Make the call
      const call = await client.calls.create({
        to: params.to,
        from: params.from,
        url: humeWebhookUrl,
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        record: params.recordingEnabled,
      })

      return {
        success: true,
        sid: call.sid,
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

  // Join a conference call
  joinConference: async (params: JoinConferenceParams) => {
    try {
      // Create TwiML for joining a conference
      const twiml = `
        <Response>
          <Dial>
            <Conference startConferenceOnEnter="false" endConferenceOnExit="false" muted="${params.muted ? "true" : "false"}">
              ${params.conferenceName}
            </Conference>
          </Dial>
        </Response>
      `

      // Create a call to join the conference
      const call = await client.calls.create({
        to: params.to,
        from: params.from,
        twiml: twiml,
      })

      return {
        success: true,
        sid: call.sid,
        status: call.status,
      }
    } catch (error) {
      console.error("Error joining conference:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  // Update an existing call to join a conference
  updateCallToJoinConference: async (callSid: string, conferenceName: string) => {
    try {
      // Update the call with TwiML to join a conference
      const call = await client.calls(callSid).update({
        twiml: `
          <Response>
            <Dial>
              <Conference startConferenceOnEnter="true" endConferenceOnExit="false">
                ${conferenceName}
              </Conference>
            </Dial>
          </Response>
        `,
      })

      return {
        success: true,
        sid: call.sid,
        status: call.status,
      }
    } catch (error) {
      console.error("Error updating call to join conference:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },
}

export default twilioService
