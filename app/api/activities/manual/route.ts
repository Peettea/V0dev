import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { name, description, start_time, end_time, user_id } = await request.json()

    if (!name || !start_time || !user_id) {
      return NextResponse.json({ error: "Activity name, start time, and user ID are required" }, { status: 400 })
    }

    const startTime = new Date(start_time)
    const endTime = end_time ? new Date(end_time) : new Date()
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    const newActivity = await sql`
      INSERT INTO activities (name, description, start_time, end_time, duration, user_id)
      VALUES (${name}, ${description || null}, ${startTime.toISOString()}, ${endTime.toISOString()}, ${duration}, ${user_id})
      RETURNING *
    `

    return NextResponse.json(newActivity[0])
  } catch (error: any) {
    console.error("Error creating manual activity:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
