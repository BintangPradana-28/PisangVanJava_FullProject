'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export const OFFLINE_QUEUE_KEY = 'pisang_pos_offline_queue'

export function getOfflineQueueCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]')
    return Array.isArray(queue) ? queue.length : 0
  } catch {
    return 0
  }
}

export function saveToOfflineQueue(payload: any) {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]')
    queue.push(payload)
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    // Trigger custom event to update Queue Indicator in UI immediately
    window.dispatchEvent(new Event('offline_queue_updated'))
  } catch (error) {
    console.error("Gagal menyimpan ke antrean offline:", error)
  }
}

export default function OfflineSyncManager() {
  const [isSyncing, setIsSyncing] = useState(false)

  const processQueue = async () => {
    if (isSyncing || !navigator.onLine) return
    
    const queueStr = localStorage.getItem(OFFLINE_QUEUE_KEY)
    if (!queueStr) return
    
    let queue: any[] = []
    try {
      queue = JSON.parse(queueStr)
    } catch {
      localStorage.removeItem(OFFLINE_QUEUE_KEY)
      return
    }

    if (queue.length === 0) return

    setIsSyncing(true)
    const toastId = toast.loading(`Menyinkronkan ${queue.length} struk offline...`)
    
    let successCount = 0
    let failedCount = 0
    // We clone the queue to iterate, but we mutate the actual localStorage array 
    // safely ONLY upon success (Safe Deletion Rule)
    const newQueue = [...queue]

    for (let i = 0; i < queue.length; i++) {
      const payload = queue[i]
      try {
        const res = await fetch('/api/pos/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        // Safe Deletion Rule: ONLY remove if 200 or 201 (or known validation error that shouldn't be retried)
        // If 500, it might be a server crash, we keep it in the queue.
        if (res.ok) {
          // Find and remove this exact payload from newQueue
          const indexToRemove = newQueue.findIndex(p => p.offlineId === payload.offlineId)
          if (indexToRemove !== -1) newQueue.splice(indexToRemove, 1)
          successCount++
        } else {
          // If it's a 400 Bad Request (like stock empty), the offline transaction is invalid.
          // We SHOULD remove it to prevent infinite loop of bad data, but record it as failed.
          if (res.status === 400) {
            const indexToRemove = newQueue.findIndex(p => p.offlineId === payload.offlineId)
            if (indexToRemove !== -1) newQueue.splice(indexToRemove, 1)
          }
          failedCount++
        }
      } catch (error) {
        // Network error (500 or fetch failed entirely). Do NOT remove from queue.
        failedCount++
      }
    }

    // Save the remaining items back to localStorage
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue))
    window.dispatchEvent(new Event('offline_queue_updated'))

    setIsSyncing(false)

    if (successCount > 0 && failedCount === 0) {
      toast.success(`${successCount} Struk Offline berhasil dikirim.`, { id: toastId, duration: 4000 })
    } else if (successCount > 0 && failedCount > 0) {
      toast.success(`${successCount} Struk terkirim. ${failedCount} struk tertunda (Server Error).`, { id: toastId, duration: 5000 })
    } else if (failedCount > 0) {
      toast.error(`Sinkronisasi gagal. Server tidak merespons.`, { id: toastId, duration: 4000 })
    } else {
      toast.dismiss(toastId)
    }
  }

  useEffect(() => {
    // 1. Pemicu Sinkronisasi Awal (On-Mount Sync Rule)
    processQueue()

    // 2. Event Listener saat koneksi kembali
    const handleOnline = () => {
      toast('Koneksi terhubung. Memeriksa antrean...', { icon: '📶' })
      processQueue()
    }

    window.addEventListener('online', handleOnline)
    
    // 3. Polling fallback every 60 seconds just in case 'online' event is missed
    const interval = setInterval(() => {
      if (navigator.onLine) processQueue()
    }, 60000)

    return () => {
      window.removeEventListener('online', handleOnline)
      clearInterval(interval)
    }
  }, []) // Empty deps ensures this runs once on mount

  return null // Invisible background component
}
