import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.menuVariant.count();
    console.log(`Total MenuVariant count: ${count}`);
    const activeCount = await prisma.menuVariant.count({ where: { isActive: true, isDeleted: false } });
    console.log(`Active MenuVariant count: ${activeCount}`);
  } catch (e: any) {
    console.error('ERROR connecting to DB:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
