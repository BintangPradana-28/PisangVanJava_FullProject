import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pisanggorengvanjava.com'

export const metadata: Metadata = {
  title: 'Tentang Kami - Warisan Rasa Van Java | Pisang Van Java',
  description:
    'Cerita Pisang Goreng Van Java sejak 2018 — membawa rasa warisan tradisional Jawa ke tingkat premium dengan bahan pilihan dari petani lokal dan resep rahasia turun-temurun.',
  openGraph: {
    title: 'Tentang Kami - Warisan Rasa Van Java',
    description: 'Cerita, nilai, dan tim di balik Pisang Goreng Van Java sejak 2018.',
    url: `${baseUrl}/tentang-kami`,
    siteName: 'Pisang Van Java',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/kitchen.png`,
        width: 1200,
        height: 630,
        alt: 'Pisang Goreng Van Java — Tentang Kami'
      }
    ]
  }
}

export default function TentangKamiLayout({
  children
}: {
  children: React.ReactNode
}): React.ReactNode {
  return children
}
