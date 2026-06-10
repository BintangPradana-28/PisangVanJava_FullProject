import { NextResponse } from 'next/server'
import { auth } from '@/src/auth'

export async function GET() {
  return NextResponse.json({ success: true, message: 'auth loaded successfully', typeOfAuth: typeof auth })
}
