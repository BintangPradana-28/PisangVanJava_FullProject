import 'server-only'
import crypto from 'crypto'
import { headers } from 'next/headers'
import { snap } from '@/src/lib/midtrans'

interface MidtransItem {
  id: string
  price: number
  quantity: number
  name: string
}

interface GenerateSnapTokenParams {
  orderId: string
  grossAmount: number
  customerName: string
  customerPhone: string
  items: MidtransItem[]
}

export async function generateSnapToken(params: GenerateSnapTokenParams): Promise<string | null> {
  try {
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'

    // Zero-Trust: Validate gross amount against items
    const calculatedGross = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    if (Math.abs(calculatedGross - params.grossAmount) > 1) {
      console.error('[SECURITY] Midtrans amount mismatch', {
        calculatedGross,
        grossAmount: params.grossAmount
      })
      return null
    }

    // Resolve dynamic site URL from headers to prevent redirection to localhost:3000 in Vercel preview/production
    let siteUrl = ''
    try {
      const headerStore = await headers()
      const host = headerStore.get('x-forwarded-host') || headerStore.get('host')
      const proto = headerStore.get('x-forwarded-proto') || 'https'
      if (host) {
        siteUrl = `${proto}://${host}`
      }
    } catch (e) {
      console.warn('[MIDTRANS] Failed to read headers for dynamic site url:', e)
    }

    if (!siteUrl) {
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        siteUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      } else if (process.env.VERCEL_URL) {
        siteUrl = `https://${process.env.VERCEL_URL}`
      } else {
        siteUrl = 'http://localhost:3000'
      }
    }

    siteUrl = siteUrl.replace(/\/$/, '')

    const requestData = {
      transaction_details: {
        order_id: params.orderId,
        gross_amount: Math.round(params.grossAmount) // Midtrans expects integer
      },
      custom_expiry: {
        expiry_duration: 15,
        unit: 'minute'
      },
      customer_details: {
        first_name: params.customerName.slice(0, 255), // Midtrans max len
        phone: params.customerPhone.slice(0, 255)
      },
      item_details: params.items.map((item) => ({
        id: item.id.slice(0, 50), // Midtrans max len
        price: Math.round(item.price),
        quantity: item.quantity,
        name: item.name.slice(0, 50)
      })),
      callbacks: {
        finish: `${siteUrl}/thanks`,
        unfinish: `${siteUrl}/payment/${params.orderId}?payment=failed`,
        error: `${siteUrl}/payment/${params.orderId}?payment=failed`
      }
    }

    console.log('[MIDTRANS] requestData payload:', requestData)

    const transaction = await snap.createTransaction(requestData)
    return transaction.token
  } catch (error: any) {
    console.error('[SECURITY] Failed to generate Snap Token.', {
      message: error?.message,
      apiResponse: error?.ApiResponse,
      httpStatusCode: error?.httpStatusCode
    })
    return null
  }
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`
    const calculatedSignature = crypto.createHash('sha512').update(payload).digest('hex')

    // Timing-attack safe equality check (Zero-Trust)
    const calculatedBuffer = Buffer.from(calculatedSignature, 'hex')
    const providedBuffer = Buffer.from(signatureKey, 'hex')

    if (calculatedBuffer.length !== providedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(calculatedBuffer, providedBuffer)
  } catch (error) {
    console.error('[SECURITY] Signature verification error:', error)
    return false
  }
}
