import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import PromoClient from './PromoClient'

export const metadata: Metadata = {
  title: 'Promo & Voucher Spesial | Pisang Van Java',
  description:
    'Dapatkan diskon eksklusif, paket bundling, dan koin loyalitas di Pisang Van Java. Pesan sekarang dan nikmati kelezatannya dengan harga hemat.'
}

export const revalidate = 60 // Cache for 60 seconds (ISR)

export default async function PromoPage() {
  // Fetch active vouchers applicable to ALL or CUSTOMER
  let vouchers: any[] = []
  try {
    vouchers = await prisma.voucher.findMany({
      where: {
        isActive: true,
        endDate: { gte: new Date() },
        applicableTo: { in: ['ALL', 'CUSTOMER'] }
      },
      orderBy: { endDate: 'asc' },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minPurchase: true,
        maxDiscount: true,
        endDate: true
      }
    })
  } catch (err) {
    console.error('Error fetching vouchers for promo page:', err)
  }

  // Format dates for safety in transmission
  const serializedVouchers = vouchers.map((v) => ({
    ...v,
    endDate: v.endDate.toISOString()
  }))

  return (
    <main className="w-full min-h-screen pt-28 pb-16 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-[1200px] mx-auto px-6">
        <PromoClient vouchers={serializedVouchers} />
      </div>
    </main>
  )
}
