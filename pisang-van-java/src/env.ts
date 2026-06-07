import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL:           z.string().url(),
    DIRECT_URL:             z.string().url().optional(),
    AUTH_SECRET:            z.string().min(32).optional(),
    MIDTRANS_SERVER_KEY:    z.string().startsWith('SB-').or(z.string().startsWith('Mid-')),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    RESEND_API_KEY:         z.string().startsWith('re_').optional(),
    FONNTE_API_TOKEN:       z.string().min(1).optional(),
    DOPPLER_TOKEN:          z.string().optional(),

    // ✅ Tambahan yang tertinggal
    CLOUDINARY_API_SECRET:  z.string().min(1).optional(),
    CLOUDINARY_API_KEY:     z.string().min(1).optional(),
    CLOUDINARY_CLOUD_NAME:  z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL:     z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().min(1),
    NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION: z.string().optional().default('false'),

    // ✅ Tambahan yang tertinggal
    NEXT_PUBLIC_POSTHOG_KEY:    z.string().startsWith('phc_').optional(),
    NEXT_PUBLIC_POSTHOG_HOST:   z.string().url().default('https://app.posthog.com').optional(),
  },
  runtimeEnv: {
    DATABASE_URL:                    process.env.DATABASE_URL,
    DIRECT_URL:                      process.env.DIRECT_URL,
    AUTH_SECRET:                     process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    MIDTRANS_SERVER_KEY:             process.env.MIDTRANS_SERVER_KEY,
    UPSTASH_REDIS_REST_URL:          process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN:        process.env.UPSTASH_REDIS_REST_TOKEN,
    RESEND_API_KEY:                  process.env.RESEND_API_KEY,
    FONNTE_API_TOKEN:                process.env.FONNTE_API_TOKEN,
    DOPPLER_TOKEN:                   process.env.DOPPLER_TOKEN,
    CLOUDINARY_API_SECRET:           process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_API_KEY:              process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_CLOUD_NAME:           process.env.CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_SUPABASE_URL:        process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION,
    NEXT_PUBLIC_POSTHOG_KEY:         process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST:        process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION || process.env.npm_lifecycle_event === "lint",
  emptyStringAsUndefined: true,
})
