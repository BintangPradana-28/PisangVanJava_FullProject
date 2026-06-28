import * as Sentry from '@sentry/nextjs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    Sentry.captureMessage('CSP Violation', {
      level: 'warning',
      extra: body['csp-report'] ?? body
    })
    return new Response(null, { status: 204 })
  } catch (_error) {
    return new Response(null, { status: 400 })
  }
}
