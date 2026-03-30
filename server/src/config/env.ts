import dotenv from 'dotenv'
import { z } from 'zod'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../../.env') })

const envSchema = z
  .object({
    ANTHROPIC_API_KEY: z.string().optional(),
    CODI_API_KEY: z.string().optional(),
    /** KT AI Codi API 베이스 (API_GUIDE: /v1/chat-messages) */
    CODI_API_BASE_URL: z.string().default('https://api.codi.kt.co.kr/v1'),
    PORT: z.string().default('3000'),
    OUTPUT_DIR: z.string().default('../output'),
    MAX_DIFF_SIZE: z.string().default('50000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    FRONTEND_URL: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const anth = (data.ANTHROPIC_API_KEY ?? '').trim()
    const codi = (data.CODI_API_KEY ?? '').trim()
    if (!anth && !codi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'ANTHROPIC_API_KEY 또는 CODI_API_KEY 중 하나는 반드시 설정해야 합니다. (Claude 모델 또는 KT AI Codi 사용)',
        path: ['ANTHROPIC_API_KEY'],
      })
    }
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('환경변수 설정 오류:')
  console.error(parsed.error.flatten().fieldErrors)
  console.error(parsed.error.issues)
  process.exit(1)
}

export const env = {
  ANTHROPIC_API_KEY: (parsed.data.ANTHROPIC_API_KEY ?? '').trim(),
  CODI_API_KEY: (parsed.data.CODI_API_KEY ?? '').trim(),
  CODI_API_BASE_URL: parsed.data.CODI_API_BASE_URL.replace(/\/$/, ''),
  PORT: parseInt(parsed.data.PORT, 10),
  OUTPUT_DIR: path.resolve(__dirname, '../../', parsed.data.OUTPUT_DIR),
  MAX_DIFF_SIZE: parseInt(parsed.data.MAX_DIFF_SIZE, 10),
  NODE_ENV: parsed.data.NODE_ENV,
  FRONTEND_URL: parsed.data.FRONTEND_URL,
}
