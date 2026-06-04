'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, KeyRound, Loader2 } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong"),
  phone: z.string()
    .min(1, "Nomor WhatsApp tidak boleh kosong")
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, "Nomor WhatsApp tidak valid."),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
  confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"]
})

type PasswordFormValues = z.infer<typeof passwordSchema>

export default function ProfileDataDiriPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    setValue: setProfileValue,
    formState: { errors: profileErrors, isValid: isProfileValid, isSubmitting: isProfileSubmitting }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: { name: '', phone: '' }
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isValid: isPasswordValid, isSubmitting: isPasswordSubmitting }
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile')
    }
  }, [status, router])

  useEffect(() => {
    let isMounted = true

    if (status === 'authenticated') {
      if (session?.user?.name) setProfileValue('name', session.user.name)

      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return
          if (data.success && data.data) {
            if (data.data.name) setProfileValue('name', data.data.name)
            if (data.data.phone) setProfileValue('phone', data.data.phone)
          }
        })
        .catch(() => {
          if (isMounted) toast.error('Gagal mengambil data profil')
        })
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })
    }
    
    return () => { isMounted = false }
  }, [status, setProfileValue]) // Removed session to prevent infinite loops

  const onProfileSubmit = async (data: ProfileFormValues) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, phone: data.phone }) // Address is removed from here
      })
      const resData = await res.json()

      if (res.ok && resData.success) {
        toast.success('Profil berhasil diperbarui!')
        // Update session client-side
        await update({ name: data.name })
      } else {
        toast.error(resData.message || 'Gagal menyimpan profil')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan jaringan')
    }
  }

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: data.currentPassword,
          newPassword: data.newPassword
        })
      })
      const resData = await res.json()

      if (res.ok && resData.success) {
        toast.success('Password berhasil diubah!')
        resetPasswordForm()
      } else {
        toast.error(resData.message || 'Gagal mengubah password')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan jaringan')
    }
  }

  if (isLoading || status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4802A]" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      
      {/* DATA DIRI SECTION */}
      <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/50 dark:border-zinc-800/80">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-[#D4802A]/10 text-[#D4802A] flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100">Data Diri</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Kelola informasi publik dan kontak Anda</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Nama Lengkap</label>
              <input
                type="text"
                {...registerProfile('name')}
                className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all"
                placeholder="Masukkan nama lengkap"
              />
              {profileErrors.name && <p className="text-xs text-red-500 mt-1.5">{profileErrors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Nomor WhatsApp</label>
              <input
                type="tel"
                {...registerProfile('phone')}
                className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all"
                placeholder="Contoh: +6281312167554"
              />
              {profileErrors.phone && <p className="text-xs text-red-500 mt-1.5">{profileErrors.phone.message}</p>}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
              <input
                type="email"
                value={session?.user?.email || ''}
                disabled
                className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 cursor-not-allowed outline-none"
              />
              <p className="text-xs text-zinc-500 mt-1.5">Email saat ini tidak dapat diubah secara mandiri.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isProfileSubmitting || !isProfileValid}
              className="bg-[#D4802A] hover:bg-[#b56d24] text-white font-bold py-3 px-8 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProfileSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Profil'}
            </button>
          </div>
        </form>
      </section>

      {/* GANTI PASSWORD SECTION */}
      <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/50 dark:border-zinc-800/80">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100">Ganti Password</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pastikan akun Anda tetap aman dengan password yang kuat</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-5 max-w-lg">
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Password Saat Ini</label>
            <input
              type="password"
              {...registerPassword('currentPassword')}
              className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all"
              placeholder="Masukkan password saat ini"
            />
            {passwordErrors.currentPassword && <p className="text-xs text-red-500 mt-1.5">{passwordErrors.currentPassword.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Password Baru</label>
            <input
              type="password"
              {...registerPassword('newPassword')}
              className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all"
              placeholder="Minimal 6 karakter"
            />
            {passwordErrors.newPassword && <p className="text-xs text-red-500 mt-1.5">{passwordErrors.newPassword.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Konfirmasi Password Baru</label>
            <input
              type="password"
              {...registerPassword('confirmPassword')}
              className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all"
              placeholder="Ketik ulang password baru"
            />
            {passwordErrors.confirmPassword && <p className="text-xs text-red-500 mt-1.5">{passwordErrors.confirmPassword.message}</p>}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPasswordSubmitting || !isPasswordValid}
              className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold py-3 px-8 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPasswordSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Perbarui Password'}
            </button>
          </div>
        </form>
      </section>

    </motion.div>
  )
}
