import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId: 'test-user-id'
        }
      }
    })
    console.log('SUCCESS')
  } catch (e: any) {
    console.error('ERROR:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
