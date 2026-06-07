// src/features/payment/payment.service.ts
//
// Payment Aggregate Service — P0 #10
// Core business logic: menerima webhook Midtrans, update Payment + Order secara atomik.
//
// ARSITEKTUR:
// 1. Redis SET NX → idempotency guard (anti-duplicate webhook)
// 2. Prisma $transaction → atomic: update Payment + update Order
// 3. Jika Payment PAID → Order otomatis PROCESSING (langsung ke dapur)
//
// Design principle: Payment adalah source of truth finansial.
// Order HANYA mengikuti Payment — tidak pernah sebaliknya.

import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash"; // Changed to upstash based on stack
import type { MidtransWebhookPayload } from "@/src/types/midtrans";

import {
  isPaymentSuccessful,
  isTerminalStatus,
  mapMidtransStatusToPaymentStatus,
} from "./payment-status.mapper";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

// 24 jam: Midtrans retry window maksimum
// Jika webhook yang sama datang dalam 24 jam → skip (sudah diproses)
const IDEMPOTENCY_TTL_SECONDS = 86_400;
const IDEMPOTENCY_KEY_PREFIX = "pvj:midtrans:webhook:";

// ─────────────────────────────────────────────────────────────
// Custom Errors
// ─────────────────────────────────────────────────────────────

export class PaymentNotFoundError extends Error {
  constructor(midtransOrderId: string) {
    super(
      `Payment record tidak ditemukan untuk midtransOrderId: ${midtransOrderId}`
    );
    this.name = "PaymentNotFoundError";
  }
}

export class PaymentAlreadyFinalError extends Error {
  constructor(currentStatus: PaymentStatus, incomingStatus: PaymentStatus) {
    super(
      `Payment sudah final (${currentStatus}) — tidak bisa diupdate ke ${incomingStatus}`
    );
    this.name = "PaymentAlreadyFinalError";
  }
}

// ─────────────────────────────────────────────────────────────
// Return Types
// ─────────────────────────────────────────────────────────────

export interface ProcessWebhookResult {
  alreadyProcessed: boolean;
  paymentStatus: PaymentStatus;
  orderId: string;
}

export interface CreatePendingPaymentInput {
  orderId: string;
  midtransOrderId: string; // Format: "PVJ-{orderId}-{timestamp}"
  grossAmount: Decimal;
}

// ─────────────────────────────────────────────────────────────
// 1. processMidtransWebhook
// ─────────────────────────────────────────────────────────────

/**
 * Memproses webhook Midtrans secara atomik dan idempoten.
 *
 * Flow:
 * ┌─────────────────────────────────────────────────────┐
 * │ Redis NX check (idempotency)                        │
 * │  └── Already processed? → return early (200 OK)    │
 * │                                                     │
 * │ Map Midtrans status → PaymentStatus                 │
 * │                                                     │
 * │ Fetch existing Payment record                       │
 * │  └── Not found? → rollback Redis, throw error       │
 * │  └── Already terminal? → return early               │
 * │                                                     │
 * │ Prisma $transaction:                                │
 * │  1. Update Payment (status + rawWebhookPayload)     │
 * │  2. If PAID → update Order.status = PROCESSING      │
 * └─────────────────────────────────────────────────────┘
 */
export async function processMidtransWebhook(
  payload: MidtransWebhookPayload
): Promise<ProcessWebhookResult> {
  const idempotencyKey = `${IDEMPOTENCY_KEY_PREFIX}${payload.transaction_id}`;

  // ── STEP 1: Idempotency Guard ─────────────────────────────
  // SET NX = "Set if Not eXists"
  // Return: "OK" jika berhasil set (first time), null jika sudah ada
  const acquired = await redis.set(
    idempotencyKey,
    new Date().toISOString(),
    {
      ex: IDEMPOTENCY_TTL_SECONDS,
      nx: true,
    }
  );

  if (acquired === null) {
    // Webhook duplikat dari Midtrans — sudah diproses sebelumnya
    // Kembalikan data terkini dari DB tanpa mutasi apapun
    const existingPayment = await prisma.payment.findUnique({
      where: { transactionId: payload.transaction_id },
      select: { status: true, orderId: true },
    });

    return {
      alreadyProcessed: true,
      paymentStatus: existingPayment?.status ?? PaymentStatus.PENDING,
      orderId: existingPayment?.orderId ?? payload.order_id,
    };
  }

  // ── STEP 2: Map Status ────────────────────────────────────
  const newPaymentStatus = mapMidtransStatusToPaymentStatus(
    payload.transaction_status,
    payload.fraud_status
  );

  // ── STEP 3: Fetch existing Payment record ─────────────────
  // midtransOrderId = order_id yang kita kirim saat buat Snap token
  const existingPayment = await prisma.payment.findUnique({
    where: { midtransOrderId: payload.order_id },
    select: { id: true, orderId: true, status: true },
  });

  if (!existingPayment) {
    // Race condition: webhook masuk sebelum createPendingPayment() selesai.
    // Rollback Redis lock agar Midtrans retry bisa diproses nanti.
    await redis.del(idempotencyKey);
    throw new PaymentNotFoundError(payload.order_id);
  }

  // Guard: jangan update status yang sudah terminal
  // Contoh: PAID → EXPIRED tidak masuk akal secara finansial
  if (isTerminalStatus(existingPayment.status)) {
    return {
      alreadyProcessed: true,
      paymentStatus: existingPayment.status,
      orderId: existingPayment.orderId,
    };
  }

  // ── STEP 4: Atomic Database Transaction ───────────────────
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 4a. Update Payment dengan data webhook terbaru
    await tx.payment.update({
      where: { id: existingPayment.id },
      data: {
        transactionId: payload.transaction_id,
        status: newPaymentStatus,
        paymentType: payload.payment_type,

        // Tentukan channel: VA bank, direct bank, atau QRIS acquirer
        paymentChannel:
          payload.va_numbers?.[0]?.bank ??
          payload.bank ??
          payload.qris_acquirer ??
          null,

        // gross_amount dari Midtrans adalah string — parse ke Decimal
        grossAmount: new Decimal(payload.gross_amount),

        fraudStatus: payload.fraud_status ?? null,

// Parse datetime strings dari Midtrans ke Date object
        settlementTime: payload.settlement_time
          ? new Date(payload.settlement_time)
          : null,
        expiryTime: payload.expiry_time
          ? new Date(payload.expiry_time)
          : null,

        vaNumber: payload.va_numbers?.[0]?.va_number ?? null,
        acquirer: payload.acquirer ?? payload.qris_acquirer ?? null,

        // Simpan seluruh raw payload untuk audit finansial
        // Tim akuntan dapat reconcile ini dengan mutasi rekening
        rawWebhookPayload: payload as unknown as Prisma.InputJsonValue,
      },
    });

    // 4b. Propagate ke Order jika dan HANYA jika payment PAID
    // Status lain (FAILED, EXPIRED, CHALLENGE) → Order tetap di status sebelumnya
    // Kasir/Admin handle manual via dashboard untuk kasus tersebut
    if (isPaymentSuccessful(newPaymentStatus)) {
      await tx.order.update({
        where: {
          id: existingPayment.orderId,
          // Safety guard: hanya update Order yang masih PENDING_PAYMENT
          // Jika Order sudah PROCESSING/COMPLETED/CANCELED → skip (tidak error, tidak update)
          status: OrderStatus.PENDING_PAYMENT,
        },
        data: {
          status: OrderStatus.PROCESSING,
          confirmedAt: new Date(), // Timestamp konfirmasi pembayaran
        },
      });
    }
  });

  return {
    alreadyProcessed: false,
    paymentStatus: newPaymentStatus,
    orderId: existingPayment.orderId,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. createPendingPayment
// ─────────────────────────────────────────────────────────────

/**
 * Buat record Payment awal saat Snap token berhasil dibuat.
 * Dipanggil dari Server Action checkout SEBELUM mengembalikan snapToken ke client.
 *
 * Urutan yang benar di checkout Server Action:
 * 1. Buat Order (status: PENDING_PAYMENT)
 * 2. Request Snap token ke Midtrans
 * 3. createPendingPayment() ← di sini
 * 4. Return snapToken ke client
 *
 * Format midtransOrderId yang direkomendasikan:
 * "PVJ-{orderId}-{Date.now()}"
 * Suffix timestamp penting karena Midtrans tidak mengizinkan
 * order_id yang sama digunakan dua kali — bahkan untuk retry.
 */
export async function createPendingPayment(
  input: CreatePendingPaymentInput
): Promise<void> {
  await prisma.payment.create({
    data: {
      orderId: input.orderId,
      midtransOrderId: input.midtransOrderId,
      grossAmount: input.grossAmount,
      status: PaymentStatus.PENDING,
      currency: "IDR",
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 3. getPaymentByOrderId (untuk UI status check)
// ─────────────────────────────────────────────────────────────

/**
 * Ambil status payment untuk ditampilkan di order detail page.
 * Hanya return field yang aman untuk di-expose ke client.
 */
export async function getPaymentByOrderId(orderId: string) {
  return prisma.payment.findUnique({
    where: { orderId },
    select: {
      status: true,
      paymentType: true,
      paymentChannel: true,
      grossAmount: true,
      settlementTime: true,
      vaNumber: true,
      // rawWebhookPayload TIDAK di-expose ke client
    },
  });
}
