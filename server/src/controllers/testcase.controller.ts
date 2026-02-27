import { Request, Response } from 'express'
import { TestCaseService } from '../services/testcase.service'
import { FileService } from '../services/file.service'
import { ClaudeModelId, DEFAULT_MODEL } from '../services/claude.service'
import { ApiResponse, GitDiffResult, ImpactAnalysis } from '../types'
import path from 'path'

const testCaseService = new TestCaseService()
const fileService = new FileService()

export async function generateTestCases(req: Request, res: Response): Promise<void> {
  const { diff, analysis, projectName, compareSummary, model } = req.body as {
    diff: GitDiffResult
    analysis: ImpactAnalysis
    projectName?: string
    compareSummary?: string
    model?: ClaudeModelId
  }

  if (!diff || !analysis) {
    res.status(400).json({ success: false, error: 'diff와 analysis 데이터가 필요합니다' } as ApiResponse)
    return
  }

  try {
    await testCaseService.generateStream(diff, analysis, res, projectName, compareSummary, model ?? DEFAULT_MODEL)
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `TC 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      } as ApiResponse)
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: '스트리밍 중 오류가 발생했습니다' })}\n\n`)
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

export async function downloadTestCase(req: Request, res: Response): Promise<void> {
  const { filename } = req.params

  if (!filename || !filename.endsWith('.md')) {
    res.status(400).json({ success: false, error: '유효하지 않은 파일명입니다' } as ApiResponse)
    return
  }

  // 경로 순회 방지
  const safeName = path.basename(filename)

  try {
    const filePath = await fileService.getFilePath(safeName)
    res.download(filePath, safeName)
  } catch {
    res.status(404).json({ success: false, error: '파일을 찾을 수 없습니다' } as ApiResponse)
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
