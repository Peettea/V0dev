import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")

    let query = `
      SELECT a.*, u.name as user_name
      FROM activities a
      JOIN users u ON a.user_id = u.id
    `
    const conditions = []
    const params = []

    if (userId && userId !== "all") {
      conditions.push(`a.user_id = $${params.length + 1}`)
      params.push(userId)
    }

    if (dateFrom) {
      conditions.push(`a.start_time >= $${params.length + 1}`)
      params.push(new Date(dateFrom).toISOString())
    }

    if (dateTo) {
      conditions.push(`a.start_time <= $${params.length + 1}`)
      params.push(new Date(dateTo + "T23:59:59").toISOString())
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ")
    }

    query += " ORDER BY a.created_at DESC LIMIT 200"

    const activities = await sql(query, params)

    return NextResponse.json(activities)
  } catch (error: any) {
    console.error("Error fetching admin activities:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
