import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id
    const { name, role } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "User name is required" }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 })
    }

    const updatedUser = await sql`
      UPDATE users 
      SET name = ${name}, 
          role = ${role || "user"},
          updated_at = NOW()
      WHERE id = ${userId}
      RETURNING *
    `

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(updatedUser[0])
  } catch (error: any) {
    console.error("Error updating user:", error)
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 })
    }

    // Delete user (activities will be deleted automatically due to CASCADE)
    const deletedUser = await sql`
      DELETE FROM users 
      WHERE id = ${userId}
      RETURNING *
    `

    if (deletedUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting user:", error)
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
