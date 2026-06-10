import { NextResponse } from 'next/server'
import { requireCheckoutActor } from '@/src/features/checkout/service'

export async function GET() {
  return NextResponse.json({ success: true, message: 'checkout service loaded successfully', typeOfActorFn: typeof requireCheckoutActor })
}
