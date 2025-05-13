import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { prompts } from "@/lib/db/schema"
import { authOptions } from "@/auth"
import { and, eq } from "drizzle-orm"
import { HumeClient } from "hume"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const promptId = Number.parseInt(params.id)
    if (isNaN(promptId)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 })
    }

    const prompt = await db.query.prompts.findFirst({
      where: (prompts, { and, eq }) => and(eq(prompts.id, promptId), eq(prompts.userId, session.user.id)),
    })

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error("Error fetching prompt:", error)
    return NextResponse.json({ error: "Failed to fetch prompt" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const promptId = Number.parseInt(params.id)
    if (isNaN(promptId)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 })
    }

    const { name, text } = await request.json()

    if (!name || !text) {
      return NextResponse.json({ error: "Name and text are required" }, { status: 400 })
    }

    // Check if prompt exists and belongs to user
    const existingPrompt = await db.query.prompts.findFirst({
      where: (prompts, { and, eq }) => and(eq(prompts.id, promptId), eq(prompts.userId, session.user.id)),
    })

    if (!existingPrompt) {
      return NextResponse.json({ error: "Prompt not found or not authorized" }, { status: 404 })
    }

    // Update in Hume AI if we have a Hume prompt ID
    let humePromptId = existingPrompt.humePromptId
    let humeError = null

    if (humePromptId) {
      try {
        const client = new HumeClient({ apiKey: process.env.HUME_API_KEY || "" })
        await client.empathicVoice.prompts.updatePrompt(humePromptId, {
          name,
          text,
        })
      } catch (error) {
        console.error("Error updating prompt in Hume AI:", error)
        humeError = error instanceof Error ? error.message : "Unknown error"
      }
    } else {
      // If no Hume ID exists, try to create one
      try {
        const client = new HumeClient({ apiKey: process.env.HUME_API_KEY || "" })
        const humeResponse = await client.empathicVoice.prompts.createPrompt({
          name,
          text,
        })
        humePromptId = humeResponse.id
      } catch (error) {
        console.error("Error creating prompt in Hume AI:", error)
        humeError = error instanceof Error ? error.message : "Unknown error"
      }
    }

    // Update in database
    const [updatedPrompt] = await db
      .update(prompts)
      .set({
        name,
        text,
        humePromptId,
        updatedAt: new Date(),
      })
      .where(and(eq(prompts.id, promptId), eq(prompts.userId, session.user.id)))
      .returning()

    if (!updatedPrompt) {
      return NextResponse.json({ error: "Failed to update prompt" }, { status: 500 })
    }

    return NextResponse.json({
      prompt: updatedPrompt,
      message: humeError ? "Prompt updated in database only (Hume API error)" : "Prompt updated successfully",
      humeError,
    })
  } catch (error) {
    console.error("Error updating prompt:", error)
    return NextResponse.json({ error: "Failed to update prompt" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const promptId = Number.parseInt(params.id)
    if (isNaN(promptId)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 })
    }

    // Check if prompt exists and belongs to user
    const existingPrompt = await db.query.prompts.findFirst({
      where: (prompts, { and, eq }) => and(eq(prompts.id, promptId), eq(prompts.userId, session.user.id)),
    })

    if (!existingPrompt) {
      return NextResponse.json({ error: "Prompt not found or not authorized" }, { status: 404 })
    }

    // Delete from Hume AI if we have a Hume prompt ID
    let humeError = null
    if (existingPrompt.humePromptId) {
      try {
        const client = new HumeClient({ apiKey: process.env.HUME_API_KEY || "" })
        await client.empathicVoice.prompts.deletePrompt(existingPrompt.humePromptId)
      } catch (error) {
        console.error("Error deleting prompt from Hume AI:", error)
        humeError = error instanceof Error ? error.message : "Unknown error"
      }
    }

    // Delete from database
    await db.delete(prompts).where(and(eq(prompts.id, promptId), eq(prompts.userId, session.user.id)))

    return NextResponse.json({
      message: humeError ? "Prompt deleted from database only (Hume API error)" : "Prompt deleted successfully",
      humeError,
    })
  } catch (error) {
    console.error("Error deleting prompt:", error)
    return NextResponse.json({ error: "Failed to delete prompt" }, { status: 500 })
  }
}
