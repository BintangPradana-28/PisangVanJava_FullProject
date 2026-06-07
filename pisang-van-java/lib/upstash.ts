// src/lib/upstash.ts
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
// Note: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// must be set in your .env or .env.local file
export const redis = Redis.fromEnv();
