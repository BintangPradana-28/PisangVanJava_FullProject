import { env } from '@/src/env'

export interface CourierOption {
  courierName: string
  courierCode: string
  serviceName: string
  serviceCode: string
  price: number
  etd: string
}

// Koordinat fisik toko Pisang Goreng Van Java di Cipayung, Jakarta Timur
const STORE_LAT = -6.3157
const STORE_LNG = 106.9016

/**
 * Menghitung jarak antara dua koordinat menggunakan rumus Haversine
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Radius bumi dalam kilometer
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Mensimulasikan tarif pengiriman kurir lokal berdasarkan jarak (Haversine)
 */
export function calculateSimulatedRates(distanceKm: number): CourierOption[] {
  // Batasi jarak pengiriman makanan instan maksimal 40 km
  if (distanceKm > 40) {
    return []
  }

  const roundedDistance = Math.ceil(distanceKm * 10) / 10

  // Gojek Instant: Min Rp 15.000 (0-4 km), selanjutnya Rp 2.500/km
  const gojekPrice = roundedDistance <= 4 ? 15000 : 15000 + Math.ceil(roundedDistance - 4) * 2500

  // Grab Express Instant: Min Rp 14.000 (0-4 km), selanjutnya Rp 2.400/km
  const grabPrice = roundedDistance <= 4 ? 14000 : 14000 + Math.ceil(roundedDistance - 4) * 2400

  // Lalamove Motor: Min Rp 12.000 (0-3 km), selanjutnya Rp 2.200/km
  const lalamovePrice = roundedDistance <= 3 ? 12000 : 12000 + Math.ceil(roundedDistance - 3) * 2200

  return [
    {
      courierName: 'Gojek',
      courierCode: 'gojek',
      serviceName: 'Instant',
      serviceCode: 'instant',
      price: gojekPrice,
      etd: '1 - 2 Jam'
    },
    {
      courierName: 'Grab',
      courierCode: 'grab',
      serviceName: 'Instant',
      serviceCode: 'instant',
      price: grabPrice,
      etd: '1 - 2 Jam'
    },
    {
      courierName: 'Lalamove',
      courierCode: 'lalamove',
      serviceName: 'Motor',
      serviceCode: 'motor',
      price: lalamovePrice,
      etd: '2 - 3 Jam'
    }
  ]
}

interface CalculateRatesParams {
  destinationLat: number
  destinationLng: number
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
}

/**
 * Mengambil tarif kurir pengiriman dari BiteShip Sandbox (atau simulasi jika API key tidak diset)
 */
export async function calculateShippingRates({
  destinationLat,
  destinationLng,
  items
}: CalculateRatesParams): Promise<CourierOption[]> {
  const apiKey = env.BITESHIP_API_KEY?.trim()

  // Jika API key tidak ada, langsung gunakan simulasi Haversine
  if (!apiKey) {
    const distance = calculateHaversineDistance(
      STORE_LAT,
      STORE_LNG,
      destinationLat,
      destinationLng
    )
    return calculateSimulatedRates(distance)
  }

  try {
    // Estimasi total berat pesanan (default 200g per item)
    const totalWeight = items.reduce((sum, item) => sum + item.quantity * 200, 0)
    // Estimasi total nilai barang
    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0)

    const requestBody = {
      origin_latitude: STORE_LAT,
      origin_longitude: STORE_LNG,
      destination_latitude: destinationLat,
      destination_longitude: destinationLng,
      couriers: 'gojek,grab,lalamove',
      items: [
        {
          name: 'Paket Pisang Goreng',
          description: 'Makanan hangat Pisang Goreng Van Java',
          value: totalValue,
          length: 20,
          width: 20,
          height: 15,
          weight: totalWeight,
          quantity: 1
        }
      ]
    }

    const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      console.warn(
        `[SHIPPING] BiteShip Rates API returned status ${response.status}. Falling back to simulation.`
      )
      const distance = calculateHaversineDistance(
        STORE_LAT,
        STORE_LNG,
        destinationLat,
        destinationLng
      )
      return calculateSimulatedRates(distance)
    }

    const json = (await response.json()) as any
    if (!json.success || !json.data?.couriers) {
      console.warn('[SHIPPING] BiteShip Rates API success was false. Falling back to simulation.')
      const distance = calculateHaversineDistance(
        STORE_LAT,
        STORE_LNG,
        destinationLat,
        destinationLng
      )
      return calculateSimulatedRates(distance)
    }

    const options: CourierOption[] = []

    for (const courier of json.data.couriers) {
      if (courier.available_services) {
        for (const service of courier.available_services) {
          options.push({
            courierName: courier.courier_name,
            courierCode: courier.courier_code,
            serviceName: service.service_name,
            serviceCode: service.service_code,
            price: service.price,
            etd: service.etd
          })
        }
      }
    }

    return options
  } catch (error) {
    console.error(
      '[SHIPPING] Error fetching rates from BiteShip. Falling back to simulation.',
      error
    )
    const distance = calculateHaversineDistance(
      STORE_LAT,
      STORE_LNG,
      destinationLat,
      destinationLng
    )
    return calculateSimulatedRates(distance)
  }
}
