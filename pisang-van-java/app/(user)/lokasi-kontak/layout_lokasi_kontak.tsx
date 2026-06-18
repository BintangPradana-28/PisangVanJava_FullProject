import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lokasi & Kontak - Cipayung, Jakarta Timur',
  description:
    'Temukan lokasi gerai, jam operasional, dan info pengantaran Pisang Goreng Van Java di Cipayung, Jakarta Timur. Hubungi kami langsung via WhatsApp.',
  openGraph: {
    title: 'Lokasi & Kontak - Pisang Goreng Van Java',
    description: 'Lokasi gerai, jam operasional, dan kontak Pisang Goreng Van Java di Cipayung.',
    type: 'website'
  }
}

export default function LokasiKontakLayout({ children }: { children: React.ReactNode }) {
  return children
}
