import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CheckoutError from '@/app/(user)/checkout/error'
import PaymentError from '@/app/(user)/payment/[orderId]/error'

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn()
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ orderId: 'test-order-123' })
}))

const mockReset = vi.fn()
const mockError = Object.assign(new Error('Test error'), {
  digest: 'abc123def456'
})

describe('CheckoutError boundary', () => {
  it('renders empati message dan escape hatch', () => {
    render(<CheckoutError error={mockError} reset={mockReset} />)

    expect(screen.getByText('Proses Checkout Terganggu')).toBeTruthy()
    expect(screen.getByText(/Keranjang Anda masih aman/)).toBeTruthy()
    expect(screen.getByText('Coba Lagi')).toBeTruthy()
    expect(screen.getByText('Kembali ke Keranjang')).toBeTruthy()
  })

  it('menampilkan error digest untuk CS reference', () => {
    render(<CheckoutError error={mockError} reset={mockReset} />)
    expect(screen.getByText(/abc123def456/)).toBeTruthy()
  })

  it('reset() dipanggil saat klik Coba Lagi', () => {
    render(<CheckoutError error={mockError} reset={mockReset} />)
    fireEvent.click(screen.getByText('Coba Lagi'))
    expect(mockReset).toHaveBeenCalledTimes(1)
  })
})

describe('PaymentError boundary', () => {
  it('menampilkan reassurance pesanan sudah tercatat', () => {
    render(<PaymentError error={mockError} reset={mockReset} />)
    expect(screen.getByText(/Pesanan Anda sudah berhasil dibuat/)).toBeTruthy()
  })

  it('escape hatch link mengandung orderId', () => {
    render(<PaymentError error={mockError} reset={mockReset} />)
    const link = screen.getByText('Lihat Status Pesanan').closest('a')
    expect(link?.getAttribute('href')).toContain('test-order-123')
  })
})
