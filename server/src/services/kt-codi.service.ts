import { env } from '../config/env'
import { GitDiffResult, ImpactAnalysis } from '../types'
import { buildImpactAnalysisPrompt, buildTestCasePrompt } from '../utils/prompt.util'
import { saveImpactPayload, saveTestcasePayload } from '../utils/log-payload.util'
import { extractJsonFromLlmResponse } from '../utils/json-extract.util'
import { Response } from 'express'
import { parseCodiChatSse } from '../utils/codi-sse.util'
import { buildReportHeaderBeforeAiTc, buildReportFooter } from '../utils/markdown.util'

/** KT AI Codi 앱 연동용 모델 식별자 (UI·서버에서 공통 사용) */
export const KT_AI_CODI_MODEL_ID = 'kt-ai-codi' as const

export function isKtAiCodiModel(model: string): boolean {
  return model === KT_AI_CODI_MODEL_ID
}

/**
 * KT AI Codi REST API: 채팅 앱 API (POST /chat-messages, streaming SSE)
 * API_GUIDE: Authorization Bearer, User-Agent 필수.
 */
export class KtCodiService {
  private ensureApiKey(): string {
    const key = env.CODI_API_KEY?.trim()
    if (!key) {
      throw new Error('KT AI Codi를 사용하려면 server/.env에 CODI_API_KEY를 설정해 주세요.')
    }
    return key
  }

  private chatMessagesUrl(): string {
    return `${env.CODI_API_BASE_URL}/chat-messages`
  }

  /**
   * 스트리밍 응답을 모두 수집해 한 문자열로 반환합니다 (영향도 분석용).
   */
  async queryCompleteStreaming(query: string): Promise<string> {
    const apiKey = this.ensureApiKey()
    const res = await fetch(this.chatMessagesUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TestPlanner/1.0',
      },
      body: JSON.stringify({
        query,
        inputs: {},
        response_mode: 'streaming',
        conversation_id: '',
        user: 'testplanner-user',
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`KT AI Codi HTTP ${res.status}: ${errBody.slice(0, 200)}`)
    }
    if (!res.body) throw new Error('KT AI Codi 응답 본문이 없습니다')

    const { fullText } = await parseCodiChatSse(res.body)
    if (!fullText.trim()) {
      throw new Error('KT AI Codi에서 빈 응답을 반환했습니다')
    }
    return fullText
  }

  async analyzeImpact(
    diff: GitDiffResult,
    projectContextDocument?: string
  ): Promise<ImpactAnalysis> {
    const prompt = buildImpactAnalysisPrompt(diff, projectContextDocument)

    if (env.NODE_ENV === 'development') {
      const logPath = await saveImpactPayload(diff, prompt, KT_AI_CODI_MODEL_ID)
      console.log('[Log] 영향도 분석 payload 저장:', logPath)
    }

    const content = await this.queryCompleteStreaming(prompt)

    try {
      console.log('[KtCodi] 영향도 분석 응답 수신, 길이:', content.length)
      const jsonStr = extractJsonFromLlmResponse(content)
      const result = JSON.parse(jsonStr) as ImpactAnalysis
      console.log('[KtCodi] 영향도 분석 파싱 성공:', { overallRisk: result.overallRisk, areas: result.affectedAreas?.length })
      return result
    } catch {
      console.warn('[KtCodi] 영향도 분석 파싱 실패, 기본값으로 대체. 원본 앞부분:', content.slice(0, 300))
      return {
        overallRisk: 'medium',
        summary: content.slice(0, 500) || '영향도 분석 결과를 파싱할 수 없었습니다.',
        affectedAreas: [],
        recommendations: ['변경사항을 직접 확인하여 테스트 범위를 결정하세요.'],
      }
    }
  }

  /**
   * TC 생성: 보고서 상단(1~2절)은 고정, 3절은 AI 스트리밍, 마지막에 푸터.
   */
  async generateTestCasesStream(
    diff: GitDiffResult,
    analysis: ImpactAnalysis,
    res: Response,
    projectName?: string,
    compareSummary?: string,
    projectContextDocument?: string
  ): Promise<void> {
    const prompt = buildTestCasePrompt(diff, analysis, projectName, projectContextDocument)

    if (env.NODE_ENV === 'development') {
      const logPath = await saveTestcasePayload(
        diff,
        analysis,
        projectName,
        prompt,
        KT_AI_CODI_MODEL_ID
      )
      console.log('[Log] 테스트케이스 생성 payload 저장:', logPath)
    }

    const systemInstruction = `You are a QA engineer writing test cases in Markdown. Your response will be inserted directly under the heading "## 3. 테스트케이스" in a report. Do NOT write "## 3. 테스트케이스" again. Start your response immediately with "### TC-001:" and write at least 5 full test cases (### TC-001 through ### TC-005 or more). End with "## 테스트 실행 체크리스트" and list items. Never output an empty section or only a title.`

    const query = `${systemInstruction}\n\n---\n\n${prompt}`

    const headerText = buildReportHeaderBeforeAiTc(
      diff,
      analysis,
      projectName,
      compareSummary ?? ''
    )

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    res.write(`data: ${JSON.stringify({ type: 'header', text: headerText })}\n\n`)

    try {
      const apiKey = this.ensureApiKey()
      const fetchRes = await fetch(this.chatMessagesUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TestPlanner/1.0',
        },
        body: JSON.stringify({
          query,
          inputs: {},
          response_mode: 'streaming',
          conversation_id: '',
          user: 'testplanner-user',
        }),
      })

      if (!fetchRes.ok) {
        const errBody = await fetchRes.text().catch(() => '')
        throw new Error(`KT AI Codi HTTP ${fetchRes.status}: ${errBody.slice(0, 200)}`)
      }
      if (!fetchRes.body) throw new Error('KT AI Codi 응답 본문이 없습니다')

      const { usage } = await parseCodiChatSse(fetchRes.body, {
        onDelta: (text) => {
          if (res.socket?.destroyed) return
          res.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`)
        },
      })

      if (!res.socket?.destroyed) {
        const footer = buildReportFooter()
        res.write(`data: ${JSON.stringify({ type: 'delta', text: footer })}\n\n`)
        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            usage: {
              inputTokens: usage?.prompt_tokens ?? 0,
              outputTokens: usage?.completion_tokens ?? 0,
            },
          })}\n\n`
        )
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '알 수 없는 오류'
      res.write(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`)
    } finally {
      res.end()
    }
  }
}
