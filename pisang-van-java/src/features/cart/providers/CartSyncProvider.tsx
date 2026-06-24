'use client'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MergeConflictModal } from '@/src/features/cart/components/MergeConflictModal'
import {
  type CartItem,
  type CartTopping,
  useCartStore
} from '@/src/features/cart/stores/cart.store'
import { api } from '@/src/lib/api'

interface CartSyncResponse {
  success: boolean
  data?: {
    items: CartItem[]
  }
}

export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const cartItems = useCartStore((s) => s.items)
  const setItems = useCartStore((s) => s.setItems)
  const _hasHydrated = useCartStore((s) => s._hasHydrated)

  const setConflictState = useCartStore((s) => s.setConflictState)
  const resolveConflict = useCartStore((s) => s.resolveConflict)
  const conflictState = useCartStore((s) => s.conflictState)

  const pathname = usePathname()
  const [isFirstSyncDone, setIsFirstSyncDone] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousItemsRef = useRef<CartItem[]>([])

  // Auto-resolve ke LOCAL jika user pindah halaman saat modal terbuka
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only run on pathname change to auto-resolve on navigation
  useEffect(() => {
    if (conflictState !== null) {
      resolveConflict('LOCAL')
    }
  }, [pathname])

  // Hydrate cart dari localStorage — satu kali saat mount
  useEffect(() => {
    useCartStore.persist.rehydrate()
  }, []) // ── 1. Sinkronisasi Awal & Lintas Perangkat (Focus Sync) ──
  useEffect(() => {
    if (!_hasHydrated) return

    if (status === 'unauthenticated') {
      setIsFirstSyncDone(false)
      return
    }

    if (status !== 'authenticated') return

    // Reset status logout jika terdeteksi login aktif
    if (useCartStore.getState().isLoggingOut) {
      useCartStore.getState().setIsLoggingOut(false)
    }

    const fetchAndMergeCart = async () => {
      try {
        const data = await api<CartSyncResponse>('/api/user/cart/sync')

        if (data.success && Array.isArray(data.data?.items)) {
          const dbItems: CartItem[] = data.data.items
          const localItems = useCartStore.getState().items

          // Threshold Config (Sprint 4)
          const CONFLICT_THRESHOLD = {
            itemCount: 3,
            totalPrice: 75000,
            diffCount: 2
          }

          const isSameCartItem = (a: CartItem, b: CartItem) => {
            if (a.menuVariantId !== b.menuVariantId) return false
            if (a.notes !== b.notes) return false

            const aToppings = Array.isArray(a.toppings)
              ? a.toppings
              : (a as unknown as { topping?: CartTopping }).topping
                ? [(a as unknown as { topping: CartTopping }).topping]
                : []
            const bToppings = Array.isArray(b.toppings)
              ? b.toppings
              : (b as unknown as { topping?: CartTopping }).topping
                ? [(b as unknown as { topping: CartTopping }).topping]
                : []

            if (aToppings.length !== bToppings.length) return false

            const aIds = aToppings.map((t) => t.toppingId).sort()
            const bIds = bToppings.map((t) => t.toppingId).sort()

            return aIds.every((val, index) => val === bIds[index])
          }

          // Hitung items yang berbeda (ada di lokal tapi tidak ada di DB)
          const differentItems = localItems.filter(
            (localItem) => !dbItems.some((dbItem) => isSameCartItem(dbItem, localItem))
          )

          // Smart Merge: Keduanya digabung (DB + Lokal ditambahkan quantity-nya)
          const merged = structuredClone(dbItems)
          localItems.forEach((localItem) => {
            const existingIndex = merged.findIndex((i) => isSameCartItem(i, localItem))
            if (existingIndex !== -1) {
              merged[existingIndex] = {
                ...merged[existingIndex],
                quantity: merged[existingIndex].quantity + localItem.quantity
              }
            } else {
              merged.push({ ...localItem, cartItemId: crypto.randomUUID() })
            }
          })

          const mergedTotal = merged.reduce(
            (acc, item) =>
              acc +
              (item.basePrice +
                (item.toppings?.reduce((s: number, t: CartTopping) => s + (t.priceAdd || 0), 0) ||
                  0)) *
                item.quantity,
            0
          )

          const shouldShowModal =
            merged.length > CONFLICT_THRESHOLD.itemCount ||
            mergedTotal > CONFLICT_THRESHOLD.totalPrice ||
            differentItems.length > CONFLICT_THRESHOLD.diffCount

          // Only show conflict modal on FIRST load, to avoid annoying user repeatedly across tabs
          if (dbItems.length > 0 && localItems.length > 0 && shouldShowModal && !isFirstSyncDone) {
            setConflictState({ local: localItems, db: dbItems })
          } else {
            setItems(merged)
            previousItemsRef.current = merged
          }
        }
      } catch (error) {
        console.error('[CartSyncProvider] Sync Error:', error)
      } finally {
        setIsFirstSyncDone(true)
      }
    }

    if (!isFirstSyncDone) {
      fetchAndMergeCart()
    }

    // Attach listener to pull latest cart when user returns to tab (Cross-device sync)
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchAndMergeCart()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('visibilitychange', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('visibilitychange', handleFocus)
    }
  }, [status, _hasHydrated, isFirstSyncDone, setItems, setConflictState])

  // ── 2. Persist to DB on Change (Debounced) ──
  const syncToDB = useCallback(
    async (items: CartItem[], attempt = 1): Promise<void> => {
      if (status !== 'authenticated') return
      if (useCartStore.getState().isLoggingOut) return
      // Optimasi: Jangan panggil API jika items sama persis dengan yang terakhir disimpan
      if (JSON.stringify(items) === JSON.stringify(previousItemsRef.current)) return

      try {
        const res = await api<{ success: boolean }>('/api/user/cart/sync', {
          method: 'POST',
          body: { items }
        })
        if (res.success) {
          previousItemsRef.current = [...items]
        }
      } catch (error) {
        console.error('[CartSyncProvider] Sync attempt failed. Attempt:', attempt, error)
        if (attempt < 3) {
          const delay = attempt === 1 ? 2000 : attempt === 2 ? 4000 : 8000
          console.log(
            '[CartSyncProvider] Retrying. Delay:',
            delay,
            'ms. Attempt:',
            attempt + 1,
            '/3'
          )

          setTimeout(() => {
            // Cegah balapan: jika isi cart di store sudah berubah selama masa tunggu retry, batalkan retry
            const currentStoreItems = useCartStore.getState().items
            if (JSON.stringify(items) !== JSON.stringify(currentStoreItems)) {
              console.log(
                '[CartSyncProvider] Cart has changed since failed attempt. Cancelling retry.'
              )
              return
            }
            syncToDB(items, attempt + 1)
          }, delay)
        } else {
          console.error('[CartSyncProvider] Max retries reached. Sync failed.')
        }
      }
    },
    [status]
  )

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
  }, [cartItems, status, _hasHydrated, isFirstSyncDone, syncToDB])

  // ── 3. Persist on VisibilityChange / BeforeUnload ──
  useEffect(() => {
    if (status !== 'authenticated') return

    const forceSync = () => {
      if (useCartStore.getState().isLoggingOut) return
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
