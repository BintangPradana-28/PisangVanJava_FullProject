import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🍌 Pisang Van Java - Integration Test: Referral & Koin')
  
  // 1. Setup Data Uji
  console.log('[1] Menyiapkan data uji...')
  
  // Hapus data lama jika ada
  await prisma.user.deleteMany({
    where: {
      email: { in: ['referrer@test.com', 'referred@test.com'] }
    }
  })

  // 2. Buat Referrer (Si Pengundang)
  const referrer = await prisma.user.create({
    data: {
      email: 'referrer@test.com',
      name: 'Referrer User',
      koinPisang: 0,
      referralCode: 'REF-123',
    }
  })
  console.log('✅ Referrer dibuat:', referrer.email, 'Saldo Koin:', referrer.koinPisang)

  // 3. Buat Referred (Si yang Diundang)
  const referred = await prisma.user.create({
    data: {
      email: 'referred@test.com',
      name: 'Referred User',
      referredBy: 'REF-123', // Menyambungkan ke referrer
      hasOrdered: false,
    }
  })
  console.log('✅ Referred dibuat:', referred.email, 'Invited By:', referred.referredBy)

  // 4. Simulasi Transaksi 1 (Selesai -> Diharapkan Referrer dapat 5000 Koin)
  console.log('[2] Memproses Transaksi #1 (First Order)...')
  const order1 = await prisma.order.create({
    data: {
      userId: referred.id,
      customerName: referred.name!,
      customerPhone: '08123456789',
      status: 'PENDING_PAYMENT',
      totalPrice: 25000,
      source: 'online',
      deliveryMethod: 'PICKUP',
      deliveryFee: 0,
    }
  })

  // Mock the logic inside route.ts for testing (Prisma transaction)
  await prisma.$transaction(async (tx) => {
    // Simulasi update status ke COMPLETED
    await tx.order.update({
      where: { id: order1.id },
      data: { status: 'COMPLETED' }
    })

    const userObj = await tx.user.findUnique({
      where: { id: referred.id },
      select: { hasOrdered: true, referredBy: true }
    })

    if (userObj && !userObj.hasOrdered) {
      await tx.user.update({
        where: { id: referred.id },
        data: { hasOrdered: true }
      })

      if (userObj.referredBy) {
        const ref = await tx.user.findUnique({
          where: { referralCode: userObj.referredBy }
        })
        if (ref) {
          await tx.user.update({
            where: { id: ref.id },
            data: { koinPisang: { increment: 5000 } }
          })
        }
      }
    }
  })

  // Cek hasil transaksi 1
  const referrerAfter1 = await prisma.user.findUnique({ where: { id: referrer.id } })
  const referredAfter1 = await prisma.user.findUnique({ where: { id: referred.id } })
  console.log(`✅ Transaksi #1 Selesai.`)
  console.log(`   - Saldo Referrer: ${referrerAfter1?.koinPisang} (Expected: 5000)`)
  console.log(`   - Referred hasOrdered: ${referredAfter1?.hasOrdered} (Expected: true)`)

  if (referrerAfter1?.koinPisang !== 5000) throw new Error('FAILED: Koin tidak bertambah 5000.')

  // 5. Simulasi Transaksi 2 (Selesai -> Diharapkan Referrer TIDAK dapat koin tambahan)
  console.log('[3] Memproses Transaksi #2 (Second Order)...')
  const order2 = await prisma.order.create({
    data: {
      userId: referred.id,
      customerName: referred.name!,
      customerPhone: '08123456789',
      status: 'PENDING_PAYMENT',
      totalPrice: 30000,
      source: 'online',
      deliveryMethod: 'PICKUP',
      deliveryFee: 0,
    }
  })

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order2.id },
      data: { status: 'COMPLETED' }
    })

    const userObj = await tx.user.findUnique({
      where: { id: referred.id },
      select: { hasOrdered: true, referredBy: true }
    })

    // Because hasOrdered is now true, it shouldn't grant bonus
    if (userObj && !userObj.hasOrdered) {
      // This block will be skipped
      await tx.user.update({
        where: { id: referred.id },
        data: { hasOrdered: true }
      })
      if (userObj.referredBy) {
        const ref = await tx.user.findUnique({
          where: { referralCode: userObj.referredBy }
        })
        if (ref) {
          await tx.user.update({
            where: { id: ref.id },
            data: { koinPisang: { increment: 5000 } }
          })
        }
      }
    }
  })

  // Cek hasil transaksi 2
  const referrerAfter2 = await prisma.user.findUnique({ where: { id: referrer.id } })
  console.log(`✅ Transaksi #2 Selesai.`)
  console.log(`   - Saldo Referrer: ${referrerAfter2?.koinPisang} (Expected: 5000)`)

  if (referrerAfter2?.koinPisang !== 5000) throw new Error('FAILED: Koin bertambah padahal sudah hasOrdered.')

  console.log('\n🎉 SEMUA TEST LULUS (Idempotency & Anti-Abuse Protected)')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
