import { NextResponse } from 'next/server'
import { redis } from '@/lib/upstash'

export async function GET() {
  return NextResponse.json({ success: true, message: 'upstash loaded successfully', typeOfRedis: typeof redis })
}
