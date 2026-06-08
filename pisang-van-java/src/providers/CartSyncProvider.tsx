'use client'
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useCartStore, type CartItem } from '@/src/stores/cart.store'
import { MergeConflictModal } from '@/components/user/MergeConflictModal'

export function CartSyncProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const cartItems = useCartStore((s) => s.items)
  const setItems = useCartStore((s) => s.setItems)
  const clearCart = useCartStore((s) => s.clearCart)
  const _hasHydrated = useCartStore((s) => s._hasHydrated)
  
  const setConflictState = useCartStore((s) => s.setConflictState)
  const resolveConflict = useCartStore((s) => s.resolveConflict)
  const conflictState = useCartStore((s) => s.conflictState)
  
  const pathname = usePathname()
  const [isFirstSyncDone, setIsFirstSyncDone] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousItemsRef = useRef<CartItem[]>([])

  // Auto-resolve ke LOCAL jika user pindah halaman saat modal terbuka
  useEffect(() => {
    if (conflictState !== null) {
      resolveConflict('LOCAL')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Hydrate cart dari localStorage — satu kali saat mount
  useEffect(() => {
    useCartStore.persist.rehydrate()
  }, [])

  // ── 1. Sinkronisasi Awal (Smart Merge Opsi B) saat Login ──
  useEffect(() => {
    if (!_hasHydrated) return
    if (status === 'authenticated' && !isFirstSyncDone) {
      const fetchAndMergeCart = async () => {
        try {
          const res = await fetch('/api/user/cart/sync')
          if (!res.ok) return
          const data = await res.json()
          
          if (data.success && Array.isArray(data.data?.items)) {
            const dbItems: CartItem[] = data.data.items
            const localItems = useCartStore.getState().items

            // Threshold Config (Sprint 4)
            const CONFLICT_THRESHOLD = {
              itemCount: 3,
              totalPrice: 75000,
              diffCount: 2,
            }

            const isSameCartItem = (a: CartItem, b: CartItem) => {
              if (a.menuVariantId !== b.menuVariantId) return false;
              if (a.notes !== b.notes) return false;
              
              const aToppings = Array.isArray(a.toppings) ? a.toppings : (a.topping ? [a.topping] : []);
              const bToppings = Array.isArray(b.toppings) ? b.toppings : (b.topping ? [b.topping] : []);
              
              if (aToppings.length !== bToppings.length) return false;
              
              const aIds = aToppings.map((t: any) => t.toppingId).sort();
              const bIds = bToppings.map((t: any) => t.toppingId).sort();
              
              return aIds.every((val, index) => val === bIds[index]);
            }

            // Hitung items yang berbeda (ada di lokal tapi tidak ada di DB)
            const differentItems = localItems.filter(localItem => 
              !dbItems.some(dbItem => isSameCartItem(dbItem, localItem))
            )

            // Smart Merge (Opsi A per user request): Keduanya digabung (DB + Lokal ditambahkan quantity-nya)
            const merged = [...dbItems]
            localItems.forEach(localItem => {
              const existingIndex = merged.findIndex(i => isSameCartItem(i, localItem))
              if (existingIndex !== -1) {
                merged[existingIndex] = {
                  ...merged[existingIndex],
                  quantity: merged[existingIndex].quantity + localItem.quantity
                }
              } else {
                merged.push({ ...localItem, cartItemId: crypto.randomUUID() })
              }
            })

            const mergedTotal = merged.reduce((acc, item) => acc + ((item.basePrice + (item.topping?.priceAdd || 0)) * item.quantity), 0)

            const shouldShowModal = 
              merged.length > CONFLICT_THRESHOLD.itemCount ||
              mergedTotal > CONFLICT_THRESHOLD.totalPrice ||
              differentItems.length > CONFLICT_THRESHOLD.diffCount

            if (dbItems.length > 0 && localItems.length > 0 && shouldShowModal) {
              setConflictState({ local: localItems, db: dbItems })
            } else {
              setItems(merged)
              previousItemsRef.current = merged
            }
          }
        } catch (error) {
          console.error('[CartSyncProvider] Init Sync Error:', error)
        } finally {
          setIsFirstSyncDone(true)
        }
      }

      fetchAndMergeCart()
    } else if (status === 'unauthenticated') {
      // Jika logout, kita mungkin ingin clear isFirstSyncDone agar bisa sync lagi saat login
      setIsFirstSyncDone(false)
    }
  }, [status, _hasHydrated, isFirstSyncDone, setItems])

  // ── 2. Persist to DB on Change (Debounced) ──
  const syncToDB = async (items: CartItem[]) => {
    if (status !== 'authenticated') return
    // Optimasi: Jangan panggil API jika items sama persis dengan yang terakhir disimpan
    if (JSON.stringify(items) === JSON.stringify(previousItemsRef.current)) return

    try {
      const res = await fetch('/api/user/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (res.ok) {
        previousItemsRef.current = [...items]
      }
    } catch (error) {
      console.error('[CartSyncProvider] Debounced Sync Error:', error)
      // TODO: Retry on network failure
    }
  }

  useEffect(() => {
    if (!_hasHydrated || status !== 'authenticated' || !isFirstSyncDone) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      syncToDB(cartItems)
    }, 2000) // Debounce 2 detik sesuai request

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [cartItems, status, _hasHydrated, isFirstSyncDone])

  // ── 3. Persist on VisibilityChange / BeforeUnload ──
  useEffect(() => {
    if (status !== 'authenticated') return

    const forceSync = () => {
      const currentItems = useCartStore.getState().items
      if (JSON.stringify(currentItems) !== JSON.stringify(previousItemsRef.current)) {
        // Gunakan navigator.sendBeacon untuk request fire-and-forget yang andal saat unload
        const payload = JSON.stringify({ items: currentItems })
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/user/cart/sync', blob)
        previousItemsRef.current = [...currentItems]
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        forceSync()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', forceSync)
    window.addEventListener('pagehide', forceSync)

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', forceSync)
      window.removeEventListener('pagehide', forceSync)
    }
  }, [status])

  return (
    <>
      {children}
      <MergeConflictModal />
    </>
  )
}
