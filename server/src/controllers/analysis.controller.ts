import { Request, Response } from 'express'
import { AnalysisService } from '../services/analysis.service'
import { ClaudeModelId, DEFAULT_MODEL } from '../services/claude.service'
import { ApiResponse, GitDiffResult } from '../types'

const analysisService = new AnalysisService()

export async function analyzeImpact(req: Request, res: Response): Promise<void> {
  const { diff, model } = req.body as { diff: GitDiffResult; model?: ClaudeModelId }

  if (!diff) {
    res.status(400).json({ success: false, error: 'diff 데이터가 필요합니다' } as ApiResponse)
    return
  }

  try {
    const analysis = await analysisService.analyzeImpact(diff, model ?? DEFAULT_MODEL)
    res.json({ success: true, data: analysis } as ApiResponse)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `영향도 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}
