import fs from 'node:fs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    fs.appendFileSync('client-log.txt', `${new Date().toISOString()} ${JSON.stringify(body)}\n`)
    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json({ success: false })
  }
}
