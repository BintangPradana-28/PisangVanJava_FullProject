/**
 * @vitest-environment node
 */
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  requireCheckoutActor: vi.fn(),
  authorizeOrderReadForActor: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique
    }
  }
}))

vi.mock('@/src/services/checkout.service', () => ({
  requireCheckoutActor: mocks.requireCheckoutActor,
  authorizeOrderReadForActor: mocks.authorizeOrderReadForActor
}))

import { GET } from './route'

const orderId = 'cmq1toxc100099kd2co0vb7ln'

function trackRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/orders/track${query}`)
}

describe('GET /api/orders/track', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorizeOrderReadForActor.mockImplementation(
      (order: { userId: string | null }, actor: { userId: string; role: string } | null) => {
        if (order.userId === null) return { allowed: true }
        if (actor === null) return { allowed: false, statusCode: 401 }
        if (
          order.userId === actor.userId ||
          ['ADMIN', 'SUPER_ADMIN', 'KITCHEN', 'CASHIER'].includes(actor.role)
        ) {
          return { allowed: true }
        }
        return { allowed: false, statusCode: 403 }
      }
    )
  })

  it('allows guest orderId tracking for guest orders', async () => {
    mocks.requireCheckoutActor.mockResolvedValue(null)
    mocks.findUnique.mockResolvedValue({
      id: orderId,
      status: 'PROCESSING',
      confirmedAt: null,
      updatedAt: new Date('2026-06-16T01:00:00.000Z'),
      userId: null,
      deliveryMethod: 'PICKUP'
    })

    const response = await GET(trackRequest(`?orderId=${orderId}`))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      data: {
        id: orderId,
        status: 'PROCESSING',
        deliveryMethod: 'PICKUP'
      }
    })
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: orderId } })
    )
  })

  it('rejects unauthenticated phone tracking', async () => {
    mocks.requireCheckoutActor.mockResolvedValue(null)

    const response = await GET(trackRequest('?phone=081234567890'))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ success: false, error: 'Unauthorized' })
    expect(mocks.findMany).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated tracking of registered member orders', async () => {
    mocks.requireCheckoutActor.mockResolvedValue(null)
    mocks.findUnique.mockResolvedValue({
      id: orderId,
      status: 'PROCESSING',
      confirmedAt: null,
      updatedAt: new Date('2026-06-16T01:00:00.000Z'),
      userId: 'user-123',
      deliveryMethod: 'PICKUP'
    })

    const response = await GET(trackRequest(`?orderId=${orderId}`))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('forbids registered members from tracking another member order', async () => {
    mocks.requireCheckoutActor.mockResolvedValue({
      userId: 'other-user',
      role: 'CUSTOMER',
      email: 'other@test.com'
    })
    mocks.findUnique.mockResolvedValue({
      id: orderId,
      status: 'PROCESSING',
      confirmedAt: null,
      updatedAt: new Date('2026-06-16T01:00:00.000Z'),
      userId: 'user-123',
      deliveryMethod: 'PICKUP'
    })

    const response = await GET(trackRequest(`?orderId=${orderId}`))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ success: false, error: 'Forbidden' })
  })
})
