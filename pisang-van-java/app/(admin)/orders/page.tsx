// app/(admin)/orders/page.tsx

import { redirect } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import AdminSidebar from '@/components/admin/AdminSidebar'
import OrdersClient from '@/components/admin/OrdersClient'
import { prisma } from '@/lib/prisma'
import { auth } from '@/src/auth'

export default async function OrdersPage(props: {
  searchParams: Promise<{
    page?: string
    limit?: string
  }>
}) {
  const session = await auth()
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) redirect('/member-login')

  const searchParams = await props.searchParams
  const page = Math.max(1, parseInt(searchParams.page || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.limit || '20', 10)))
  const skip = (page - 1) * limit

  const [orders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        totalPrice: true,
        status: true,
        notes: true,
        source: true,
        createdAt: true,
        deliveryMethod: true,
        deliveryFee: true,
        items: {
          select: {
            id: true,
            baseType: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
            variant: {
              select: {
                flavorName: true
              }
            },
            toppings: {
              select: {
                name: true,
                emoji: true
              }
            }
          }
        }
      }
    }),
    prisma.order.count()
  ])

  const formattedOrders = orders.map((o: any) => ({
    id: o.id,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    totalPrice: o.totalPrice,
    status: o.status,
    notes: o.notes,
    source: o.source,
    createdAt: o.createdAt.toISOString(),
    deliveryMethod: o.deliveryMethod,
    deliveryFee: o.deliveryFee,
    items: o.items.map((item: any) => ({
      id: item.id,
      baseType: item.baseType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      variant: {
        flavorName: item.variant.flavorName
      },
      toppings: item.toppings
        ? item.toppings.map((t: any) => ({
            name: t.name,
            emoji: t.emoji
          }))
        : []
    }))
  }))

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 sm:p-8 bg-cream-100 overflow-y-auto">
        <Toaster position="top-right" />
        <OrdersClient
          initialOrders={formattedOrders}
          totalOrders={totalOrders}
          currentPage={page}
          limit={limit}
        />
      </main>
    </div>
  )
}
