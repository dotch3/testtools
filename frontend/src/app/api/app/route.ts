import { NextResponse } from "next/server"
import { APP_CONFIG } from "@/lib/config"

export async function GET() {
  return NextResponse.json({
    name: APP_CONFIG.name,
    version: APP_CONFIG.version,
    description: APP_CONFIG.description,
  })
}
