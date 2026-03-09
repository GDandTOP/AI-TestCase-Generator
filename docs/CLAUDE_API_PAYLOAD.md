# Claude API로 보내는 데이터 구조

Git에서 받은 diff를 가공한 뒤, Claude API에 **문자열(프롬프트)** 하나로 보냅니다.  
API에는 객체 형태로 `messages: [{ role: 'user', content: prompt }]` 만 넘깁니다.

---

## 1. Claude에 넘기기 전의 “원본” 데이터 (Git에서 옴)

서버가 쓰는 타입은 아래와 같습니다.

```ts
// server/src/types/index.ts

interface GitDiffResult {
  files: DiffFile[]           // 변경된 파일 목록
  rawDiff: string            // git diff 전체 텍스트
  stats: {
    filesChanged: number
    insertions: number
    deletions: number
  }
}

interface DiffFile {
  path: string                // 예: "src/App.tsx"
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  insertions: number
  deletions: number
}
```

**예시 (실제로 메모리 안에 있는 값):**

```json
{
  "files": [
    { "path": "src/App.tsx", "status": "modified", "insertions": 12, "deletions": 3 },
    { "path": "src/api/client.ts", "status": "added", "insertions": 45, "deletions": 0 }
  ],
  "rawDiff": "diff --git a/src/App.tsx b/src/App.tsx\nindex 123..456 100644\n--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -10,3 +10,5 @@\n ...",
  "stats": {
    "filesChanged": 2,
    "insertions": 57,
    "deletions": 3
  }
}
```

이 `GitDiffResult`를 기준으로 프롬프트 문자열을 만든 뒤, 그 문자열만 Claude에 보냅니다.

---

## 2. API로 “실제로” 보내는 것 (요청 바디)

Claude API는 **채팅 메시지** 형태만 받습니다.  
그래서 “깃허브 데이터”는 **프롬프트 문자열 안에** 넣어서 보냅니다.

### 2-1. 영향도 분석 (`POST /api/analysis/impact` → Claude 영향도 분석)

**호출 코드 (서버):**

```ts
const prompt = buildImpactAnalysisPrompt(diff)  // diff = GitDiffResult

await this.client.messages.create({
  model: 'claude-haiku-4-5-20251001',  // 또는 선택한 모델
  max_tokens: 2048,
  messages: [{ role: 'user', content: prompt }],
})
```

즉, **API로 보내는 데이터**는 다음 한 덩어리입니다.

- `model`: 문자열
- `max_tokens`: 숫자
- `messages`: 배열 하나, 그 안에 `role: 'user'`, `content: prompt` (문자열)

**`prompt` 안에 들어가는 내용 (데이터가 어떤 식인지):**

- `diff.files` → “변경된 파일 목록” 문단 (예: `- modified: src/App.tsx (+12/-3)`)
- `diff.stats` → “변경 통계” 문단 (파일 수, 추가/삭제 라인)
- `diff.rawDiff` → 최대 15,000자까지 잘라서 ` ```diff ... ``` ` 블록 안에 넣음

즉, **깃허브에서 받은 데이터는 전부 이 하나의 `prompt` 문자열 안에 텍스트로 들어가고**, 그 문자열이 그대로 `content`로 전달됩니다.

---

### 2-2. 테스트케이스 생성 (`POST /api/testcase/generate` → Claude TC 생성)

**호출 코드 (서버):**

```ts
const prompt = buildTestCasePrompt(diff, analysis, projectName)

await this.client.messages.stream({
  model,
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }],
})
```

**API로 보내는 데이터 형식은 동일:**

- `model`, `max_tokens`, `messages: [{ role: 'user', content: prompt }]`

**이때 `prompt` 안에 들어가는 데이터:**

- `projectName` (또는 '알 수 없음')
- **영향도 분석 결과(analysis):**
  - `overallRisk`, `summary`
  - `affectedAreas` → 각각 name, risk, description
- **diff 요약:**
  - `diff.files` → “변경된 파일” 목록 (경로 + status)
  - `diff.rawDiff` → 최대 10,000자까지 잘라서 ` ```diff ... ``` ` 블록
- 그 위에 “시나리오 기반 테스트케이스 마크다운 형식” 같은 지시문

역시 **깃허브 데이터(diff)와 분석(analysis)는 전부 문자열로 합쳐진 `prompt`**이고, API에는 이 `prompt`가 `content`로만 전달됩니다.

---

## 3. 요약 표

| 구분 | Claude에 보내는 “데이터” 형태 | 실제 API 바디 |
|------|------------------------------|----------------|
| **영향도 분석** | `GitDiffResult`를 문단 + diff 블록으로 만든 **한 줄 문자열** `prompt` | `{ model, max_tokens, messages: [{ role: 'user', content: prompt }] }` |
| **테스트케이스 생성** | `GitDiffResult` + `ImpactAnalysis` + `projectName`을 문단 + diff 블록으로 만든 **한 줄 문자열** `prompt` | `{ model, max_tokens, messages: [{ role: 'user', content: prompt }] }` |

정리하면, **깃허브 데이터는 JSON으로 직접 보내지 않고**,  
`prompt.util.ts`에서 **문자열(프롬프트)** 로 가공된 뒤, 그 문자열이 **Claude API의 `messages[].content`** 로 전달되는 구조입니다.
