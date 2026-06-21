/**
 * Intended path: app/api/orders/[id]/tip/route.ts (REPLACES current file)
 *
 * [FIX 1 — guest tipping] requireCheckoutActor() forced a login session;
 * Order.userId is nullable (prisma/schema.prisma — guest checkout is valid),
 * and the entire tracking flow this button lives on is a public masked link
 * with no login required to view (see page.tsx maskName/maskPhone). Gating
 * the tip action behind auth broke it for every guest customer — likely the
 * majority for a small business taking orders without forcing account
 * creation. Knowing `orderId` is already this feature's de-facto capability
 * token, same trust level as viewing the page itself — so tipping now uses
 * that same model instead of the stricter staff/owner-only one.
 *
 * Rate limit key changed from `actor.userId` to `orderId`, since there's no
 * reliable identity for an anonymous tipper — this still bounds abuse per
 * order (max 3 tip requests / 5 min / order) without needing a login.
 *
 * [FINDING, not fixed here] This endpoint only does `tipAmount: { increment }`
 * — there is no Midtrans/payment-gateway call anywhere in it. If tips are
 * meant to move real money, that's a separate, larger gap than auth. If the
 * tip is meant to just be a courier-facing "appreciation counter" backed by
 * cash collected in person, this is fine as-is. Worth confirming which one
 * this is intended to be before this goes further.
 */
import { OrderStatus } from '@prisma/client'
import { Ratelimit } from '@upstash/ratelimit'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

interface TipRouteContext {
  params: Promise<{
    id: string
  }>
}

const tipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '5 m'), // 3 tips per 5 minutes per ORDER (was: per user)
  analytics: true
})

const tipSchema = z
  .object({
    amount: z.number().finite().int().min(1000).max(1_000_000) // Rp 1.000 to Rp 1.000.000 — unchanged
  })
  .strict()

export async function POST(req: NextRequest, { params }: TipRouteContext) {
  const { id: orderId } = await params

  // 1. Rate limit by orderId — no actor identity exists for guest tippers.
  const { success: rateLimitOk } = await tipRateLimit.limit(`tip_${orderId}`)
  if (!rateLimitOk) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  // 2. Request Body Validation — unchanged
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsedBody = tipSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid tip amount. Must be between Rp 1.000 and Rp 1.000.000.' },
      { status: 400 }
    )
  }

  const { amount } = parsedBody.data

  try {
    // 3. Fetch order — REMOVED userId in select (no longer used for BOLA check)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true }
    })

    if (order === null) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // REMOVED: `if (order.userId !== actor.userId)` ownership check.
    // orderId itself is the capability token now — see file header.

    // 4. Lifecycle Guard — unchanged: only DELIVERED or COMPLETED orders can be tipped
    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.COMPLETED) {
      return NextResponse.json(
        { success: false, error: 'Tipping is only allowed for delivered or completed orders' },
        { status: 400 }
      )
    }

    // 5. Atomically update tip amount — unchanged
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        tipAmount: {
          increment: amount
        }
      },
      select: {
        id: true,
        tipAmount: true
      }
    })

    // 6. Audit log — `userId` field removed (no actor to attribute it to)
    await logAudit('ADD_TIP', 'Order', orderId, { amount, source: 'public_tracking_link' })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrder.id,
        tipAmount: updatedOrder.tipAmount
      }
    })
  } catch (error) {
    console.error('[SECURITY] Failed to add tip to order.', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
