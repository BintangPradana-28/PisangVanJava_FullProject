// src/lib/ip-utils.ts
//
// IP Address CIDR Matching — Zero external dependencies.
// Menggunakan bitwise operations native JS untuk subnet matching.
//
// SECURITY NOTE:
// Fungsi ini adalah defense-in-depth terhadap WAF misconfiguration.
// Layer utama adalah Cloudflare WAF Custom Rule.
// Layer ini menangkap kasus: Origin Bypass, WAF rule terhapus tidak sengaja.

export const MIDTRANS_CIDR_RANGES = [
  '103.208.23.0/24' // Midtrans production — primary range
] as const

export function ipv4ToUint32(ip: string): number | null {
  const parts = ip.trim().split('.')

  if (parts.length !== 4) return null

  let result = 0

  for (const part of parts) {
    if (part === '' || !/^\d+$/.test(part)) return null
    if (part.length > 1 && part.startsWith('0')) return null

    const num = parseInt(part, 10)
    if (num < 0 || num > 255) return null

    result = (result << 8) | num
  }

  return result >>> 0
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const slashIndex = cidr.indexOf('/')
  if (slashIndex === -1) return false

  const networkAddress = cidr.slice(0, slashIndex)
  const prefixStr = cidr.slice(slashIndex + 1)
  const prefixLength = parseInt(prefixStr, 10)

  if (Number.isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) return false

  const ipNum = ipv4ToUint32(ip)
  const networkNum = ipv4ToUint32(networkAddress)

  if (ipNum === null || networkNum === null) return false

  const mask = prefixLength === 0 ? 0 : ~((1 << (32 - prefixLength)) - 1) >>> 0

  return (ipNum & mask) === (networkNum & mask)
}

export function isMidtransIp(ip: string): boolean {
  return MIDTRANS_CIDR_RANGES.some((cidr) => isIpInCidr(ip, cidr))
}

export function extractClientIp(headers: Headers): string | null {
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    const ip = cfConnectingIp.trim()
    if (ipv4ToUint32(ip) !== null) return ip
  }

  const xRealIp = headers.get('x-real-ip')
  if (xRealIp) {
    const ip = xRealIp.trim()
    if (ipv4ToUint32(ip) !== null) return ip
  }

  const xForwardedFor = headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim()
    if (firstIp && ipv4ToUint32(firstIp) !== null) return firstIp
  }

  return null
}

export function isRequestViaCloudflare(headers: Headers): boolean {
  return headers.get('cf-ray') !== null
}
