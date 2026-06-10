// src/types/midtrans.ts
// TypeScript types untuk Midtrans webhook payload
// Ref: https://docs.midtrans.com/docs/status-cycle-and-status-definition

// ─────────────────────────────────────────────────────────────
// Midtrans transaction_status values (exhaustive)
// ─────────────────────────────────────────────────────────────
export type MidtransTransactionStatus =
  | 'capture' // Credit card: authorized + captured (lihat fraud_status)
  | 'settlement' // QRIS, GoPay, bank transfer: settled — uang masuk
  | 'pending' // Menunggu pembayaran dari user
  | 'deny' // Ditolak oleh bank/provider
  | 'cancel' // Dibatalkan
  | 'expire' // Waktu habis
  | 'refund' // Full refund
  | 'partial_refund' // Partial refund
  | 'authorize' // Credit card pre-auth (butuh capture manual)

export type MidtransFraudStatus =
  | 'accept' // Aman — lanjutkan
  | 'challenge' // Perlu review manual Midtrans
  | 'deny' // Ditolak karena fraud

export type MidtransPaymentType =
  | 'qris'
  | 'bank_transfer'
  | 'gopay'
  | 'shopeepay'
  | 'cstore' // Alfamart, Indomaret
  | 'credit_card'
  | 'akulaku'
  | 'kredivo'
  | 'uob_ezpay'
  | 'echannel' // Mandiri Bill

// ─────────────────────────────────────────────────────────────
// Virtual Account info (bank_transfer payment type)
// ─────────────────────────────────────────────────────────────
export interface MidtransVaNumber {
  bank: string // "bca" | "bni" | "bri" | "mandiri" | "permata"
  va_number: string // Nomor VA 16 digit
}

// ─────────────────────────────────────────────────────────────
// Full Midtrans Webhook Payload
// Semua field opsional kecuali yang wajib untuk signature verify
// ─────────────────────────────────────────────────────────────
export interface MidtransWebhookPayload {
  // ── Wajib (untuk signature verification) ─────────────────
  order_id: string // midtransOrderId yang kita kirim saat buat Snap
  transaction_id: string // ID transaksi unik dari Midtrans
  status_code: string // "200" | "201" | "202" | "400" | dll
  gross_amount: string // "50000.00" — string, bukan number (presisi finansial)
  signature_key: string // SHA512(order_id+status_code+gross_amount+server_key)
  merchant_id: string // Midtrans Merchant ID kita

  // ── Status ───────────────────────────────────────────────
  transaction_status: MidtransTransactionStatus
  fraud_status?: MidtransFraudStatus // Hanya ada untuk credit_card
  status_message: string

  // ── Payment Method ───────────────────────────────────────
  payment_type: MidtransPaymentType
  bank?: string // Untuk bank_transfer langsung
  va_numbers?: MidtransVaNumber[] // Untuk bank_transfer via VA
  masked_card?: string // Untuk credit_card
  payment_code?: string // Untuk cstore (Alfamart/Indomaret)

  // ── Timing ───────────────────────────────────────────────
  transaction_time: string // "2026-06-07 14:30:00"
  settlement_time?: string // Ada saat status=settlement
  expiry_time?: string // Ada saat status=pending

  // ── Acquirer / Issuer ────────────────────────────────────
  acquirer?: string // Bank/provider yang memproses
  issuer?: string
  qris_acquirer?: string // Khusus QRIS
  qris_issuer?: string

  // ── Financial ────────────────────────────────────────────
  currency: string // "IDR"
}
