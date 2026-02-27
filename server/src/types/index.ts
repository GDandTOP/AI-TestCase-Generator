export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface GitDiffRequest {
  repoPath: string
  compareType: 'branch' | 'commit' | 'recent'
  base?: string
  head?: string
  count?: number
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

export interface DiffFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  insertions: number
  deletions: number
}

export interface ImpactAnalysis {
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  affectedAreas: AffectedArea[]
  summary: string
  recommendations: string[]
}

export interface AffectedArea {
  name: string
  risk: 'low' | 'medium' | 'high' | 'critical'
  description: string
  files: string[]
}

export interface TestCase {
  id: string
  title: string
  priority: 'P1' | 'P2' | 'P3'
  preconditions: string[]
  scenario: string
  steps: string[]
  expectedResult: string
  affectedArea: string
}

export interface GenerateTestCaseRequest {
  repoPath: string
  diff: GitDiffResult
  analysis: ImpactAnalysis
  projectName?: string
  compareSummary?: string
}

export interface SaveTestCaseRequest {
  content: string
  projectName?: string
  compareSummary?: string
}
