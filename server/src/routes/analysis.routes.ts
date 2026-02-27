import { Router } from 'express'
import { analyzeImpact } from '../controllers/analysis.controller'

const router = Router()

router.post('/impact', analyzeImpact)

export default router
