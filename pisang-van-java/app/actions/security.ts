'use server'

import { authenticator } from 'otplib'
import qrcode from 'qrcode'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { auth } from '@/src/auth'
import { verifyPassword } from '@/src/lib/password'

/**
 * 1. Generate Kunci TOTP Baru untuk Pendaftaran 2FA
 */
export async function generate2FASecret() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const secret = authenticator.generateSecret()

  // SECURE: Store secret in Redis temporarily (5 mins), DO NOT trust client to send it back
  await redis.setex(`pending_2fa:${session.user.id}`, 300, secret)

  const otpauth = authenticator.keyuri(session.user.email!, 'Pisang Van Java', secret)

  const qrCodeDataUrl = await qrcode.toDataURL(otpauth)
  return { secret, qrCodeDataUrl }
}

/**
 * 2. Verifikasi dan Aktifkan 2FA
 */
export async function enable2FA(token: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const pendingSecret = (await redis.get(`pending_2fa:${session.user.id}`)) as string | null
  if (!pendingSecret) throw new Error('Sesi setup 2FA kedaluwarsa. Ulangi proses.')

  const isValid = authenticator.check(token, pendingSecret)
  if (!isValid) throw new Error('Kode OTP tidak valid. Silakan coba lagi.')

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: pendingSecret
    }
  })

  await redis.del(`pending_2fa:${session.user.id}`)

  return { success: true, message: '2FA Berhasil Diaktifkan' }
}

/**
 * Menonaktifkan 2FA (Bisa jadi butuh konfirmasi password)
 */
export async function disable2FA(password: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw new Error('USER_NOT_FOUND')
  if (user.passwordHash) {
    const isValidPassword = await verifyPassword(user.passwordHash, password)
    if (!isValidPassword) throw new Error('Kata sandi salah.')
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null
    }
  })

  return { success: true, message: '2FA Berhasil Dinonaktifkan' }
}

/**
 * 3. Hapus Sesi Jarak Jauh (Remote Logout)
 */
export async function revokeDeviceSession(targetSessionId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const sessionKey = `session:${session.user.id}:${targetSessionId}`
  await redis.del(sessionKey)

  return { success: true, message: 'Sesi perangkat telah dicabut.' }
}

/**
 * Ambil semua sesi aktif dari Redis
 */
export async function getActiveSessions() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  // Format key: session:userId:sessionId
  const keys = await redis.keys(`session:${session.user.id}:*`)

  if (keys.length === 0) return []

  const pipelines = redis.pipeline()
  for (const key of keys) {
    pipelines.get(key)
  }
  const results = await pipelines.exec()

  const activeSessions = keys.map((key, index) => {
    const sessionId = key.split(':').pop()!
    const data = results[index] as string | null
    let parsed = { createdAt: Date.now(), device: 'Unknown Device', current: false }
    if (data) {
      try {
        parsed = typeof data === 'string' ? JSON.parse(data) : data
      } catch (e) {}
    }

    // (session as any) because we might have injected sessionId into user
    const isCurrent = (session.user as any).sessionId === sessionId
    return {
      sessionId,
      ...parsed,
      current: isCurrent
    }
  })

  return activeSessions
}

/**
 * 4. Hapus Akun (Soft Delete)
 */
const deleteAccountSchema = z.object({ password: z.string().min(8) })

export async function deleteAccount(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const rawPassword = formData.get('password') as string

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw new Error('User not found')

  if (user.passwordHash) {
    const { password } = deleteAccountSchema.parse({ password: rawPassword })
    const isValid = await verifyPassword(user.passwordHash, password)
    if (!isValid) throw new Error('Kata sandi salah. Penghapusan dibatalkan.')
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      twoFactorEnabled: false,
      twoFactorSecret: null
    }
  })

  // Opsional: Batalkan semua pesanan PENDING
  await prisma.order.updateMany({
    where: { userId: session.user.id, status: 'PENDING_PAYMENT' },
    data: { status: 'CANCELED' }
  })

  // Revoke current session so it gets logged out immediately
  if ((session.user as any).sessionId) {
    await revokeDeviceSession((session.user as any).sessionId)
  }

  return { success: true }
}

/**
 * 5. Update Preferensi Notifikasi
 */
export async function updateNotificationPrefs(prefs: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true }
  })

  let currentPrefs: Record<string, unknown> = {}
  if (user?.notificationPrefs) {
    currentPrefs =
      typeof user.notificationPrefs === 'string'
        ? (JSON.parse(user.notificationPrefs) as Record<string, unknown>)
        : (user.notificationPrefs as Record<string, unknown>)
  }

  const mergedPrefs = {
    ...currentPrefs,
    ...prefs
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: mergedPrefs }
  })

  return { success: true }
}
