'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data dianggap fresh selama 60 detik
        staleTime: 60 * 1000,
        // Refetch otomatis saat user balik ke tab
        refetchOnWindowFocus: true,
        // Refetch saat reconnect internet (penting untuk PWA offline)
        refetchOnReconnect: true,
        // Retry 2x saat gagal
        retry: 2,
      }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
