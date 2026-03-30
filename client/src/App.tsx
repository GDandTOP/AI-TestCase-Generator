import { useAppStore } from './store/useAppStore'
import GitConfig from './components/GitConfig/GitConfig'
import Analysis from './components/Analysis/Analysis'
import TestCase from './components/TestCase/TestCase'

const STEPS = [
  { number: 1, label: '저장소 설정' },
  { number: 2, label: '영향도 분석' },
  { number: 3, label: '테스트케이스 산출' },
]


function StepIndicator() {
  const { currentStep } = useAppStore()

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center gap-2">
            {/* 스텝 원형 아이콘 */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
              currentStep > step.number
                ? 'bg-apple-green text-white'
                : currentStep === step.number
                ? 'bg-apple-blue text-white ring-4 ring-apple-blue/[0.15]'
                : 'bg-[rgba(0,0,0,0.06)] text-apple-tertiary'
            }`}>
              {currentStep > step.number
                ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                : step.number
              }
            </div>
            {/* 라벨 */}
            <span className={`text-[13px] font-medium transition-colors duration-300 ${
              currentStep === step.number
                ? 'text-apple-text'
                : currentStep > step.number
                ? 'text-apple-secondary'
                : 'text-apple-tertiary'
            }`}>
              {step.label}
            </span>
          </div>

          {/* 연결선 */}
          {index < STEPS.length - 1 && (
            <div className={`w-10 h-px mx-3 transition-colors duration-500 ${
              currentStep > step.number ? 'bg-apple-green' : 'bg-[rgba(0,0,0,0.08)]'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const { currentStep } = useAppStore()
  const store = useAppStore()

  return (
    <div className="min-h-screen bg-apple-bg font-sans">

      {/* 헤더 — 프로스티드 글래스 */}
      <header className="sticky top-0 z-50 bg-white/[0.82] backdrop-blur-apple border-b border-[rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto px-6 h-[52px] flex items-center justify-between">
          <button
            onClick={() => store.reset()}
            className="flex items-center gap-2.5 hover:opacity-75 active:opacity-50 transition-opacity duration-150"
          >
            <div className="w-7 h-7 bg-apple-blue rounded-[8px] flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-apple-text tracking-[-0.01em]">AI Testcase Generator</span>
          </button>

          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-apple-green"></div>
            <span className="text-[12px] text-apple-secondary">AI Mode</span>
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-2xl mx-auto px-6 py-10">
        <StepIndicator />

        <div className="bg-white rounded-apple-xl border border-[rgba(0,0,0,0.07)] shadow-apple overflow-hidden animate-fade-in">
          <div className="p-8">
            {currentStep === 1 && <GitConfig />}
            {currentStep === 2 && <Analysis />}
            {currentStep === 3 && <TestCase />}
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="text-center text-[11px] text-apple-tertiary py-6 tracking-wide">
        TestPlanner — Git diff를 AI로 분석하여 QA 테스트케이스 자동 생성
      </footer>
    </div>
  )
}
