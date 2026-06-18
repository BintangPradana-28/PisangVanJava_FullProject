import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pisanggorengvanjava.com'

export const metadata: Metadata = {
  title: 'Menu Spesial - Pilihan Rasa Van Java | Pisang Van Java',
  description:
    '12+ varian topping premium. 3 tipe gorengan — Kembung, Lumpia, Krispy. Semua dibuat segar setiap hari. Pesan langsung via WhatsApp.',
  openGraph: {
    title: 'Menu Spesial - Pisang Goreng Van Java',
    description:
      '12+ varian topping premium, 3 tipe gorengan, dibuat segar setiap hari.',
    url: `${baseUrl}/menu-spesial`,
    siteName: 'Pisang Van Java',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/kitchen.png`,
        width: 1200,
        height: 630,
        alt: 'Pisang Goreng Van Java — Menu Spesial'
      }
    ]
  }
}

export default function MenuSpesialLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return children
}
