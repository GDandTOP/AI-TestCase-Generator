import { Request, Response } from 'express'
import { TestCaseService } from '../services/testcase.service'
import { FileService } from '../services/file.service'
import { ClaudeModelId, DEFAULT_MODEL } from '../services/claude.service'
import { KtCodiService, isKtAiCodiModel } from '../services/kt-codi.service'
import { toFriendlyLlmError } from '../utils/claude-error.util'
import { ApiResponse, GitDiffResult, ImpactAnalysis } from '../types'
import { env } from '../config/env'
import path from 'path'
import { createLogger } from '../utils/logger.util'

const logger = createLogger('TestCaseController')

const testCaseService = new TestCaseService()
const ktCodiService = new KtCodiService()
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
    logger.warn('generateTestCases: diff 또는 analysis 누락')
    res.status(400).json({ success: false, error: 'diff와 analysis 데이터가 필요합니다' } as ApiResponse)
    return
  }

  const m = model ?? DEFAULT_MODEL
  logger.info('TC 생성 요청', {
    model: m,
    projectName,
    filesChanged: diff.files?.length,
    overallRisk: analysis.overallRisk,
    hasProjectContext: !!projectContextDocument,
  })

  try {
    if (isKtAiCodiModel(m)) {
      logger.info('KT AI Codi 모델로 TC 스트리밍 시작')
      await ktCodiService.generateTestCasesStream(
        diff,
        analysis,
        res,
        projectName,
        compareSummary,
        projectContextDocument
      )
      logger.info('KT AI Codi TC 스트리밍 완료')
      return
    }
    logger.info('Claude 모델로 TC 스트리밍 시작', { model: m })
    await testCaseService.generateStream(
      diff,
      analysis,
      res,
      projectName,
      compareSummary,
      m,
      projectContextDocument
    )
    logger.info('Claude TC 스트리밍 완료', { model: m })
  } catch (error) {
    const friendly = toFriendlyLlmError(error)
    const message =
      friendly.startsWith('Anthropic') || friendly.startsWith('KT AI')
        ? friendly
        : `TC 생성 실패: ${friendly}`
    logger.error('TC 생성 실패', error instanceof Error ? error : { error, message })
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
    logger.warn('saveTestCase: 저장 데이터 부족', { hasContent: !!content, hasDiff: !!diff, hasAnalysis: !!analysis })
    res.status(400).json({ success: false, error: '저장할 데이터가 부족합니다' } as ApiResponse)
    return
  }

  logger.info('MD 보고서 저장 요청', { projectName, contentLength: content.length })
  try {
    const filename = await testCaseService.saveReport(content, diff, analysis, projectName, compareSummary)
    logger.info('MD 보고서 저장 완료', { filename })
    res.json({ success: true, data: { filename } } as ApiResponse)
  } catch (error) {
    logger.error('MD 보고서 저장 실패', error instanceof Error ? error : { error })
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
    logger.warn('savePdfTestCase: 저장 데이터 부족', { hasContent: !!content, hasDiff: !!diff, hasAnalysis: !!analysis })
    res.status(400).json({ success: false, error: '저장할 데이터가 부족합니다' } as ApiResponse)
    return
  }

  logger.info('PDF 보고서 저장 요청', { projectName, contentLength: content.length })
  try {
    const filename = await testCaseService.savePdfReport(content, diff, analysis, projectName, compareSummary)
    logger.info('PDF 보고서 저장 완료', { filename })
    res.json({ success: true, data: { filename } } as ApiResponse)
  } catch (error) {
    logger.error('PDF 보고서 저장 실패', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      error: `PDF 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}

export async function downloadTestCase(req: Request, res: Response): Promise<void> {
  const { filename } = req.params

  if (!filename || (!filename.endsWith('.md') && !filename.endsWith('.pdf'))) {
    logger.warn('downloadTestCase: 유효하지 않은 파일명', { filename })
    res.status(400).json({ success: false, error: '유효하지 않은 파일명입니다' } as ApiResponse)
    return
  }

  // 경로 순회 방지: basename으로 디렉토리 구성요소 제거
  const safeName = path.basename(filename)

  // OUTPUT_DIR 범위 내에 있는지 이중 검증
  const resolvedOutput = path.resolve(env.OUTPUT_DIR)
  const resolvedFile = path.resolve(env.OUTPUT_DIR, safeName)
  if (!resolvedFile.startsWith(resolvedOutput + path.sep) && resolvedFile !== resolvedOutput) {
    logger.warn('downloadTestCase: 경로 순회 시도 감지', { filename, safeName })
    res.status(400).json({ success: false, error: '유효하지 않은 파일 경로입니다' } as ApiResponse)
    return
  }

  logger.info('파일 다운로드 요청', { safeName })
  try {
    const filePath = await fileService.getFilePath(safeName)
    logger.info('파일 다운로드 시작', { filePath })
    res.download(filePath, safeName)
  } catch {
    logger.warn('파일 다운로드 실패: 파일 없음', { safeName })
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
    logger.warn('exportPdfDownload: content 누락')
    res.status(400).json({ success: false, error: 'content(마크다운 문자열)가 필요합니다' } as ApiResponse)
    return
  }
  logger.info('PDF 즉시 다운로드 요청', { contentLength: content.length })
  try {
    const pdfBuffer = await testCaseService.exportPdfBuffer(content)
    logger.info('PDF 변환 완료, 응답 전송', { bufferSize: pdfBuffer.length })
    const filename = '테스트케이스.pdf'
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Type', 'application/pdf')
    res.send(pdfBuffer)
  } catch (error) {
    logger.error('PDF 즉시 다운로드 실패', error instanceof Error ? error : { error })
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `PDF 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      } as ApiResponse)
    }
  }
}

export async function listTestCases(_req: Request, res: Response): Promise<void> {
  logger.info('파일 목록 조회 요청')
  try {
    const files = await fileService.listFiles()
    logger.info('파일 목록 조회 완료', { count: files.length })
    res.json({ success: true, data: files } as ApiResponse)
  } catch (error) {
    logger.error('파일 목록 조회 실패', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      error: `파일 목록 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}
