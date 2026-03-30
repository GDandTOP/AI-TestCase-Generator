/**
 * Anthropic API 에러 메시지를 비개발자도 이해하기 쉬운 한글 안내로 바꿉니다.
 */
export function toFriendlyClaudeError(raw: unknown): string {
  const message = raw instanceof Error ? raw.message : String(raw)

  // KT AI Codi (키·할당량·HTTP)
  if (/KT AI Codi|CODI_API_KEY|codi\.kt\.co\.kr/i.test(message)) {
    if (/provider_quota|quota insufficient|할당량/i.test(message)) {
      return 'KT AI Codi 모델 호출 할당량이 부족합니다. KT 콘솔에서 할당량을 확인해 주세요.'
    }
    if (/401|unauthorized|invalid.*key/i.test(message)) {
      return 'KT AI Codi API 키가 올바르지 않습니다. server/.env의 CODI_API_KEY를 확인해 주세요.'
    }
    if (/404|not found/i.test(message)) {
      return 'KT AI Codi API 주소를 찾을 수 없습니다. CODI_API_BASE_URL 설정을 확인해 주세요.'
    }
    if (message.length <= 200) return message
    return message.slice(0, 200) + '…'
  }

  // 크레딧 부족
  if (
    /credit balance is too low|credits?.*(too low|insufficient|depleted)/i.test(message) ||
    (message.includes('invalid_request_error') && message.includes('credit'))
  ) {
    return 'Anthropic API 크레딧이 부족합니다. Anthropic 콘솔(https://console.anthropic.com) → Plans & Billing에서 크레딧을 충전해 주세요.'
  }

  // API 키 오류
  if (/invalid.*api key|authentication|401|unauthorized/i.test(message)) {
    return 'Anthropic API 키가 올바르지 않거나 만료되었습니다. server/.env의 ANTHROPIC_API_KEY를 확인해 주세요.'
  }

  // 요청 한도/속도 제한
  if (/rate limit|too many requests|429/i.test(message)) {
    return 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
  }

  // 그대로 반환 (이미 짧은 메시지면)
  if (message.length <= 200) return message
  return message.slice(0, 200) + '…'
}

/**
 * Claude 또는 KT AI Codi 등 LLM 에러를 한글 안내로 통일합니다.
 */
export function toFriendlyLlmError(raw: unknown): string {
  return toFriendlyClaudeError(raw)
}
