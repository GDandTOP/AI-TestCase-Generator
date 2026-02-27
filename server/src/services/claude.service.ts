import Anthropic from '@anthropic-ai/sdk'
import { env } from '../config/env'
import { GitDiffResult, ImpactAnalysis } from '../types'
import { buildImpactAnalysisPrompt, buildTestCasePrompt } from '../utils/prompt.util'
import { Response } from 'express'

export const CLAUDE_MODELS = [
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Haiku 4.5',
    inputPrice: 0.80,
    outputPrice: 4,
    description: '빠름 · 저렴',
    badge: '최저가',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Sonnet 4.6',
    inputPrice: 3,
    outputPrice: 15,
    description: '품질 · 가격 균형',
    badge: '추천',
  },
  {
    id: 'claude-opus-4-6',
    name: 'Opus 4.6',
    inputPrice: 15,
    outputPrice: 75,
    description: '최고 품질',
    badge: '최고급',
  },
] as const

export type ClaudeModelId = (typeof CLAUDE_MODELS)[number]['id']

export const DEFAULT_MODEL: ClaudeModelId = 'claude-haiku-4-5-20251001'

export class ClaudeService {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  }

  async analyzeImpact(diff: GitDiffResult, model: ClaudeModelId = DEFAULT_MODEL): Promise<ImpactAnalysis> {
    const prompt = buildImpactAnalysisPrompt(diff)

    const message = await this.client.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Claude API에서 예상치 못한 응답 형식을 반환했습니다')
    }

    try {
      // JSON 블록이 있는 경우 추출
      const jsonMatch = content.text.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.text.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content.text
      return JSON.parse(jsonStr) as ImpactAnalysis
    } catch {
      throw new Error(`영향도 분석 결과 파싱 실패: ${content.text.slice(0, 200)}`)
    }
  }

  async generateTestCasesStream(
    diff: GitDiffResult,
    analysis: ImpactAnalysis,
    res: Response,
    projectName?: string,
    model: ClaudeModelId = DEFAULT_MODEL
  ): Promise<void> {
    const prompt = buildTestCasePrompt(diff, analysis, projectName)

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    const stream = await this.client.messages.stream({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        const data = JSON.stringify({ type: 'delta', text: chunk.delta.text })
        res.write(`data: ${data}\n\n`)
      }
    }

    const finalMessage = await stream.finalMessage()
    const usage = finalMessage.usage

    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        usage: { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens },
      })}\n\n`
    )
    res.end()
  }
}
