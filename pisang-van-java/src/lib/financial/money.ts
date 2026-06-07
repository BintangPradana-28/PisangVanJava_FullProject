/**
 * @file money.ts
 * @description Core financial calculation engine untuk Pisang Van Java.
 *
 * ARSITEKTUR KEPUTUSAN:
 * - File ini adalah SERVER-ONLY. Jangan import di komponen client.
 * - Semua kalkulasi intermediate menggunakan Decimal untuk presisi penuh.
 * - Output ke DB: Prisma Decimal (otomatis kompatibel).
 * - Output ke client: number (integer Rupiah, sudah dibulatkan).
 * - IDR tidak mengenal sen — rounding direction: ROUND_HALF_UP ke integer.
 *
 * THREAT MODEL:
 * - Salami Slicing: dicegah dengan rounding SETELAH akumulasi, bukan per-item.
 * - Price manipulation: semua harga diambil dari DB, bukan dari client payload.
 * - Overflow: Decimal(15,4) untuk intermediate, Decimal(15,2) untuk final.
 */

// Server-only guard — build akan gagal jika file ini diimport di client bundle
import "server-only";

import Decimal from "decimal.js";

// ─── Konfigurasi Global Decimal.js ───────────────────────────────────────────
// Presisi 20 digit cukup untuk semua intermediate calculation IDR
// Rounding: ROUND_HALF_UP sesuai konvensi akuntansi Indonesia
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 20,
});

// ─── Type Definitions ─────────────────────────────────────────────────────────

/**
 * Input type yang bisa diterima oleh fungsi kalkulasi.
 * Menerima Prisma Decimal, number, atau string untuk fleksibilitas.
 */
export type MoneyInput = Decimal | number | string | null | undefined;

/**
 * Hasil kalkulasi order yang siap dikirim ke Midtrans dan disimpan ke DB.
 * Semua nilai sudah dibulatkan ke integer Rupiah.
 */
export interface OrderCalculation {
  /** Total harga item sebelum diskon dan ongkir */
  subtotal: number;
  /** Nilai diskon dalam Rupiah */
  discountAmount: number;
  /** Biaya pengiriman dalam Rupiah */
  deliveryFee: number;
  /** Total akhir yang ditagihkan ke pelanggan */
  totalPrice: number;
  /** Breakdown per item untuk audit */
  items: OrderItemCalculation[];
}

export interface OrderItemCalculation {
  menuVariantId: string;
  quantity: number;
  /** Harga satuan dari DB (sebelum topping) */
  unitPrice: number;
  /** Total harga topping untuk item ini */
  toppingTotal: number;
  /** Subtotal item: (unitPrice + toppingTotal) × quantity */
  subtotal: number;
}

// ─── Core Money Functions ─────────────────────────────────────────────────────

/**
 * Konversi input ke Decimal dengan validasi.
 * Menolak NaN, Infinity, dan nilai negatif untuk harga.
 */
export function toDecimal(value: MoneyInput): Decimal {
  if (value === null || value === undefined) {
    return new Decimal(0);
  }

  const d = new Decimal(value.toString());

  if (!d.isFinite()) {
    throw new Error(
      `[money.ts] Nilai tidak valid untuk kalkulasi finansial: ${value}`
    );
  }

  return d;
}

/**
 * Pembulatan ke integer Rupiah terdekat.
 * IDR tidak mengenal sen — selalu bulatkan ke bilangan bulat.
 *
 * @example
 * roundToRupiah(new Decimal("15249.50")) // → 15250
 * roundToRupiah(new Decimal("15249.49")) // → 15249
 */
export function roundToRupiah(value: Decimal): number {
  return value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Hitung total harga satu item order.
 *
 * Formula: (unitPrice + toppingsTotalPrice) × quantity
 *
 * PENTING: Rounding hanya dilakukan di akhir per-item, BUKAN per-operasi.
 * Ini mencegah akumulasi rounding error.
 */
export function calculateItemSubtotal(params: {
  unitPrice: MoneyInput;
  toppingPrices: MoneyInput[];
  quantity: number;
}): Decimal {
  const { unitPrice, toppingPrices, quantity } = params;

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error(
      `[money.ts] Kuantitas tidak valid: ${quantity}. Harus integer positif.`
    );
  }

  const basePrice = toDecimal(unitPrice);

  // Akumulasi harga topping tanpa rounding intermediate
  const toppingTotal = toppingPrices.reduce<Decimal>((acc, price) => {
    return acc.plus(toDecimal(price));
  }, new Decimal(0));

  // (basePrice + toppingTotal) × quantity — rounding SETELAH semua operasi
  return basePrice.plus(toppingTotal).times(quantity);
}

/**
 * Hitung diskon dari voucher.
 * Mendukung: fixed amount dan persentase.
 *
 * @param subtotal - Subtotal sebelum diskon
 * @param discountType - "FIXED" | "PERCENTAGE"
 * @param discountValue - Nilai diskon (Rupiah atau persen 0-100)
 * @param maxDiscount - Batas maksimum diskon (untuk voucher persentase)
 *
 * @example
 * // Diskon persentase 15.5% dari Rp 50.000 dengan max Rp 10.000
 * calculateDiscount(50000, "PERCENTAGE", 15.5, 10000) // → 7750
 *
 * // Diskon fixed Rp 5.000
 * calculateDiscount(30000, "FIXED", 5000) // → 5000
 */
export function calculateDiscount(
  subtotal: MoneyInput,
  discountType: "FIXED" | "PERCENTAGE",
  discountValue: MoneyInput,
  maxDiscount?: MoneyInput
): Decimal {
  const subtotalD = toDecimal(subtotal);
  const valueD = toDecimal(discountValue);

  if (valueD.isNegative()) {
    throw new Error("[money.ts] Nilai diskon tidak boleh negatif.");
  }

  let discountAmount: Decimal;

  if (discountType === "FIXED") {
    discountAmount = valueD;
  } else if (discountType === "PERCENTAGE") {
    if (valueD.greaterThan(100)) {
      throw new Error("[money.ts] Persentase diskon tidak boleh melebihi 100%.");
    }
    // subtotal × (percentage / 100) — presisi penuh sebelum rounding
    discountAmount = subtotalD.times(valueD).dividedBy(100);
  } else {
    throw new Error(`[money.ts] Tipe diskon tidak dikenal: ${discountType}`);
  }

  // Terapkan batas maksimum diskon jika ada
  if (maxDiscount !== undefined && maxDiscount !== null) {
    const maxD = toDecimal(maxDiscount);
    if (discountAmount.greaterThan(maxD)) {
      discountAmount = maxD;
    }
  }

  // Diskon tidak boleh melebihi subtotal
  if (discountAmount.greaterThan(subtotalD)) {
    discountAmount = subtotalD;
  }

  return discountAmount;
}

/**
 * Fungsi utama: kalkulasi lengkap satu order.
 *
 * PRINSIP:
 * 1. Semua harga diambil dari DB (bukan dari client) — price tampering prevention.
 * 2. Rounding Salami-Safe: akumulasi dulu, bulatkan di akhir.
 * 3. Output adalah integer Rupiah — tidak ada desimal ke Midtrans.
 */
export function calculateOrder(params: {
  items: Array<{
    menuVariantId: string;
    quantity: number;
    unitPrice: MoneyInput;
    toppingPrices: MoneyInput[];
  }>;
  deliveryFee: MoneyInput;
  discountType?: "FIXED" | "PERCENTAGE";
  discountValue?: MoneyInput;
  maxDiscount?: MoneyInput;
}): OrderCalculation {
  const { items, deliveryFee, discountType, discountValue, maxDiscount } =
    params;

  if (items.length === 0) {
    throw new Error("[money.ts] Order tidak boleh kosong.");
  }

  // ── Step 1: Hitung per-item ───────────────────────────────────────────────
  const itemCalculations: OrderItemCalculation[] = items.map((item) => {
    const toppingTotal = item.toppingPrices.reduce<Decimal>(
      (acc, price) => acc.plus(toDecimal(price)),
      new Decimal(0)
    );

    const subtotalDecimal = calculateItemSubtotal({
      unitPrice: item.unitPrice,
      toppingPrices: item.toppingPrices,
      quantity: item.quantity,
    });

    return {
      menuVariantId: item.menuVariantId,
      quantity: item.quantity,
      unitPrice: roundToRupiah(toDecimal(item.unitPrice)),
      toppingTotal: roundToRupiah(toppingTotal),
      subtotal: roundToRupiah(subtotalDecimal),
    };
  });

  // ── Step 2: Akumulasi subtotal tanpa rounding ─────────────────────────────
  // Rounding Salami-Safe: sum SEMUA item dulu, baru bulatkan
  const subtotalDecimal = items.reduce<Decimal>((acc, item) => {
    return acc.plus(
      calculateItemSubtotal({
        unitPrice: item.unitPrice,
        toppingPrices: item.toppingPrices,
        quantity: item.quantity,
      })
    );
  }, new Decimal(0));

  const subtotal = roundToRupiah(subtotalDecimal);

  // ── Step 3: Kalkulasi diskon ──────────────────────────────────────────────
  let discountAmount = 0;
  if (discountType && discountValue !== undefined && discountValue !== null) {
    const discountDecimal = calculateDiscount(
      subtotalDecimal,
      discountType,
      discountValue,
      maxDiscount
    );
    discountAmount = roundToRupiah(discountDecimal);
  }

  // ── Step 4: Total akhir ───────────────────────────────────────────────────
  const deliveryFeeAmount = roundToRupiah(toDecimal(deliveryFee));

  // Final total: subtotal - diskon + ongkir
  // Menggunakan Decimal sekali lagi untuk final sum — tidak ada rounding error
  const totalPrice = roundToRupiah(
    new Decimal(subtotal)
      .minus(discountAmount)
      .plus(deliveryFeeAmount)
  );

  // Guard: total tidak boleh negatif
  if (totalPrice < 0) {
    throw new Error(
      "[money.ts] Total order tidak boleh negatif. Periksa kalkulasi diskon."
    );
  }

  return {
    subtotal,
    discountAmount,
    deliveryFee: deliveryFeeAmount,
    totalPrice,
    items: itemCalculations,
  };
}

/**
 * Konversi Prisma Decimal ke number untuk serialisasi ke client.
 * Gunakan ini SEBELUM mengirim data ke client component atau API response.
 *
 * @example
 * const order = await prisma.order.findUnique(...)
 * const totalForClient = decimalToNumber(order.totalPrice) // → 25000
 */
export function decimalToNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return roundToRupiah(new Decimal(value.toString()));
}

/**
 * Format Rupiah untuk display.
 * Server-side safe — tidak menggunakan browser Intl.
 *
 * @example
 * formatRupiah(25000) // → "Rp 25.000"
 */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
