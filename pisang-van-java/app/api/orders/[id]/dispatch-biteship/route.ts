import { type NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { createBiteshipOrder } from '@/src/services/biteship.service'
import { hasValidSameOriginHeaders, requireCheckoutActor } from '@/src/services/checkout.service'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const actor = await requireCheckoutActor()
  if (actor === null) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'KITCHEN', 'CASHIER'] as const
  if (!actor || !STAFF_ROLES.includes(actor.role as (typeof STAFF_ROLES)[number])) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  if (!(await hasValidSameOriginHeaders())) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await createBiteshipOrder(id)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Gagal memicu pengiriman Biteship' },
        { status: 400 }
      )
    }
    await logAudit('DISPATCH_BITESHIP', 'Order', id, {
      biteshipOrderId: result.data?.biteshipOrderId,
      waybillId: result.data?.waybillId
    })

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('[BITESHIP DISPATCH ERROR] Failed to dispatch order:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
