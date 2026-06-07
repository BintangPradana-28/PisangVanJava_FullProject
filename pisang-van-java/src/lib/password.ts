import { hash, verify } from '@node-rs/argon2';
import * as Sentry from '@sentry/nextjs';

/**
 * 2026 OWASP-Recommended Argon2id Parameters
 * Balances extreme GPU-cracking resistance with Serverless compute limits.
 */
const ARGON2_CONFIG = {
  memoryCost: 65536, // 64 MB (Resistant to ASIC/GPU attacks)
  timeCost: 3,       // 3 linear iterations
  parallelism: 4,    // 4 parallel threads (modern CPU utilization)
} as const;

/**
 * Generates an Argon2id hash from a plaintext password.
 */
export const hashPassword = async (plain: string): Promise<string> => {
  try {
    if (!plain || plain.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }
    return await hash(plain, ARGON2_CONFIG);
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "auth", action: "hashPassword" } });
    throw new Error("Internal security error during password hashing.");
  }
};

/**
 * Verifies a plaintext password against an Argon2id hash.
 */
export const verifyPassword = async (storedHash: string, plain: string): Promise<boolean> => {
  try {
    if (!storedHash || !plain) return false;
    return await verify(storedHash, plain);
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "auth", action: "verifyPassword" } });
    // Fail closed on error
    return false;
  }
};
