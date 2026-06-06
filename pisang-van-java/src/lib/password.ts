import { hash, verify } from '@node-rs/argon2';

const OPTIONS = {
  memoryCost: 19456, // 19 MB - OWASP minimum
  timeCost: 2,       // 2 iterations
  parallelism: 1,    // 1 thread
} as const;

export const hashPassword = async (plain: string) => hash(plain, OPTIONS);
export const verifyPassword = async (stored: string, plain: string) => verify(stored, plain);
