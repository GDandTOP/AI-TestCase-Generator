import { Request, Response } from 'express'
import { TestCaseService } from '../services/testcase.service'
import { FileService } from '../services/file.service'
import { ClaudeModelId, DEFAULT_MODEL } from '../services/claude.service'
import { toFriendlyClaudeError } from '../utils/claude-error.util'
import { ApiResponse, GitDiffResult, ImpactAnalysis } from '../types'
import { env } from '../config/env'
import path from 'path'

const testCaseService = new TestCaseService()
const fileService = new FileService()

export async function generateTestCases(req: Request, res: Response): Promise<void> {
  const { diff, analysis, projectName, compareSummary, model, projectContextDocument } = req.body as {
    diff: GitDiffResult
    analysis: ImpactAnalysis
    projectName?: string
    compareSummary?: string
    model?: ClaudeModelId
    projectContextDocument?: string
  }

  if (!diff || !analysis) {
    res.status(400).json({ success: false, error: 'diff와 analysis 데이터가 필요합니다' } as ApiResponse)
    return
  }

  try {
    await testCaseService.generateStream(
      diff,
      analysis,
      res,
      projectName,
      compareSummary,
      model ?? DEFAULT_MODEL,
      projectContextDocument
    )
  } catch (error) {
    const friendly = toFriendlyClaudeError(error)
    const message = friendly.startsWith('Anthropic') ? friendly : `TC 생성 실패: ${friendly}`
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: message,
      } as ApiResponse)
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
      res.end()
    }
  }
}

export async function saveTestCase(req: Request, res: Response): Promise<void> {
  const { content, diff, analysis, projectName, compareSummary } = req.body as {
    content: string
    diff: GitDiffResult
    analysis: ImpactAnalysis
    projectName?: string
    compareSummary?: string
  }

  if (!content || !diff || !analysis) {
    res.status(400).json({ success: false, error: '저장할 데이터가 부족합니다' } as ApiResponse)
    return
  }

  try {
    const filename = await testCaseService.saveReport(content, diff, analysis, projectName, compareSummary)
    res.json({ success: true, data: { filename } } as ApiResponse)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `파일 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}

export async function savePdfTestCase(req: Request, res: Response): Promise<void> {
  const { content, diff, analysis, projectName, compareSummary } = req.body as {
    content: string
    diff: GitDiffResult
    analysis: ImpactAnalysis
    projectName?: string
    compareSummary?: string
  }

  if (!content || !diff || !analysis) {
    res.status(400).json({ success: false, error: '저장할 데이터가 부족합니다' } as ApiResponse)
    return
  }

  try {
    const filename = await testCaseService.savePdfReport(content, diff, analysis, projectName, compareSummary)
    res.json({ success: true, data: { filename } } as ApiResponse)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `PDF 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}

export async function downloadTestCase(req: Request, res: Response): Promise<void> {
  const { filename } = req.params

  if (!filename || (!filename.endsWith('.md') && !filename.endsWith('.pdf'))) {
    res.status(400).json({ success: false, error: '유효하지 않은 파일명입니다' } as ApiResponse)
    return
  }

  // 경로 순회 방지: basename으로 디렉토리 구성요소 제거
  const safeName = path.basename(filename)

  // OUTPUT_DIR 범위 내에 있는지 이중 검증
  const resolvedOutput = path.resolve(env.OUTPUT_DIR)
  const resolvedFile = path.resolve(env.OUTPUT_DIR, safeName)
  if (!resolvedFile.startsWith(resolvedOutput + path.sep) && resolvedFile !== resolvedOutput) {
    res.status(400).json({ success: false, error: '유효하지 않은 파일 경로입니다' } as ApiResponse)
    return
  }

  try {
    const filePath = await fileService.getFilePath(safeName)
    res.download(filePath, safeName)
  } catch {
    res.status(404).json({ success: false, error: '파일을 찾을 수 없습니다' } as ApiResponse)
  }
}

/**
 * 마크다운 전체 문자열을 PDF로 변환해 응답으로 바로 내려줍니다. (서버에 파일 저장 없음)
 * 사용자 PC로 다운로드할 때 사용.
 */
export async function exportPdfDownload(req: Request, res: Response): Promise<void> {
  const { content } = req.body as { content?: string }
  if (!content || typeof content !== 'string') {
    res.status(400).json({ success: false, error: 'content(마크다운 문자열)가 필요합니다' } as ApiResponse)
    return
  }
  try {
    const pdfBuffer = await testCaseService.exportPdfBuffer(content)
    const filename = '테스트케이스.pdf'
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Type', 'application/pdf')
    res.send(pdfBuffer)
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `PDF 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      } as ApiResponse)
    }
  }
}

export async function listTestCases(req: Request, res: Response): Promise<void> {
  try {
    const files = await fileService.listFiles()
    res.json({ success: true, data: files } as ApiResponse)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `파일 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}
