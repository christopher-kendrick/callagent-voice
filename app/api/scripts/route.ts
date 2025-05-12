import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { scripts, type NewScript } from "@/lib/db/schema"
import { authOptions } from "@/auth"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userScripts = await db.query.scripts.findMany({
      where: eq(scripts.userId, session.user.id),
      orderBy: (scripts, { desc }) => [desc(scripts.createdAt)],
    })

    return NextResponse.json(userScripts)
  } catch (error) {
    console.error("Error fetching scripts:", error)
    return NextResponse.json({ error: "Failed to fetch scripts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const newScript: NewScript = {
      userId: session.user.id,
      title: body.title,
      content: body.content,
      isTemplate: body.isTemplate || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.insert(scripts).values(newScript).returning()

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating script:", error)
    return NextResponse.json({ error: "Failed to create script" }, { status: 500 })
  }
}
