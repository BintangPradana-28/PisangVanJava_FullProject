'use client'

import { useState, useRef, useEffect } from 'react'

export default function MapEmbed({ address }: { address: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' } // Load map when it's 200px away from viewport
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="relative w-full h-full min-h-[300px] bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-2xl overflow-hidden">
      {isVisible && (
        <iframe
          src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Peta Lokasi"
          className="absolute inset-0"
        ></iframe>
      )}
    </div>
  )
}
