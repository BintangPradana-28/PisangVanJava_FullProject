import { prisma } from './lib/prisma.ts'

async function checkRecent() {
  try {
    console.log('Querying recent orders...')
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        items: true
      }
    })
    console.log('Recent Orders:', JSON.stringify(orders, null, 2))
  } catch (error) {
    console.error('Failed to query orders:', error)
  }
}

checkRecent()
