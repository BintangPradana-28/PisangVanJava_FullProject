/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => {
  return {}
})

import Decimal from 'decimal.js'
import {
  calculateDiscount,
  calculateItemSubtotal,
  calculateOrder,
  decimalToNumber,
  roundToRupiah,
  toDecimal
} from '@/src/lib/financial/money'

describe('Financial Precision Engine (money.ts)', () => {
  describe('toDecimal()', () => {
    it('should handle null/undefined as 0', () => {
      expect(toDecimal(null).toNumber()).toBe(0)
      expect(toDecimal(undefined).toNumber()).toBe(0)
    })

    it('should convert number and string properly', () => {
      expect(toDecimal(15000).toNumber()).toBe(15000)
      expect(toDecimal('15000.55').toNumber()).toBe(15000.55)
    })

    it('should throw on invalid numbers', () => {
      expect(() => toDecimal(NaN)).toThrow()
      expect(() => toDecimal(Infinity)).toThrow()
    })
  })

  describe('roundToRupiah()', () => {
    it('should round half up properly', () => {
      expect(roundToRupiah(new Decimal('15000.5'))).toBe(15001)
      expect(roundToRupiah(new Decimal('15000.49'))).toBe(15000)
      expect(roundToRupiah(new Decimal('15000.50'))).toBe(15001)
      expect(roundToRupiah(new Decimal('15000.00'))).toBe(15000)
    })
  })

  describe('calculateItemSubtotal()', () => {
    it('should calculate correctly with toppings', () => {
      const result = calculateItemSubtotal({
        unitPrice: 12000,
        toppingPrices: [3000, 2000],
        quantity: 2
      })
      // (12000 + 5000) * 2 = 34000
      expect(result.toNumber()).toBe(34000)
    })

    it('should accumulate without early rounding', () => {
      // 12000.4 + 3000.4 = 15000.8
      // 15000.8 * 2 = 30001.6
      const result = calculateItemSubtotal({
        unitPrice: 12000.4,
        toppingPrices: [3000.4],
        quantity: 2
      })
      expect(result.toNumber()).toBe(30001.6)
    })

    it('should throw on invalid quantity', () => {
      expect(() =>
        calculateItemSubtotal({ unitPrice: 10000, toppingPrices: [], quantity: 0 })
      ).toThrow('Kuantitas tidak valid')
      expect(() =>
        calculateItemSubtotal({ unitPrice: 10000, toppingPrices: [], quantity: 1.5 })
      ).toThrow('Kuantitas tidak valid')
    })
  })

  describe('calculateDiscount()', () => {
    it('should handle FIXED discount', () => {
      const res = calculateDiscount(50000, 'FIXED', 10000)
      expect(res.toNumber()).toBe(10000)
    })

    it('should handle PERCENTAGE discount', () => {
      const res = calculateDiscount(50000, 'PERCENTAGE', 15)
      expect(res.toNumber()).toBe(7500)
    })

    it('should handle fractional PERCENTAGE correctly without precision loss', () => {
      // 15.5% of 13000 = 2015
      const res = calculateDiscount(13000, 'PERCENTAGE', 15.5)
      expect(res.toNumber()).toBe(2015)
    })

    it('should cap discount to maxDiscount', () => {
      const res = calculateDiscount(100000, 'PERCENTAGE', 50, 15000)
      expect(res.toNumber()).toBe(15000)
    })

    it('should not exceed subtotal', () => {
      const res = calculateDiscount(50000, 'FIXED', 60000)
      expect(res.toNumber()).toBe(50000)
    })

    it('should throw on negative discount', () => {
      expect(() => calculateDiscount(50000, 'FIXED', -5000)).toThrow()
    })

    it('should throw on percentage > 100', () => {
      expect(() => calculateDiscount(50000, 'PERCENTAGE', 101)).toThrow()
    })
  })

  describe('calculateOrder()', () => {
    it('should calculate a full order correctly with integer output', () => {
      const result = calculateOrder({
        items: [
          {
            menuVariantId: 'v1',
            quantity: 2,
            unitPrice: 12000,
            toppingPrices: [3000] // 15000 * 2 = 30000
          },
          {
            menuVariantId: 'v2',
            quantity: 1,
            unitPrice: 10000,
            toppingPrices: [] // 10000
          }
        ],
        deliveryFee: 5000,
        discountType: 'PERCENTAGE',
        discountValue: 10 // 10% dari 40000 = 4000
      })

      expect(result.subtotal).toBe(40000)
      expect(result.discountAmount).toBe(4000)
      expect(result.deliveryFee).toBe(5000)
      expect(result.totalPrice).toBe(41000)
      expect(result.items).toHaveLength(2)
      expect(result.items[0].subtotal).toBe(30000)
      expect(result.items[1].subtotal).toBe(10000)
    })

    it('should prevent salami slicing attacks', () => {
      // 3 items of 12000.33 each
      // Individual rounded: 12000 * 3 = 36000
      // Summed before rounding: 36000.99 -> 36001
      const result = calculateOrder({
        items: [
          {
            menuVariantId: 'v1',
            quantity: 3,
            unitPrice: 12000.33,
            toppingPrices: []
          }
        ],
        deliveryFee: 0
      })

      expect(result.subtotal).toBe(36001)
      expect(result.totalPrice).toBe(36001)
    })

    it('should throw if order is empty', () => {
      expect(() => calculateOrder({ items: [], deliveryFee: 0 })).toThrow()
    })

    it('should throw if final total is negative', () => {
      expect(() =>
        calculateOrder({
          items: [{ menuVariantId: '1', quantity: 1, unitPrice: 10000, toppingPrices: [] }],
          deliveryFee: -15000 // force negative
        })
      ).toThrow()
    })
  })

  describe('decimalToNumber()', () => {
    it('should convert Prisma Decimal to client safe number', () => {
      expect(decimalToNumber(new Decimal('15000.5'))).toBe(15001)
      expect(decimalToNumber(15000)).toBe(15000)
      expect(decimalToNumber(null)).toBe(0)
      expect(decimalToNumber(undefined)).toBe(0)
    })
  })
})
