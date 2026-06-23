'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { ProductType } from '@/src/features/menu/components/MenuCards'

// We define an explicit structure for Topping as retrieved from DB
export interface Topping {
  id: string
  name: string
  price: number
  emoji: string | null
  isActive: boolean
}

interface PosModifierModalProps {
  product: ProductType | null
  toppings: Topping[]
  onClose: () => void
  onAdd: (orderItem: {
    product: ProductType
    baseType: 'Kembung' | 'Lumpia' | 'Krispy'
    toppings: Topping[]
    topping: Topping | null
    quantity: number
    subtotal: number
  }) => void
}

export default function PosModifierModal({
  product,
  toppings,
  onClose,
  onAdd
}: PosModifierModalProps) {
  const [selectedBase, setSelectedBase] = useState<'Kembung' | 'Lumpia' | 'Krispy'>('Kembung')
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([])
  const [quantity, setQuantity] = useState(1)

  // RAG Source: components/user/QuickViewModal.tsx (Select first valid base with price > 0)
  useEffect(() => {
    if (product) {
      const defaultBase =
        (['Kembung', 'Lumpia', 'Krispy'] as const).find((b) => {
          if (b === 'Kembung') return product.priceKembung > 0
          if (b === 'Lumpia') return product.priceLumpia > 0
          if (b === 'Krispy') return product.priceKrispy > 0
          return false
        }) || 'Kembung'
      setSelectedBase(defaultBase)
      setSelectedToppings([])
      setQuantity(1)
    }
  }, [product])

  if (!product) return null

  // Calculate Base Price based on selected type
  let basePrice = product.priceKembung
  if (selectedBase === 'Lumpia') basePrice = product.priceLumpia
  else if (selectedBase === 'Krispy') basePrice = product.priceKrispy

  // Calculate Add-on Price for all selected toppings
  const toppingPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0)

  // Calculate Subtotal
  const subtotal = (basePrice + toppingPrice) * quantity

  const handleAdd = () => {
    onAdd({
      product,
      baseType: selectedBase,
      toppings: selectedToppings,
      topping: selectedToppings[0] || null, // Fallback for single-topping legacy uses
      quantity,
      subtotal
    })
    // Reset state for next time
    setSelectedBase('Kembung')
    setSelectedToppings([])
    setQuantity(1)
    onClose()
  }

  // Formatting utility
  const formatRupiah = (num: number) => `Rp ${num.toLocaleString('id-ID')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 truncate pr-4">{product.flavorName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 font-bold p-2 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: Mandatory Base Selection */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
              1. Pilih Jenis (Wajib)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['Kembung', 'Lumpia', 'Krispy'] as const).map((base) => {
                let price = product.priceKembung
                if (base === 'Lumpia') price = product.priceLumpia
                if (base === 'Krispy') price = product.priceKrispy

                const isSelected = selectedBase === base
                const disabled = price <= 0

                return (
                  <button
                    key={base}
                    type="button"
                    onClick={() => !disabled && setSelectedBase(base)}
                    disabled={disabled}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all active:scale-95 ${
                      disabled
                        ? 'bg-zinc-150 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 opacity-40 cursor-not-allowed'
                        : isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                          : 'border-gray-200 dark:border-zinc-750 hover:border-orange-200 dark:hover:border-orange-900 text-gray-600 dark:text-zinc-300'
                    }`}
                  >
                    <span className="font-bold text-lg mb-1">{base}</span>
                    <span className="text-sm">{price > 0 ? formatRupiah(price) : 'N/A'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* STEP 2: Optional Topping Selection */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                2. Topping (Opsional)
              </h3>
              {selectedToppings.length > 0 && (
                <button
                  onClick={() => setSelectedToppings([])}
                  className="text-xs text-red-500 font-bold"
                >
                  Hapus Topping
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {toppings
                .filter((t) => t.isActive)
                .map((topping) => {
                  const isSelected = selectedToppings.some((t) => t.id === topping.id)
                  // RAG Source:
                  // src/features/checkout/schemas.ts
                  // Enforce maximum 5 toppings limit in cashier POS modal
                  const handleToppingClick = () => {
                    setSelectedToppings((prev) => {
                      if (prev.some((t) => t.id === topping.id)) {
                        return prev.filter((t) => t.id !== topping.id)
                      }
                      if (prev.length >= 5) {
                        toast.error('Maksimal 5 topping per porsi.')
                        return prev
                      }
                      return [...prev, topping]
                    })
                  }
                  return (
                    <button
                      key={topping.id}
                      onClick={handleToppingClick}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-95 text-left ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-gray-800">
                          {topping.emoji} {topping.name}
                        </div>
                        <div className="text-xs text-gray-500">+{formatRupiah(topping.price)}</div>
                      </div>
                      {isSelected && <span className="text-orange-500 font-bold text-xl">✓</span>}
                    </button>
                  )
                })}
            </div>
          </div>

          {/* STEP 3: Quantity */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
              3. Jumlah
            </h3>
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl w-fit">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-xl bg-white shadow-sm font-bold text-xl text-gray-600 hover:text-orange-600 active:scale-95"
              >
                -
              </button>
              <span className="w-12 text-center font-bold text-2xl text-gray-900">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-xl bg-orange-500 shadow-sm font-bold text-xl text-white hover:bg-orange-600 active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-5 border-t border-gray-100 bg-white">
          <button
            onClick={handleAdd}
            className="w-full bg-[#D4802A] text-white font-bold py-4 rounded-2xl text-lg flex justify-between items-center px-6 active:scale-[0.98] transition-transform shadow-lg shadow-orange-500/30"
          >
            <span>Tambah ke Pesanan</span>
            <span>{formatRupiah(subtotal)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
