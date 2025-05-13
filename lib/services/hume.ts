import { HumeClient } from "hume"

interface CreatePromptParams {
  name: string
  text: string
}

interface UpdatePromptParams extends CreatePromptParams {
  promptId: string
}

export const humeService = {
  getClient: () => {
    return new HumeClient({
      apiKey: process.env.HUME_API_KEY || "",
    })
  },

  createPrompt: async (params: CreatePromptParams) => {
    try {
      const client = humeService.getClient()
      const response = await client.empathicVoice.prompts.createPrompt({
        name: params.name,
        text: params.text,
      })

      return {
        success: true,
        promptId: response.id,
        data: response,
      }
    } catch (error) {
      console.error("Error creating Hume prompt:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  getPrompts: async () => {
    try {
      const client = humeService.getClient()
      const response = await client.empathicVoice.prompts.listPrompts()

      return {
        success: true,
        prompts: response.prompts,
      }
    } catch (error) {
      console.error("Error fetching Hume prompts:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  getPrompt: async (promptId: string) => {
    try {
      const client = humeService.getClient()
      const response = await client.empathicVoice.prompts.getPrompt(promptId)

      return {
        success: true,
        prompt: response,
      }
    } catch (error) {
      console.error(`Error fetching Hume prompt ${promptId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  updatePrompt: async (params: UpdatePromptParams) => {
    try {
      const client = humeService.getClient()
      const response = await client.empathicVoice.prompts.updatePrompt(params.promptId, {
        name: params.name,
        text: params.text,
      })

      return {
        success: true,
        data: response,
      }
    } catch (error) {
      console.error(`Error updating Hume prompt ${params.promptId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },

  deletePrompt: async (promptId: string) => {
    try {
      const client = humeService.getClient()
      await client.empathicVoice.prompts.deletePrompt(promptId)

      return {
        success: true,
      }
    } catch (error) {
      console.error(`Error deleting Hume prompt ${promptId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },
}
