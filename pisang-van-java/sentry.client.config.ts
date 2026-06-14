import * as Sentry from '@sentry/nextjs'

// High-Performance & Security calibration:
// Only initialize DOM session recordings (Sentry Replay) on internal administrative panels (/dashboard, /kasir, /kitchen)
// where detailed diagnostics are critical. Disable on public storefront paths to keep LCP / TBT at 100% on mobile.
const isInternalPanel =
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/dashboard') ||
    window.location.pathname.startsWith('/kasir') ||
    window.location.pathname.startsWith('/kitchen'))

Sentry.init({
  // DSN diberikan via Environment Variables (.env)
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sesuaikan tracesSampleRate di production (misal 0.1 untuk 10%)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting Sentry Replay (Enabled only on internal panels)
  replaysSessionSampleRate: isInternalPanel ? 0.1 : 0.0,
  replaysOnErrorSampleRate: isInternalPanel ? 1.0 : 0.0,

  integrations: isInternalPanel
    ? [
        Sentry.replayIntegration({
          // 🛡️ CISO Security Masking: Sembunyikan semua teks dan input di layar pengguna dari rekaman Sentry
          maskAllText: true,
          maskAllInputs: true
        })
      ]
    : []
})
