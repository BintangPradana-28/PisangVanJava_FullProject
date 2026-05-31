import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { id: 'cmpt388j80007dv9kw0oxu6yk' },
    select: { userId: true, source: true, status: true, id: true, customerName: true }
  });
  console.log('Order Details:', order);
  
  const allOrders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, userId: true, source: true }
  });
  console.log('Last 5 Orders:', allOrders);
}

main().finally(() => prisma.$disconnect());
