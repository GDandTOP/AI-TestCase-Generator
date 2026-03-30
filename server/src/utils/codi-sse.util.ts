/**
 * KT AI Codi (Dify 스타일) SSE 스트림을 한 줄씩 파싱합니다.
 * - data: 로 시작하는 JSON 한 줄을 기대합니다.
 * - message / agent_message 이벤트의 answer를 이어붙입니다.
 */

export interface CodiSseParseResult {
  /** 전체 응답 텍스트 */
  fullText: string
  /** message_end 이벤트의 usage (있을 때만) */
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/**
 * 스트림을 읽어 answer를 모으고, 옵션으로 청크마다 콜백을 호출합니다.
 */
export async function parseCodiChatSse(
  body: ReadableStream<Uint8Array>,
  options?: { onDelta?: (text: string) => void }
): Promise<CodiSseParseResult> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let lineBuffer = ''
  let fullText = ''
  let usage: CodiSseParseResult['usage']

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    lineBuffer += decoder.decode(value, { stream: true })

    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trimEnd()
      if (!trimmed.startsWith('data: ')) continue
      const jsonStr = trimmed.slice(6).trim()
      if (!jsonStr || jsonStr === '[DONE]') continue

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(jsonStr) as Record<string, unknown>
      } catch {
        continue
      }

      const event = parsed.event as string | undefined

      if (event === 'error') {
        const msg =
          (parsed.message as string) ||
          (parsed.code as string) ||
          JSON.stringify(parsed)
        throw new Error(`KT AI Codi 오류: ${msg}`)
      }

      if (event === 'message' || event === 'agent_message') {
        const answer = parsed.answer
        if (typeof answer === 'string' && answer.length > 0) {
          fullText += answer
          options?.onDelta?.(answer)
        }
      }

      if (event === 'message_end') {
        const meta = parsed.metadata as { usage?: CodiSseParseResult['usage'] } | undefined
        if (meta?.usage) usage = meta.usage
      }
    }
  }

  return { fullText, usage }
}
