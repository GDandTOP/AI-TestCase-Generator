import { ClaudeModelId } from './claude.service'
import { FileService } from './file.service'
import { GitDiffResult, ImpactAnalysis } from '../types'
import { buildReportHeader, buildReportFooter } from '../utils/markdown.util'
import { markdownToPdf } from '../utils/pdf.util'
import { Response } from 'express'

export class TestCaseService {
  private fileService: FileService

  constructor() {
    this.fileService = new FileService()
  }

  async generateStream(
    diff: GitDiffResult,
    analysis: ImpactAnalysis,
    res: Response,
    projectName?: string,
    compareSummary?: string,
    _model?: ClaudeModelId,
    _projectContextDocument?: string
  ): Promise<void> {
    // 권고사항을 "3. 테스트케이스"에 넣은 완성 보고서를 한 번에 전송 (AI 호출 없음)
    const header = buildReportHeader(diff, analysis, projectName, compareSummary || '')
    const footer = buildReportFooter()
    const fullReport = header + footer

    res.write(`data: ${JSON.stringify({ type: 'header', text: fullReport })}\n\n`)
    res.write(`data: ${JSON.stringify({ type: 'done', usage: { inputTokens: 0, outputTokens: 0 } })}\n\n`)
    res.end()
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

  /**
   * 마크다운 전체 문자열을 PDF Buffer로만 변환해 반환. (파일 저장 없음)
   */
  async exportPdfBuffer(fullMarkdown: string): Promise<Buffer> {
    return markdownToPdf(fullMarkdown)
  }
}
