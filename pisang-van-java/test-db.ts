import { prisma } from './lib/prisma.ts'

async function testConn() {
  try {
    console.log('Testing connection...')
    const result = await prisma.user.findFirst()
    console.log('Success!', result)
  } catch (error) {
    console.error('Connection failed:', error)
  }
}

testConn()
