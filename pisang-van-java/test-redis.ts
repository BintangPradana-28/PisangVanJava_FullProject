import dotenv from 'dotenv'
import { rateLimit } from './lib/redis'

dotenv.config()

async function main() {
  try {
    const res = await rateLimit.limit('test_ip_127.0.0.1')
    console.log('RATELIMIT SUCCESS:', res)
  } catch (err) {
    console.error('RATELIMIT ERROR:', err)
  }
}
main()
