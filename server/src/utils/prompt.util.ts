import { GitDiffResult, ImpactAnalysis } from '../types'

export function buildImpactAnalysisPrompt(diff: GitDiffResult): string {
  const fileList = diff.files.map((f) => `- ${f.status}: ${f.path} (+${f.insertions}/-${f.deletions})`).join('\n')

  return `당신은 소프트웨어 QA 전문가입니다. 아래 Git diff를 분석하여 영향도를 평가해주세요.

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
      "name": "영향 받는 기능/영역 이름",
      "risk": "low|medium|high|critical",
      "description": "이 영역이 어떻게 영향을 받는지 설명",
      "files": ["관련 파일 경로들"]
    }
  ],
  "recommendations": [
    "테스트 시 주의해야 할 사항 1",
    "테스트 시 주의해야 할 사항 2"
  ]
}`
}

export function buildTestCasePrompt(diff: GitDiffResult, analysis: ImpactAnalysis, projectName?: string): string {
  const affectedAreasList = analysis.affectedAreas
    .map((a) => `- ${a.name} (위험도: ${a.risk}): ${a.description}`)
    .join('\n')

  return `당신은 소프트웨어 QA 엔지니어입니다. 아래 Git diff 분석 결과를 바탕으로 시나리오 기반 테스트케이스를 작성해주세요.

## 프로젝트: ${projectName || '알 수 없음'}

## 영향도 분석 결과
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

다음 규칙에 따라 마크다운 형식으로 테스트케이스를 작성해주세요:

1. P1(필수): 핵심 기능 변경에 대한 테스트 (최소 2개)
2. P2(중요): 영향 받는 주변 기능 테스트 (최소 2개)
3. P3(일반): 회귀 테스트 시나리오 (최소 1개)

각 TC는 다음 형식을 따르세요:

### TC-XXX: [테스트 케이스 제목]
- **우선순위**: P1/P2/P3
- **관련 영역**: [영향 받는 기능 영역]
- **사전 조건**:
  - [전제 조건 1]
- **테스트 시나리오**: [이 테스트가 검증하는 것]
- **실행 단계**:
  1. [단계 1]
  2. [단계 2]
- **예상 결과**: [기대되는 결과]
- **주의사항**: [특별히 확인해야 할 사항 (선택)]

마지막에 "## 테스트 실행 체크리스트" 섹션을 추가해주세요.`
}
