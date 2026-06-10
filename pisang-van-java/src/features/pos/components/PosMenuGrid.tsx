'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { ProductType } from '@/src/features/menu/components/MenuCards'
import PosModifierModal, { type Topping } from './PosModifierModal'

interface PosMenuGridProps {
  products: ProductType[]
  toppings: Topping[]
  onAddToCart: (orderItem: any) => void
}

export default function PosMenuGrid({ products, toppings, onAddToCart }: PosMenuGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null)

  // Group products by tags or display all in a flat grid optimized for touch
  // We'll use a clean, touch-friendly grid without clutter.

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {products
          .filter((p) => p.isActive)
          .map((product) => {
            const available = product.isAvailable && product.stock > 0

            return (
              <button
                key={product.id}
                onClick={() => available && setSelectedProduct(product)}
                disabled={!available}
                className={`relative flex flex-col h-32 rounded-2xl overflow-hidden shadow-sm border transition-all active:scale-95 ${
                  available
                    ? 'border-gray-200 hover:border-orange-400 bg-white'
                    : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Product Background Image / Fallback Color */}
                <div className="absolute inset-0 bg-gray-100">
                  {product.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt={product.flavorName}
                      fill
                      className="object-cover opacity-30"
                    />
                  )}
                  {/* Gradient Overlay for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-end p-3 h-full text-left">
                  <h3 className="font-bold text-gray-800 text-lg leading-tight line-clamp-2">
                    {product.flavorName}
                  </h3>
                  {available ? (
                    <span className="text-xs text-green-600 font-bold mt-1">
                      Stok: {product.stock}
                    </span>
                  ) : (
                    <span className="text-xs text-red-500 font-bold mt-1">Habis Terjual</span>
                  )}
                </div>
              </button>
            )
          })}
      </div>

      {/* Modifier Modal Mount */}
      {selectedProduct && (
        <PosModifierModal
          product={selectedProduct}
          toppings={toppings}
          onClose={() => setSelectedProduct(null)}
          onAdd={onAddToCart}
        />
      )}
    </>
  )
}
