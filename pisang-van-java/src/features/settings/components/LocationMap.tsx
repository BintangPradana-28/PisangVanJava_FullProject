'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const MapEmbed = dynamic(() => import('@/components/ui/MapEmbed'), { ssr: false })

import { useLanguage } from '@/context/LanguageContext'
import { useSettings } from '@/context/SettingsContext'

export default function LocationMap() {
  const { t } = useLanguage()
  const { getSetting } = useSettings()

  return (
    <section
      id="lokasi"
      className="py-24 bg-surface dark:bg-zinc-950/20 border-b border-outline-variant/20 dark:border-zinc-800/40"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="text-secondary text-[11px] font-semibold tracking-wider font-mono uppercase mb-3">
            {t('location_badge')}
          </div>
          <h2 className="font-sans text-3xl sm:text-4xl font-extrabold text-primary dark:text-zinc-100 tracking-[-0.03em] sm:tracking-[-0.04em]">
            {t('location_title').split(' ')[0]}{' '}
            <span className="text-secondary font-medium">
              {t('location_title').split(' ').slice(1).join(' ')}.
            </span>
          </h2>
        </motion.div>

        {/* Map & Address Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          {/* Address & Operational Info Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-outline-variant/35 dark:border-zinc-800 rounded-[6px] p-8 flex flex-col justify-between shadow-sm"
          >
            <div>
              <h3 className="font-sans text-xl font-bold text-primary dark:text-zinc-100 mb-6 tracking-tight">
                {t('location_branch')}
              </h3>

              <div className="space-y-6">
                <div>
                  <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono tracking-wider uppercase mb-1 font-semibold">
                    {t('location_address_label')}
                  </div>
                  <p className="text-primary dark:text-zinc-300 font-medium text-sm sm:text-base leading-relaxed">
                    {getSetting('alamat', t('location_address_val'))}
                  </p>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono tracking-wider uppercase mb-1 font-semibold">
                    {t('location_hours_label')}
                  </div>
                  <p className="text-primary dark:text-zinc-300 font-medium text-sm sm:text-base leading-relaxed font-mono">
                    {getSetting('jam_operasional', t('location_hours_val'))}
                  </p>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono tracking-wider uppercase mb-1 font-semibold">
                    {t('location_delivery_label')}
                  </div>
                  <p className="text-primary dark:text-zinc-300 font-medium text-sm sm:text-base leading-relaxed">
                    {t('location_delivery_val')}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-outline-variant/20 dark:border-zinc-800 mt-8">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(getSetting('alamat', 'Jakarta Timur'))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-secondary dark:text-amber-500 font-bold text-sm hover:underline"
              >
                <span>{t('location_maps_btn')}</span>
                <span>→</span>
              </a>
            </div>
          </motion.div>

          {/* Interactive Maps Iframe Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 h-[450px] lg:h-auto rounded-[6px] overflow-hidden shadow-sm border border-outline-variant/35 dark:border-zinc-800 bg-surface-container-high dark:bg-zinc-900/60"
          >
            {/* Google Maps Iframe with high reliability Location */}
            <MapEmbed
              address={getSetting(
                'alamat',
                'Jl. Raya Cilangkap l Rt.2/Rw.5, Cilangkap, Kec. Cipayung, Kota Jakarta Timur'
              )}
            />
          </motion.div>
        </div>

        {/* Read More — Lihat Detail Lokasi */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-12"
        >
          <Link
            href="/lokasi-kontak"
            className="inline-flex items-center gap-2 font-bold text-sm px-8 py-3.5 rounded-full transition-all active:scale-95 bg-amber-brand hover:bg-amber-brand/95 text-white shadow-sm"
          >
            📍 {t('location_btn_detail')} →
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
