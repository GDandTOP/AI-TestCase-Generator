import { ClaudeService, ClaudeModelId, DEFAULT_MODEL } from './claude.service'
import { FileService } from './file.service'
import { GitDiffResult, ImpactAnalysis } from '../types'
import { buildReportHeader, buildReportFooter } from '../utils/markdown.util'
import { markdownToPdf } from '../utils/pdf.util'
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
    model: ClaudeModelId = DEFAULT_MODEL,
    projectContextDocument?: string
  ): Promise<void> {
    const header = buildReportHeader(diff, analysis, projectName, compareSummary || '')

    // 헤더를 먼저 전송
    res.write(`data: ${JSON.stringify({ type: 'header', text: header })}\n\n`)

    await this.claudeService.generateTestCasesStream(
      diff,
      analysis,
      res,
      projectName,
      model,
      projectContextDocument
    )
  }

  async saveReport(
    tcContent: string,
    diff: GitDiffResult,
    analysis: ImpactAnalysis,
    projectName?: string,
    compareSummary?: string
  ): Promise<string> {
    const header = buildReportHeader(diff, analysis, projectName, compareSummary || '')
    const footer = buildReportFooter()
    const fullContent = header + tcContent + footer

    return this.fileService.saveMarkdown(fullContent, projectName)
  }

  async savePdfReport(
    tcContent: string,
    diff: GitDiffResult,
    analysis: ImpactAnalysis,
    projectName?: string,
    compareSummary?: string
  ): Promise<string> {
    const header = buildReportHeader(diff, analysis, projectName, compareSummary || '')
    const footer = buildReportFooter()
    const fullMarkdown = header + tcContent + footer

    const pdfBuffer = await markdownToPdf(fullMarkdown)
    return this.fileService.savePdf(pdfBuffer, projectName)
  }
}
