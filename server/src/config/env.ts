import dotenv from 'dotenv'
import { z } from 'zod'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../../.env') })

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY는 필수입니다'),
  PORT: z.string().default('3000'),
  OUTPUT_DIR: z.string().default('../output'),
  MAX_DIFF_SIZE: z.string().default('50000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('환경변수 설정 오류:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = {
  ANTHROPIC_API_KEY: parsed.data.ANTHROPIC_API_KEY,
  PORT: parseInt(parsed.data.PORT, 10),
  OUTPUT_DIR: path.resolve(__dirname, '../../', parsed.data.OUTPUT_DIR),
  MAX_DIFF_SIZE: parseInt(parsed.data.MAX_DIFF_SIZE, 10),
  NODE_ENV: parsed.data.NODE_ENV,
  FRONTEND_URL: parsed.data.FRONTEND_URL,
}
