'use client'
import { useEffect } from 'react'
import { useCartStore } from '@/src/stores/cart.store'

export function CartSyncProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // Hydrate cart dari localStorage — satu kali saat mount
  useEffect(() => {
    useCartStore.persist.rehydrate()
  }, [])

  // ── Sprint 3 placeholder ───────────────────────────────────────────────────
  // TODO Sprint 3: Jika user login dan cart kosong,
  // fetch saved cart dari DB dan merge ke Zustand.
  // Ref: CartSyncProvider v2 dengan debounced DB write.
  // ─────────────────────────────────────────────────────────────────────────

  return <>{children}</>
}
