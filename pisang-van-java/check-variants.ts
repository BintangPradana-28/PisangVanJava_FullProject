import { prisma } from './lib/prisma.ts'

async function checkVariants() {
  try {
    console.log('Querying menu variants...')
    const variants = await prisma.menuVariant.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        flavorName: true,
        priceKembung: true,
        isActive: true,
        isAvailable: true,
        stock: true
      }
    })
    console.log('Menu Variants:', JSON.stringify(variants, null, 2))
  } catch (error) {
    console.error('Failed to query variants:', error)
  }
}

checkVariants()
