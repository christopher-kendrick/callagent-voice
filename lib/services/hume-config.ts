import { HumeClient } from "hume"

// Initialize Hume client
const getHumeClient = () => {
  return new HumeClient({ apiKey: process.env.HUME_API_KEY || "" })
}

export interface CreateConfigParams {
  name: string
  promptId: string
  promptVersion?: number
  eviVersion?: string
  voiceProvider?: string
  voiceName: string
  modelProvider?: string
  modelResource?: string
  temperature?: number
  onNewChatEnabled?: boolean
  onNewChatText?: string
  onInactivityTimeoutEnabled?: boolean
  onInactivityTimeoutText?: string
  onMaxDurationTimeoutEnabled?: boolean
  onMaxDurationTimeoutText?: string
}

export interface UpdateConfigParams extends CreateConfigParams {
  humeConfigId: string
}

export const humeConfigService = {
  // Create a new config
  createConfig: async (params: CreateConfigParams) => {
    try {
      const client = getHumeClient()

      // Prepare the config object
      const configData = {
        name: params.name,
        prompt: {
          id: params.promptId,
          version: params.promptVersion || 0,
        },
        eviVersion: params.eviVersion || "2",
        voice: {
          provider: params.voiceProvider || "HUME_AI",
          name: params.voiceName,
        },
        languageModel: {
          modelProvider: params.modelProvider || "ANTHROPIC",
          modelResource: params.modelResource || "claude-3-7-sonnet-latest",
          temperature: params.temperature || 1,
        },
        eventMessages: {
          onNewChat: {
            enabled: params.onNewChatEnabled || false,
            text: params.onNewChatText || "",
          },
          onInactivityTimeout: {
            enabled: params.onInactivityTimeoutEnabled || false,
            text: params.onInactivityTimeoutText || "",
          },
          onMaxDurationTimeout: {
            enabled: params.onMaxDurationTimeoutEnabled || false,
            text: params.onMaxDurationTimeoutText || "",
          },
        },
      }

      // Create the config
      const response = await client.empathicVoice.configs.createConfig(configData)

      return {
        success: true,
        configId: response.id,
        config: configData,
      }
    } catch (error) {
      console.error("Error creating Hume config:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  // Get a config
  getConfig: async (configId: string) => {
    try {
      const client = getHumeClient()
      const config = await client.empathicVoice.configs.getConfig(configId)

      return {
        success: true,
        config,
      }
    } catch (error) {
      console.error("Error getting Hume config:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  // Update a config - Updated to use createConfigVersion
  updateConfig: async (params: UpdateConfigParams) => {
    try {
      const client = getHumeClient()

      // Prepare the config version object
      const configVersionData = {
        versionDescription: `Updated version of ${params.name}`,
        eviVersion: params.eviVersion || "2",
        prompt: {
          id: params.promptId,
          version: params.promptVersion || 0,
        },
        voice: {
          provider: params.voiceProvider || "HUME_AI",
          name: params.voiceName,
        },
        languageModel: {
          modelProvider: params.modelProvider || "ANTHROPIC",
          modelResource: params.modelResource || "claude-3-7-sonnet-latest",
          temperature: params.temperature || 1,
        },
        ellmModel: {
          allowShortResponses: true,
        },
        eventMessages: {
          onNewChat: {
            enabled: params.onNewChatEnabled || false,
            text: params.onNewChatText || "",
          },
          onInactivityTimeout: {
            enabled: params.onInactivityTimeoutEnabled || false,
            text: params.onInactivityTimeoutText || "",
          },
          onMaxDurationTimeout: {
            enabled: params.onMaxDurationTimeoutEnabled || false,
            text: params.onMaxDurationTimeoutText || "",
          },
        },
      }

      // Create a new version of the config
      const response = await client.empathicVoice.configs.createConfigVersion(params.humeConfigId, configVersionData)

      return {
        success: true,
        configId: params.humeConfigId,
        config: {
          name: params.name,
          ...configVersionData,
        },
      }
    } catch (error) {
      console.error("Error updating Hume config:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  // Delete a config
  deleteConfig: async (configId: string) => {
    try {
      const client = getHumeClient()
      await client.empathicVoice.configs.deleteConfig(configId)

      return {
        success: true,
      }
    } catch (error) {
      console.error("Error deleting Hume config:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  // List voices
  listVoices: async () => {
    try {
      const client = getHumeClient()
      const response = await client.tts.voices.list({
        provider: "HUME_AI",
      })

      const voices = []
      for await (const voice of response) {
        voices.push(voice)
      }

      return {
        success: true,
        voices,
      }
    } catch (error) {
      console.error("Error listing Hume voices:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },
}
