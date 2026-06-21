// app/(user)/loading.tsx
// High-fidelity skeleton grid that mirrors MenuCard dimensions exactly.
// Prevents Cumulative Layout Shift (CLS) by matching: aspect-[4/3] image + p-6 content.

function MenuCardSkeleton() {
  return (
    <div className="rounded-[4px] overflow-hidden flex flex-col bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
      {/* Outer padding for image — mirrors MenuGrid card: p-3 pb-0 */}
      <div className="relative p-3 pb-0">
        <div className="relative w-full aspect-[4/3] bg-zinc-200 dark:bg-zinc-800 rounded-[4px] animate-pulse">
          {/* Favorite button placeholder */}
          <div className="absolute top-4 right-4 w-10 h-10 rounded-[4px] bg-zinc-300 dark:bg-zinc-700 animate-pulse" />
        </div>
      </div>

      {/* Content area — mirrors p-5 pt-4 flex flex-col items-start */}
      <div className="p-5 pt-4 flex flex-col items-start gap-3 flex-grow text-left">
        {/* Title */}
        <div className="w-3/4 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

        {/* Stock status placeholder */}
        <div className="w-1/2 h-4 rounded-md bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />

        {/* Rating placeholder */}
        <div className="w-1/3 h-4 rounded-md bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />

        {/* Description lines */}
        <div className="w-full h-3.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
        <div className="w-5/6 h-3.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />

        {/* Divider + price + button — mirrors border-t pt-4 section */}
        <div className="w-full border-t border-zinc-200 dark:border-zinc-800/60 pt-4 mt-auto flex items-center justify-between gap-3">
          {/* Price details */}
          <div className="flex flex-col gap-1.5">
            <div className="w-12 h-3 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="w-24 h-6 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          </div>
          {/* CTA button */}
          <div className="w-24 h-10 rounded-full bg-amber-200/70 dark:bg-amber-900/40 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function UserLoading() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--background-custom)' }}
      aria-label="Memuat menu..."
      aria-busy="true"
    >
      {/* Navbar placeholder */}
      <div className="h-16 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-950/80 animate-pulse" />

      {/* Hero placeholder — compact strip */}
      <div className="pt-14 pb-8 px-6 max-w-[1200px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2.5">
            <div className="w-16 h-4 rounded-[4px] bg-amber-200 dark:bg-amber-900/40 animate-pulse" />
            <div className="w-64 h-9 rounded-[4px] bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="w-48 h-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
          </div>
          {/* Search bar placeholder */}
          <div className="w-full sm:w-72 h-11 rounded-[4px] bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* Menu grid — 6 skeleton cards in a responsive grid */}
      <section className="py-8 px-6 max-w-[1200px] mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <MenuCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
