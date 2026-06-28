'use server'

import crypto from 'node:crypto'
import { render } from '@react-email/components'
import { headers } from 'next/headers'
import React from 'react'
import { prisma } from '@/lib/prisma'
import { rateLimit, redis } from '@/lib/redis'
import { normalizePhoneNumber } from '@/lib/utils'
import { hashPassword } from '@/src/lib/password'
import { resend } from '@/src/lib/resend'
import ResetPasswordEmail from './ResetPasswordEmail'
import { forgotPasswordSchema, registerSchema, resetPasswordSchema } from './schemas'

export async function registerUser(formData: FormData) {
  try {
    // 1. EXTRACT AND SANITIZE PAYLOAD
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      whatsapp: formData.get('whatsapp'),
      password: formData.get('password'),
      referralCode: formData.get('referralCode') || undefined,
      consent: formData.get('consent') === 'on' || formData.get('consent') === 'true'
    }

    // 2. THE ABSOLUTE QUARANTINE
    const parsed = registerSchema.safeParse(payload)
    if (!parsed.success) {
      return {
        success: false,
        error: 'Validasi gagal. Pastikan semua data diisi dengan format yang benar.'
      }
    }

    const { name, email, password, whatsapp, referralCode } = parsed.data

    // 3. THE IRON GATE: IP RATE LIMITING
    const headerStore = await headers()
    const ip = headerStore.get('x-forwarded-for')?.split(',')[0] || 'unknown-ip'

    const { success: rateLimitSuccess } = await rateLimit.limit(`register_ip_${ip}`)
    if (!rateLimitSuccess) {
      return { success: false, error: 'Terlalu banyak aktivitas. Silakan coba lagi nanti.' }
    }

    // 4. ANTI-USER ENUMERATION & DUPLICATE CHECK
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    })

    if (existingUser) {
      // OPAQUE ERROR: Menolak pendaftaran tanpa membocorkan eksistensi data secara terang-terangan
      return {
        success: false,
        error: 'Pendaftaran ditolak. Jika Anda sudah memiliki akun, silakan masuk.'
      }
    }

    const passwordHash = await hashPassword(password)

    let validReferralCode = null
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode }
      })
      if (referrer) {
        validReferralCode = referrer.referralCode
      }
    }

    // 6. LEAST PRIVILEGE DB INSERT
    await prisma.user.create({
      data: {
        name,
        email,
        phone: normalizePhoneNumber(whatsapp),
        passwordHash,
        role: 'CUSTOMER', // Default absolut, anti-mass assignment
        referredBy: validReferralCode
      },
      select: { id: true }
    })

    return { success: true }
  } catch (error) {
    // BLIND LOGGING: Jangan log raw data atau password
    console.error('[SECURITY] Register Error:', error instanceof Error ? error.message : 'Unknown')
    return { success: false, error: 'Kesalahan sistem. Permintaan dibatalkan.' }
  }
}

export async function generateResetToken(formData: FormData) {
  try {
    // 1. EXTRACT PAYLOAD SECURELY
    const payload = {
      email: formData.get('email')
    }

    // 2. THE ABSOLUTE QUARANTINE
    const parsed = forgotPasswordSchema.safeParse(payload)
    if (!parsed.success) {
      return { success: false, error: 'Format email tidak valid.' }
    }

    const { email } = parsed.data

    // 3. THE IRON GATE: IP RATE LIMITING
    const headerStore = await headers()
    const ip = headerStore.get('x-forwarded-for')?.split(',')[0] || 'unknown-ip'

    const { success: rateLimitSuccess } = await rateLimit.limit(`reset_ip_${ip}`)
    if (!rateLimitSuccess) {
      return { success: false, error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // 4. CONSTANT-TIME BLIND RESPONSE (ANTI-USER ENUMERATION)
    // Jangan pernah biarkan eksekusi gagal atau melambat jika user tidak ditemukan
    if (user) {
      // 5. THE CRYPTO UUID MANDATE
      // Menghasilkan token acak 32-byte yang mustahil ditebak
      const token = crypto.randomBytes(32).toString('hex')

      // 6. HUKUM TOKEN SEKALI PAKAI (HARD EXPIRE 15 MENIT)
      // Waktu 1 jam (3600s) terlalu berisiko. Diubah ke 900s (15 menit).
      await redis.set(`reset-token:${token}`, user.id, { ex: 900 })

      // Panggil fungsi pihak ketiga untuk mengirim email berisi token
      const host = headerStore.get('host') || 'localhost:3000'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
      const resetLink = `${baseUrl}/reset-password?token=${token}`

      if (resend) {
        try {
          const htmlContent = await render(
            React.createElement(ResetPasswordEmail, {
              customerName: user.name || 'Pelanggan',
              resetLink
            })
          )

          await resend.emails.send({
            from: 'Pisang Van Java <noreply@pisangvanjava.com>',
            to: user.email,
            subject: 'Atur Ulang Kata Sandi - Pisang Van Java',
            html: htmlContent
          })
          console.info('[AUTH] Reset password email sent successfully')
        } catch (emailError) {
          console.error('[AUTH ERROR] Gagal mengirim email reset password via Resend:', emailError)
        }
      } else {
        console.warn(
          `[AUTH WARN] Resend tidak dikonfigurasi. Link reset sandi (Mode Dev): ${resetLink}`
        )
      }
    }

    // OPAQUE MESSAGE: Selalu kembalikan respons yang sama
    return {
      success: true,
      message: 'Jika email terdaftar di sistem kami, tautan pemulihan sandi telah dikirim.'
    }
  } catch (error) {
    // 7. BLIND LOGGING
    console.error(
      '[SECURITY] Reset Password Error:',
      error instanceof Error ? error.message : 'Unknown'
    )
    return { success: false, error: 'Terjadi kesalahan sistem.' }
  }
}

export async function resetPassword(formData: FormData) {
  try {
    // 1. EXTRACT PAYLOAD SECURELY
    const token = formData.get('token')
    const password = formData.get('password')

    // 2. THE ABSOLUTE QUARANTINE
    const parsed = resetPasswordSchema.safeParse({ token, password })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message || 'Validasi gagal.' }
    }

    const { token: validatedToken, password: validatedPassword } = parsed.data

    // 3. THE IRON GATE: IP RATE LIMITING (mencegah bruteforce token)
    const headerStore = await headers()
    const ip = headerStore.get('x-forwarded-for')?.split(',')[0] || 'unknown-ip'

    const { success: rateLimitSuccess } = await rateLimit.limit(`reset_attempt_ip_${ip}`)
    if (!rateLimitSuccess) {
      return { success: false, error: 'Terlalu banyak percobaan. Silakan coba lagi nanti.' }
    }

    // 4. VERIFIKASI TOKEN DI REDIS
    const redisKey = `reset-token:${validatedToken}`
    const userId = await redis.get<string>(redisKey)

    if (!userId) {
      return { success: false, error: 'Tautan reset sandi tidak valid atau telah kedaluwarsa.' }
    }

    // 5. UPDATE PASSWORD DI DATABASE
    const passwordHash = await hashPassword(validatedPassword)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    })

    // 6. HAPUS TOKEN DARI REDIS (sekali pakai)
    await redis.del(redisKey)

    return { success: true }
  } catch (error) {
    console.error(
      '[SECURITY] Reset Password Execute Error:',
      error instanceof Error ? error.message : 'Unknown'
    )
    return { success: false, error: 'Terjadi kesalahan sistem saat memperbarui kata sandi.' }
  }
}
