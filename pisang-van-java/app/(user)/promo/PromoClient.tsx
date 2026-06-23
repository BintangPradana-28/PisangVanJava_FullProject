'use client'

import { motion } from 'framer-motion'
import { Ticket, Coins, Gift, Sparkles, Copy, Clock, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

interface Voucher {
  id: string
  code: string
  discountType: string
  discountValue: number
  minPurchase: number
  maxDiscount: number | null
  endDate: string
}

export default function PromoClient({ vouchers }: { vouchers: Voucher[] }) {
  const { t, locale } = useLanguage()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(n)

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateStr))
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(
      locale === 'id'
        ? `Kode voucher ${code} berhasil disalin!`
        : `Voucher code ${code} successfully copied!`
    )
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const promoBundles = [
    {
      id: 'bundle-1',
      title: locale === 'id' ? 'Paket Heritage Bundle' : 'Heritage Bundle Pack',
      description:
        locale === 'id'
          ? 'Beli 2 Box Pisang Kembung Original, Gratis 1 Box Lumpia Coklat!'
          : 'Buy 2 Boxes of Original Kembung, Get 1 Box of Chocolate Lumpia FREE!',
      discount: locale === 'id' ? 'Hemat 25%' : 'Save 25%',
      badge: locale === 'id' ? 'Paling Populer' : 'Best Seller',
      gradient: 'from-orange-500 to-amber-500',
      emoji: '🍌'
    },
    {
      id: 'bundle-2',
      title: locale === 'id' ? 'Weekend Sweet Treat' : 'Weekend Sweet Treat',
      description:
        locale === 'id'
          ? 'Diskon khusus untuk varian Matcha Milky & Strawberry Milky setiap Sabtu - Minggu.'
          : 'Special discounts for Matcha Milky & Strawberry Milky every Saturday - Sunday.',
      discount: locale === 'id' ? 'Potongan Rp 10.000' : 'Rp 10,000 Off',
      badge: locale === 'id' ? 'Akhir Pekan' : 'Weekend Only',
      gradient: 'from-pink-500 to-rose-500',
      emoji: '🍓'
    },
    {
      id: 'bundle-3',
      title: locale === 'id' ? 'Family Feast' : 'Family Feast',
      description:
        locale === 'id'
          ? 'Dapatkan 3 Box varian Krispy topping premium bebas pilih.'
          : 'Get 3 Boxes of premium Krispy variants with free topping choices.',
      discount: locale === 'id' ? 'Hanya Rp 40.000' : 'Only Rp 40,000',
      badge: locale === 'id' ? 'Paket Rame-Rame' : 'Group Saver',
      gradient: 'from-purple-500 to-indigo-500',
      emoji: '🥨'
    }
  ]

  return (
    <div className="space-y-12">
      {/* ── HERO BANNER ── */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-amber-950 text-white p-8 md:p-12 shadow-xl border border-zinc-800/80">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl text-left">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              {locale === 'id' ? 'Kupon & Penawaran Eksklusif' : 'Exclusive Offers & Coupons'}
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-black tracking-tight leading-tight">
              {locale === 'id' ? 'Promo Menarik' : 'Special Promos'}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                Van Java
              </span>
            </h1>
            <p className="text-zinc-300 text-sm md:text-base leading-relaxed">
              {locale === 'id'
                ? 'Nikmati kelezatan pisang goreng premium dengan berbagai penawaran diskon, potongan langsung, serta koin loyalitas melimpah.'
                : 'Enjoy premium fried bananas with various discount offers, instant price cuts, and abundant loyalty points.'}
            </p>
          </div>
          <div className="w-24 h-24 md:w-32 md:w-32 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30 backdrop-blur-md shrink-0">
            <span className="text-5xl md:text-6xl animate-bounce">🎁</span>
          </div>
        </div>
      </section>

      {/* ── BUNDLING OFFERS ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
            <Gift className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-serif text-zinc-950 dark:text-zinc-50">
              {locale === 'id' ? 'Paket Bundling & Menu Spesial' : 'Bundles & Special Menu'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {locale === 'id'
                ? 'Pesan sekaligus untuk porsi lebih banyak dengan harga lebih terjangkau.'
                : 'Order together for larger portions at a lower price.'}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {promoBundles.map((bundle, index) => (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className={`h-2 bg-gradient-to-r ${bundle.gradient}`} />
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{bundle.emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350">
                      {bundle.badge}
                    </span>
                  </div>
                  <h3 className="font-serif font-black text-lg text-zinc-900 dark:text-zinc-100">
                    {bundle.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {bundle.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-500">
                    {bundle.discount}
                  </span>
                  <Link
                    href="/menu-spesial"
                    className="inline-flex items-center gap-1 text-xs font-bold text-zinc-900 dark:text-zinc-150 hover:text-amber-brand dark:hover:text-amber-brand transition-colors"
                  >
                    {locale === 'id' ? 'Beli Sekarang' : 'Order Now'}{' '}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── VOUCHER TICKET GRID ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-serif text-zinc-950 dark:text-zinc-50">
              {locale === 'id' ? 'Kupon Diskon Tersedia' : 'Available Discount Coupons'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {locale === 'id'
                ? 'Salin kode voucher di bawah dan gunakan saat proses pembayaran.'
                : 'Copy the voucher code below and use it during checkout.'}
            </p>
          </div>
        </div>

        {vouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 rounded-xl">
            <Ticket className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-zinc-850 dark:text-zinc-250 font-bold mb-1">
              {locale === 'id' ? 'Belum Ada Voucher Publik' : 'No Public Vouchers'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
              {locale === 'id'
                ? 'Kami sedang mempersiapkan voucher baru untuk Anda. Silakan hubungi admin atau ikuti sosial media kami.'
                : 'We are preparing new vouchers for you. Please contact admin or follow our social media.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {vouchers.map((voucher) => (
              <div
                key={voucher.id}
                className="group relative bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-6 hover:border-amber-400 dark:hover:border-amber-500/80 transition-all overflow-hidden flex flex-col justify-between shadow-sm"
              >
                {/* Simulated perforations on tickets */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-6 h-6 bg-zinc-50 dark:bg-zinc-950 rounded-full border-r border-zinc-200/60 dark:border-zinc-800" />
                <div className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-6 h-6 bg-zinc-50 dark:bg-zinc-950 rounded-full border-l border-zinc-200/60 dark:border-zinc-800" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 font-mono">
                      {voucher.code}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-850 px-2 py-1 rounded">
                      <Clock className="w-3.5 h-3.5" />
                      Batas: {formatDate(voucher.endDate)}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                      Diskon{' '}
                      {voucher.discountType === 'PERCENTAGE'
                        ? `${voucher.discountValue}%`
                        : formatPrice(voucher.discountValue)}
                    </h3>
                    {voucher.discountType === 'PERCENTAGE' && voucher.maxDiscount && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Maksimal Potongan: {formatPrice(voucher.maxDiscount)}
                      </p>
                    )}
                    <p className="text-xs text-zinc-550 dark:text-zinc-450 mt-1">
                      Min. Belanja: {formatPrice(voucher.minPurchase)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-end">
                  <button
                    onClick={() => handleCopy(voucher.code)}
                    className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 px-3 py-1.5 rounded-lg transition-colors border border-amber-200/30"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedCode === voucher.code
                      ? locale === 'id'
                        ? 'Disalin!'
                        : 'Copied!'
                      : locale === 'id'
                        ? 'Salin Kode'
                        : 'Copy Code'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── LOYALTY PROGRAM ── */}
      <section className="bg-gradient-to-br from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-750 text-white rounded-2xl p-8 md:p-10 shadow-lg shadow-amber-200/30 dark:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/20 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-amber-800/30 rounded-full blur-2xl" />

        <div className="relative z-10 grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
              <Coins className="w-3.5 h-3.5" />
              {locale === 'id' ? 'Koin Pisang' : 'Koin Pisang Rewards'}
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-black">
              {locale === 'id' ? 'Kumpulkan Koin & Makan Gratis!' : 'Collect Coins & Eat for Free!'}
            </h2>
            <p className="text-white/95 text-xs md:text-sm leading-relaxed max-w-xl">
              {locale === 'id'
                ? 'Setiap transaksi senilai Rp 10.000 akan mendapatkan 1 Koin Pisang (bernilai Rp 1.000). Koin yang Anda kumpulkan dapat digunakan secara langsung sebagai potongan belanja pada transaksi berikutnya.'
                : 'Every Rp 10,000 transaction earns 1 Koin Pisang (worth Rp 1,000). The coins you collect can be directly used as a discount on your next transaction.'}
            </p>
          </div>

          <div className="bg-black/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-white uppercase tracking-wider text-center">
              {locale === 'id' ? 'Cara Menggunakan' : 'How to Use'}
            </h4>
            <ul className="text-xs text-white/90 space-y-2">
              <li className="flex gap-2">
                <span>1.</span>
                <span>
                  {locale === 'id'
                    ? 'Buat akun member atau login sebelum memesan.'
                    : 'Create a member account or login before ordering.'}
                </span>
              </li>
              <li className="flex gap-2">
                <span>2.</span>
                <span>
                  {locale === 'id'
                    ? 'Lakukan checkout menu favorit Anda secara online.'
                    : 'Checkout your favorite menu items online.'}
                </span>
              </li>
              <li className="flex gap-2">
                <span>3.</span>
                <span>
                  {locale === 'id'
                    ? 'Gunakan koin Anda langsung di formulir pembayaran.'
                    : 'Use your coins directly in the checkout payment form.'}
                </span>
              </li>
            </ul>
            <div className="pt-2 text-center">
              <Link
                href="/member-register"
                className="inline-block text-xs font-black bg-white hover:bg-white/95 text-amber-600 px-4 py-2.5 rounded-lg shadow transition-all active:scale-95"
              >
                {locale === 'id' ? 'Daftar Member Sekarang' : 'Register Now'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
