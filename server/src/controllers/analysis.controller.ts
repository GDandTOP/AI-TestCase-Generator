import { Request, Response } from 'express'
import { AnalysisService } from '../services/analysis.service'
import { ClaudeModelId, DEFAULT_MODEL } from '../services/claude.service'
import { toFriendlyClaudeError } from '../utils/claude-error.util'
import { ApiResponse, GitDiffResult } from '../types'

const analysisService = new AnalysisService()

export async function analyzeImpact(req: Request, res: Response): Promise<void> {
  const { diff, model, projectContextDocument } = req.body as {
    diff: GitDiffResult
    model?: ClaudeModelId
    projectContextDocument?: string
  }

  if (!diff) {
    res.status(400).json({ success: false, error: 'diff 데이터가 필요합니다' } as ApiResponse)
    return
  }

  try {
    const analysis = await analysisService.analyzeImpact(diff, model ?? DEFAULT_MODEL, projectContextDocument)
    res.json({ success: true, data: analysis } as ApiResponse)
  } catch (error) {
    const friendly = toFriendlyClaudeError(error)
    res.status(500).json({
      success: false,
      error: friendly.startsWith('Anthropic') ? friendly : `영향도 분석 실패: ${friendly}`,
    } as ApiResponse)
  }
}
