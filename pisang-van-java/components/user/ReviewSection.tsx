'use client'

// components/user/ReviewSection.tsx
// Orchestrator: fetches reviews and shows StarRating + ReviewList on the same page.
// Drop this into a page that receives a `variantId`.

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import ReviewList, { type ReviewItem } from './ReviewList'
import StarRating from './StarRating'

interface ReviewSectionProps {
  variantId: string
}

export default function ReviewSection({ variantId }: ReviewSectionProps) {
  const { status } = useSession()
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [average, setAverage] = useState<number | null>(null)
  const [myRating, setMyRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterPhoto, setFilterPhoto] = useState(false)

  useEffect(() => {
    if (!variantId) return
    setLoading(true)
    let url = `/api/reviews?variantId=${variantId}`
    if (filterRating) url += `&rating=${filterRating}`
    if (filterPhoto) url += `&withPhoto=true`

    fetch(url)
      .then(async (res) => {
        if (!res.ok) return { success: false, data: [] }
        return res.json().catch(() => ({ success: false, data: [] }))
      })
      .then((data) => {
        if (data.success) {
          setReviews(data.data as ReviewItem[])
          setAverage(data.aggregates.average) // Update from new aggregate format
        }
      })
      .finally(() => setLoading(false))
  }, [variantId, filterRating, filterPhoto])

  const handleSubmit = async (
    id: string,
    rating: number,
    comment: string,
    imageUrl?: string
  ): Promise<string | null> => {
    const payload: { variantId: string; rating: number; comment: string; imageUrl?: string } = {
      variantId: id,
      rating,
      comment
    }
    if (imageUrl) payload.imageUrl = imageUrl

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!data.success) return data.error ?? 'Gagal mengirim ulasan.'

    // Optimistically refresh the list without filters
    setFilterRating(null)
    setFilterPhoto(false)
    const freshRes = await fetch(`/api/reviews?variantId=${variantId}`)
    const freshData = await freshRes.json()
    if (freshData.success) {
      setReviews(freshData.data as ReviewItem[])
      setAverage(freshData.aggregates.average)
      setMyRating(rating)
    }
    return null
  }

  return (
    <section className="space-y-6 mt-8">
      <h2 className="font-serif font-bold text-zinc-800 dark:text-zinc-150 text-xl border-b border-amber-100 dark:border-zinc-800/80 pb-2">
        💬 Ulasan Pelanggan
      </h2>

      {/* Star Rating form — only for logged-in customers */}
      {status === 'authenticated' && (
        <StarRating variantId={variantId} existingRating={myRating} onSubmit={handleSubmit} />
      )}
      {status === 'unauthenticated' && (
        <div className="bg-[#FDFBF7] dark:bg-zinc-900 border border-amber-100 dark:border-zinc-800 rounded-[4px] p-4 text-sm text-zinc-650 dark:text-zinc-400 text-center">
          <Link
            href="/member-login"
            className="text-[#D4802A] dark:text-amber-400 font-bold hover:underline"
          >
            Masuk / Daftar
          </Link>{' '}
          untuk memberikan ulasan.
        </div>
      )}

      {/* Review list & Filters */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setFilterRating(null)
              setFilterPhoto(false)
            }}
            className={`px-4 py-1.5 rounded-[4px] text-sm font-bold border transition-all ${!filterRating && !filterPhoto ? 'bg-amber-500/10 border-[#D4802A] text-[#D4802A]' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            Semua
          </button>
          <button
            onClick={() => {
              setFilterRating(null)
              setFilterPhoto(true)
            }}
            className={`px-4 py-1.5 rounded-[4px] text-sm font-bold border transition-all ${filterPhoto ? 'bg-amber-500/10 border-[#D4802A] text-[#D4802A]' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
          >
            📸 Dengan Foto
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => {
                setFilterRating(star)
                setFilterPhoto(false)
              }}
              className={`px-4 py-1.5 rounded-[4px] text-sm font-bold border transition-all flex items-center gap-1 ${filterRating === star ? 'bg-amber-500/10 border-[#D4802A] text-[#D4802A]' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
            >
              ⭐ {star}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-zinc-450 dark:text-zinc-500 text-center py-6 animate-pulse">
            Memuat ulasan...
          </div>
        ) : (
          <ReviewList reviews={reviews} averageRating={average} />
        )}
      </div>
    </section>
  )
}
