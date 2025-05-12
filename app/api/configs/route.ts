import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { configs } from "@/lib/db/schema"
import { authOptions } from "@/auth"
import { humeConfigService } from "@/lib/services/hume-config"
import { eq } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all configs for the user
    const userConfigs = await db.query.configs.findMany({
      where: eq(configs.userId, session.user.id),
      orderBy: (configs, { desc }) => [desc(configs.createdAt)],
    })

    return NextResponse.json({ configs: userConfigs })
  } catch (error) {
    console.error("Error fetching configs:", error)
    return NextResponse.json({ error: "Failed to fetch configs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      promptId,
      promptVersion = 0,
      eviVersion = "2",
      voiceProvider = "HUME_AI",
      voiceName,
      modelProvider = "ANTHROPIC",
      modelResource = "claude-3-7-sonnet-latest",
      temperature = 1,
      onNewChatEnabled = false,
      onNewChatText = "",
      onInactivityTimeoutEnabled = false,
      onInactivityTimeoutText = "",
      onMaxDurationTimeoutEnabled = false,
      onMaxDurationTimeoutText = "",
    } = body

    if (!name || !promptId || !voiceName) {
      return NextResponse.json({ error: "Name, prompt ID, and voice name are required" }, { status: 400 })
    }

    // Verify prompt exists and belongs to user
    const prompt = await db.query.prompts.findFirst({
      where: (prompts, { and, eq }) => and(eq(prompts.humePromptId, promptId), eq(prompts.userId, session.user.id)),
    })

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found or not authorized" }, { status: 404 })
    }

    // Create config in Hume
    const humeResponse = await humeConfigService.createConfig({
      name,
      promptId,
      promptVersion,
      eviVersion,
      voiceProvider,
      voiceName,
      modelProvider,
      modelResource,
      temperature,
      onNewChatEnabled,
      onNewChatText,
      onInactivityTimeoutEnabled,
      onInactivityTimeoutText,
      onMaxDurationTimeoutEnabled,
      onMaxDurationTimeoutText,
    })

    if (!humeResponse.success) {
      return NextResponse.json({ error: humeResponse.error || "Failed to create config in Hume" }, { status: 500 })
    }

    // Create config in database
    const [config] = await db
      .insert(configs)
      .values({
        userId: session.user.id,
        name,
        humeConfigId: humeResponse.configId,
        promptId,
        promptVersion,
        eviVersion,
        voiceProvider,
        voiceName,
        modelProvider,
        modelResource,
        temperature,
        onNewChatEnabled,
        onNewChatText,
        onInactivityTimeoutEnabled,
        onInactivityTimeoutText,
        onMaxDurationTimeoutEnabled,
        onMaxDurationTimeoutText,
        rawConfig: humeResponse.config,
      })
      .returning()

    return NextResponse.json({ config })
  } catch (error) {
    console.error("Error creating config:", error)
    return NextResponse.json({ error: "Failed to create config" }, { status: 500 })
  }
}
