import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 })
    }

    // First check if user exists
    const userExists = await sql`
      SELECT id FROM users WHERE id = ${userId} LIMIT 1
    `

    if (userExists.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get current activity
    const currentActivity = await sql`
      SELECT 
        id,
        name,
        description,
        start_time,
        end_time,
        duration,
        user_id,
        created_at,
        updated_at
      FROM activities 
      WHERE user_id = ${userId} AND end_time IS NULL
      ORDER BY start_time DESC
      LIMIT 1
    `

    if (currentActivity.length === 0) {
      return NextResponse.json(null)
    }

    // Ensure dates are properly formatted
    const activity = currentActivity[0]
    return NextResponse.json({
      ...activity,
      start_time: activity.start_time ? new Date(activity.start_time).toISOString() : null,
      end_time: activity.end_time ? new Date(activity.end_time).toISOString() : null,
      created_at: activity.created_at ? new Date(activity.created_at).toISOString() : null,
      updated_at: activity.updated_at ? new Date(activity.updated_at).toISOString() : null,
    })
  } catch (error: any) {
    console.error("Error fetching current activity:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        code: error.code || "UNKNOWN_ERROR",
      },
      { status: 500 },
    )
  }
}
