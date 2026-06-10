'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/src/auth'

export async function getUserOrders() {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: 'Sesi tidak valid. Silakan login kembali.' }
    }

    // Enterprise-grade query: Fetches exactly what's needed, strictly scoped to the user,
    // limits to 50 for MVP performance, and prevents N+1 via nested includes.
    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id
      },
      take: 50,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                flavorName: true,
                imageUrl: true
              }
            },
            toppings: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        },
        payment: {
          select: {
            status: true,
            paymentType: true
          }
        }
      }
    })

    return { success: true, data: orders }
  } catch (error: any) {
    console.error('Error fetching user orders:', error)
    return { success: false, error: 'Gagal memuat riwayat pesanan. Terjadi kesalahan pada server.' }
  }
}
