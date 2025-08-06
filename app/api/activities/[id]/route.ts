import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const activityId = params.id
    const { name, description, start_time, end_time, user_id } = await request.json() // Get user_id from body

    if (!name || !start_time || !user_id) {
      return NextResponse.json({ error: "Activity name, start time, and user ID are required" }, { status: 400 })
    }

    const startTime = new Date(start_time)
    const endTime = end_time ? new Date(end_time) : new Date()
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    const updatedActivity = await sql`
      UPDATE activities 
      SET name = ${name}, 
          description = ${description || null}, 
          start_time = ${startTime.toISOString()}, 
          end_time = ${endTime.toISOString()}, 
          duration = ${duration},
          updated_at = NOW()
      WHERE id = ${activityId} AND user_id = ${user_id}
      RETURNING *
    `

    if (updatedActivity.length === 0) {
      return NextResponse.json({ error: "Activity not found or not owned by user" }, { status: 404 })
    }

    return NextResponse.json(updatedActivity[0])
  } catch (error: any) {
    console.error("Error updating activity:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const activityId = params.id
    const { user_id } = await request.json() // Get user_id from body

    if (!user_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const deletedActivity = await sql`
      DELETE FROM activities 
      WHERE id = ${activityId} AND user_id = ${user_id}
      RETURNING *
    `

    if (deletedActivity.length === 0) {
      return NextResponse.json({ error: "Activity not found or not owned by user" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting activity:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
