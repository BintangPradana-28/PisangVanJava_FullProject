// src/lib/upstash.ts
import { Redis } from '@upstash/redis'

// Initialize Upstash Redis client safely to prevent import-time crashes on Vercel
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
