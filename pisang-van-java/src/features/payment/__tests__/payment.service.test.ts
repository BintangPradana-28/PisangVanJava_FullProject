/**
 * @vitest-environment node
 */
// src/features/payment/__tests__/payment.service.test.ts
//
// Unit tests untuk Payment Aggregate — P0 #10
// Semua test menggunakan pure functions — zero DB, zero Redis, zero network.
// Integration test (dengan Prisma + Redis real) ada di terpisah.

import { describe, expect, it } from "vitest";
import { PaymentStatus } from "@prisma/client";
import { createHash } from "crypto";

import {
  isPaymentSuccessful,
  isTerminalStatus,
  mapMidtransStatusToPaymentStatus,
} from "../payment-status.mapper";
import { verifyMidtransSignature } from "@/src/lib/midtrans-crypto";

// ─────────────────────────────────────────────────────────────
// Helper: generate valid signature untuk test
// ─────────────────────────────────────────────────────────────

const TEST_SERVER_KEY = "SB-Mid-server-testkey-pvj-2026";
const TEST_PARAMS = {
  orderId: "PVJ-cuid123abc-1717920000000",
  statusCode: "200",
  grossAmount: "50000.00",
};

function generateTestSignature(overrides?: Partial<typeof TEST_PARAMS>): string {
  const params = { ...TEST_PARAMS, ...overrides };
  return createHash("sha512")
    .update(
      `${params.orderId}${params.statusCode}${params.grossAmount}${TEST_SERVER_KEY}`
    )
    .digest("hex");
}

// ─────────────────────────────────────────────────────────────
// Suite 1: mapMidtransStatusToPaymentStatus
// ─────────────────────────────────────────────────────────────

describe("mapMidtransStatusToPaymentStatus", () => {
  describe("settlement (QRIS, GoPay, bank transfer)", () => {
    it("settlement → PAID", () => {
      expect(mapMidtransStatusToPaymentStatus("settlement")).toBe(
        PaymentStatus.PAID
      );
    });

    it("settlement tidak peduli fraud_status (tidak relevan)", () => {
      // fraud_status hanya relevan untuk credit_card capture
      expect(mapMidtransStatusToPaymentStatus("settlement", "challenge")).toBe(
        PaymentStatus.PAID
      );
    });
  });

  describe("capture (credit card)", () => {
    it("capture + fraud accept → PAID", () => {
      expect(mapMidtransStatusToPaymentStatus("capture", "accept")).toBe(
        PaymentStatus.PAID
      );
    });

    it("capture + fraud challenge → CHALLENGE (butuh review manual)", () => {
      expect(mapMidtransStatusToPaymentStatus("capture", "challenge")).toBe(
        PaymentStatus.CHALLENGE
      );
    });

    it("capture tanpa fraud_status → PAID (default)", () => {
      expect(mapMidtransStatusToPaymentStatus("capture")).toBe(
        PaymentStatus.PAID
      );
    });
  });

  describe("status lainnya", () => {
    it("pending → PENDING", () => {
      expect(mapMidtransStatusToPaymentStatus("pending")).toBe(
        PaymentStatus.PENDING
      );
    });

    it("deny → FAILED", () => {
      expect(mapMidtransStatusToPaymentStatus("deny")).toBe(
        PaymentStatus.FAILED
      );
    });

    it("cancel → CANCELED", () => {
      expect(mapMidtransStatusToPaymentStatus("cancel")).toBe(
        PaymentStatus.CANCELED
      );
    });

    it("expire → EXPIRED", () => {
      expect(mapMidtransStatusToPaymentStatus("expire")).toBe(
        PaymentStatus.EXPIRED
      );
    });

    it("refund → REFUNDED", () => {
      expect(mapMidtransStatusToPaymentStatus("refund")).toBe(
        PaymentStatus.REFUNDED
      );
    });

    it("partial_refund → REFUNDED", () => {
      expect(mapMidtransStatusToPaymentStatus("partial_refund")).toBe(
        PaymentStatus.REFUNDED
      );
    });

    it("authorize → PENDING (pre-auth belum captured)", () => {
      expect(mapMidtransStatusToPaymentStatus("authorize")).toBe(
        PaymentStatus.PENDING
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 2: isPaymentSuccessful
// ─────────────────────────────────────────────────────────────

describe("isPaymentSuccessful", () => {
  it("PAID → true (uang sudah masuk)", () => {
    expect(isPaymentSuccessful(PaymentStatus.PAID)).toBe(true);
  });

  it("PENDING → false", () => {
    expect(isPaymentSuccessful(PaymentStatus.PENDING)).toBe(false);
  });

  it("FAILED → false", () => {
    expect(isPaymentSuccessful(PaymentStatus.FAILED)).toBe(false);
  });

  it("EXPIRED → false", () => {
    expect(isPaymentSuccessful(PaymentStatus.EXPIRED)).toBe(false);
  });

  it("CHALLENGE → false (butuh konfirmasi Midtrans dulu)", () => {
    // Jika CHALLENGE dianggap sukses, dapur akan proses pesanan yang
    // mungkin akhirnya di-deny. Ini tidak boleh terjadi.
    expect(isPaymentSuccessful(PaymentStatus.CHALLENGE)).toBe(false);
  });

  it("CANCELED → false", () => {
    expect(isPaymentSuccessful(PaymentStatus.CANCELED)).toBe(false);
  });

  it("REFUNDED → false", () => {
    expect(isPaymentSuccessful(PaymentStatus.REFUNDED)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 3: isTerminalStatus
// ─────────────────────────────────────────────────────────────

describe("isTerminalStatus", () => {
  it("PAID adalah terminal — tidak akan berubah lagi", () => {
    expect(isTerminalStatus(PaymentStatus.PAID)).toBe(true);
  });

  it("FAILED adalah terminal", () => {
    expect(isTerminalStatus(PaymentStatus.FAILED)).toBe(true);
  });

  it("EXPIRED adalah terminal", () => {
    expect(isTerminalStatus(PaymentStatus.EXPIRED)).toBe(true);
  });

  it("CANCELED adalah terminal", () => {
    expect(isTerminalStatus(PaymentStatus.CANCELED)).toBe(true);
  });

  it("REFUNDED adalah terminal", () => {
    expect(isTerminalStatus(PaymentStatus.REFUNDED)).toBe(true);
  });

  it("PENDING bukan terminal — masih bisa berubah", () => {
    expect(isTerminalStatus(PaymentStatus.PENDING)).toBe(false);
  });

  it("CHALLENGE bukan terminal — menunggu review Midtrans", () => {
    expect(isTerminalStatus(PaymentStatus.CHALLENGE)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 4: verifyMidtransSignature (SECURITY CRITICAL)
// ─────────────────────────────────────────────────────────────

describe("verifyMidtransSignature — Security", () => {
  it("✅ menerima signature valid yang di-generate dengan benar", () => {
    const validSignature = generateTestSignature();
    expect(
      verifyMidtransSignature({
        ...TEST_PARAMS,
        serverKey: TEST_SERVER_KEY,
        receivedSignature: validSignature,
      })
    ).toBe(true);
  });

  it("❌ menolak signature yang salah (spoofing attempt)", () => {
    expect(
      verifyMidtransSignature({
        ...TEST_PARAMS,
        serverKey: TEST_SERVER_KEY,
        receivedSignature: "a".repeat(128), // 128 chars hex tapi salah
      })
    ).toBe(false);
  });

  it("❌ menolak signature dengan panjang tidak valid (anti timing-attack)", () => {
    // Jika panjang berbeda, hacker bisa tahu signature terlalu pendek/panjang
    // tanpa perlu compute SHA512 penuh
    expect(
      verifyMidtransSignature({
        ...TEST_PARAMS,
        serverKey: TEST_SERVER_KEY,
        receivedSignature: "abc123", // terlalu pendek
      })
    ).toBe(false);
  });

  it("❌ menolak signature kosong", () => {
    expect(
      verifyMidtransSignature({
        ...TEST_PARAMS,
        serverKey: TEST_SERVER_KEY,
        receivedSignature: "",
      })
    ).toBe(false);
  });

  it("❌ menolak jika order_id diubah (payload tampering)", () => {
    const validSignature = generateTestSignature();
    expect(
      verifyMidtransSignature({
        orderId: "PVJ-DIFFERENT-ORDER-999", // order_id diubah hacker
        statusCode: TEST_PARAMS.statusCode,
        grossAmount: TEST_PARAMS.grossAmount,
        serverKey: TEST_SERVER_KEY,
        receivedSignature: validSignature, // signature masih dari order asli
      })
    ).toBe(false);
  });

  it("❌ menolak jika gross_amount diubah (free order exploit)", () => {
    const validSignature = generateTestSignature();
    expect(
      verifyMidtransSignature({
        ...TEST_PARAMS,
        grossAmount: "1.00", // hacker coba bayar Rp 1 untuk order Rp 50.000
        serverKey: TEST_SERVER_KEY,
        receivedSignature: validSignature,
      })
    ).toBe(false);
  });

  it("❌ menolak jika server_key salah (wrong environment)", () => {
    const validSignature = generateTestSignature();
    expect(
      verifyMidtransSignature({
        ...TEST_PARAMS,
        serverKey: "WRONG-SERVER-KEY-PRODUCTION",
        receivedSignature: validSignature,
      })
    ).toBe(false);
  });

  it("❌ menolak jika ada field kosong", () => {
    expect(
      verifyMidtransSignature({
        orderId: "",
        statusCode: TEST_PARAMS.statusCode,
        grossAmount: TEST_PARAMS.grossAmount,
        serverKey: TEST_SERVER_KEY,
        receivedSignature: generateTestSignature(),
      })
    ).toBe(false);
  });
});
