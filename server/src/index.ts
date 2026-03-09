import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import gitRoutes from './routes/git.routes'
import analysisRoutes from './routes/analysis.routes'
import testcaseRoutes from './routes/testcase.routes'

const app = express()

const corsOrigin = env.NODE_ENV === 'production'
  ? (env.FRONTEND_URL || 'http://localhost:5173')
  : 'http://localhost:5173'
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 헬스체크
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 라우터
app.use('/api/git', gitRoutes)
app.use('/api/analysis', analysisRoutes)
app.use('/api/testcase', testcaseRoutes)

// 404 핸들러
app.use((_req, res) => {
  res.status(404).json({ success: false, error: '요청한 경로를 찾을 수 없습니다' })
})

// 전역 에러 핸들러
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message)
  res.status(500).json({ success: false, error: '서버 내부 오류가 발생했습니다' })
})

app.listen(env.PORT, () => {
  console.log(`✅ TestPlanner 서버 실행 중: http://localhost:${env.PORT}`)
  console.log(`   환경: ${env.NODE_ENV}`)
  console.log(`   출력 디렉토리: ${env.OUTPUT_DIR}`)
})

export default app
