'use client'

import { PushNotificationManager } from '@/components/push/PushNotificationManager'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  User
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FetchError } from 'ofetch'
import { useCallback, useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { requestEmailOTP, verifyAndChangeEmail } from '@/app/actions/emailChange'
import { useLanguage } from '@/context/LanguageContext'
import { api } from '@/src/lib/api'
import getCroppedImg from '@/src/lib/cropImage'

// --- Schemas ---
const profileSchema = z.object({
  name: z.string().min(1, 'Nama tidak boleh kosong'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(val), {
      message: 'Nomor WhatsApp tidak valid.'
    })
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword']
  })

const emailSchema = z.object({
  newEmail: z.string().email('Format email tidak valid')
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>
type EmailFormValues = z.infer<typeof emailSchema>

export default function ProfileDataDiriPage() {
  const { data: session, status, update } = useSession()
  const { t } = useLanguage()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isOAuth, setIsOAuth] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  // Email state
  const [emailMode, setEmailMode] = useState<'idle' | 'otp' | 'newEmail'>('idle')
  const [otpValue, setOtpValue] = useState('')
  const [isEmailLoading, setIsEmailLoading] = useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    setValue: setProfileValue,
    formState: { errors: profileErrors, isValid: isProfileValid }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: { name: '', phone: '' }
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isValid: isPasswordValid }
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange'
  })

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors, isValid: isEmailValid }
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    mode: 'onChange'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/member-login?callbackUrl=/profile')
    }
  }, [status, router])

  const { data: profileData, isLoading: isQueryLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const data = await api<{ success: boolean; data: any }>('/api/user/profile')
      if (!data.success) throw new Error('Gagal mengambil data profil')
      return data.data
    },
    enabled: status === 'authenticated',
    staleTime: 2 * 60 * 1000
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.name && !profileData?.name) {
      setProfileValue('name', session.user.name)
    }
  }, [status, session, setProfileValue, profileData])

  useEffect(() => {
    if (profileData) {
      if (profileData.name) setProfileValue('name', profileData.name)
      if (profileData.phone) setProfileValue('phone', profileData.phone)
      if (profileData.image) setAvatarUrl(profileData.image)
      if (profileData.accounts && profileData.accounts.length > 0) setIsOAuth(true)
    }
  }, [profileData, setProfileValue])

  // --- Profile Name & Phone ---
  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const resData = await api<{ success: boolean; message?: string }>('/api/user/profile', {
        method: 'PUT',
        body: { name: data.name, phone: data.phone ? data.phone : undefined }
      })
      if (!resData.success) throw new Error(resData.message || 'Gagal menyimpan profil')
      return data
    },
    onSuccess: async (data) => {
      toast.success('Profil berhasil diperbarui!')
      await update({ name: data.name })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (error: FetchError | Error) => {
      const msg =
        error instanceof FetchError
          ? error.data?.message || 'Gagal menyimpan profil'
          : error.message
      toast.error(msg || 'Terjadi kesalahan jaringan')
    }
  })

  const onProfileSubmit = (data: ProfileFormValues) => profileMutation.mutate(data)

  // --- Avatar Logic ---
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran maksimal 2MB')
        return
      }
      const reader = new FileReader()
      reader.addEventListener('load', () => setImageToCrop(reader.result as string))
      reader.readAsDataURL(file)
      e.target.value = '' // reset input
    }
  }

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const avatarMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const resData = await api<{ success: boolean; data: { url: string }; message?: string }>(
        '/api/user/profile/avatar',
        {
          method: 'POST',
          body: formData
        }
      )
      if (!resData.success) throw new Error(resData.message || 'Gagal mengubah foto profil')
      return resData.data.url
    },
    onSuccess: async (url) => {
      toast.success('Foto profil berhasil diubah!')
      setAvatarUrl(url)
      await update({ image: url })
      setImageToCrop(null)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsUploading(false)
    },
    onError: (error: FetchError | Error) => {
      setIsUploading(false)
      const msg =
        error instanceof FetchError
          ? error.data?.message || 'Gagal mengubah foto profil'
          : error.message
      toast.error(msg || 'Terjadi kesalahan sistem')
    }
  })

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels) return
    setIsUploading(true)
    try {
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels)
      if (!croppedImageBlob) throw new Error('Gagal memproses gambar')
      const formData = new FormData()
      formData.append('file', croppedImageBlob, 'avatar.jpg')
      avatarMutation.mutate(formData)
    } catch (e: any) {
      setIsUploading(false)
      toast.error(e.message || 'Terjadi kesalahan sistem')
    }
  }

  const deleteAvatarMutation = useMutation({
    mutationFn: async () => {
      const data = await api<{ success: boolean; message?: string }>('/api/user/profile/avatar', {
        method: 'DELETE'
      })
      if (!data.success) throw new Error(data.message || 'Gagal menghapus foto')
      return true
    },
    onSuccess: async () => {
      toast.success('Foto berhasil dihapus')
      setAvatarUrl(null)
      await update({ image: null })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsUploading(false)
    },
    onError: (error: FetchError | Error) => {
      setIsUploading(false)
      const msg =
        error instanceof FetchError ? error.data?.message || 'Gagal menghapus foto' : error.message
      toast.error(msg || 'Kesalahan jaringan')
    }
  })

  const handleAvatarDelete = () => {
    if (!confirm('Apakah Anda yakin ingin menghapus foto profil?')) return
    setIsUploading(true)
    deleteAvatarMutation.mutate()
  }

  // --- Email Logic ---
  const handleRequestEmailOTP = async () => {
    setIsEmailLoading(true)
    const res = await requestEmailOTP()
    if (res.success) {
      toast.success(res.message ? String(res.message) : 'Berhasil')
      setEmailMode('otp')
    } else {
      toast.error(res.error ? String(res.error) : 'Gagal mengirim OTP')
    }
    setIsEmailLoading(false)
  }

  const handleVerifyAndChangeEmail = async (data: EmailFormValues) => {
    setIsEmailLoading(true)
    const res = await verifyAndChangeEmail(otpValue, data.newEmail)
    if (res.success) {
      toast.success(res.message ? String(res.message) : 'Berhasil')
      setEmailMode('idle')
      setOtpValue('')
      await update() // refresh session
    } else {
      toast.error(res.error ? String(res.error) : 'Gagal verifikasi')
    }
    setIsEmailLoading(false)
  }

  // --- Password Logic ---
  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const resData = await api<{ success: boolean; message?: string }>('/api/user/password', {
        method: 'PUT',
        body: {
          oldPassword: data.currentPassword,
          newPassword: data.newPassword
        }
      })
      if (!resData.success) throw new Error(resData.message || 'Gagal mengubah password')
      return resData
    },
    onSuccess: () => {
      toast.success('Password berhasil diubah!')
      resetPasswordForm()
    },
    onError: (error: FetchError | Error) => {
      const msg =
        error instanceof FetchError
          ? error.data?.message || 'Gagal mengubah password'
          : error.message
      toast.error(msg || 'Terjadi kesalahan jaringan')
    }
  })

  const onPasswordSubmit = (data: PasswordFormValues) => passwordMutation.mutate(data)

  if (isQueryLoading || status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4802A]" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      {/* CROP MODAL */}
      <AnimatePresence>
        {imageToCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-[4px] w-full max-w-md overflow-hidden shadow-sm flex flex-col">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Sesuaikan Foto</h3>
                <button
                  type="button"
                  onClick={() => setImageToCrop(null)}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  Batal
                </button>
              </div>
              <div className="relative h-80 w-full bg-zinc-100 dark:bg-zinc-950">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
                <span className="text-xs font-bold text-zinc-500">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-[#D4802A]"
                  aria-label="Zoom"
                  title="Zoom"
                />
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50">
                <button
                  type="button"
                  onClick={handleCropSave}
                  disabled={isUploading}
                  className="w-full bg-[#D4802A] hover:bg-[#b56d24] text-white font-bold py-3 rounded-[4px] transition-all flex justify-center items-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Foto'}
                </button>
              </div>
              <PushNotificationManager />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DATA DIRI SECTION */}
      <section className="bg-white dark:bg-zinc-900 rounded-[4px] p-6 md:p-8 shadow-sm border border-zinc-200/50 dark:border-zinc-800/80">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-[4px] bg-[#D4802A]/10 text-[#D4802A] flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100">
              {t('profile_title')}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('profile_subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-5">
          {/* Avatar Upload */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-[4px] border border-zinc-100 dark:border-zinc-800">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 shadow-md relative">
                {avatarUrl || session?.user?.image ? (
                  <Image
                    src={avatarUrl || session?.user?.image || ''}
                    alt="Avatar"
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-zinc-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
                {isUploading && !imageToCrop && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <label
                htmlFor="avatar-input"
                className="absolute bottom-0 right-0 p-2.5 bg-[#D4802A] text-white rounded-full cursor-pointer shadow-sm hover:bg-[#b56d24] transition-all hover:scale-105 active:scale-95 group-hover:ring-4 ring-white dark:ring-zinc-900"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="avatar-input"
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onFileChange}
                  disabled={isUploading}
                  aria-label="Upload Avatar"
                  title="Upload Avatar"
                />
              </label>
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">
                {t('profile_avatar_title')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                {t('profile_avatar_desc')}
              </p>

              {(avatarUrl || session?.user?.image) && (
                <button
                  type="button"
                  onClick={handleAvatarDelete}
                  disabled={isUploading}
                  className="mt-3 text-sm text-red-500 hover:text-red-600 font-bold flex items-center gap-1.5 mx-auto md:mx-0 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> {t('profile_avatar_delete')}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                {t('profile_name_label')}
              </label>
              <input
                type="text"
                {...registerProfile('name')}
                className="w-full p-3.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all"
                placeholder={t('profile_name_placeholder')}
              />
              {profileErrors.name && (
                <p className="text-xs text-red-500 mt-1.5">{profileErrors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                {t('profile_phone_label')}
              </label>
              <input
                type="tel"
                {...registerProfile('phone')}
                className="w-full p-3.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all"
                placeholder={t('profile_phone_placeholder')}
              />
              {profileErrors.phone && (
                <p className="text-xs text-red-500 mt-1.5">{profileErrors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={profileMutation.isPending || !isProfileValid}
              className="bg-[#D4802A] hover:bg-[#b56d24] text-white font-bold py-3 px-8 rounded-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {profileMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('profile_save_btn')
              )}
            </button>
          </div>
        </form>
      </section>

      {/* CONDITIONAL RENDER: EMAIL & PASSWORD OR OAUTH INFO */}
      {isOAuth ? (
        <section className="bg-white dark:bg-zinc-900 rounded-[4px] p-6 md:p-8 shadow-sm border border-zinc-200/50 dark:border-zinc-800/80">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-[4px] bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl fon