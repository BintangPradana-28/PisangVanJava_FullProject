'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Star, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '@/src/lib/api'

interface ReviewType {
  id: string
  userName: string
  userEmail: string
  variantName: string
  orderId: string | null
  rating: number
  comment: string | null
  imageUrl: string | null
  isVerifiedBuyer: boolean
  isHidden: boolean
  createdAt: string
}

export default function ReviewModerationClient({
  initialReviews
}: {
  initialReviews: ReviewType[]
}) {
  const queryClient = useQueryClient()
  const [filterHidden, setFilterHidden] = useState<'all' | 'visible' | 'hidden'>('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: reviews = initialReviews } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () =>
      api<{ success: boolean; data: ReviewType[] }>('/api/reviews?adminView=true').then(
        (r) => r.data ?? []
      ),
    initialData: initialReviews,
    staleTime: 0
  })

  const toggleHiddenMutation = useMutation({
    mutationFn: async ({ reviewId, isHidden }: { reviewId: string; isHidden: boolean }) => {
      return api<{ success: boolean }>('/api/reviews', {
        method: 'PATCH',
        body: { reviewId, isHidden }
      })
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.isHidden ? 'Ulasan disembunyikan' : 'Ulasan ditampilkan kembali')
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    },
    onError: () => toast.error('Gagal memperbarui ulasan')
  })

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return api<{ success: boolean }>(`/api/reviews?reviewId=${reviewId}`, {
        method: 'DELETE'
      })
    },
    onSuccess: () => {
      toast.success('Ulasan berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
      setConfirmDeleteId(null)
    },
    onError: () => toast.error('Gagal menghapus ulasan')
  })

  const filtered = reviews.filter((r) => {
    if (filterHidden === 'visible') return !r.isHidden
    if (filterHidden === 'hidden') return r.isHidden
    return true
  })

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-3 flex-wrap">
        {(['all', 'visible', 'hidden'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterHidden(f)}
            className={`px-4 py-2 rounded-[4px] text-sm font-bold transition-all ${
              filterHidden === f
                ? 'bg-brown-700 text-white'
                : 'bg-white text-brown-700 border border-cream-200 hover:bg-cream-50'
            }`}
          >
            {f === 'all'
              ? `Semua (${reviews.length})`
              : f === 'visible'
                ? `Tampil (${reviews.filter((r) => !r.isHidden).length})`
                : `Tersembunyi (${reviews.filter((r) => r.isHidden).length})`}
          </button>
        ))}
      </div>

      {/* Review List */}
      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-[4px] p-10 text-center text-gray-400 border border-cream-200">
            Tidak ada ulasan di kategori ini.
          </div>
        ) : (
          filtered.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-[4px] p-5 shadow-sm border transition-all ${
                review.isHidden
                  ? 'border-red-200/70 bg-red-50/30 opacity-70'
                  : 'border-cream-200 hover:shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Review Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    {/* Star Rating */}
                    <div className="flex items-center gap-0.5">
                      {([1, 2, 3, 4, 5] as const).map((n) => (
                        <Star
                          key={`${review.id}-star-${n}`}
                          className={`w-3.5 h-3.5 ${
                            n <= review.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-200 fill-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-cream-100 text-brown-600 rounded-full">
                      {review.variantName}
                    </span>
                    {review.isVerifiedBuyer && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">
                        ✓ Pembeli Terverifikasi
                      </span>
                    )}
                    {review.isHidden && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                        TERSEMBUNYI
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-brown-900 text-sm">{review.userName}</p>
                  <p className="text-xs text-gray-400 mb-2">
                    {review.userEmail} •{' '}
                    {new Date(review.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>

                  {review.comment && (
                    <p className="text-sm text-brown-700 leading-relaxed bg-cream-50 p-3 rounded-[4px] border border-cream-100">
                      {review.comment}
                    </p>
                  )}

                  {review.imageUrl && (
                    <div className="mt-3">
                      <Image
                        src={review.imageUrl}
                        alt="Foto ulasan"
                        width={120}
                        height={90}
                        className="rounded-[4px] object-cover border border-cream-200"
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      toggleHiddenMutation.mutate({
                        reviewId: review.id,
                        isHidden: !review.isHidden
                      })
                    }
                    disabled={toggleHiddenMutation.isPending}
                    title={review.isHidden ? 'Tampilkan kembali' : 'Sembunyikan ulasan'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-xs font-bold transition-all disabled:opacity-50 ${
                      review.isHidden
                        ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                        : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                    }`}
                  >
                    {review.isHidden ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {review.isHidden ? 'Tampilkan' : 'Sembunyikan'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(review.id)}
                    title="Hapus permanen"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirm Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[4px] p-6 w-full max-w-sm shadow-lg">
            <h3 className="font-bold text-lg text-brown-900 mb-2">Hapus Ulasan?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Tindakan ini permanen dan tidak dapat dibatalkan. Ulasan akan dihapus dari database.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-[4px] hover:bg-gray-200 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-[4px] hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
