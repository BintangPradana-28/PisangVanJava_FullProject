'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Drawer } from 'vaul'

interface Address {
  id: string
  label: string
  fullAddress: string
  notes?: string | null
  isDefault: boolean
}

const addressSchema = z.object({
  label: z.string().min(1, "Label wajib diisi (misal: Rumah, Kantor)"),
  fullAddress: z.string().min(10, "Alamat harus lengkap minimal 10 karakter"),
  notes: z.string().optional(),
  isDefault: z.boolean()
})

type AddressFormValues = z.infer<typeof addressSchema>

export default function AlamatPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { isDefault: false }
  })

  const fetchAddresses = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/user/addresses')
      const data = await res.json()
      if (data.success) {
        setAddresses(data.data)
      }
    } catch {
      toast.error('Gagal mengambil data alamat')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  const onSubmit = async (data: AddressFormValues) => {
    try {
      const res = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const resData = await res.json()

      if (res.ok && resData.success) {
        toast.success('Alamat berhasil ditambahkan')
        reset()
        setIsAddModalOpen(false)
        fetchAddresses()
      } else {
        toast.error(resData.message || 'Gagal menyimpan alamat')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    }
  }

  const handleSetDefault = async (id: string) => {
    // Calling PUT /api/user/addresses/[id] (Wait, does this route exist?)
    // If not, we might need to fallback or wait for it.
    // For now, let's implement a quick mock update using our UI state, then sync to a PUT route
    try {
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true })
      })
      if (res.ok) {
        toast.success('Alamat utama diperbarui')
        fetchAddresses()
      } else {
        toast.error('Gagal memperbarui alamat utama')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus alamat ini?')) return
    try {
      const res = await fetch(`/api/user/addresses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Alamat dihapus')
        fetchAddresses()
      } else {
        toast.error('Gagal menghapus alamat')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    }
  }

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/50 dark:border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#D4802A]/10 text-[#D4802A] flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100">Alamat Pengiriman</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Kelola lokasi pengiriman pesanan Anda</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#D4802A] hover:bg-[#b56d24] text-white font-bold py-2.5 px-5 rounded-full transition-all text-sm shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Alamat
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4802A]" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <MapPin className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">Belum Ada Alamat</h3>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-4">Anda belum menambahkan alamat pengiriman. Tambahkan sekarang untuk mempermudah pesanan.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-[#D4802A] font-bold text-sm hover:underline"
            >
              + Tambah Alamat Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {addresses.map((addr) => (
                <motion.div
                  key={addr.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`p-5 rounded-2xl border-2 relative group transition-all ${
                    addr.isDefault 
                      ? 'border-[#D4802A] bg-[#D4802A]/5' 
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#D4802A] text-white rounded-full">Utama</span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label="Hapus alamat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-2">{addr.fullAddress}</p>
                  
                  {addr.notes && (
                    <p className="text-xs text-zinc-500 italic flex items-center gap-1">
                      <span>Catatan:</span> {addr.notes}
                    </p>
                  )}

                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="mt-4 text-xs font-bold text-zinc-500 hover:text-[#D4802A] transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Jadikan Utama
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Drawer for Add Address */}
      <Drawer.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-white dark:bg-zinc-900 flex flex-col rounded-t-[2rem] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-t-[2rem] flex-1 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-300 mb-8" />
              
              <div className="max-w-md mx-auto">
                <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-zinc-100 mb-6">Tambah Alamat Baru</h3>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Label Alamat <span className="text-red-500">*</span></label>
                    <input
                      {...register('label')}
                      placeholder="Contoh: Rumah, Kantor, Kosan"
                      className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all"
                    />
                    {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Alamat Lengkap <span className="text-red-500">*</span></label>
                    <textarea
                      {...register('fullAddress')}
                      placeholder="Nama jalan, gedung, no. rumah, RT/RW, kecamatan, kota"
                      className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all min-h-[100px]"
                    />
                    {errors.fullAddress && <p className="text-xs text-red-500 mt-1">{errors.fullAddress.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Catatan Kurir (Opsional)</label>
                    <input
                      {...register('notes')}
                      placeholder="Warna cat rumah, patokan, instruksi khusus"
                      className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-[#D4802A]/50 outline-none transition-all"
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <input
                      type="checkbox"
                      {...register('isDefault')}
                      className="w-5 h-5 accent-[#D4802A] rounded border-zinc-300"
                    />
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Jadikan alamat utama
                    </span>
                  </label>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#D4802A] hover:bg-[#b56d24] text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Alamat'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

    </div>
  )
}
