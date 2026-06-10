import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, any> = {}

  // We test the main modules imported by /api/orders
  const importsToTest = [
    { name: 'redis', path: '@/lib/redis' },
    { name: 'upstash', path: '@/lib/upstash' },
    { name: 'auth', path: '@/src/auth' },
    { name: 'checkout_service', path: '@/src/features/checkout/service' },
    { name: 'payment_service', path: '@/src/features/payment/service' },
    { name: 'payment_db_service', path: '@/src/features/payment/payment.service' }
  ]

  for (const { name, path } of importsToTest) {
    try {
      const startTime = Date.now()
      // Use dynamic import so it is evaluated at runtime inside our try/catch
      const module = await import(path)
      const keys = Object.keys(module)
      results[name] = { success: true, keys, timeMs: Date.now() - startTime }
    } catch (err: any) {
      results[name] = {
        success: false,
        error: err?.message || String(err),
        stack: err?.stack || null
      }
    }
  }

  return NextResponse.json({ success: true, results })
}
