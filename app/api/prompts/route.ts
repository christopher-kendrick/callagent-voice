import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { prompts } from "@/lib/db/schema"
import { authOptions } from "@/auth"
import { eq } from "drizzle-orm"
import { HumeClient } from "hume"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userPrompts = await db.query.prompts.findMany({
      where: eq(prompts.userId, session.user.id),
      orderBy: (prompts, { desc }) => [desc(prompts.createdAt)],
    })

    return NextResponse.json({ prompts: userPrompts })
  } catch (error) {
    console.error("Error fetching prompts:", error)
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, text } = await request.json()

    if (!name || !text) {
      return NextResponse.json({ error: "Name and text are required" }, { status: 400 })
    }

    // Create prompt in Hume AI
    try {
      const client = new HumeClient({ apiKey: process.env.HUME_API_KEY || "" })
      const humeResponse = await client.empathicVoice.prompts.createPrompt({
        name,
        text,
      })

      // Create prompt in database
      const [prompt] = await db
        .insert(prompts)
        .values({
          userId: session.user.id,
          name,
          text,
          humePromptId: humeResponse.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      return NextResponse.json({
        prompt,
        message: "Prompt created successfully",
      })
    } catch (humeError) {
      console.error("Error creating prompt in Hume AI:", humeError)

      // Still create in database but without Hume ID
      const [prompt] = await db
        .insert(prompts)
        .values({
          userId: session.user.id,
          name,
          text,
          humePromptId: null, // No Hume ID since creation failed
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      return NextResponse.json(
        {
          prompt,
          message: "Prompt created in database only (Hume API error)",
          humeError: humeError instanceof Error ? humeError.message : "Unknown error",
        },
        { status: 207 },
      ) // Partial success
    }
  } catch (error) {
    console.error("Error creating prompt:", error)
    return NextResponse.json({ error: "Failed to create prompt" }, { status: 500 })
  }
}
