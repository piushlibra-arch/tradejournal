import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    app: "MyTradeJournal Frontend",
    timestamp: new Date().toISOString(),
  })
}
