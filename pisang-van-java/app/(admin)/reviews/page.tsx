import { redirect } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { prisma } from '@/lib/prisma'
import { auth } from '@/src/auth'
import ReviewModerationClient from './ReviewModerationClient'

export const metadata = { title: 'Moderasi Ulasan | Admin Van Java' }

export default async function ReviewModerationPage() {
  const session = await auth()
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    redirect('/member-login')
  }

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      variant: { select: { flavorName: true } },
      order: { select: { id: true } }
    }
  })

  const serialized = reviews.map((r: (typeof reviews)[0]) => ({
    id: r.id,
    userName: r.user?.name ?? 'Unknown',
    userEmail: r.user?.email ?? '',
    variantName: r.variant?.flavorName ?? 'Pesanan Umum',
    orderId: r.order?.id ?? null,
    rating: r.rating,
    comment: r.comment ?? null,
    imageUrl: r.imageUrl ?? null,
    isVerifiedBuyer: r.isVerifiedBuyer,
    isHidden: r.isHidden,
    createdAt: r.createdAt.toISOString()
  }))

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto bg-cream-100">
        <AdminHeader
          title="Moderasi Ulasan"
          subtitle="Sembunyikan atau hapus ulasan yang tidak pantas"
        />
        <ReviewModerationClient initialReviews={serialized} />
      </main>
    </div>
  )
}
