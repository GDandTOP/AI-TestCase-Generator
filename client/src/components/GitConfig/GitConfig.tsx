import { useState } from 'react'
import { useAppStore, GitDiffResult, ImpactAnalysis, CLAUDE_MODELS } from '../../store/useAppStore'
import { validateRepo, getBranches, getDiff, analyzeImpact, cloneRepo, openFolderDialog } from '../../api/client'

const BADGE_STYLE: Record<string, string> = {
  '추천':   'bg-emerald-50 text-emerald-600 border border-emerald-100',
  '최저가': 'bg-sky-50 text-sky-600 border border-sky-100',
  '최고급': 'bg-purple-50 text-purple-600 border border-purple-100',
}

export default function GitConfig() {
  const store = useAppStore()
  const [repoPathInput, setRepoPathInput] = useState(store.repoPath)
  // GitHub URL 입력값 (로컬 상태로 관리)
  const [githubUrlInput, setGithubUrlInput] = useState(store.githubUrl)
  const [isValidating, setIsValidating] = useState(false)
  // GitHub 클론 진행 단계 메시지
  const [cloneStatus, setCloneStatus] = useState('')

  /**
   * 로컬 저장소 경로를 검증하고 브랜치 목록을 불러옵니다.
   */
  const handleValidate = async () => {
    if (!repoPathInput.trim()) {
      store.setError('저장소 경로를 입력해주세요')
      return
    }
    setIsValidating(true)
    store.setError(null)
    try {
      await validateRepo(repoPathInput)
      store.setRepoPath(repoPathInput)
      const { all, commits } = await getBranches(repoPathInput)
      store.setBranches(all, commits)
      if (all.length >= 2) {
        store.setBaseBranch(all[0])
        store.setHeadBranch(all[1])
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '저장소 검증 실패')
    } finally {
      setIsValidating(false)
    }
  }

  /**
   * GitHub URL로 저장소를 클론한 후 브랜치 목록을 불러옵니다.
   * 서버에서 임시 디렉토리에 클론하고 그 경로를 repoPath로 사용합니다.
   */
  const handleClone = async () => {
    if (!githubUrlInput.trim()) {
      store.setError('GitHub URL을 입력해주세요')
      return
    }
    setIsValidating(true)
    setCloneStatus('GitHub 저장소 클론 중...')
    store.setError(null)
    store.setGithubUrl(githubUrlInput)
    try {
      // GitHub URL을 서버에 전달해서 임시 경로에 클론
      const localPath = await cloneRepo(githubUrlInput)
      store.setRepoPath(localPath)
      setCloneStatus('브랜치 목록 불러오는 중...')
      const { all, commits } = await getBranches(localPath)
      store.setBranches(all, commits)
      if (all.length >= 2) {
        store.setBaseBranch(all[0])
        store.setHeadBranch(all[1])
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'GitHub 저장소 클론 실패')
    } finally {
      setIsValidating(false)
      setCloneStatus('')
    }
  }

  /**
   * macOS 네이티브 폴더 선택 다이얼로그를 서버를 통해 열고,
   * 선택된 경로를 경로 입력란에 자동으로 채워넣습니다.
   */
  const handleOpenFolder = async () => {
    try {
      const selectedPath = await openFolderDialog()
      // 사용자가 다이얼로그에서 취소를 누르면 null 반환 → 아무 것도 하지 않음
      if (selectedPath) {
        setRepoPathInput(selectedPath)
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '폴더 선택에 실패했습니다')
    }
  }

  const handleAnalyze = async () => {
    store.setLoading(true, 'diff 추출 중...')
    store.setError(null)
    try {
      const diffPayload: {
        repoPath: string
        compareType: 'branch' | 'commit' | 'recent'
        base?: string
        head?: string
        count?: number
      } = { repoPath: store.repoPath, compareType: store.compareType }

      if (store.compareType === 'branch') {
        diffPayload.base = store.baseBranch
        diffPayload.head = store.headBranch
      } else if (store.compareType === 'commit') {
        diffPayload.base = store.baseCommit
        diffPayload.head = store.headCommit
      } else {
        diffPayload.count = store.recentCount
      }

      const diff = await getDiff(diffPayload)
      store.setDiffResult(diff as GitDiffResult)

      store.setLoading(true, 'Claude AI로 영향도 분석 중...')
      const analysis = await analyzeImpact(diff, store.selectedModel)
      store.setImpactAnalysis(analysis as ImpactAnalysis)

      store.goToStep(2)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '분석 실패')
    } finally {
      store.setLoading(false)
    }
  }

  const isRepoLoaded = store.branches.length > 0

  return (
    <div className="space-y-8">

      {/* 섹션 헤더 */}
      <div>
        <p className="apple-label">Step 1</p>
        <h2 className="text-[22px] font-bold text-apple-text tracking-[-0.02em] leading-tight">Git 저장소 설정</h2>
        <p className="text-[13px] text-apple-secondary mt-1">저장소 유형을 선택하고 분석할 저장소를 연결하세요</p>
      </div>

      {/* 저장소 유형 선택 탭 — 로컬 경로 vs GitHub URL */}
      <div className="space-y-3">
        <label className="block text-[13px] font-semibold text-apple-text">저장소 유형</label>
        <div className="grid grid-cols-2 gap-2">
          {/* 로컬 저장소 탭 */}
          <button
            onClick={() => {
              store.setRepoSourceType('local')
              // 탭 전환 시 기존 로드 상태 초기화
              store.setBranches([], [])
              store.setRepoPath('')
            }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-apple-lg border-2 text-left transition-all duration-200 ${
              store.repoSourceType === 'local'
                ? 'border-apple-blue bg-blue-50/70 shadow-apple-sm'
                : 'border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.015)] hover:border-[rgba(0,0,0,0.16)] hover:bg-white'
            }`}
          >
            {/* 폴더 아이콘 */}
            <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${store.repoSourceType === 'local' ? 'bg-apple-blue' : 'bg-[rgba(0,0,0,0.06)]'}`}>
              <svg className={`w-4 h-4 ${store.repoSourceType === 'local' ? 'text-white' : 'text-apple-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </div>
            <div>
              <div className={`text-[13px] font-semibold ${store.repoSourceType === 'local' ? 'text-apple-blue' : 'text-apple-text'}`}>로컬 저장소</div>
              <div className="text-[11px] text-apple-tertiary mt-0.5">PC의 디렉토리 경로 입력</div>
            </div>
          </button>

          {/* GitHub URL 탭 */}
          <button
            onClick={() => {
              store.setRepoSourceType('github')
              store.setBranches([], [])
              store.setRepoPath('')
            }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-apple-lg border-2 text-left transition-all duration-200 ${
              store.repoSourceType === 'github'
                ? 'border-apple-blue bg-blue-50/70 shadow-apple-sm'
                : 'border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.015)] hover:border-[rgba(0,0,0,0.16)] hover:bg-white'
            }`}
          >
            {/* GitHub 아이콘 */}
            <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${store.repoSourceType === 'github' ? 'bg-apple-blue' : 'bg-[rgba(0,0,0,0.06)]'}`}>
              <svg className={`w-4 h-4 ${store.repoSourceType === 'github' ? 'text-white' : 'text-apple-tertiary'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <div>
              <div className={`text-[13px] font-semibold ${store.repoSourceType === 'github' ? 'text-apple-blue' : 'text-apple-text'}`}>GitHub URL</div>
              <div className="text-[11px] text-apple-tertiary mt-0.5">원격 저장소 자동 클론</div>
            </div>
          </button>
        </div>
      </div>

      {/* 로컬 저장소 경로 입력 */}
      {store.repoSourceType === 'local' && (
        <div className="space-y-2">
          <label className="block text-[13px] font-semibold text-apple-text">저장소 경로</label>

          {/* 경로 입력창 + 폴더 선택 버튼 */}
          <div className="relative">
            {/* 폴더 아이콘 (입력창 왼쪽) */}
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-tertiary pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            <input
              type="text"
              value={repoPathInput}
              onChange={(e) => setRepoPathInput(e.target.value)}
              placeholder="/Users/username/my-project"
              className="apple-input pl-9 pr-[7.5rem]"
              onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            />
            {/* '폴더 선택' 버튼 — 입력창 오른쪽 내부에 위치 */}
            <button
              type="button"
              onClick={handleOpenFolder}
              disabled={isValidating}
              title="Finder에서 폴더를 선택합니다"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[12px] font-medium text-apple-secondary bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.09)] active:scale-95 disabled:opacity-40 transition-all duration-150 whitespace-nowrap"
            >
              {/* 업로드/열기 아이콘 */}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              폴더 선택
            </button>
          </div>

          {/* 저장소 확인 버튼 (하단 전체 너비) */}
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="w-full py-2.5 bg-apple-blue text-white rounded-apple text-[13px] font-semibold hover:bg-apple-blue-dark active:scale-[0.99] disabled:opacity-50 transition-all duration-150 flex items-center justify-center gap-1.5"
          >
            {isValidating
              ? <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  확인 중
                </>
              : <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  저장소 확인
                </>
            }
          </button>
        </div>
      )}

      {/* GitHub URL 입력 */}
      {store.repoSourceType === 'github' && (
        <div className="space-y-2">
          <label className="block text-[13px] font-semibold text-apple-text">GitHub 저장소 URL</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              {/* GitHub 로고 아이콘 */}
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-tertiary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              <input
                type="url"
                value={githubUrlInput}
                onChange={(e) => setGithubUrlInput(e.target.value)}
                placeholder="https://github.com/username/repository"
                className="apple-input pl-9"
                onKeyDown={(e) => e.key === 'Enter' && handleClone()}
              />
            </div>
            <button
              onClick={handleClone}
              disabled={isValidating}
              className="px-4 py-2.5 bg-apple-blue text-white rounded-apple text-[13px] font-semibold hover:bg-apple-blue-dark active:scale-[0.97] disabled:opacity-50 transition-all duration-150 whitespace-nowrap"
            >
              {isValidating
                ? <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {cloneStatus || '처리 중'}
                  </span>
                : '클론하기'
              }
            </button>
          </div>
          {/* GitHub URL 입력 안내 메시지 */}
          <p className="text-[11px] text-apple-tertiary">
            공개 저장소만 지원합니다. 최근 50개 커밋을 shallow clone합니다.
          </p>
        </div>
      )}

      {/* AI 모델 선택 */}
      <div className="space-y-2.5">
        <label className="block text-[13px] font-semibold text-apple-text">AI Agent Model 선택</label>
        <div className="grid grid-cols-3 gap-2.5">
          {CLAUDE_MODELS.map((m) => {
            const isSelected = store.selectedModel === m.id
            const estimatedCost = ((3000 * m.inputPrice + 2000 * m.outputPrice) / 1_000_000).toFixed(3)
            return (
              <button
                key={m.id}
                onClick={() => store.setSelectedModel(m.id)}
                className={`relative flex flex-col items-start p-4 rounded-apple-lg border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-apple-blue bg-blue-50/70 shadow-apple-sm'
                    : 'border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.015)] hover:border-[rgba(0,0,0,0.16)] hover:bg-white'
                }`}
              >
                {/* 선택 인디케이터 */}
                {isSelected && (
                  <div className="absolute top-3.5 right-3.5 w-4 h-4 rounded-full bg-apple-blue flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </div>
                )}

                {/* 뱃지 */}
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-2 ${BADGE_STYLE[m.badge] || 'bg-gray-50 text-gray-500'}`}>
                  {m.badge}
                </span>

                {/* 모델명 */}
                <span className={`text-[13px] font-bold leading-tight ${isSelected ? 'text-apple-blue' : 'text-apple-text'}`}>
                  {m.name}
                </span>
                <span className="text-[11px] text-apple-secondary mt-0.5">{m.description}</span>

                {/* 가격 */}
                <div className="mt-3 w-full pt-3 border-t border-[rgba(0,0,0,0.06)] space-y-1">
                  <div className="flex justify-between text-[11px] text-apple-secondary">
                    <span>Input</span>
                    <span className="font-mono tabular-nums">${m.inputPrice}/1M</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-apple-secondary">
                    <span>Output</span>
                    <span className="font-mono tabular-nums">${m.outputPrice}/1M</span>
                  </div>
                  <div className={`flex justify-between text-[11px] font-semibold pt-1.5 border-t ${
                    isSelected ? 'border-apple-blue/[0.15] text-apple-blue' : 'border-[rgba(0,0,0,0.05)] text-apple-secondary'
                  }`}>
                    <span>1회 예상</span>
                    <span className="font-mono tabular-nums">≈${estimatedCost}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 저장소 로드 후 */}
      {isRepoLoaded && (
        <div className="space-y-6 animate-slide-up">
          {/* 프로젝트 이름 */}
          <div className="space-y-2">
            <label className="block text-[13px] font-semibold text-apple-text">
              프로젝트 이름
              <span className="text-apple-tertiary font-normal ml-1">(선택)</span>
            </label>
            <input
              type="text"
              value={store.projectName}
              onChange={(e) => store.setProjectName(e.target.value)}
              placeholder="my-project"
              className="apple-input"
            />
          </div>

          {/* 비교 방식 — 세그먼트 컨트롤 */}
          <div className="space-y-2">
            <label className="block text-[13px] font-semibold text-apple-text">비교 방식</label>
            <div className="apple-segment">
              {(['branch', 'commit', 'recent'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => store.setCompareType(type)}
                  className={`apple-segment-item ${store.compareType === type ? 'active' : ''}`}
                >
                  {type === 'branch' ? '브랜치' : type === 'commit' ? '커밋' : '최근 N개'}
                </button>
              ))}
            </div>
          </div>

          {/* 브랜치 비교 */}
          {store.compareType === 'branch' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Base 브랜치', value: store.baseBranch, onChange: store.setBaseBranch },
                { label: 'Head 브랜치', value: store.headBranch, onChange: store.setHeadBranch },
              ].map(({ label, value, onChange }) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-[12px] text-apple-secondary font-medium">{label}</label>
                  <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="apple-input"
                  >
                    {store.branches.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* 커밋 비교 */}
          {store.compareType === 'commit' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Base 커밋', value: store.baseCommit, onChange: store.setBaseCommit },
                { label: 'Head 커밋', value: store.headCommit, onChange: store.setHeadCommit },
              ].map(({ label, value, onChange }) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-[12px] text-apple-secondary font-medium">{label}</label>
                  <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="apple-input"
                  >
                    <option value="">선택...</option>
                    {store.commits.map((c) => (
                      <option key={c.hash} value={c.hash}>
                        {c.hash.slice(0, 7)} — {c.message.slice(0, 35)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* 최근 N개 */}
          {store.compareType === 'recent' && (
            <div className="w-44 space-y-1.5">
              <label className="block text-[12px] text-apple-secondary font-medium">최근 커밋 수</label>
              <input
                type="number"
                min={1}
                max={20}
                value={store.recentCount}
                onChange={(e) => store.setRecentCount(parseInt(e.target.value) || 1)}
                className="apple-input"
              />
            </div>
          )}

          {/* 분석 시작 버튼 */}
          <button
            onClick={handleAnalyze}
            disabled={store.isLoading}
            className="w-full py-3 bg-apple-text text-white rounded-apple-lg text-[14px] font-semibold hover:bg-[#2d2d2f] active:scale-[0.99] disabled:opacity-50 transition-all duration-150 flex items-center justify-center gap-2"
          >
            {store.isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {store.loadingMessage}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                분석 시작
              </>
            )}
          </button>
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
    </div>
  )
}
