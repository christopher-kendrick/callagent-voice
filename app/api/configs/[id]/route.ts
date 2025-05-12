import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { configs } from "@/lib/db/schema"
import { authOptions } from "@/auth"
import { humeConfigService } from "@/lib/services/hume-config"
import { eq, and } from "drizzle-orm"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Get config from database
    const config = await db.query.configs.findFirst({
      where: (configs, { and, eq }) => and(eq(configs.id, id), eq(configs.userId, session.user.id)),
    })

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error("Error fetching config:", error)
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Get config from database
    const existingConfig = await db.query.configs.findFirst({
      where: (configs, { and, eq }) => and(eq(configs.id, id), eq(configs.userId, session.user.id)),
    })

    if (!existingConfig) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
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

    // Update config in Hume
    const humeResponse = await humeConfigService.updateConfig({
      humeConfigId: existingConfig.humeConfigId || "",
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
      return NextResponse.json({ error: humeResponse.error || "Failed to update config in Hume" }, { status: 500 })
    }

    // Update config in database
    const [updatedConfig] = await db
      .update(configs)
      .set({
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
        rawConfig: humeResponse.config,
        updatedAt: new Date(),
      })
      .where(and(eq(configs.id, id), eq(configs.userId, session.user.id)))
      .returning()

    return NextResponse.json({ config: updatedConfig })
  } catch (error) {
    console.error("Error updating config:", error)
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Get config from database
    const config = await db.query.configs.findFirst({
      where: (configs, { and, eq }) => and(eq(configs.id, id), eq(configs.userId, session.user.id)),
    })

    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    // Delete config from Hume
    if (config.humeConfigId) {
      const humeResponse = await humeConfigService.deleteConfig(config.humeConfigId)

      if (!humeResponse.success) {
        console.error("Failed to delete config from Hume:", humeResponse.error)
        // Continue with database deletion even if Hume deletion fails
      }
    }

    // Delete config from database
    await db.delete(configs).where(and(eq(configs.id, id), eq(configs.userId, session.user.id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting config:", error)
    return NextResponse.json({ error: "Failed to delete config" }, { status: 500 })
  }
}
