import fs from 'fs/promises'
import path from 'path'
import { GitDiffResult, ImpactAnalysis } from '../types'

/** logs 폴더 경로 (프로젝트 루트 기준 logs) */
const LOGS_DIR = path.resolve(__dirname, '../../..', 'logs')

/**
 * logs 디렉터리가 없으면 생성합니다.
 */
async function ensureLogsDir(): Promise<void> {
  await fs.mkdir(LOGS_DIR, { recursive: true })
}

/**
 * 타임스탬프 기반 파일명 생성 (중복 줄이기)
 * 예: impact-2025-03-09T12-30-45.123Z.json
 */
function timestampFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
}

/**
 * 영향도 분석 API로 던지려는 데이터를 logs 폴더에 저장합니다.
 * - diff: Git diff 결과
 * - prompt: Claude에 보내는 프롬프트 문자열
 * - apiPayload: 실제 API 요청 바디 (model, max_tokens, messages)
 */
export async function saveImpactPayload(
  diff: GitDiffResult,
  prompt: string,
  model: string
): Promise<string> {
  await ensureLogsDir()
  const filename = timestampFilename('impact')
  const filePath = path.join(LOGS_DIR, filename)
  const payload = {
    savedAt: new Date().toISOString(),
    type: 'impact',
    model,
    apiPayload: {
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    },
    input: {
      diff: {
        files: diff.files,
        stats: diff.stats,
        rawDiffLength: diff.rawDiff.length,
        rawDiff: diff.rawDiff,
      },
    },
    prompt,
  }
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return filePath
}

/**
 * 테스트케이스 생성 API로 던지려는 데이터를 logs 폴더에 저장합니다.
 */
export async function saveTestcasePayload(
  diff: GitDiffResult,
  analysis: ImpactAnalysis,
  projectName: string | undefined,
  prompt: string,
  model: string
): Promise<string> {
  await ensureLogsDir()
  const filename = timestampFilename('testcase')
  const filePath = path.join(LOGS_DIR, filename)
  const payload = {
    savedAt: new Date().toISOString(),
    type: 'testcase',
    model,
    apiPayload: {
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    },
    input: {
      projectName: projectName ?? null,
      diff: {
        files: diff.files,
        stats: diff.stats,
        rawDiffLength: diff.rawDiff.length,
        rawDiff: diff.rawDiff,
      },
      analysis,
    },
    prompt,
  }
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return filePath
}
