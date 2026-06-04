'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Shield, AlertTriangle } from 'lucide-react'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'
import { deleteAccountPermanently } from '@/src/features/user/actions'

export default function KeamananPage() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/50 dark:border-zinc-800/80">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100">Keamanan Akun</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pengaturan privasi dan kontrol akun tingkat lanjut</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 mb-2">Riwayat Login</h3>
            <p className="text-sm text-zinc-500 mb-4">Pastikan tidak ada aktivitas login yang mencurigakan di akun Anda.</p>
            <p className="text-xs text-zinc-400 italic">Fitur riwayat sesi sedang dalam pengembangan.</p>
          </div>
        </div>
      </section>

      {/* DANGER ZONE */}
      <section className="bg-red-50/50 dark:bg-red-950/10 rounded-3xl p-6 md:p-8 shadow-sm border border-red-200/50 dark:border-red-900/30">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-red-600 dark:text-red-500">Zona Berbahaya</h2>
            <p className="text-sm text-red-500/80 dark:text-red-400/80">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-2">
              Hapus Akun Permanen <AlertTriangle className="w-4 h-4 text-red-500" />
            </h3>
            <p className="text-sm text-zinc-500 max-w-md">
              Menghapus akun akan menghapus semua data diri, riwayat pesanan, alamat, dan poin Anda secara permanen.
            </p>
          </div>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="shrink-0 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white dark:bg-red-950/30 dark:border-red-900/50 dark:hover:bg-red-600 dark:text-red-400 font-bold py-3 px-6 rounded-xl transition-all"
          >
            Hapus Akun
          </button>
        </div>
      </section>

      {/* DELETE ACCOUNT MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-red-500/30"
          >
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-4">Peringatan Terakhir</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Anda akan kehilangan akses secara permanen. Silakan ketik <strong>HAPUS AKUN SAYA</strong> untuk mengonfirmasi tindakan ini.
            </p>
            
            <form action={async (formData) => {
              setIsDeleting(true);
              const result = await deleteAccountPermanently(formData);
              if (result.success) {
                toast.success(result.message || "Akun berhasil dihapus.");
                await signOut({ callbackUrl: '/' });
              } else {
                toast.error(result.error || "Gagal menghapus akun.");
                setIsDeleting(false);
              }
            }}>
              <input
                type="text"
                name="confirmationString"
                required
                className="w-full p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 mb-6 font-mono text-center tracking-widest"
                placeholder="HAPUS AKUN SAYA"
              />
              <div className="flex gap-4">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : 'Ya, Hapus'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
