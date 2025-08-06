import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const activityId = params.id
    const { user_id } = await request.json() // Get user_id from body

    if (!user_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Ukonči aktivitu, ověř uživatele
    const stoppedActivity = await sql`
      UPDATE activities 
      SET end_time = NOW(), 
          duration = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER,
          updated_at = NOW()
      WHERE id = ${activityId} AND user_id = ${user_id}
      RETURNING *
    `

    if (stoppedActivity.length === 0) {
      return NextResponse.json({ error: "Activity not found or not owned by user" }, { status: 404 })
    }

    return NextResponse.json(stoppedActivity[0])
  } catch (error: any) {
    console.error("Error stopping activity:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
