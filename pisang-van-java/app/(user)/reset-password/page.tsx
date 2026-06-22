'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast, { Toaster } from 'react-hot-toast'
import type { z } from 'zod'
import { useLanguage } from '@/context/LanguageContext'
import { resetPassword } from '@/src/features/auth/actions'
import { resetPasswordSchema } from '@/src/features/auth/schemas'

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '' }
  })

  useEffect(() => setMounted(true), [])

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!data.token) {
      toast.error('Token tidak valid atau tidak ditemukan di URL.')
      return
    }

    const tid = toast.loading(t('reset_submitting') || 'Memproses...')
    try {
      const formData = new FormData()
      formData.append('token', data.token)
      formData.append('password', data.password)

      const result = await resetPassword(formData)

      if (!result.success) {
        toast.error(result.error || t('reset_toast_error') || 'Gagal memperbarui password', {
          id: tid
        })
        return
      }

      toast.success(t('reset_toast_success') || 'Password berhasil diperbarui!', { id: tid })
      setSuccess(true)

      // Auto redirect to login setelah 3 detik
      setTimeout(() => {
        router.push('/member-login')
      }, 3000)
    } catch {
      toast.error(t('reset_toast_error') || 'Terjadi kesalahan', { id: tid })
    }
  }

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
  const item = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  }

  const inputCls = `w-full px-4 py-3 text-sm rounded-[4px] outline-none transition-all
                    bg-white dark:bg-zinc-950 border border-zinc-400 dark:border-zinc-600
                    text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                    focus:ring-2 focus:ring-amber-brand/40 focus:border-amber-brand`

  if (!mounted) return null

  return (
    <div className="rounded-[4px] px-8 py-10 sm:px-10 shadow-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <motion.div variants={stagger} initial="hidden" animate="visible">
        {/* Brand */}
        <motion.div variants={item} className="flex flex-col items-center gap-1 mb-8">
          <div className="w-16 h-16 rounded-[4px] flex items-center justify-center text-4xl mb-1 shadow-md bg-zinc-900 dark:bg-white">
            🍌
          </div>
          <p className="font-serif text-xl font-bold leading-none tracking-tight text-zinc-900 dark:text-zinc-100">
            Pisang Goreng
          </p>
          <p className="font-serif text-lg font-bold text-[#D4802A]">Van Java</p>
          <p className="text-[9px] font-bold tracking-[0.35em] uppercase mt-0.5 text-zinc-500 dark:text-zinc-400">
            {t('login_brand_subtitle') || 'PREMIUM HERITAGE'}
          </p>
        </motion.div>

        {/* Heading */}
        <motion.div variants={item} className="text-center mb-8">
          {success ? (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h1 className="font-serif text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
                {t('reset_toast_success') || 'Sandi Diperbarui!'}
              </h1>
              <p className="text-sm leading-relaxed mb-2 text-zinc-500 dark:text-zinc-400">
                Kata sandi Anda telah berhasil diperbarui. Mengalihkan Anda ke halaman login dalam 3
                detik...
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-1 text-zinc-900 dark:text-zinc-100">
                {t('reset_title') || 'Atur Ulang Password'}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t('reset_subtitle') || 'Masukkan kata sandi baru untuk akun Anda'}
              </p>
            </>
          )}
        </motion.div>

        {/* Form */}
        {!success && (
          <motion.form variants={stagger} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Hidden Input for Token */}
            <input type="hidden" {...register('token')} value={token} />

            <motion.div variants={item}>
              <label
                htmlFor="new-password"
                className="block text-[11px] font-bold tracking-widest uppercase mb-1.5 text-[#D4802A]"
              >
                {t('reset_password_label') || 'Password Baru'}
              </label>
              <input
                id="new-password"
                type="password"
                placeholder={t('reset_password_placeholder') || 'Minimal 8 karakter'}
                className={inputCls}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>
              )}
            </motion.div>

            <motion.div variants={item}>
              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full py-3.5 rounded-[4px] text-sm font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 bg-[#D4802A] hover:bg-amber-600 text-white shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-label="Loading"
                    >
                      <title>Loading</title>
                      <circle
                        className="opacity-30"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-80"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {t('reset_submitting') || 'Memperbarui…'}
                  </>
                ) : (
                  t('reset_submit_btn') || 'Perbarui Password'
                )}
              </button>
              {!token && (
                <p className="text-red-500 text-xs mt-2 text-center font-medium">
                  Token reset tidak ditemukan. Periksa kembali tautan dari email Anda.
                </p>
              )}
            </motion.div>
          </motion.form>
        )}

        {/* Footer */}
        <motion.div variants={item} className="mt-7 text-center space-y-2.5">
          <Link
            href="/member-login"
            className="block text-sm font-semibold text-amber-brand hover:underline"
          >
            {t('forgot_back_to_login') || 'Kembali ke Login'}
          </Link>
          <Link
            href="/"
            className="block text-xs font-medium transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            {t('login_back_to_web') || '← Kembali ke Website'}
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="rounded-[4px] px-8 py-10 sm:px-10 shadow-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center min-h-[300px]">
      <svg
        className="w-8 h-8 animate-spin text-amber-brand"
        fill="none"
        viewBox="0 0 24 24"
        role="img"
        aria-label="Loading"
      >
        <title>Loading</title>
        <circle
          className="opacity-30"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-80"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <p className="text-sm mt-4 text-zinc-500 dark:text-zinc-400">Memuat halaman reset...</p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-amber-50 dark:bg-zinc-950 transition-colors duration-300">
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            '!bg-[var(--card-bg)] !text-[var(--text-custom)] !border !border-[var(--border-custom)] !shadow-sm'
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-hero-pattern opacity-40" />

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-[420px]">
          <Suspense fallback={<LoadingCard />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
