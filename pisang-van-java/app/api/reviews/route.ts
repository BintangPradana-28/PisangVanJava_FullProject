import type { Prisma } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/src/auth'

const reviewSchema = z.object({
  orderId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal(''))
})

// GET /api/reviews
export async function GET(req: NextRequest) {
  const variantId = req.nextUrl.searchParams.get('variantId')
  const ratingFilter = req.nextUrl.searchParams.get('rating')
  const hasComment = req.nextUrl.searchParams.get('hasComment') === 'true'
  const withPhoto = req.nextUrl.searchParams.get('withPhoto') === 'true'
  const session = await auth()
  const isAdmin = session && ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)
  const adminView = req.nextUrl.searchParams.get('adminView') === 'true' && isAdmin

  const where: Prisma.ReviewWhereInput = adminView ? {} : { isHidden: false }
  if (variantId) where.variantId = variantId
  if (ratingFilter) where.rating = parseInt(ratingFilter, 10)
  if (hasComment) where.comment = { not: null, gt: '' }
  if (withPhoto) where.imageUrl = { not: null, gt: '' }

  try {
    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        variant: { select: { flavorName: true } }
      }
    })

    const data = reviews.map((r: any) => {
      const maskName = (name: string | null) => {
        if (!name) return 'A****n'
        if (name.length <= 2) return name
        return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
      }
      return {
        id: r.id,
        userId: r.userId,
        userName: adminView ? r.user?.name : maskName(r.user?.name),
        variantName: r.variant?.flavorName || 'Pesanan Umum',
        rating: r.rating,
        comment: r.comment,
        imageUrl: r.imageUrl,
        isVerifiedBuyer: r.isVerifiedBuyer,
        isHidden: r.isHidden,
        createdAt: r.createdAt.toISOString()
      }
    })

    const allReviewsWhere: Prisma.ReviewWhereInput = variantId
      ? { variantId, isHidden: false }
      : { isHidden: false }
    const allReviews = await prisma.review.findMany({
      where: allReviewsWhere,
      select: { rating: true }
    })

    let average = 0
    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    if (allReviews.length > 0) {
      let sum = 0
      allReviews.forEach((r: any) => {
        sum += r.rating
        if (starCounts[r.rating as keyof typeof starCounts] !== undefined) {
          starCounts[r.rating as keyof typeof starCounts]++
        }
      })
      average = Number((sum / allReviews.length).toFixed(1))
    }

    return NextResponse.json({
      success: true,
      data,
      aggregates: { average, total: allReviews.length, starCounts }
    })
  } catch (err) {
    console.error('[GET /api/reviews]', err)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data ulasan.' },
      { status: 500 }
    )
  }
}

// POST /api/reviews
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Login terlebih dahulu untuk memberikan ulasan.' },
      { status: 401 }
    )
  }

  const body = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { orderId, variantId, rating, comment, imageUrl } = parsed.data

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    const isVerifiedBuyer = order !== null

    const review = await prisma.review.upsert({
      where: { userId_orderId: { userId: session.user.id, orderId } },
      create: {
        userId: session.user.id,
        orderId,
        variantId: variantId ?? null,
        rating,
        comment: comment ?? null,
        imageUrl: imageUrl ?? null,
        isVerifiedBuyer
      },
      update: {
        rating,
        comment: comment ?? null,
        imageUrl: imageUrl ?? null
      }
    })
    return NextResponse.json({ success: true, data: review }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/reviews]', err)
    return NextResponse.json({ success: false, error: 'Gagal menyimpan ulasan.' }, { status: 500 })
  }
}

// PATCH /api/reviews — Admin only: toggle isHidden
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { reviewId, isHidden } = body
    if (!reviewId || typeof isHidden !== 'boolean') {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 })
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { isHidden }
    })

    return NextResponse.json({ success: true, review: updated })
  } catch (err) {
    console.error('[PATCH /api/reviews]', err)
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui ulasan.' },
      { status: 500 }
    )
  }
}

// DELETE /api/reviews — Admin only: hard delete a review
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const reviewId = searchParams.get('reviewId')
    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId diperlukan' }, { status: 400 })
    }

    await prisma.review.delete({ where: { id: reviewId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/reviews]', err)
    return NextResponse.json({ success: false, error: 'Gagal menghapus ulasan.' }, { status: 500 })
  }
}
