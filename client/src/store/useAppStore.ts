import { create } from 'zustand'

export type Step = 1 | 2 | 3

export interface DiffFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  insertions: number
  deletions: number
}

export interface GitDiffResult {
  files: DiffFile[]
  rawDiff: string
  stats: {
    filesChanged: number
    insertions: number
    deletions: number
  }
}

export interface AffectedArea {
  name: string
  risk: 'low' | 'medium' | 'high' | 'critical'
  description: string
  files: string[]
}

export interface ImpactAnalysis {
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  affectedAreas: AffectedArea[]
  summary: string
  recommendations: string[]
}

export interface CommitInfo {
  hash: string
  message: string
  date: string
}

export type ClaudeModelId = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6' | 'claude-opus-4-6'

export interface ClaudeModel {
  id: ClaudeModelId
  name: string
  inputPrice: number
  outputPrice: number
  description: string
  badge: string
}

export const CLAUDE_MODELS: ClaudeModel[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Haiku 4.5',
    inputPrice: 0.80,
    outputPrice: 4,
    description: '빠름 · 저렴',
    badge: '최저가',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Sonnet 4.6',
    inputPrice: 3,
    outputPrice: 15,
    description: '품질 · 가격 균형',
    badge: '추천',
  },
  {
    id: 'claude-opus-4-6',
    name: 'Opus 4.6',
    inputPrice: 15,
    outputPrice: 75,
    description: '최고 품질',
    badge: '최고급',
  },
]

interface AppState {
  // 현재 단계
  currentStep: Step

  // Step 1: Git 설정
  repoSourceType: 'local' | 'github'  // 저장소 입력 방식 (로컬 경로 or GitHub URL)
  githubUrl: string                    // GitHub 저장소 URL
  repoPath: string
  selectedModel: ClaudeModelId
  compareType: 'branch' | 'commit' | 'recent'
  baseBranch: string
  headBranch: string
  baseCommit: string
  headCommit: string
  recentCount: number
  branches: string[]
  commits: CommitInfo[]
  projectName: string

  // Step 2: diff + 분석
  diffResult: GitDiffResult | null
  impactAnalysis: ImpactAnalysis | null

  // Step 3: TC
  tcContent: string
  headerContent: string
  savedFilename: string | null

  // 로딩/에러 상태
  isLoading: boolean
  loadingMessage: string
  error: string | null

  // Actions
  setRepoSourceType: (type: 'local' | 'github') => void
  setGithubUrl: (url: string) => void
  setRepoPath: (path: string) => void
  setSelectedModel: (model: ClaudeModelId) => void
  setCompareType: (type: 'branch' | 'commit' | 'recent') => void
  setBaseBranch: (branch: string) => void
  setHeadBranch: (branch: string) => void
  setBaseCommit: (commit: string) => void
  setHeadCommit: (commit: string) => void
  setRecentCount: (count: number) => void
  setBranches: (branches: string[], commits: CommitInfo[]) => void
  setProjectName: (name: string) => void
  setDiffResult: (diff: GitDiffResult) => void
  setImpactAnalysis: (analysis: ImpactAnalysis) => void
  appendTcContent: (text: string) => void
  setHeaderContent: (header: string) => void
  setTcContent: (content: string) => void
  setSavedFilename: (filename: string) => void
  setLoading: (loading: boolean, message?: string) => void
  setError: (error: string | null) => void
  goToStep: (step: Step) => void
  reset: () => void
}

const initialState = {
  currentStep: 1 as Step,
  repoSourceType: 'local' as const,  // 기본값은 로컬 저장소
  githubUrl: '',
  repoPath: '',
  selectedModel: 'claude-haiku-4-5-20251001' as ClaudeModelId,
  compareType: 'branch' as const,
  baseBranch: '',
  headBranch: '',
  baseCommit: '',
  headCommit: '',
  recentCount: 1,
  branches: [],
  commits: [],
  projectName: '',
  diffResult: null,
  impactAnalysis: null,
  tcContent: '',
  headerContent: '',
  savedFilename: null,
  isLoading: false,
  loadingMessage: '',
  error: null,
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setRepoSourceType: (type) => set({ repoSourceType: type }),
  setGithubUrl: (url) => set({ githubUrl: url }),
  setRepoPath: (path) => set({ repoPath: path }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setCompareType: (type) => set({ compareType: type }),
  setBaseBranch: (branch) => set({ baseBranch: branch }),
  setHeadBranch: (branch) => set({ headBranch: branch }),
  setBaseCommit: (commit) => set({ baseCommit: commit }),
  setHeadCommit: (commit) => set({ headCommit: commit }),
  setRecentCount: (count) => set({ recentCount: count }),
  setBranches: (branches, commits) => set({ branches, commits }),
  setProjectName: (name) => set({ projectName: name }),
  setDiffResult: (diff) => set({ diffResult: diff }),
  setImpactAnalysis: (analysis) => set({ impactAnalysis: analysis }),
  appendTcContent: (text) => set((state) => ({ tcContent: state.tcContent + text })),
  setHeaderContent: (header) => set({ headerContent: header }),
  setTcContent: (content) => set({ tcContent: content }),
  setSavedFilename: (filename) => set({ savedFilename: filename }),
  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),
  setError: (error) => set({ error }),
  goToStep: (step) => set({ currentStep: step, error: null }),
  reset: () => set(initialState),
}))
