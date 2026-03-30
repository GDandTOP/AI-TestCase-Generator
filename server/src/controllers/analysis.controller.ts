import { Request, Response } from 'express'
import { AnalysisService } from '../services/analysis.service'
import { ClaudeModelId, DEFAULT_MODEL } from '../services/claude.service'
import { toFriendlyLlmError } from '../utils/claude-error.util'
import { ApiResponse, GitDiffResult } from '../types'
import { createLogger } from '../utils/logger.util'

const logger = createLogger('AnalysisController')
const analysisService = new AnalysisService()

export async function analyzeImpact(req: Request, res: Response): Promise<void> {
  const { diff, model, projectContextDocument } = req.body as {
    diff: GitDiffResult
    model?: ClaudeModelId
    projectContextDocument?: string
  }

  if (!diff) {
    logger.warn('analyzeImpact: diff 데이터 누락')
    res.status(400).json({ success: false, error: 'diff 데이터가 필요합니다' } as ApiResponse)
    return
  }

  const usedModel = model ?? DEFAULT_MODEL
  logger.info('영향도 분석 요청', {
    model: usedModel,
    filesChanged: diff.files?.length,
    rawDiffSize: diff.rawDiff?.length,
    hasProjectContext: !!projectContextDocument,
  })

  try {
    const analysis = await analysisService.analyzeImpact(diff, usedModel, projectContextDocument)
    logger.info('영향도 분석 완료', {
      model: usedModel,
      overallRisk: analysis.overallRisk,
      affectedAreasCount: analysis.affectedAreas?.length,
    })
    res.json({ success: true, data: analysis } as ApiResponse)
  } catch (error) {
    const friendly = toFriendlyLlmError(error)
    logger.error('영향도 분석 실패', error instanceof Error ? error : { error, friendly })
    res.status(500).json({
      success: false,
      error:
        friendly.startsWith('Anthropic') || friendly.startsWith('KT AI')
          ? friendly
          : `영향도 분석 실패: ${friendly}`,
    } as ApiResponse)
  }
}
