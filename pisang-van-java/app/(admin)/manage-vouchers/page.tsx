import { Metadata } from 'next'
import ManageVouchersClient from './ManageVouchersClient'

export const metadata: Metadata = {
  title: 'Manajemen Voucher - Admin Panel',
  description: 'Kelola kode promo dan diskon untuk pelanggan dan reseller',
}

import { redirect } from 'next/navigation'
import { auth } from "@/src/auth"
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function ManageVouchersPage() {
  const session = await auth()
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) redirect('/member-login')

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 sm:p-8 bg-cream-100 overflow-y-auto">
        <ManageVouchersClient />
      </main>
    </div>
  )
}
