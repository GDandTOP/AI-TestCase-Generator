import { ClaudeService, ClaudeModelId, DEFAULT_MODEL } from './claude.service'
import { GitDiffResult, ImpactAnalysis } from '../types'

export class AnalysisService {
  private claudeService: ClaudeService

  constructor() {
    this.claudeService = new ClaudeService()
  }

  async analyzeImpact(diff: GitDiffResult, model: ClaudeModelId = DEFAULT_MODEL): Promise<ImpactAnalysis> {
    if (!diff.rawDiff || diff.rawDiff.trim().length === 0) {
      return {
        overallRisk: 'low',
        summary: '변경사항이 없거나 분석할 diff가 없습니다.',
        affectedAreas: [],
        recommendations: ['변경사항을 확인해 주세요.'],
      }
    }

    return this.claudeService.analyzeImpact(diff, model)
  }
}
