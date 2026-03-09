import { GitDiffResult, ImpactAnalysis } from '../types'

const RISK_LABELS: Record<string, string> = {
  low: '낮음 (Low)',
  medium: '보통 (Medium)',
  high: '높음 (High)',
  critical: '치명적 (Critical)',
}

export function buildReportHeader(
  diff: GitDiffResult,
  analysis: ImpactAnalysis,
  projectName: string | undefined,
  compareSummary: string
): string {
  const now = new Date()
  const dateStr = now.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const fileStats = diff.files
    .map((f) => {
      const statusIcon = { added: '🟢', modified: '🟡', deleted: '🔴', renamed: '🔵' }[f.status] || '⚪'
      return `| ${statusIcon} ${f.path} | ${f.status} | +${f.insertions} | -${f.deletions} |`
    })
    .join('\n')

  const affectedAreas = analysis.affectedAreas
    .map((a) => `| ${a.name} | ${RISK_LABELS[a.risk] || a.risk} | ${a.description} |`)
    .join('\n')

  const projectRow = projectName?.trim() ? `| 프로젝트 | ${projectName} |\n` : ''

  return `# 테스트케이스 보고서

## 문서 정보
| 항목 | 내용 |
|------|------|
${projectRow}| 생성 일시 | ${dateStr} |
| 분석 기준 | ${compareSummary || '알 수 없음'} |
| 전체 위험도 | ${RISK_LABELS[analysis.overallRisk] || analysis.overallRisk} |

---

## 1. 변경사항 요약

### 파일 변경 통계
- 변경된 파일 수: **${diff.stats.filesChanged}개**
- 추가된 라인: **+${diff.stats.insertions}**
- 삭제된 라인: **-${diff.stats.deletions}**

### 변경 파일 목록
| 파일 경로 | 상태 | 추가 | 삭제 |
|-----------|------|------|------|
${fileStats}

---

## 2. 영향도 분석

**요약**: ${analysis.summary}

### 영향 받는 기능 영역
| 기능 영역 | 위험도 | 설명 |
|-----------|--------|------|
${affectedAreas}

### 테스트 권고사항
${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

## 3. 테스트케이스

`
}

export function buildReportFooter(): string {
  return `

---

*이 보고서는 TestPlanner(AI 기반 자동 생성)에 의해 생성되었습니다.*
`
}

export function generateFilename(projectName?: string, ext: 'md' | 'pdf' = 'md'): string {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const prefix = projectName?.trim() ? projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 20) : 'tc'
  return `${prefix}_${timestamp}.${ext}`
}
