/**
 * LLM 응답 텍스트에서 JSON 객체를 추출하는 유틸리티.
 *
 * 처리 순서:
 * 1. 코드 펜스(```json 또는 ```) 제거 후 정제된 텍스트 확보
 * 2. 문자열 내 중괄호를 올바르게 처리하는 균형 중괄호 탐색
 * 3. 원본 텍스트 반환 (위 모두 실패 시)
 */
export function extractJsonFromLlmResponse(text: string): string {
  // 코드 펜스 제거 (닫는 펜스 없는 경우도 처리)
  let cleaned = text.trim()
  const fenceStartMatch = cleaned.match(/^```(?:json)?\s*\n?/)
  if (fenceStartMatch) {
    cleaned = cleaned.slice(fenceStartMatch[0].length)
    // 닫는 펜스 제거 (있는 경우)
    cleaned = cleaned.replace(/\n?\s*```\s*$/, '').trim()
    console.log('[json-extract] 코드 펜스 제거 완료')
  }

  // 문자열 내 {/} 를 올바르게 처리하는 균형 중괄호 탐색
  const startIdx = cleaned.indexOf('{')
  if (startIdx !== -1) {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = startIdx; i < cleaned.length; i++) {
      const ch = cleaned[i]
      if (escape) { escape = false; continue }
      if (ch === '\\' && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (!inString) {
        if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) {
            console.log('[json-extract] 균형 중괄호 탐색 성공, 위치:', startIdx, '~', i)
            return cleaned.slice(startIdx, i + 1)
          }
        }
      }
    }
  }

  // 추출 실패 — 원본 반환 (JSON.parse 에서 에러 발생)
  console.warn('[json-extract] JSON 추출 실패, 원본 텍스트 반환 (길이:', text.length, ')')
  return text
}
