// src/app/api/webhooks/midtrans/route.ts
//
// Midtrans Webhook Endpoint — P0 Security Critical
//
// KEAMANAN:
// - Validate SHA512 signature (mencegah spoofing / free order exploit)
// - Return 200 CEPAT (< 5 detik) agar Midtrans tidak retry berlebihan
// - Jangan expose detail error ke response body (information leakage)
// - IP allowlist 103.208.23.0/24 sudah dihandle di Cloudflare WAF
//
// JANGAN gunakan Next Safe Action di sini.
// Next Safe Action untuk Server Actions (form/mutation).
// Webhook = Route Handler biasa.

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyMidtransSignature } from "@/src/lib/midtrans-crypto";
import {
  extractClientIp,
  isMidtransIp,
  isRequestViaCloudflare,
} from "@/src/lib/ip-utils";
import {
  PaymentNotFoundError,
  processMidtransWebhook,
} from "@/src/features/payment/payment.service";
import type { MidtransWebhookPayload } from "@/src/types/midtrans";

// ─────────────────────────────────────────────────────────────
// Schema Validation
// Validasi field minimum yang dibutuhkan untuk signature + processing.
// rawWebhookPayload menyimpan full payload mentah dari Midtrans.
// ─────────────────────────────────────────────────────────────

const midtransWebhookSchema = z.object({
  order_id: z.string().min(1).max(50),
  transaction_id: z.string().min(1).max(100),
  merchant_id: z.string().min(1),
  status_code: z.string().min(3).max(3), // "200", "201", "202", dll
  gross_amount: z
    .string()
    .regex(/^\d{1,10}(\.\d{2})?$/, "gross_amount format tidak valid"),
  signature_key: z
    .string()
    .length(128, "signature_key harus 128 karakter SHA512 hex"),
  transaction_status: z.enum([
    "capture",
    "settlement",
    "pending",
    "deny",
    "cancel",
    "expire",
    "refund",
    "partial_refund",
    "authorize",
  ]),
  payment_type: z.string().min(1),
  currency: z.string().default("IDR"),
  fraud_status: z.enum(["accept", "challenge", "deny"]).optional(),
});

// ─────────────────────────────────────────────────────────────
// POST /api/webhooks/midtrans
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 0. App-Level IP Guard (Defense-in-Depth) ─────────────
  const clientIp = extractClientIp(request.headers);

  if (!isRequestViaCloudflare(request.headers)) {
    console.warn("[Midtrans Webhook] ⚠️ Request tidak melewati Cloudflare — potensi origin bypass", {
      clientIp: clientIp ?? "unknown",
      timestamp: new Date().toISOString(),
    });
  }

  if (clientIp === null) {
    console.warn("[Midtrans Webhook] ❌ IP tidak bisa diekstrak dari headers", {
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!isMidtransIp(clientIp)) {
    console.warn("[Midtrans Webhook] ❌ IP ditolak — bukan Midtrans IP range", {
      clientIp,
      viaCloudflare: isRequestViaCloudflare(request.headers),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // ── 1. Parse JSON body ───────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Payload tidak valid" },
      { status: 400 }
    );
  }

  // ── 2. Validate schema ───────────────────────────────────
  const validation = midtransWebhookSchema.safeParse(rawBody);

  if (!validation.success) {
    // Log untuk debugging — JANGAN expose Zod error detail ke response
    const orderId =
      typeof rawBody === "object" &&
      rawBody !== null &&
      "order_id" in rawBody
        ? (rawBody as Record<string, unknown>).order_id
        : "unknown";

    console.error("[Midtrans Webhook] Schema validation failed", {
      orderId,
      errorCount: validation.error.issues.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Format payload tidak valid" },
      { status: 400 }
    );
  }

  const validated = validation.data;

  // ── 3. Verify Signature ──────────────────────────────────
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    console.error(
      "[Midtrans Webhook] MIDTRANS_SERVER_KEY tidak terkonfigurasi"
    );
    // Return 500 — Midtrans akan retry nanti saat konfigurasi sudah benar
    return NextResponse.json(
      { message: "Konfigurasi server error" },
      { status: 500 }
    );
  }

  const isSignatureValid = verifyMidtransSignature({
    orderId: validated.order_id,
    statusCode: validated.status_code,
    grossAmount: validated.gross_amount,
    serverKey,
    receivedSignature: validated.signature_key,
  });

  if (!isSignatureValid) {
    // SECURITY: Log detail untuk audit tapi jangan expose ke caller
    console.warn("[Midtrans Webhook] ⚠️ SIGNATURE MISMATCH — Possible spoofing", {
      orderId: validated.order_id,
      merchantId: validated.merchant_id,
      transactionStatus: validated.transaction_status,
      sourceIp: request.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
      timestamp: new Date().toISOString(),
    });

    // 400 — bukan 200, agar Midtrans tahu kita tolak request ini
    return NextResponse.json(
      { message: "Signature tidak valid" },
      { status: 400 }
    );
  }

  // ── 4. Process Webhook ───────────────────────────────────
  // Cast ke full payload type — rawBody sudah validated untuk fields wajib
  const fullPayload = rawBody as MidtransWebhookPayload;

  try {
    const result = await processMidtransWebhook(fullPayload);

    if (result.alreadyProcessed) {
      console.info("[Midtrans Webhook] Duplicate — idempotent skip", {
        orderId: validated.order_id,
        transactionId: validated.transaction_id,
        existingStatus: result.paymentStatus,
      });
    } else {
      console.info("[Midtrans Webhook] ✅ Processed successfully", {
        orderId: result.orderId,
        transactionId: validated.transaction_id,
        paymentStatus: result.paymentStatus,
        transactionStatus: validated.transaction_status,
      });
    }

    // WAJIB return 200 — Midtrans berhenti retry setelah dapat 200
    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error) {
    // Payment record belum dibuat (race condition)
    // Return 404 → Midtrans akan retry setelah beberapa menit
    if (error instanceof PaymentNotFoundError) {
      console.error("[Midtrans Webhook] Payment record not found (race condition)", {
        orderId: validated.order_id,
        transactionId: validated.transaction_id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { message: "Payment record tidak ditemukan" },
        { status: 404 }
      );
    }

    // Unexpected error — 500 agar Midtrans retry
    // Ganti console.error dengan Sentry.captureException(error) di production
    console.error("[Midtrans Webhook] ❌ Unexpected error", {
      orderId: validated.order_id,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Tolak method selain POST ──────────────────────────────────
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}
