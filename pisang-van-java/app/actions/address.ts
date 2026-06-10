'use server'

import { auth } from '@/src/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validasi Zero-Trust
const addressSchema = z.object({
  label: z.string().min(1, 'Label alamat wajib diisi (misal: Rumah/Kantor)'),
  fullAddress: z.string().min(10, 'Alamat lengkap wajib diisi dengan detail'),
  notes: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  isDefault: z.boolean().default(false),
})

export async function getUserAddresses() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Sesi tidak valid.' }
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isDefault: 'desc' }, // Default addresses appear first
        { updatedAt: 'desc' }
      ]
    })

    return { success: true, data: addresses }
  } catch (error) {
    console.error('[GET_ADDRESSES_ERROR]', error)
    return { success: false, error: 'Gagal mengambil alamat pengiriman.' }
  }
}

export async function createAddress(data: z.infer<typeof addressSchema>) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Sesi tidak valid.' }
    }

    const parsed = addressSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // Cek apakah ini alamat pertama pengguna?
    const existingCount = await prisma.address.count({
      where: { userId: session.user.id }
    })

    const isFirstAddress = existingCount === 0

    // Jika ini adalah alamat pertama atau user mencentang isDefault, set isDefault: true
    const shouldBeDefault = isFirstAddress || parsed.data.isDefault

    // Menggunakan Prisma Transaction jika address ini dijadikan default (untuk menonaktifkan default alamat lain)
    if (shouldBeDefault && !isFirstAddress) {
      const [_, newAddress] = await prisma.$transaction([
        prisma.address.updateMany({
          where: { userId: session.user.id, isDefault: true },
          data: { isDefault: false }
        }),
        prisma.address.create({
          data: {
            ...parsed.data,
            userId: session.user.id,
            isDefault: true
          }
        })
      ])
      return { success: true, data: newAddress, message: 'Alamat utama berhasil ditambahkan.' }
    } else {
      const newAddress = await prisma.address.create({
        data: {
          ...parsed.data,
          userId: session.user.id,
          isDefault: shouldBeDefault
        }
      })
      return { success: true, data: newAddress, message: 'Alamat berhasil ditambahkan.' }
    }

  } catch (error) {
    console.error('[CREATE_ADDRESS_ERROR]', error)
    return { success: false, error: 'Terjadi kesalahan saat menyimpan alamat.' }
  }
}

export async function updateAddress(id: string, data: z.infer<typeof addressSchema>) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Sesi tidak valid.' }
    }

    const parsed = addressSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // Zero-Trust BOLA/IDOR protection: Ensure the address belongs to the user
    const address = await prisma.address.findUnique({ where: { id } })
    if (!address || address.userId !== session.user.id) {
      return { success: false, error: 'Akses ditolak.' }
    }

    if (parsed.data.isDefault && !address.isDefault) {
      // Transitioning to default -> Turn off other defaults via transaction
      await prisma.$transaction([
        prisma.address.updateMany({
          where: { userId: session.user.id, isDefault: true },
          data: { isDefault: false }
        }),
        prisma.address.update({
          where: { id },
          data: parsed.data
        })
      ])
    } else {
      // Normal update
      await prisma.address.update({
        where: { id },
        data: parsed.data
      })
    }

    return { success: true, message: 'Alamat berhasil diperbarui.' }

  } catch (error) {
    console.error('[UPDATE_ADDRESS_ERROR]', error)
    return { success: false, error: 'Terjadi kesalahan saat memperbarui alamat.' }
  }
}

export async function deleteAddress(id: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Sesi tidak valid.' }
    }

    // Check ownership
    const address = await prisma.address.findUnique({ where: { id } })
    if (!address || address.userId !== session.user.id) {
      return { success: false, error: 'Akses ditolak.' }
    }

    await prisma.address.delete({ where: { id } })

    // Jika yang dihapus adalah alamat default, dan masih ada alamat lain, set salah satu jadi default otomatis
    if (address.isDefault) {
      const remainingAddresses = await prisma.address.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        take: 1
      })

      if (remainingAddresses.length > 0) {
        await prisma.address.update({
          where: { id: remainingAddresses[0].id },
          data: { isDefault: true }
        })
      }
    }

    return { success: true, message: 'Alamat berhasil dihapus.' }

  } catch (error) {
    console.error('[DELETE_ADDRESS_ERROR]', error)
    return { success: false, error: 'Terjadi kesalahan saat menghapus alamat.' }
  }
}

export async function setDefaultAddress(id: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Sesi tidak valid.' }
    }

    // Check ownership
    const address = await prisma.address.findUnique({ where: { id } })
    if (!address || address.userId !== session.user.id) {
      return { success: false, error: 'Akses ditolak.' }
    }

    // Atomic transaction to ensure only one default exists
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false }
      }),
      prisma.address.update({
        where: { id },
        data: { isDefault: true }
      })
    ])

    return { success: true, message: 'Alamat utama berhasil diatur.' }

  } catch (error) {
    console.error('[SET_DEFAULT_ADDRESS_ERROR]', error)
    return { success: false, error: 'Terjadi kesalahan saat mengatur alamat utama.' }
  }
}
