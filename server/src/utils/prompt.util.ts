import { GitDiffResult, ImpactAnalysis } from '../types'

/** 프로젝트 구조 문서가 있으면 프롬프트 앞에 붙입니다. 한 번 받아 두면 이후 요청마다 같은 문서를 쓰면 됩니다. */
function withProjectContext(projectContextDocument: string | undefined, prompt: string): string {
  if (!projectContextDocument?.trim()) return prompt
  return `${projectContextDocument}\n\n---\n\n${prompt}`
}

export function buildImpactAnalysisPrompt(diff: GitDiffResult, projectContextDocument?: string): string {
  const fileList = diff.files.map((f) => `- ${f.status}: ${f.path} (+${f.insertions}/-${f.deletions})`).join('\n')

  const body = `당신은 소프트웨어 QA 전문가입니다. 아래 Git diff를 분석하여 영향도를 평가해주세요.

## 변경된 파일 목록
${fileList}

## 변경 통계
- 변경된 파일 수: ${diff.stats.filesChanged}
- 추가된 라인: ${diff.stats.insertions}
- 삭제된 라인: ${diff.stats.deletions}

## Git Diff 내용
\`\`\`diff
${diff.rawDiff.slice(0, 15000)}
\`\`\`

다음 JSON 형식으로 영향도 분석 결과를 반환해주세요. JSON 외 다른 텍스트는 포함하지 마세요:

{
  "overallRisk": "low|medium|high|critical",
  "summary": "전체 변경사항에 대한 2-3문장 요약",
  "affectedAreas": [
    {
      "name": "영향 받는 기능/영역 이름 (비개발자도 이해할 수 있게: 예: 로그인 화면, 결제 버튼, 상품 목록)",
      "risk": "low|medium|high|critical",
      "description": "이 영역이 어떻게 영향을 받는지 설명. 웹이라면 '어떤 화면/메뉴에서 무엇이 바뀌는지'를 한글으로 명확히",
      "files": ["관련 파일 경로들"]
    }
  ],
  "recommendations": [
    "수동 테스트 시 꼭 확인할 것 1 (예: '로그인 후 마이페이지 접속해 보기')",
    "수동 테스트 시 꼭 확인할 것 2"
  ]
}

※ 이 결과는 비개발자·수동 테스터(웹사이트 접속 후 마우스로 클릭하며 테스트하는 사람)가 놓치지 않도록, '어디를 봐야 하는지'가 드러나게 작성해주세요.`
  return withProjectContext(projectContextDocument, body)
}

export function buildTestCasePrompt(
  diff: GitDiffResult,
  analysis: ImpactAnalysis,
  projectName?: string,
  projectContextDocument?: string
): string {
  const affectedAreasList = analysis.affectedAreas
    .map((a) => `- ${a.name} (위험도: ${a.risk}): ${a.description}`)
    .join('\n')

  const projectSection = projectName?.trim() ? `## 프로젝트: ${projectName}\n\n` : ''

  const body = `당신은 소프트웨어 QA 엔지니어입니다. 아래 Git diff 분석 결과를 바탕으로 시나리오 기반 테스트케이스를 작성해주세요.

${projectSection}## 영향도 분석 결과
- 전체 위험도: ${analysis.overallRisk}
- 요약: ${analysis.summary}

## 영향 받는 영역
${affectedAreasList}

## 변경된 파일
${diff.files.map((f) => `- ${f.status}: ${f.path}`).join('\n')}

## Git Diff 상세
\`\`\`diff
${diff.rawDiff.slice(0, 10000)}
\`\`\`

다음 규칙에 따라 마크다운 형식으로 테스트케이스를 작성해주세요.

**대상 독자**: 비개발자, 웹사이트에 접속해서 직접 마우스로 클릭하며 테스트하는 사람. 따라서 개발 용어(API, 컴포넌트, diff 등) 대신 '화면', '버튼', '입력칸', '메뉴' 같은 표현을 쓰고, 실행 단계는 '어디를 클릭하고, 무엇을 입력하고, 무엇이 보이면 되는지' 구체적으로 적어 주세요. (웹 앱인 경우 접속할 URL이나 메뉴 경로가 있으면 포함)

1. P1(필수): 핵심 기능 변경에 대한 테스트 (최소 2개)
2. P2(중요): 영향 받는 주변 기능 테스트 (최소 2개)
3. P3(일반): 회귀 테스트 시나리오 (최소 1개)

각 TC는 다음 형식을 따르세요:

### TC-XXX: [테스트 케이스 제목]
- **우선순위**: P1/P2/P3
- **관련 영역**: [영향 받는 기능/화면 (비개발자도 이해 가능한 이름)]
- **사전 조건**:
  - [전제 조건 1 (예: 로그인된 상태, 특정 메뉴에 있음)]
- **테스트 시나리오**: [이 테스트가 검증하는 것]
- **실행 단계** (클릭·입력·확인 순서로 구체적으로):
  1. [예: 상단 '로그인' 클릭 → 이메일/비밀번호 입력 → '제출' 클릭]
  2. [예: 메인 화면에서 '장바구니' 아이콘 클릭]
  3. [확인할 것: 화면에 OO가 보이는지]
- **예상 결과**: [화면에 무엇이 보이거나, 어떤 동작이 되면 통과인지]
- **주의사항**: [수동 테스트 시 놓치기 쉬운 점 (선택)]

마지막에 "## 테스트 실행 체크리스트" 섹션을 추가하고, 테스터가 한 번에 하나씩 체크하며 누락 없이 테스트할 수 있도록 항목을 나열해주세요.

---
**출력 형식 (반드시 준수)**: 다른 설명이나 서두 없이, 응답의 첫 줄을 \`### TC-001: [제목]\`으로 시작하세요. 그다음 해당 TC의 - **우선순위**, - **관련 영역** 등을 이어서 작성하고, 최소 5개 이상의 TC(### TC-002, ### TC-003, ...)를 모두 작성한 뒤, 마지막에 ## 테스트 실행 체크리스트를 붙이세요. "3. 테스트케이스" 섹션을 비워 두지 마세요.`
  return withProjectContext(projectContextDocument, body)
}
