import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Menu Spesial - Pilihan Rasa Van Java',
  description:
    '12+ varian topping premium. 3 tipe gorengan — Kembung, Lumpia, Krispy. Semua dibuat segar setiap hari. Pesan langsung via WhatsApp.',
  openGraph: {
    title: 'Menu Spesial - Pisang Goreng Van Java',
    description: '12+ varian topping premium, 3 tipe gorengan, dibuat segar setiap hari.',
    type: 'website'
  }
}

export default function MenuSpesialLayout({ children }: { children: React.ReactNode }) {
  return children
}
