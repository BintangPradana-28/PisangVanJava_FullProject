import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '..', '.env') })

async function main() {
  const result = await streamText({
    model: openai('gpt-4o'),
    prompt: 'Invent a new holiday and describe its traditions.'
  })

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart)
  }

  console.log()
  console.log('Token usage:', await result.usage)
}

main().catch(console.error)
