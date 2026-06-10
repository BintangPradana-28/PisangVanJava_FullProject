'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, redis } from '@/lib/redis'
import { auth } from '@/src/auth'
import { resend } from '@/src/lib/resend'

const emailChangeSchema = z.object({
  otp: z.string().length(6, 'OTP harus 6 digit'),
  newEmail: z.string().email('Format email tidak valid')
})

function generateOTP() {
  // CRITICAL SECURITY FIX: Use cryptographically secure pseudo-random number generator
  return require('crypto').randomInt(100000, 999999).toString()
}

export async function requestEmailOTP() {
  try {
    const session = await auth()
    if (!session || !session.user || !session.user.id || !session.user.email) {
      return { success: false, error: 'Sesi tidak valid.' }
    }

    // Check if user is OAuth (Google)
    const oauthAccount = await prisma.account.findFirst({
      where: { userId: session.user.id }
    })

    if (oauthAccount) {
      return {
        success: false,
        error: 'Akun Anda terhubung dengan Google. Email tidak dapat diubah secara manual.'
      }
    }

    // Rate Limiting: Max 3 OTP requests per 15 minutes to prevent email bombing
    const { success: rateLimitSuccess } = await rateLimit.limit(`email_otp_${session.user.id}`)
    if (!rateLimitSuccess) {
      return { success: false, error: 'Terlalu banyak permintaan OTP. Tunggu beberapa menit.' }
    }

    const otp = generateOTP()
    const redisKey = `email_change_otp:${session.user.id}`

    // Simpan OTP di Redis dengan kedaluwarsa 5 menit (300 detik)
    await redis.set(redisKey, otp, { ex: 300 })

    if (!resend) {
      console.warn('RESEND API KEY missing, fallback to console. OTP:', otp)
      // Fallback for dev if no resend key
      return { success: true, message: 'OTP terkirim (Mode Dev: ' + otp + ')' }
    }

    // Kirim email via Resend
    await resend.emails.send({
      from: 'Pisang Van Java <noreply@pisanggorengvanjava.com>', // Update with verified domain later
      to: session.user.email,
      subject: 'Kode Verifikasi Ganti Email - Pisang Van Java',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Halo ${session.user.name || 'Pelanggan'},</h2>
          <p>Anda baru saja meminta untuk mengganti alamat email pada akun Anda.</p>
          <p>Gunakan kode OTP berikut untuk melanjutkan (berlaku 5 menit):</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #D4802A;">${otp}</h1>
          <p>Jika Anda tidak meminta pergantian email, abaikan email ini dan pastikan password Anda aman.</p>
        </div>
      `
    })

    return { success: true, message: 'OTP berhasil dikirim ke email Anda.' }
  } catch (error) {
    console.error('[EMAIL_OTP_ERROR]', error)
    return { success: false, error: 'Terjadi kesalahan sistem saat mengirim OTP.' }
  }
}

export async function verifyAndChangeEmail(otp: string, newEmail: string) {
  try {
    const session = await auth()
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: 'Sesi tidak valid.' }
    }

    // Check if user is OAuth (Google)
    const oauthAccount = await prisma.account.findFirst({
      where: { userId: session.user.id }
    })

    if (oauthAccount) {
      return {
        success: false,
        error: 'Akun Anda terhubung dengan Google. Email tidak dapat diubah secara manual.'
      }
    }

    // Validasi input dengan Zod (Zero-Trust)
    const parsed = emailChangeSchema.safeParse({ otp, newEmail })
    if (!parsed.success) {
      return { success: false, error: 'Input tidak valid: ' + parsed.error.issues[0].message }
    }

    const redisKey = `email_change_otp:${session.user.id}`
    const storedOtp = await redis.get(redisKey)

    if (!storedOtp) {
      return { success: false, error: 'OTP sudah kedaluwarsa atau belum diminta.' }
    }

    if (storedOtp !== otp) {
      return { success: false, error: 'Kode OTP salah.' }
    }

    // Cek apakah email baru sudah terdaftar oleh akun lain
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail }
    })

    if (existingUser) {
      return { success: false, error: 'Email baru sudah digunakan oleh akun lain.' }
    }

    // Update Email di PostgreSQL
    await prisma.user.update({
      where: { id: session.user.id },
      data: { email: newEmail }
    })

    // Hapus OTP dari Redis
    await redis.del(redisKey)

    return { success: true, message: 'Email berhasil diubah. Sesi mungkin perlu di-refresh.' }
  } catch (error) {
    console.error('[EMAIL_CHANGE_ERROR]', error)
    return { success: false, error: 'Terjadi kesalahan sistem saat mengganti email.' }
  }
}
