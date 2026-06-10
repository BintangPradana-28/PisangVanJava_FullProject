import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { auth } from "@/src/auth";
import AdminSidebar from '@/components/admin/AdminSidebar'
import ManageComplaintsClient from './ManageComplaintsClient'
import { Toaster } from 'react-hot-toast'

export default async function ComplaintsPage() {
  const session = await auth()
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) redirect('/member-login')

  const complaints = await prisma.complaint.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      order: { select: { id: true, invoiceNumber: true } }
    }
  })

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 sm:p-8 bg-cream-100 overflow-y-auto">
        <Toaster position="top-right" />
        <ManageComplaintsClient initialComplaints={complaints as any} />
      </main>
    </div>
  )
}
