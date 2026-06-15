/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => {
  return {}
})

let mockBiteshipApiKey: string | undefined

vi.mock('@/src/env', () => {
  return {
    get env() {
      return {
        BITESHIP_API_KEY: mockBiteshipApiKey
      }
    }
  }
})

import {
  calculateHaversineDistance,
  calculateShippingRates,
  calculateSimulatedRates
} from '../shipping.service'

describe('Shipping Service', () => {
  beforeEach(() => {
    mockBiteshipApiKey = undefined
    vi.restoreAllMocks()
  })

  describe('calculateHaversineDistance()', () => {
    it('should return 0 when calculating distance to the same point', () => {
      const distance = calculateHaversineDistance(-6.3157, 106.9016, -6.3157, 106.9016)
      expect(distance).toBeCloseTo(0, 4)
    })

    it('should calculate correct distance between two different coordinates', () => {
      // Monumen Nasional (Monas) coordinates: -6.1754, 106.8272
      // Store coordinates: -6.3157, 106.9016
      const distance = calculateHaversineDistance(-6.3157, 106.9016, -6.1754, 106.8272)
      // Jarak harus sekitar 17.5 km
      expect(distance).toBeGreaterThan(15)
      expect(distance).toBeLessThan(20)
    })
  })

  describe('calculateSimulatedRates()', () => {
    it('should apply minimum base rates for distance <= 3km', () => {
      const rates = calculateSimulatedRates(2.5)
      expect(rates).toHaveLength(3)

      const gojek = rates.find((r) => r.courierCode === 'gojek')
      const grab = rates.find((r) => r.courierCode === 'grab')
      const lalamove = rates.find((r) => r.courierCode === 'lalamove')

      expect(gojek?.price).toBe(15000)
      expect(grab?.price).toBe(14000)
      expect(lalamove?.price).toBe(12000)
    })

    it('should calculate higher rates for distance > 4km', () => {
      const rates = calculateSimulatedRates(10)
      expect(rates).toHaveLength(3)

      const gojek = rates.find((r) => r.courierCode === 'gojek')
      // 10km -> roundedDistance = 10 -> 15000 + Math.ceil(10 - 4) * 2500 = 15000 + 6 * 2500 = 30000
      expect(gojek?.price).toBe(30000)
    })

    it('should return empty array if distance is greater than 40km', () => {
      const rates = calculateSimulatedRates(45)
      expect(rates).toEqual([])
    })
  })

  describe('calculateShippingRates()', () => {
    const mockItems = [{ name: 'Pisang Krispy', quantity: 2, price: 15000 }]

    it('should use simulation when BITESHIP_API_KEY is not set', async () => {
      mockBiteshipApiKey = undefined
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)

      const rates = await calculateShippingRates({
        destinationLat: -6.32,
        destinationLng: 106.91,
        items: mockItems
      })

      expect(fetchSpy).not.toHaveBeenCalled()
      expect(rates).toHaveLength(3)
      expect(rates[0].courierName).toBeDefined()
    })

    it('should call BiteShip API when BITESHIP_API_KEY is set and return correct services', async () => {
      mockBiteshipApiKey = 'biteship_test_mock_key'

      const mockApiResponse = {
        success: true,
        data: {
          couriers: [
            {
              courier_name: 'Gojek',
              courier_code: 'gojek',
              available_services: [
                {
                  service_name: 'Instant',
                  service_code: 'instant',
                  price: 18000,
                  etd: '1-2 hours'
                }
              ]
            }
          ]
        }
      }

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      })
      vi.stubGlobal('fetch', fetchSpy)

      const rates = await calculateShippingRates({
        destinationLat: -6.32,
        destinationLng: 106.91,
        items: mockItems
      })

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.biteship.com/v1/rates/couriers',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer biteship_test_mock_key',
            'Content-Type': 'application/json'
          })
        })
      )

      expect(rates).toHaveLength(1)
      expect(rates[0]).toEqual({
        courierName: 'Gojek',
        courierCode: 'gojek',
        serviceName: 'Instant',
        serviceCode: 'instant',
        price: 18000,
        etd: '1-2 hours'
      })
    })

    it('should fall back to simulation when BiteShip API returns non-ok status', async () => {
      mockBiteshipApiKey = 'biteship_test_mock_key'

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })
      vi.stubGlobal('fetch', fetchSpy)

      const rates = await calculateShippingRates({
        destinationLat: -6.32,
        destinationLng: 106.91,
        items: mockItems
      })

      // Should fall back to simulation and return 3 services
      expect(rates).toHaveLength(3)
      const gojek = rates.find((r) => r.courierCode === 'gojek')
      expect(gojek?.price).toBeDefined()
    })

    it('should fall back to simulation when BiteShip API returns success: false', async () => {
      mockBiteshipApiKey = 'biteship_test_mock_key'

      const mockApiResponse = {
        success: false,
        error: 'Invalid request'
      }

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockApiResponse
      })
      vi.stubGlobal('fetch', fetchSpy)

      const rates = await calculateShippingRates({
        destinationLat: -6.32,
        destinationLng: 106.91,
        items: mockItems
      })

      expect(rates).toHaveLength(3)
    })

    it('should fall back to simulation when BiteShip API throws an error', async () => {
      mockBiteshipApiKey = 'biteship_test_mock_key'

      const fetchSpy = vi.fn().mockRejectedValue(new Error('Network failure'))
      vi.stubGlobal('fetch', fetchSpy)

      const rates = await calculateShippingRates({
        destinationLat: -6.32,
        destinationLng: 106.91,
        items: mockItems
      })

      expect(rates).toHaveLength(3)
    })
  })
})
