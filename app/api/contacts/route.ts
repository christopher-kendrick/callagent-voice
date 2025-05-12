import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { contacts, type NewContact } from "@/lib/db/schema"
import { authOptions } from "@/auth"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userContacts = await db.query.contacts.findMany({
      where: eq(contacts.userId, session.user.id),
      orderBy: (contacts, { desc }) => [desc(contacts.createdAt)],
    })

    return NextResponse.json(userContacts)
  } catch (error) {
    console.error("Error fetching contacts:", error)
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const newContact: NewContact = {
      userId: session.user.id,
      name: body.name,
      phoneNumber: body.phoneNumber,
      email: body.email || null,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.insert(contacts).values(newContact).returning()

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error creating contact:", error)
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 })
  }
}
