// app/(admin)/layout.tsx
import type { Metadata } from 'next'
import AdminSyncWrapper from './AdminSyncWrapper'

export const metadata: Metadata = {
  title: { default: 'Admin Panel', template: '%s | Admin Van Java' }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell min-h-screen bg-cream-100 font-sans">
      <AdminSyncWrapper />
      {children}
    </div>
  )
}
