// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

// PERF/PRIVACY: This logic was previously written in sentry.client.config.ts, the
// pre-v8 file location. @sentry/nextjs v10 reads instrumentation-client.ts instead —
// the old file was very likely no longer being picked up, meaning tracesSampleRate
// was silently running at 100% in production (instead of the intended 10%) and
// Session Replay had no storefront/admin distinction. Restored here, in the file
// this SDK version actually uses.
const isInternalPanel =
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/dashboard') ||
    window.location.pathname.startsWith('/kasir') ||
    window.location.pathname.startsWith('/kitchen'))

Sentry.init({
  dsn: 'https://25061a893fc72afab9980dee8176f341@o4511473006084096.ingest.us.sentry.io/4511473128833024',

  // Sesuaikan tracesSampleRate di production (10% di production, 100% di dev utk debugging)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Session Replay hanya aktif di panel internal (dashboard/kasir/kitchen) —
  // dimatikan di halaman publik storefront agar tidak membebani LCP/TBT mobile.
  replaysSessionSampleRate: isInternalPanel ? 0.1 : 0.0,
  replaysOnErrorSampleRate: isInternalPanel ? 1.0 : 0.0,

  integrations: isInternalPanel
    ? [
      Sentry.replayIntegration({
        // 🛡️ Sembunyikan semua teks dan input di layar pengguna dari rekaman Sentry
        maskAllText: true,
        maskAllInputs: true
      })
    ]
    : []
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart