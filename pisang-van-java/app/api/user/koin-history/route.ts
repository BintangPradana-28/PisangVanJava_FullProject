import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/src/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !session.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const logs = await prisma.koinPisangLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('[KOIN_HISTORY_GET_ERROR]', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil riwayat koin.' },
      { status: 500 }
    )
  }
}
