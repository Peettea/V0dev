import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const userStats = await sql`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        COUNT(a.id) as total_activities,
        COALESCE(SUM(a.duration), 0) as total_duration,
        COALESCE(AVG(a.duration), 0) as avg_duration,
        MAX(a.start_time) as last_activity
      FROM users u
      LEFT JOIN activities a ON u.id = a.user_id
      GROUP BY u.id, u.name
      ORDER BY u.name
    `

    // Validate and format the data
    const formattedStats = userStats.map((stat) => {
      // Validate required fields
      if (!stat.user_id || !stat.user_name) {
        throw new Error(`Invalid user stats data: missing required fields`)
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(stat.user_id)) {
        throw new Error(`Invalid UUID format in user stats: ${stat.user_id}`)
      }

      return {
        user_id: stat.user_id.toString(),
        user_name: stat.user_name.toString().trim(),
        total_activities: Number.parseInt(stat.total_activities) || 0,
        total_duration: Number.parseInt(stat.total_duration) || 0,
        avg_duration: Math.round(Number.parseFloat(stat.avg_duration) || 0),
        last_activity: stat.last_activity ? new Date(stat.last_activity).toISOString() : null,
      }
    })

    return NextResponse.json(formattedStats)
  } catch (error: any) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message || "Failed to fetch user statistics",
        code: error.code || "UNKNOWN_ERROR",
      },
      { status: 500 },
    )
  }
}
