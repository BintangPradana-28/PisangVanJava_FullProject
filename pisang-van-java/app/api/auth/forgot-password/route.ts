import { type NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Endpoint ini telah dideviasi/deprecated. Silakan gunakan Server Action generateResetToken.'
    },
    { status: 410 }
  )
}
