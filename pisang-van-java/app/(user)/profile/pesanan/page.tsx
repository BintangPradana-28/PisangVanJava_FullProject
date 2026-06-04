import { Metadata } from 'next'
import OrderHistory from '@/components/user/OrderHistory'
import { ShoppingBag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Riwayat Pesanan | Pisang Goreng Van Java',
  description: 'Daftar riwayat pesanan Anda.',
}

export default function PesananPage() {
  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/50 dark:border-zinc-800/80">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-[#D4802A]/10 text-[#D4802A] flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100">Riwayat Pesanan</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pantau status dan riwayat transaksi Anda</p>
          </div>
        </div>

        {/* Existing Order History Component */}
        <div className="mt-6">
          <OrderHistory useAuth={true} />
        </div>
      </section>
    </div>
  )
}
