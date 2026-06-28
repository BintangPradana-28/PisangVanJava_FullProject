import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { safeJsonLdScript } from '@/lib/sanitize'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pisanggorengvanjava.com'

export const metadata: Metadata = {
  title: 'Lokasi & Kontak - Cipayung, Jakarta Timur | Pisang Van Java',
  description:
    'Temukan lokasi gerai, jam operasional, dan info pengantaran Pisang Goreng Van Java di Cipayung, Jakarta Timur. Hubungi kami langsung via WhatsApp.',
  openGraph: {
    title: 'Lokasi & Kontak - Pisang Goreng Van Java',
    description:
      'Lokasi gerai, jam operasional, dan kontak Pisang Goreng Van Java di Cipayung, Jakarta Timur.',
    url: `${baseUrl}/lokasi-kontak`,
    siteName: 'Pisang Van Java',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/kitchen.png`,
        width: 1200,
        height: 630,
        alt: 'Pisang Goreng Van Java — Lokasi & Kontak'
      }
    ]
  }
}

// SEO FIX (L11): Fetch SiteSettings for LocalBusiness JSON-LD
const getCachedContactSettings = unstable_cache(
  async () => {
    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: ['alamat', 'nomor_wa', 'jam_operasional'] } },
      select: { key: true, value: true }
    })
    const map: Record<string, string> = {}
    for (const s of settings) {
      map[s.key] = s.value
    }
    return map
  },
  ['lokasi-kontak-settings'],
  { revalidate: 3600, tags: ['settings'] }
)

export default async function LokasiKontakLayout({
  children
}: {
  children: React.ReactNode
}): Promise<React.ReactNode> {
  let siteSettings: Record<string, string> = {}
  try {
    siteSettings = await getCachedContactSettings()
  } catch {
    console.warn('[Safe Log] Failed to fetch site settings for JSON-LD')
  }

  const storePhone = siteSettings.nomor_wa || '6285773728748'
  const storeAddress =
    siteSettings.alamat ||
    'Jl. Raya Cilangkap l Rt.2/Rw.5, Cilangkap, Kec. Cipayung, Kota Jakarta Timur'
  const storeHours = siteSettings.jam_operasional || 'Setiap Hari: 10.00–21.00 WIB'

  // SEO FIX (L11): LocalBusiness JSON-LD for rich local search results
  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/lokasi-kontak`,
    name: 'Pisang Goreng Van Java',
    image: `${baseUrl}/kitchen.png`,
    url: baseUrl,
    telephone: `+${storePhone}`,
    priceRange: 'Rp10.000 - Rp50.000',
    address: {
      '@type': 'PostalAddress',
      streetAddress: storeAddress,
      addressLocality: 'Jakarta Timur',
      addressRegion: 'DKI Jakarta',
      postalCode: '13870',
      addressCountry: 'ID'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -6.3543,
      longitude: 106.9036
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '10:00',
      closes: '21:00'
    },
    description: `Gerai pisang goreng premium dengan aneka topping. ${storeHours}`,
    servesCuisine: 'Indonesian Snacks',
    currenciesAccepted: 'IDR',
    paymentAccepted: 'Cash, QRIS, Transfer Bank'
  }

  // SEO FIX (L6): FAQPage JSON-LD for rich FAQ snippets in Google
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Apakah bisa pesan dalam jumlah besar?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Tentu! Kami melayani pemesanan partai besar (catering, event) — hubungi kami via WhatsApp untuk info harga spesial.'
        }
      },
      {
        '@type': 'Question',
        name: 'Berapa lama waktu pengiriman?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pengiriman dilakukan melalui mitra ojek online (Grab/Gojek/Lalamove) dengan estimasi waktu 20-40 menit tergantung jarak lokasi Anda dari gerai kami.'
        }
      },
      {
        '@type': 'Question',
        name: 'Apakah ada pilihan topping tanpa gula?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ya! Kami menyediakan pilihan original (tanpa topping manis) dan bisa request khusus saat pemesanan.'
        }
      },
      {
        '@type': 'Question',
        name: 'Apakah ada diskon untuk member?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Member terdaftar mendapatkan akses promo eksklusif. Daftar sekarang di halaman Login Member!'
        }
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD schema requires raw HTML injection
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD schema requires raw HTML injection
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(faqJsonLd) }}
      />
      {children}
    </>
  )
}
