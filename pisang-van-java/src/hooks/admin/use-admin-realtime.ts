'use client'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabaseBrowserClient } from '@/src/lib/supabase-client'
import toast from 'react-hot-toast'

export function useAdminRealtimeSync() {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!supabaseBrowserClient) return
    const channel = supabaseBrowserClient
      .channel('pvj-admin-internal')

      // Live new order masuk
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'Order', // Prisma uses 'Order'
      }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
        toast.success(`🍌 Order baru masuk! #${payload.new.orderNumber}`)
      })

      // Order status berubah
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'Order',
      }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      })

      // Stok berubah — update admin product table
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'MenuVariant', // Prisma uses 'MenuVariant'
      }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ['admin-products'] })

        // Alert admin jika stok kritis
        if (payload.new.stock <= 5 && payload.new.stock > 0) {
          toast(`⚠️ Stok ${payload.new.flavorName} tinggal ${payload.new.stock}`, {
            icon: '⚠️',
            style: { background: '#FEF3C7' }
          })
        }
        if (payload.new.stock === 0) {
          toast.error(`❌ ${payload.new.flavorName} HABIS`)
        }
      })

      .subscribe()

    return () => { supabaseBrowserClient?.removeChannel(channel) }
  }, [queryClient])
}
