import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tentang Kami - Warisan Rasa Van Java',
  description:
    'Cerita Pisang Goreng Van Java sejak 2018 — membawa rasa warisan tradisional Jawa ke tingkat premium dengan bahan pilihan dari petani lokal dan resep rahasia turun-temurun.',
  openGraph: {
    title: 'Tentang Kami - Warisan Rasa Van Java',
    description:
      'Cerita, nilai, dan tim di balik Pisang Goreng Van Java sejak 2018.',
    type: 'website'
  }
}

export default function TentangKamiLayout({ children }: { children: React.ReactNode }) {
  return children
}
