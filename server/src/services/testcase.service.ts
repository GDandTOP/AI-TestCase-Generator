import { ClaudeService, ClaudeModelId, DEFAULT_MODEL } from './claude.service'
import { FileService } from './file.service'
import { GitDiffResult, ImpactAnalysis } from '../types'
import { buildReportHeader, buildReportFooter } from '../utils/markdown.util'
import { Response } from 'express'

export class TestCaseService {
  private claudeService: ClaudeService
  private fileService: FileService

  constructor() {
    this.claudeService = new ClaudeService()
    this.fileService = new FileService()
  }

  async generateStream(
    diff: GitDiffResult,
    analysis: ImpactAnalysis,
    res: Response,
    projectName?: string,
    compareSummary?: string,
    model: ClaudeModelId = DEFAULT_MODEL
  ): Promise<void> {
    const header = buildReportHeader(diff, analysis, projectName || '미지정', compareSummary || '')
    const footer = buildReportFooter()

    // 헤더를 먼저 전송
    res.write(`data: ${JSON.stringify({ type: 'header', text: header })}\n\n`)

    await this.claudeService.generateTestCasesStream(diff, analysis, res, projectName, model)

    // footer는 SSE 종료 후 저장 시점에 붙임
    void footer
  }

  async saveReport(
    tcContent: string,
    diff: GitDiffResult,
    analysis: ImpactAnalysis,
    projectName?: string,
    compareSummary?: string
  ): Promise<string> {
    const header = buildReportHeader(diff, analysis, projectName || '미지정', compareSummary || '')
    const footer = buildReportFooter()
    const fullContent = header + tcContent + footer

    return this.fileService.saveMarkdown(fullContent, projectName)
  }
}
