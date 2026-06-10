import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding store_status setting...')

  // Upsert the store_status setting
  await prisma.siteSetting.upsert({
    where: { key: 'store_status' },
    update: {},
    create: {
      key: 'store_status',
      value: 'AUTO',
      group: 'general',
      label: 'Status Kedai (AUTO / OPEN / CLOSED)'
    }
  })

  console.log('Successfully seeded store_status')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
