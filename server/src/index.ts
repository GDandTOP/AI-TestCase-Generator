import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import gitRoutes from './routes/git.routes'
import analysisRoutes from './routes/analysis.routes'
import testcaseRoutes from './routes/testcase.routes'
import { createLogger } from './utils/logger.util'

const logger = createLogger('App')
const app = express()

const corsOrigin = env.NODE_ENV === 'production'
  ? (env.FRONTEND_URL || 'http://localhost:5173')
  : 'http://localhost:5173'
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 요청 로깅 미들웨어
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, contentLength: req.headers['content-length'] })
  next()
})

// 헬스체크
app.get('/health', (_req, res) => {
  logger.debug('Health check')
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 라우터
app.use('/api/git', gitRoutes)
app.use('/api/analysis', analysisRoutes)
app.use('/api/testcase', testcaseRoutes)

// 404 핸들러
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`)
  res.status(404).json({ success: false, error: '요청한 경로를 찾을 수 없습니다' })
})

// 전역 에러 핸들러
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled server error', err)
  res.status(500).json({ success: false, error: '서버 내부 오류가 발생했습니다' })
})

app.listen(env.PORT, () => {
  logger.info(`TestPlanner 서버 실행 중: http://localhost:${env.PORT}`, {
    env: env.NODE_ENV,
    outputDir: env.OUTPUT_DIR,
  })
})

export default app
