// src/features/payment/payment-status.mapper.ts
//
// Pure functions untuk mapping Midtrans status → internal PaymentStatus.
// Pure = zero side effects, zero dependencies, 100% testable.
//
// Ref: https://docs.midtrans.com/docs/status-cycle-and-status-definition

import { PaymentStatus } from "@prisma/client";
import type {
  MidtransFraudStatus,
  MidtransTransactionStatus,
} from "@/src/types/midtrans";

// ─────────────────────────────────────────────────────────────
// Main: mapMidtransStatusToPaymentStatus
// ─────────────────────────────────────────────────────────────

/**
 * Mapping Midtrans transaction_status + fraud_status → PaymentStatus internal.
 *
 * Rules:
 * - settlement             → PAID       (QRIS, GoPay, bank transfer)
 * - capture + accept       → PAID       (credit card sukses)
 * - capture + challenge    → CHALLENGE  (credit card fraud review)
 * - capture (tanpa fraud)  → PAID       (default capture)
 * - pending                → PENDING
 * - deny                   → FAILED
 * - cancel                 → CANCELED
 * - expire                 → EXPIRED
 * - refund/partial_refund  → REFUNDED
 * - authorize              → PENDING    (pre-auth, belum capture)
 */
export function mapMidtransStatusToPaymentStatus(
  transactionStatus: MidtransTransactionStatus,
  fraudStatus?: MidtransFraudStatus
): PaymentStatus {
  switch (transactionStatus) {
    case "settlement":
      // QRIS, GoPay, OVO, bank transfer: langsung settled
      return PaymentStatus.PAID;

    case "capture":
      // Credit card: fraud_status menentukan outcome
      if (fraudStatus === "challenge") return PaymentStatus.CHALLENGE;
      // "accept" atau undefined (beberapa metode tidak kirim fraud_status)
      return PaymentStatus.PAID;

    case "pending":
      return PaymentStatus.PENDING;

    case "deny":
      return PaymentStatus.FAILED;

    case "cancel":
      return PaymentStatus.CANCELED;

    case "expire":
      return PaymentStatus.EXPIRED;

    case "refund":
    case "partial_refund":
      return PaymentStatus.REFUNDED;

    case "authorize":
      // Pre-authorization — masih butuh capture manual, belum final
      return PaymentStatus.PENDING;

    default: {
      // TypeScript exhaustive check
      // Jika Midtrans menambahkan status baru, TypeScript akan error di sini
      const _exhaustive: never = transactionStatus;
      void _exhaustive;
      return PaymentStatus.PENDING;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Helper: isPaymentSuccessful
// ─────────────────────────────────────────────────────────────

/**
 * Apakah status ini berarti uang sudah diterima?
 * Digunakan untuk menentukan apakah Order perlu di-update ke PROCESSING.
 *
 * CHALLENGE bukan sukses — butuh konfirmasi manual dari Midtrans dulu.
 */
export function isPaymentSuccessful(status: PaymentStatus): boolean {
  return status === PaymentStatus.PAID;
}

/**
 * Apakah status ini bersifat terminal (tidak akan berubah lagi)?
 * Digunakan untuk mencegah update yang tidak perlu pada record yang sudah final.
 */
export function isTerminalStatus(status: PaymentStatus): boolean {
  const terminalStatuses: PaymentStatus[] = [
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
    PaymentStatus.CANCELED,
    PaymentStatus.REFUNDED,
  ];
  return terminalStatuses.includes(status);
}
