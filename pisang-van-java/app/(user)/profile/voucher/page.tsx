import { auth } from "@/src/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import VoucherClient from "./VoucherClient"

export default async function VoucherPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { koinPisang: true, role: true }
  })

  if (!user) {
    redirect("/auth/signin")
  }

  // Fetch active vouchers applicable to this user
  const vouchers = await prisma.voucher.findMany({
    where: {
      isActive: true,
      endDate: { gte: new Date() },
      OR: [
        { applicableTo: "ALL" },
        { applicableTo: user.role }
      ]
    },
    orderBy: { endDate: 'asc' },
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      minPurchase: true,
      maxDiscount: true,
      endDate: true,
    }
  })

  return (
    <VoucherClient koinPisang={user.koinPisang} vouchers={vouchers} />
  )
}
