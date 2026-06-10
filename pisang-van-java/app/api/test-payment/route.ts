import { NextResponse } from 'next/server'
import { generateSnapToken } from '@/src/features/payment/service'

export async function GET() {
  return NextResponse.json({ success: true, message: 'payment service loaded successfully', typeOfTokenFn: typeof generateSnapToken })
}
