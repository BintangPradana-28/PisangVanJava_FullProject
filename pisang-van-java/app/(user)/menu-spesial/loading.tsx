import Footer from '@/components/user/Footer'
import SearchFilterBar from '@/components/user/SearchFilterBar'
import HeroBanner from './HeroBanner'

export default function Loading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background-custom)', color: 'var(--text-custom)' }}>
      {/* ── Hero ── */}
      <HeroBanner />

      {/* ── Search & Filter bar (Disabled state or 0) ── */}
      <SearchFilterBar totalItems={0} />

      {/* ── Grid Skeleton ── */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="relative rounded-3xl overflow-hidden flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              >
                {/* Image Skeleton (16:9) */}
                <div className="w-full aspect-[16/9] bg-zinc-200 dark:bg-zinc-800 skeleton-shimmer" />
                
                {/* Content Skeleton */}
                <div className="p-6 flex flex-col items-center text-center flex-grow">
                  <div className="w-2/3 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 skeleton-shimmer mb-4" />
                  <div className="w-full h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 skeleton-shimmer mb-2" />
                  <div className="w-4/5 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 skeleton-shimmer mb-6" />
                  
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-800 pt-4 flex flex-col items-center gap-3">
                    <div className="w-1/2 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 skeleton-shimmer mb-1" />
                    <div className="w-1/3 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 skeleton-shimmer mb-3" />
                    <div className="w-3/4 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
