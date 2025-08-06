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

    query += " ORDER BY a.created_at DESC"

    const activities = await sql(query, params)

    // Vytvoř CSV obsah
    const csvHeader = "Uživatel,Aktivita,Popis,Začátek,Konec,Doba trvání (s)\n"
    const csvRows = activities
      .map((activity: any) => {
        const row = [
          activity.user_name || "Neznámý",
          activity.name,
          activity.description || "",
          activity.start_time,
          activity.end_time || "",
          activity.duration?.toString() || "0",
        ]
        return row.map((field) => `"${field}"`).join(",")
      })
      .join("\n")

    const csvContent = csvHeader + csvRows

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="aktivity_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("Error exporting data:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
