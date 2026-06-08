'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CreditCard, RefreshCw, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PaymentError({ error, reset }: PaymentErrorProps) {
  const params = useParams()
  const orderId = typeof params?.orderId === 'string' ? params.orderId : null

  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        boundary: 'payment',
        digest: error.digest ?? 'unknown',
      },
      extra: {
        orderId: orderId ?? 'unknown',
        hasDigest: !!error.digest,
      },
    })
  }, [error, orderId])

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-8 h-8 text-blue-500" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Halaman Pembayaran Gagal Dimuat
        </h1>

        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-green-800 text-sm font-medium">
            ✅ Pesanan Anda sudah berhasil dibuat
          </p>
          <p className="text-green-700 text-xs mt-1">
            Data pesanan aman tersimpan di sistem kami. Anda bisa melanjutkan
            pembayaran dari halaman pesanan.
          </p>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          Terjadi gangguan saat memuat gateway pembayaran. Silakan coba lagi atau
          bayar melalui halaman pesanan Anda.
        </p>

        {error.digest && (
          <p className="text-xs text-gray-400 font-mono mb-6">
            Kode error: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={reset}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-3 font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Muat Ulang Pembayaran
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full rounded-full py-3 font-medium flex items-center justify-center gap-2 border-gray-200 text-gray-700"
          >
            <Link
              href={
                orderId
                  ? `/profile?tab=orders&highlight=${orderId}`
                  : '/profile?tab=orders'
              }
            >
              <ClipboardList className="w-4 h-4" />
              Lihat Status Pesanan
            </Link>
          </Button>

          <p className="text-xs text-gray-400 mt-2">
            Perlu bantuan?{' '}
            <a
              href={`https://wa.me/6281234567890?text=Halo%2C%20saya%20butuh%20bantuan%20pembayaran%20pesanan%20${
                orderId ?? ''
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 underline"
            >
              Chat CS kami
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
