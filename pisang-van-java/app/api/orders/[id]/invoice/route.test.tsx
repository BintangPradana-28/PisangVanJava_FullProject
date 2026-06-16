/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createBucket: vi.fn(),
  download: vi.fn(),
  findUnique: vi.fn(),
  from: vi.fn(),
  renderToStream: vi.fn(),
  requireCheckoutActor: vi.fn(),
  authorizeOrderReadForActor: vi.fn(),
  upload: vi.fn()
}))

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: unknown }) => children,
  Page: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  View: ({ children }: { children: unknown }) => children,
  StyleSheet: {
    create: (styles: unknown) => styles
  },
  renderToStream: mocks.renderToStream
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: mocks.findUnique
    }
  }
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      createBucket: mocks.createBucket,
      from: mocks.from
    }
  }
}))

vi.mock('@/src/services/checkout.service', () => ({
  requireCheckoutActor: mocks.requireCheckoutActor,
  authorizeOrderReadForActor: mocks.authorizeOrderReadForActor
}))

import { GET } from './route'

const orderId = 'cmq1toxc100099kd2co0vb7ln'

function context(id = orderId) {
  return {
    params: Promise.resolve({ id })
  }
}

describe('GET /api/orders/[id]/invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.from.mockReturnValue({
      download: mocks.download,
      upload: mocks.upload
    })
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

  it('rejects invalid order ids before querying invoices', async () => {
    const response = await GET(new Request('http://localhost'), context('bad'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Invalid order' })
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated registered member invoices before storage access', async () => {
    mocks.requireCheckoutActor.mockResolvedValue(null)
    mocks.findUnique.mockResolvedValue({ id: orderId, userId: 'user-123' })

    const response = await GET(new Request('http://localhost'), context())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.renderToStream).not.toHaveBeenCalled()
  })

  it('forbids registered members from downloading another member invoice', async () => {
    mocks.requireCheckoutActor.mockResolvedValue({
      userId: 'other-user',
      role: 'CUSTOMER',
      email: 'other@test.com'
    })
    mocks.findUnique.mockResolvedValue({ id: orderId, userId: 'user-123' })

    const response = await GET(new Request('http://localhost'), context())
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: 'Forbidden' })
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.renderToStream).not.toHaveBeenCalled()
  })

  it('allows guest invoices by orderId capability and returns cached PDFs', async () => {
    mocks.requireCheckoutActor.mockResolvedValue(null)
    mocks.findUnique.mockResolvedValue({ id: orderId, userId: null })
    mocks.download.mockResolvedValue({
      data: {
        arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer
      },
      error: null
    })

    const response = await GET(new Request('http://localhost'), context())
    const body = new Uint8Array(await response.arrayBuffer())

    expect(response.status).toBe(200)
    expect(body).toEqual(new Uint8Array([37, 80, 68, 70]))
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(mocks.from).toHaveBeenCalledWith('invoices')
    expect(mocks.renderToStream).not.toHaveBeenCalled()
  })
})
