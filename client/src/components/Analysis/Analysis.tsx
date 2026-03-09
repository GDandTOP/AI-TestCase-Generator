import { useAppStore } from '../../store/useAppStore'

const RISK_CONFIG = {
  low:      { label: '낮음',    bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500',  pill: 'bg-emerald-100 text-emerald-700' },
  medium:   { label: '보통',    bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',    pill: 'bg-amber-100 text-amber-700'   },
  high:     { label: '높음',    bg: 'bg-orange-50',  border: 'border-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500',   pill: 'bg-orange-100 text-orange-700' },
  critical: { label: '치명적',  bg: 'bg-red-50',     border: 'border-red-100',     text: 'text-red-700',     dot: 'bg-red-500',      pill: 'bg-red-100 text-red-700'       },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  added:    { label: '추가',      color: 'text-emerald-600', dot: 'bg-emerald-400' },
  modified: { label: '수정',      color: 'text-apple-blue',  dot: 'bg-apple-blue'  },
  deleted:  { label: '삭제',      color: 'text-red-500',     dot: 'bg-red-400'     },
  renamed:  { label: '이름변경',  color: 'text-purple-600',  dot: 'bg-purple-400'  },
}

export default function Analysis() {
  const {
    diffResult, impactAnalysis,
    goToStep, setLoading, setError,
    setTcContent, setHeaderContent, appendTcContent,
    repoPath, projectName, compareType,
    baseBranch, headBranch, baseCommit, headCommit, recentCount,
    selectedModel,
    projectContextDocument,
  } = useAppStore()

  if (!diffResult || !impactAnalysis) return null

  const compareSummary =
    compareType === 'branch' ? `${baseBranch}...${headBranch}` :
    compareType === 'commit' ? `${baseCommit}..${headCommit}` :
    `최근 ${recentCount}개 커밋`

  const risk = RISK_CONFIG[impactAnalysis.overallRisk]

  const handleGenerateTC = async () => {
    setLoading(true, 'TC 생성 중...')
    setError(null)
    setTcContent('')
    setHeaderContent('')

    try {
      const response = await fetch('/api/testcase/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diff: diffResult,
          analysis: impactAnalysis,
          projectName: projectName || repoPath.split('/').pop(),
          compareSummary,
          model: selectedModel,
          projectContextDocument: projectContextDocument || undefined,
        }),
      })

      if (!response.ok || !response.body) throw new Error('TC 생성 요청 실패')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      goToStep(3)
      setLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6))
              if (json.type === 'header') setHeaderContent(json.text)
              else if (json.type === 'delta') appendTcContent(json.text)
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TC 생성 실패')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <p className="apple-label">Step 2</p>
          <h2 className="text-[22px] font-bold text-apple-text tracking-[-0.02em] leading-tight">영향도 분석 결과</h2>
        </div>
        <button
          onClick={() => goToStep(1)}
          className="flex items-center gap-1 text-[13px] text-apple-secondary hover:text-apple-text transition-colors mt-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          뒤로
        </button>
      </div>

      {/* 전체 위험도 배너 */}
      <div className={`flex items-center gap-3 p-4 rounded-apple-lg border ${risk.bg} ${risk.border}`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${risk.dot}`}></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-medium text-gray-500">전체 위험도</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${risk.pill}`}>{risk.label}</span>
          </div>
          <p className={`text-[13px] ${risk.text} leading-snug`}>{impactAnalysis.summary}</p>
        </div>
      </div>

      {/* 변경 통계 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: diffResult.stats.filesChanged, label: '변경된 파일', color: 'text-apple-text' },
          { value: `+${diffResult.stats.insertions}`, label: '추가된 라인', color: 'text-emerald-600' },
          { value: `-${diffResult.stats.deletions}`, label: '삭제된 라인', color: 'text-red-500' },
        ].map(({ value, label, color }) => (
          <div key={label} className="apple-card p-4 text-center">
            <div className={`text-[22px] font-bold font-mono tabular-nums tracking-tight ${color}`}>{value}</div>
            <div className="text-[11px] text-apple-secondary mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* 변경 파일 목록 */}
      <div className="apple-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,0,0,0.05)] bg-[rgba(0,0,0,0.015)]">
          <h3 className="text-[13px] font-semibold text-apple-text">변경된 파일</h3>
          <span className="text-[11px] text-apple-secondary bg-[rgba(0,0,0,0.05)] px-2 py-0.5 rounded-full">
            {diffResult.files.length}개
          </span>
        </div>
        <div className="divide-y divide-[rgba(0,0,0,0.04)] max-h-44 overflow-y-auto">
          {diffResult.files.map((file, i) => {
            const s = STATUS_CONFIG[file.status] || { label: file.status, color: 'text-apple-secondary', dot: 'bg-gray-300' }
            return (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`}></div>
                  <span className="font-mono text-[12px] text-apple-text truncate">{file.path}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className={`text-[11px] font-semibold ${s.color}`}>{s.label}</span>
                  <span className="text-[11px] text-apple-tertiary font-mono tabular-nums">+{file.insertions}/-{file.deletions}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 영향 받는 영역 */}
      <div className="space-y-2.5">
        <h3 className="text-[13px] font-semibold text-apple-text">영향 받는 기능 영역</h3>
        <div className="space-y-2">
          {impactAnalysis.affectedAreas.map((area, i) => {
            const r = RISK_CONFIG[area.risk]
            return (
              <div key={i} className={`p-4 rounded-apple-lg border ${r.bg} ${r.border}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${r.dot}`}></div>
                  <span className={`text-[13px] font-semibold ${r.text}`}>{area.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.pill}`}>{r.label}</span>
                </div>
                <p className={`text-[13px] ${r.text} opacity-75 pl-3.5 leading-relaxed`}>{area.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 권고사항 */}
      {impactAnalysis.recommendations.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-apple-lg">
          <h3 className="text-[13px] font-semibold text-apple-blue mb-2.5">테스트 권고사항</h3>
          <ul className="space-y-2">
            {impactAnalysis.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-blue-700">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-apple-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* TC 생성 버튼 */}
      <button
        onClick={handleGenerateTC}
        className="w-full py-3 bg-apple-blue text-white rounded-apple-lg text-[14px] font-semibold hover:bg-apple-blue-dark active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
        </svg>
        테스트케이스 생성
      </button>
    </div>
  )
}
