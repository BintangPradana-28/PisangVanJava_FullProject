import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Correct relative path from app/api/test-checkout/route.ts to src/features/checkout/service
    const service = await import('../../../src/features/checkout/service')
    return NextResponse.json({
      success: true,
      message: 'checkout service loaded successfully',
      typeOfActorFn: typeof service.requireCheckoutActor
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || String(err),
      stack: err?.stack || null
    })
  }
}
