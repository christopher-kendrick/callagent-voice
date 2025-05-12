import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

// Hard-coded list of Hume AI voices
const HUME_VOICES = [
  { name: "ITO", gender: "Male", language: "English" },
  { name: "KORA", gender: "Female", language: "English" },
  { name: "DACHER", gender: "Male", language: "English" },
  { name: "AURA", gender: "Female", language: "English" },
  { name: "FINN", gender: "Male", language: "English" },
  { name: "WHIMSY", gender: "Female", language: "English" },
  { name: "STELLA", gender: "Female", language: "English" },
  { name: "SUNNY", gender: "Female", language: "English" },
]

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return the hard-coded list of voices
    return NextResponse.json({ voices: HUME_VOICES })
  } catch (error) {
    console.error("Error fetching voices:", error)
    return NextResponse.json({ error: "Failed to fetch voices" }, { status: 500 })
  }
}
