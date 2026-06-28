// src/lib/midtrans-crypto.ts
//
// Verifikasi Midtrans Webhook Signature menggunakan native Node.js crypto.
// ZERO external dependencies — tidak butuh midtrans-client library.
//
// Formula Midtrans:
//   SHA512(order_id + status_code + gross_amount + server_key)
//
// Security: Menggunakan timingSafeEqual untuk mencegah timing attacks.
// Tanpa ini, hacker bisa guess signature karakter per karakter dengan
// mengukur perbedaan response time (< 1ms per karakter yang benar).

import { createHash, timingSafeEqual } from 'node:crypto'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface VerifySignatureParams {
  orderId: string
  statusCode: string
  grossAmount: string
  serverKey: string
  receivedSignature: string
}

// ─────────────────────────────────────────────────────────────
// Main: verifyMidtransSignature
// ─────────────────────────────────────────────────────────────

/**
 * Verifikasi SHA512 signature dari Midtrans webhook.
 *
 * @returns true jika signature valid, false jika tidak valid atau error
 *
 * PENTING: Selalu return boolean — jangan throw exception dari sini.
 * Route handler yang menentukan HTTP response berdasarkan return value.
 */
export function verifyMidtransSignature(params: VerifySignatureParams): boolean {
  const { orderId, statusCode, grossAmount, serverKey, receivedSignature } = params

  // Guard: jika ada parameter kosong, tolak langsung
  if (!orderId || !statusCode || !grossAmount || !serverKey || !receivedSignature) {
    return false
  }

  // SHA512 selalu menghasilkan 128 karakter hex
  // Jika panjang berbeda, pasti invalid — tolak sebelum komputasi
  if (receivedSignature.length !== 128) {
    return false
  }

  // Hitung expected signature
  const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`
  const expectedHash = createHash('sha512').update(rawString, 'utf8').digest('hex')

  try {
    // timingSafeEqual membandingkan dua Buffer dalam waktu konstan
    // sehingga tidak ada informasi yang bocor melalui timing
    return timingSafeEqual(
      Buffer.from(expectedHash, 'utf8'),
      Buffer.from(receivedSignature, 'utf8')
    )
  } catch {
    // Buffer.from() bisa throw jika input tidak valid encoding
    return false
  }
}
