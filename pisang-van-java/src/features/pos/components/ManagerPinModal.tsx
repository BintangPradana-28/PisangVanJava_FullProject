'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface ManagerPinModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (approvalToken: string) => void
  actionLabel: string
}

export default function ManagerPinModal({ isOpen, onClose, onSuccess, actionLabel }: ManagerPinModalProps) {
  const [pin, setPin] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleNumpadClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num)
    }
  }

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setPin('')
  }

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      toast.error('PIN harus 4 digit')
      return
    }

    setIsProcessing(true)
    const toastId = toast.loading('Memverifikasi PIN...')

    try {
      const res = await fetch('/api/pos/auth-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'PIN Salah')
      }

      toast.success('Otorisasi Diberikan', { id: toastId })
      setPin('')
      onSuccess(data.approvalToken)
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
      setPin('') // Reset on failure to prevent brute force guess visibility
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Loader Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <span className="text-orange-500 font-bold animate-pulse">Memeriksa...</span>
          </div>
        )}

        {/* Header */}
        <div className="p-5 text-center border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Otorisasi Manajer</h2>
          <p className="text-xs text-gray-500 mt-1 uppercase font-semibold">{actionLabel}</p>
        </div>

        {/* PIN Dots */}
        <div className="p-8 flex justify-center gap-4">
          {[0, 1, 2, 3].map(index => (
            <div 
              key={index} 
              className={`w-5 h-5 rounded-full transition-all duration-200 ${
                index < pin.length ? 'bg-orange-500 scale-110 shadow-md' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="px-6 pb-6 grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleNumpadClick(num)}
              className="h-16 rounded-2xl bg-gray-50 hover:bg-orange-50 text-2xl font-bold text-gray-800 hover:text-orange-600 transition-colors active:scale-95 shadow-sm border border-gray-100"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 rounded-2xl bg-red-50 hover:bg-red-100 text-sm font-bold text-red-600 transition-colors active:scale-95"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleNumpadClick('0')}
            className="h-16 rounded-2xl bg-gray-50 hover:bg-orange-50 text-2xl font-bold text-gray-800 hover:text-orange-600 transition-colors active:scale-95 shadow-sm border border-gray-100"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 transition-colors active:scale-95"
          >
            DEL
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 active:scale-95"
          >
            Batal
          </button>
          <button 
            onClick={handleSubmit}
            disabled={pin.length !== 4 || isProcessing}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-50 hover:bg-orange-600 active:scale-95 shadow-md shadow-orange-500/20"
          >
            Otorisasi
          </button>
        </div>
      </div>
    </div>
  )
}
