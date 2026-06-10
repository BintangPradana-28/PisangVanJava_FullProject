import { useState, useEffect } from 'react'
import { ProductType } from '@/src/features/menu/components/MenuCards'
import { Topping } from './PosModifierModal'
import { saveToOfflineQueue, getOfflineQueueCount } from './OfflineSyncManager'
import toast from 'react-hot-toast'
import PosReceiptModal, { ReceiptData } from './PosReceiptModal'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/src/lib/api'
import { FetchError } from 'ofetch'

export interface CartItem {
  id: string // temporary client-side id
  product: ProductType
  baseType: string
  topping: Topping | null
  quantity: number
  subtotal: number
}

interface PosCartProps {
  items: CartItem[]
  onUpdateQuantity: (id: string, newQuantity: number) => void
  onRemoveItem: (id: string) => void
  onClearCart: () => void
}

export default function PosCart({ items, onUpdateQuantity, onRemoveItem, onClearCart }: PosCartProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  useEffect(() => {
    // Initialize state
    setIsOnline(navigator.onLine)
    setQueueCount(getOfflineQueueCount())

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const updateQueue = () => setQueueCount(getOfflineQueueCount())

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline_queue_updated', updateQueue)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline_queue_updated', updateQueue)
    }
  }, [])
  
  const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0)

  // Formatting utility
  const formatRupiah = (num: number) => `Rp ${num.toLocaleString('id-ID')}`

  const checkoutMutation = useMutation({
    mutationFn: async ({ payload, paymentMethod }: { payload: any, paymentMethod: 'CASH' | 'QRIS' }) => {
      if (!isOnline) {
        saveToOfflineQueue(payload)
        return { offline: true, payload, paymentMethod }
      }
      const data = await api<{ success: boolean; data?: any; error?: string }>('/api/pos/orders', {
        method: 'POST',
        body: payload,
      })
      if (!data.success) throw new Error(data.error || 'Gagal memproses transaksi')
      return { offline: false, data, payload, paymentMethod }
    },
    retry: 0,
    onSuccess: (res) => {
      if (res.offline) {
        toast.success('Mode Offline: Pesanan Masuk Antrean.', { icon: '📶' })
        setReceiptData({
          orderId: res.payload.offlineId,
          date: new Date(),
          items: [...items],
          totalPrice,
          paymentMethod: res.paymentMethod,
          cashierName: "Kasir POS (Offline)"
        })
      } else {
        toast.success('Transaksi Berhasil! Pesanan dikirim ke dapur.')
        setReceiptData({
          orderId: res.data?.data?.id || res.payload.offlineId,
          date: new Date(),
          items: [...items],
          totalPrice,
          paymentMethod: res.paymentMethod,
          cashierName: "Kasir POS"
        })
      }
    },
    onError: (error: FetchError | Error, variables) => {
      if (error instanceof TypeError || error.message.includes('Failed to fetch') || error.message.includes('fetch failed')) {
        saveToOfflineQueue(variables.payload)
        toast.error('Koneksi terputus. Pesanan Masuk Antrean.')
        setReceiptData({
          orderId: variables.payload.offlineId,
          date: new Date(),
          items: [...items],
          totalPrice,
          paymentMethod: variables.paymentMethod,
          cashierName: "Kasir POS (Offline)"
        })
      } else {
        const msg = error instanceof FetchError ? (error.data?.error || 'Gagal memproses transaksi') : error.message
        toast.error(msg, { duration: 5000 })
      }
    }
  })

  const handleCheckout = (paymentMethod: 'CASH' | 'QRIS') => {
    if (items.length === 0 || checkoutMutation.isPending) return

    // Mapping Client Cart to API Schema
    const payload = {
      offlineId: crypto.randomUUID(), // Idempotency key for Phase 4
      customerName: "Pelanggan Kasir", // Can be dynamic if we add a field
      customerPhone: "-",
      paymentMethod,
      totalPrice,
      items: items.map(item => ({
        variantId: item.product.id,
        toppingId: item.topping?.id || null,
        baseType: item.baseType,
        quantity: item.quantity,
        unitPrice: item.subtotal / item.quantity,
        subtotal: item.subtotal
      }))
    }

    checkoutMutation.mutate({ payload, paymentMethod })
  }

  return (
    <div className="w-full h-full bg-white flex flex-col border-l border-gray-100 shadow-xl relative">
      {/* Overlay if processing */}
      {checkoutMutation.isPending && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="font-bold text-orange-600 animate-pulse">Memproses...</div>
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">Keranjang Kasir</h2>
          {/* Queue Indicator Rule */}
          {queueCount > 0 && (
            <div className="relative flex items-center justify-center cursor-help" title={`${queueCount} transaksi menunggu sinkronisasi`}>
              <span className="text-2xl text-gray-400">☁️</span>
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-gray-50">
                {queueCount}
              </span>
            </div>
          )}
        </div>
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
          {items.length} Item
        </span>
      </div>

      {/* Cart Items Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-4xl mb-3">🛒</div>
            <p className="font-semibold">Keranjang kosong</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex flex-col p-4 bg-gray-50 rounded-2xl border border-gray-100 relative">
              <div className="flex justify-between items-start mb-2">
                <div className="pr-6">
                  <h3 className="font-bold text-gray-800 leading-tight">{item.product.flavorName}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    Dasar: <span className="font-semibold">{item.baseType}</span>
                    {item.topping && <span> • + {item.topping.name}</span>}
                  </div>
                </div>
                <button 
                  onClick={() => onRemoveItem(item.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold"
                >&times;</button>
              </div>

              <div className="flex justify-between items-end mt-2">
                <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                  <button 
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-100 text-orange-600 font-bold active:scale-95"
                  >-</button>
                  <span className="font-bold w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-100 text-orange-600 font-bold active:scale-95"
                  >+</button>
                </div>
                <span className="font-bold text-lg text-gray-800">{formatRupiah(item.subtotal)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Checkout Actions */}
      <div className="p-5 border-t border-gray-100 bg-white">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-500 font-bold">Total Penjualan</span>
          <span className="text-3xl font-black text-gray-800">{formatRupiah(totalPrice)}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleCheckout('CASH')}
            disabled={items.length === 0 || checkoutMutation.isPending}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl text-lg flex justify-center items-center active:scale-[0.98] transition-transform shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:shadow-none"
          >
            Tunai
          </button>
          {/* Payment Lock Rule: Disable QRIS when offline */}
          <button
            onClick={() => handleCheckout('QRIS')}
            disabled={items.length === 0 || checkoutMutation.isPending || !isOnline}
            className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl text-lg flex flex-col justify-center items-center active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none disabled:bg-gray-400"
          >
            <span>QRIS</span>
            {!isOnline && <span className="text-[10px] uppercase font-bold text-gray-200 tracking-wider">Terkunci (Offline)</span>}
          </button>
        </div>
      </div>

      <PosReceiptModal 
        isOpen={!!receiptData} 
        data={receiptData} 
        onClose={() => {
          setReceiptData(null)
          onClearCart()
        }} 
      />
    </div>
  )
}
