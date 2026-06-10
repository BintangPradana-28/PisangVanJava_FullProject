import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/src/auth'
import PosClient from './PosClient'

// Revalidate 0 ensures we always fetch fresh data on full reload
export const revalidate = 0

export default async function KasirPage() {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  // Fetch active products and toppings
  const [products, toppings] = await Promise.all([
    prisma.menuVariant.findMany({
      where: { isDeleted: false, isActive: true },
      orderBy: { flavorName: 'asc' }
    }),
    prisma.topping.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })
  ])

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-50 flex flex-col">
      <PosClient products={products} toppings={toppings} />
    </div>
  )
}
