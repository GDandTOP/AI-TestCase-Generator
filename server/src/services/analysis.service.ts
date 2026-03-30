import {
  ClaudeService,
  ClaudeModelId,
  ClaudeAnthropicModelId,
  DEFAULT_MODEL,
} from './claude.service'
import { KtCodiService, isKtAiCodiModel } from './kt-codi.service'
import { GitDiffResult, ImpactAnalysis } from '../types'

export class AnalysisService {
  private claudeService: ClaudeService
  private ktCodiService: KtCodiService

  constructor() {
    this.claudeService = new ClaudeService()
    this.ktCodiService = new KtCodiService()
  }

  async analyzeImpact(
    diff: GitDiffResult,
    model: ClaudeModelId = DEFAULT_MODEL,
    projectContextDocument?: string
  ): Promise<ImpactAnalysis> {
    if (!diff.rawDiff || diff.rawDiff.trim().length === 0) {
      return {
        overallRisk: 'low',
        summary: '변경사항이 없거나 분석할 diff가 없습니다.',
        affectedAreas: [],
        recommendations: ['변경사항을 확인해 주세요.'],
      }
    }

    if (isKtAiCodiModel(model)) {
      return this.ktCodiService.analyzeImpact(diff, projectContextDocument)
    }

    return this.claudeService.analyzeImpact(
      diff,
      model as ClaudeAnthropicModelId,
      projectContextDocument
    )
  }
}
