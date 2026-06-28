'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, HelpCircle, Mail, MapPin, Phone, Search } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'

interface FAQItem {
  id: string
  category: 'ordering' | 'delivery' | 'payment' | 'franchise'
  questionId: string
  questionEn: string
  answerId: string
  answerEn: string
}

const FAQ_DATA: FAQItem[] = [
  // ── ORDERING ──
  {
    id: 'o1',
    category: 'ordering',
    questionId: 'Bagaimana cara melakukan pemesanan online?',
    questionEn: 'How do I place an order online?',
    answerId:
      'Anda dapat memilih menu favorit Anda di halaman "Menu Spesial", menentukan jenis adonan (Kembung, Lumpia, Krispy) beserta topping pilihan, lalu memasukkannya ke keranjang belanja. Klik tombol checkout, isi detail pengiriman/pengambilan, dan selesaikan pembayaran.',
    answerEn:
      'You can choose your favorite menu items on the "Special Menu" page, select the batter type (Kembung, Lumpia, Krispy) along with toppings of your choice, and add them to the cart. Click checkout, fill in the delivery/pickup details, and complete the payment.'
  },
  {
    id: 'o2',
    category: 'ordering',
    questionId: 'Apakah saya bisa memesan tanpa membuat akun member?',
    questionEn: 'Can I order without creating a member account?',
    answerId:
      'Ya, Anda dapat melakukan pemesanan sebagai tamu (Guest Checkout). Namun, dengan mendaftar sebagai member, Anda akan mendapatkan Koin Pisang loyalitas di setiap transaksi yang bisa digunakan sebagai potongan harga belanja berikutnya.',
    answerEn:
      'Yes, you can check out as a guest. However, by registering as a member, you will earn loyalty Koin Pisang on every transaction, which can be used as discounts for future purchases.'
  },
  {
    id: 'o3',
    category: 'ordering',
    questionId: 'Apakah menu Pisang Goreng Van Java aman dikonsumsi anak-anak?',
    questionEn: 'Are Pisang Goreng Van Java products safe for kids?',
    answerId:
      'Sangat aman. Produk kami dibuat dari 100% bahan alami, pisang segar pilihan dari petani lokal, tanpa pengawet sintesis, dan digoreng higienis dengan minyak berkualitas.',
    answerEn:
      'Absolutely. Our products are made from 100% natural ingredients, fresh bananas selected from local farmers, with no synthetic preservatives, and fried hygienically with quality oil.'
  },
  // ── DELIVERY ──
  {
    id: 'd1',
    category: 'delivery',
    questionId: 'Berapa jarak pengiriman maksimal dari outlet?',
    questionEn: 'What is the maximum delivery distance from the outlet?',
    answerId:
      'Saat ini pengiriman instan online kami melayani radius maksimal 15 km dari outlet terdekat untuk memastikan pisang tetap hangat dan renyah saat sampai di tempat Anda.',
    answerEn:
      'Currently, our online instant delivery serves a maximum radius of 15 km from the nearest outlet to ensure the bananas remain warm and crispy when they reach you.'
  },
  {
    id: 'd2',
    category: 'delivery',
    questionId: 'Berapa biaya pengiriman yang dikenakan?',
    questionEn: 'How much is the delivery fee?',
    answerId:
      'Biaya pengiriman dihitung secara otomatis berdasarkan jarak jarak pengiriman dari outlet kami ke alamat tujuan Anda saat proses checkout.',
    answerEn:
      'The delivery fee is calculated automatically based on the distance from our outlet to your destination address during the checkout process.'
  },
  {
    id: 'd3',
    category: 'delivery',
    questionId: 'Apakah saya bisa mengambil sendiri pesanan di outlet (Self Pickup)?',
    questionEn: 'Can I choose self-pickup at the outlet?',
    answerId:
      'Tentu saja. Di halaman checkout, Anda bisa memilih metode pengambilan "Ambil Sendiri" (Self Pickup) untuk menghemat biaya kirim dan mengambil pesanan langsung ke outlet sesuai jam siap.',
    answerEn:
      'Of course. On the checkout page, you can choose the "Self Pickup" method to save on delivery fees and pick up your order directly from the store at the scheduled time.'
  },
  // ── PAYMENT ──
  {
    id: 'p1',
    category: 'payment',
    questionId: 'Metode pembayaran apa saja yang didukung?',
    questionEn: 'What payment methods are supported?',
    answerId:
      'Kami mendukung berbagai pilihan pembayaran aman yang terintegrasi dengan Midtrans, meliputi Transfer Bank (Virtual Account), E-Wallet (GoPay, ShopeePay, QRIS), Kartu Kredit, serta bayar di tempat (COD) untuk wilayah tertentu.',
    answerEn:
      'We support various secure payment options integrated with Midtrans, including Bank Transfer (Virtual Account), E-Wallet (GoPay, ShopeePay, QRIS), Credit Card, and Cash on Delivery (COD) for selected areas.'
  },
  {
    id: 'p2',
    category: 'payment',
    questionId: 'Bagaimana jika pesanan saya dibatalkan, apakah ada pengembalian dana (Refund)?',
    questionEn: 'What if my order is canceled, is there a refund?',
    answerId:
      'Apabila pesanan dibatalkan karena kendala operasional outlet, dana pembayaran nontunai Anda akan dikembalikan secara penuh. Proses refund akan diverifikasi oleh sistem dan masuk kembali sesuai metode pembayaran asal (biasanya 1-3 hari kerja untuk e-wallet/VA).',
    answerEn:
      'If an order is canceled due to outlet operational constraints, your cashless payment will be refunded in full. The refund process will be verified by the system and returned to the original payment method (usually 1-3 business days for e-wallets/VA).'
  },
  // ── FRANCHISE ──
  {
    id: 'f1',
    category: 'franchise',
    questionId: 'Bagaimana cara bergabung dalam kemitraan / franchise?',
    questionEn: 'How do I join the partnership or franchise?',
    answerId:
      'Anda dapat masuk ke halaman Kemitraan (Reseller/B2B Portal) di web ini, mengisi formulir pendaftaran mitra, dan mengunggah dokumen pendukung. Tim Business Development kami akan menghubungi Anda dalam 2x24 jam melalui WhatsApp untuk proses negosiasi dan survei lokasi.',
    answerEn:
      'You can go to the Partnership (Reseller/B2B Portal) page on this website, fill out the partner registration form, and upload the supporting documents. Our Business Development team will contact you within 2x24 hours via WhatsApp for negotiations and site survey.'
  },
  {
    id: 'f2',
    category: 'franchise',
    questionId: 'Apa saja keuntungan menjadi reseller Pisang Van Java?',
    questionEn: 'What are the benefits of becoming a Pisang Van Java reseller?',
    answerId:
      'Reseller resmi berhak mendapatkan harga grosir khusus (Wholesale Price List) dengan margin keuntungan hingga 35%, prioritas suplai bahan baku pisang berkualitas premium, materi pemasaran digital gratis, serta bimbingan operasional standar.',
    answerEn:
      'Official resellers are entitled to special wholesale prices with profit margins of up to 35%, priority supply of premium raw bananas, free digital marketing materials, and standard operational guidance.'
  }
]

export default function FAQPage() {
  const { locale } = useLanguage()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const categories = [
    { key: 'all', labelId: 'Semua Pertanyaan', labelEn: 'All Questions' },
    { key: 'ordering', labelId: 'Pemesanan', labelEn: 'Ordering' },
    { key: 'delivery', labelId: 'Pengiriman', labelEn: 'Delivery' },
    { key: 'payment', labelId: 'Pembayaran', labelEn: 'Payments' },
    { key: 'franchise', labelId: 'Kemitraan & Reseller', labelEn: 'Partnership' }
  ]

  const filteredFaqs = FAQ_DATA.filter((faq) => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory
    const questionText = locale === 'id' ? faq.questionId : faq.questionEn
    const answerText = locale === 'id' ? faq.answerId : faq.answerEn
    const matchesSearch =
      questionText.toLowerCase().includes(search.toLowerCase()) ||
      answerText.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <main className="w-full min-h-screen pt-28 pb-16 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-[800px] mx-auto px-6 space-y-10">
        {/* ── HEADER ── */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            {locale === 'id' ? 'Pusat Bantuan' : 'Help Center'}
          </div>
          <h1 className="font-serif font-black text-3xl sm:text-5xl text-zinc-900 dark:text-zinc-50 leading-tight">
            {locale === 'id' ? 'Ada yang bisa kami bantu?' : 'How can we help you?'}
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
            {locale === 'id'
              ? 'Temukan jawaban cepat seputar cara memesan, jangkauan pengiriman, metode pembayaran, dan kemitraan.'
              : 'Find quick answers regarding ordering, delivery ranges, payment methods, and partnership.'}
          </p>
        </section>

        {/* ── SEARCH BAR ── */}
        <section className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'id' ? 'Cari pertanyaan...' : 'Search questions...'}
            className="w-full pl-12 pr-4 py-4 rounded-xl outline-none transition-all bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-150 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm sm:text-base shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-zinc-650"
            >
              Clear
            </button>
          )}
        </section>

        {/* ── CATEGORY TABS ── */}
        <section className="flex gap-2 overflow-x-auto scrollbar-none pb-2 justify-start sm:justify-center border-b border-zinc-200/60 dark:border-zinc-800/80">
          {categories.map((cat) => {
            const active = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key)
                  setOpenId(null)
                }}
                className={`flex-shrink-0 text-xs font-bold px-4 py-2.5 rounded-full transition-all duration-200 ${
                  active
                    ? 'bg-amber-brand text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {locale === 'id' ? cat.labelId : cat.labelEn}
              </button>
            )
          })}
        </section>

        {/* ── ACCORDION LIST ── */}
        <section className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/50 dark:border-zinc-850/60">
              <p className="text-zinc-500 dark:text-zinc-450 text-sm">
                {locale === 'id'
                  ? 'Pertanyaan tidak ditemukan. Coba dengan kata kunci lain.'
                  : 'No questions found. Try searching other keywords.'}
              </p>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id
              const questionText = locale === 'id' ? faq.questionId : faq.questionEn
              const answerText = locale === 'id' ? faq.answerId : faq.answerEn

              return (
                <div
                  key={faq.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-850/60 rounded-xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    className="w-full flex items-center justify-between p-5 text-left font-serif font-black text-sm sm:text-base text-zinc-800 dark:text-zinc-150 hover:bg-zinc-50 dark:hover:bg-zinc-850/30 transition-colors"
                  >
                    <span>{questionText}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-amber-brand' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                      >
                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-650 dark:text-zinc-350 leading-relaxed border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-850/15">
                          {answerText}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </section>

        {/* ── STILL HAVE QUESTIONS ── */}
        <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-2xl p-8 border border-zinc-800 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="font-serif font-bold text-lg sm:text-xl">
              {locale === 'id' ? 'Masih memiliki pertanyaan?' : 'Still have questions?'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              {locale === 'id'
                ? 'Hubungi tim layanan pelanggan kami jika Anda membutuhkan bantuan lebih lanjut seputar pesanan atau kerjasama.'
                : 'Contact our customer service team if you need further help regarding orders or cooperation.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://wa.me/6281312167554"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs sm:text-sm transition-all active:scale-95"
            >
              <Phone className="w-4 h-4" /> WhatsApp Support
            </a>
            <a
              href="mailto:support@pisangvanjava.com"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-bold text-xs sm:text-sm border border-zinc-700 transition-all active:scale-95"
            >
              <Mail className="w-4 h-4" /> Email Support
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
