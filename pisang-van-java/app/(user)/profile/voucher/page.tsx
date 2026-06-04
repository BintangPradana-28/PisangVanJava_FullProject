import { Ticket } from 'lucide-react'

export default function VoucherPage() {
  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/50 dark:border-zinc-800/80">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-[#D4802A]/10 text-[#D4802A] flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100">Voucher & Poin</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Gunakan voucher untuk mendapatkan diskon spesial</p>
          </div>
        </div>

        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <Ticket className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">Belum Ada Voucher</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">Pantau terus aplikasi Pisang Van Java untuk mendapatkan promo dan voucher menarik setiap minggunya.</p>
        </div>
      </section>
    </div>
  )
}
