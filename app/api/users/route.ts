import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const users = await sql`
      SELECT 
        id,
        name,
        role,
        created_at,
        updated_at
      FROM users 
      ORDER BY name
    `

    // Ensure all data is properly formatted and validated
    const formattedUsers = users.map((user) => {
      // Validate required fields
      if (!user.id || !user.name || !user.role) {
        throw new Error(`Invalid user data: missing required fields for user ${user.id || "unknown"}`)
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(user.id)) {
        throw new Error(`Invalid UUID format for user: ${user.id}`)
      }

      // Validate role
      if (!["user", "admin"].includes(user.role)) {
        throw new Error(`Invalid role for user ${user.id}: ${user.role}`)
      }

      return {
        id: user.id.toString(),
        name: user.name.toString().trim(),
        role: user.role as "user" | "admin",
        created_at: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString(),
        updated_at: user.updated_at ? new Date(user.updated_at).toISOString() : new Date().toISOString(),
      }
    })

    return NextResponse.json(formattedUsers)
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message || "Failed to fetch users",
        code: error.code || "UNKNOWN_ERROR",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, role = "user" } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "User name is required" }, { status: 400 })
    }

    const newUser = await sql`
      INSERT INTO users (name, role)
      VALUES (${name}, ${role})
      ON CONFLICT (name) DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json(newUser[0])
  } catch (error: any) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
