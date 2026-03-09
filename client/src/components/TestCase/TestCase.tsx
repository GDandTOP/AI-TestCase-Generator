import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAppStore } from '../../store/useAppStore'
import { saveTestCase, savePdfTestCase } from '../../api/client'

export default function TestCase() {
  const store = useAppStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingPdf, setIsSavingPdf] = useState(false)
  const [savedPdfFilename, setSavedPdfFilename] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fullContent = store.headerContent + store.tcContent
  const isStreaming = store.isLoading

  const compareSummary =
    store.compareType === 'branch' ? `${store.baseBranch}...${store.headBranch}` :
    store.compareType === 'commit' ? `${store.baseCommit}..${store.headCommit}` :
    `최근 ${store.recentCount}개 커밋`

  const handleSave = async () => {
    if (!store.tcContent || !store.diffResult || !store.impactAnalysis) return
    setIsSaving(true)
    try {
      const { filename } = await saveTestCase({
        content: store.tcContent,
        diff: store.diffResult,
        analysis: store.impactAnalysis,
        projectName: store.projectName || store.repoPath.split('/').pop(),
        compareSummary,
      })
      store.setSavedFilename(filename)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = () => {
    if (store.savedFilename) window.open(`/api/testcase/download/${store.savedFilename}`, '_blank')
  }

  const handleSavePdf = async () => {
    if (!store.tcContent || !store.diffResult || !store.impactAnalysis) return
    setIsSavingPdf(true)
    store.setError(null)
    try {
      const { filename } = await savePdfTestCase({
        content: store.tcContent,
        diff: store.diffResult,
        analysis: store.impactAnalysis,
        projectName: store.projectName || store.repoPath.split('/').pop(),
        compareSummary,
      })
      setSavedPdfFilename(filename)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'PDF 저장 실패')
    } finally {
      setIsSavingPdf(false)
    }
  }

  const handleDownloadPdf = () => {
    if (savedPdfFilename) window.open(`/api/testcase/download/${savedPdfFilename}`, '_blank')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <p className="apple-label">Step 3</p>
          <h2 className="text-[22px] font-bold text-apple-text tracking-[-0.02em] leading-tight">테스트케이스</h2>
        </div>
        <button
          onClick={() => store.goToStep(2)}
          className="flex items-center gap-1 text-[13px] text-apple-secondary hover:text-apple-text transition-colors mt-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          뒤로
        </button>
      </div>

      {/* AI 스트리밍 상태 */}
      {isStreaming && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-apple text-[13px] text-apple-blue animate-fade-in">
          {/* 점 3개 애니메이션 */}
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-apple-blue rounded-full animate-pulse-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <span>AI가 테스트케이스를 생성하고 있습니다...</span>
        </div>
      )}

      {/* 마크다운 뷰어 */}
      <div className="apple-card overflow-hidden">
        {/* 뷰어 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,0,0,0.05)] bg-[rgba(0,0,0,0.015)]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
            </div>
            <span className="text-[12px] text-apple-secondary ml-1">테스트케이스.md</span>
          </div>
          {fullContent && !isStreaming && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[12px] text-apple-secondary hover:text-apple-text transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-apple-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  <span className="text-apple-green">복사됨</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  복사
                </>
              )}
            </button>
          )}
        </div>

        {/* 콘텐츠 영역 */}
        <div className="p-6 min-h-60 max-h-[56vh] overflow-y-auto bg-white">
          {fullContent ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{fullContent}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 select-none">
              <svg className="w-12 h-12 text-apple-tertiary mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p className="text-[13px] text-apple-tertiary text-center">테스트케이스가 생성되면 여기에 표시됩니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      {fullContent && !isStreaming && (
        <div className="space-y-2 animate-fade-in">
          {/* MD + PDF 저장 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || isSavingPdf}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-apple-text text-white rounded-apple-lg text-[13px] font-semibold hover:bg-[#2d2d2f] active:scale-[0.99] disabled:opacity-50 transition-all duration-150"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  저장 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                  </svg>
                  MD 저장
                </>
              )}
            </button>

            <button
              onClick={handleSavePdf}
              disabled={isSaving || isSavingPdf}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0071e3] text-white rounded-apple-lg text-[13px] font-semibold hover:bg-[#0077ed] active:scale-[0.99] disabled:opacity-50 transition-all duration-150"
            >
              {isSavingPdf ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  PDF 생성 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                  </svg>
                  PDF 저장
                </>
              )}
            </button>
          </div>

          {/* 다운로드 버튼 */}
          {(store.savedFilename || savedPdfFilename) && (
            <div className="flex gap-2">
              {store.savedFilename && (
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[rgba(0,0,0,0.05)] text-apple-text rounded-apple-lg text-[13px] font-semibold hover:bg-[rgba(0,0,0,0.09)] active:scale-[0.99] transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  MD 다운로드
                </button>
              )}
              {savedPdfFilename && (
                <button
                  onClick={handleDownloadPdf}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[rgba(0,113,227,0.08)] text-[#0071e3] rounded-apple-lg text-[13px] font-semibold hover:bg-[rgba(0,113,227,0.14)] active:scale-[0.99] transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  PDF 다운로드
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 저장 완료 */}
      {store.savedFilename && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-apple text-[13px] text-emerald-700 animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          MD 저장 완료:
          <span className="font-mono text-[12px] ml-1">{store.savedFilename}</span>
        </div>
      )}
      {savedPdfFilename && (
        <div className="flex items-center gap-2.5 p-3.5 bg-blue-50 border border-blue-100 rounded-apple text-[13px] text-blue-700 animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          PDF 저장 완료:
          <span className="font-mono text-[12px] ml-1">{savedPdfFilename}</span>
        </div>
      )}

      {/* 에러 */}
      {store.error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-apple text-[13px] text-red-600">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {store.error}
        </div>
      )}

      {/* 처음으로 */}
      <button
        onClick={store.reset}
        className="w-full py-2.5 text-[13px] text-apple-secondary hover:text-apple-text flex items-center justify-center gap-1.5 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        처음으로 돌아가기
      </button>
    </div>
  )
}
