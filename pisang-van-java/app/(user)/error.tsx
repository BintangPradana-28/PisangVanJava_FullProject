'use client'

import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function UserAreaError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        boundary: 'user-area-global',
        digest: error.digest ?? 'unknown'
      }
    })
  }, [error])

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-[4px] shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-[4px] flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">Terjadi Kesalahan</h1>
        <p className="text-gray-500 text-sm mb-6">
          Halaman ini mengalami gangguan. Tim kami sudah diberitahu dan sedang memperbaikinya.
        </p>

        {error.digest && (
          <p className="text-xs text-gray-400 font-mono mb-6">Kode error: {error.digest}</p>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={reset}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-[4px] py-3 font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full rounded-[4px] border-gray-200 text-gray-700 py-3 font-medium flex items-center justify-center gap-2"
          >
            <Link href="/">
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
