import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || '알 수 없는 오류가 발생했습니다'
    return Promise.reject(new Error(message))
  }
)

export default apiClient

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export async function validateRepo(repoPath: string): Promise<void> {
  const res = await apiClient.post<ApiResponse>('/git/validate', { repoPath })
  if (!res.data.success) throw new Error(res.data.error)
}

/**
 * 서버에서 macOS 네이티브 폴더 선택 다이얼로그를 띄우고 선택된 경로를 반환합니다.
 * 사용자가 취소하면 null을 반환합니다.
 */
export async function openFolderDialog(): Promise<string | null> {
  const res = await apiClient.get<ApiResponse<{ cancelled: boolean; path: string | null }>>('/git/open-folder')
  if (!res.data.success) throw new Error(res.data.error)
  const { cancelled, path } = res.data.data!
  return cancelled ? null : path
}

/**
 * GitHub URL을 서버에 전달하여 임시 디렉토리에 클론하고 로컬 경로를 반환합니다.
 * @param githubUrl - 클론할 GitHub 저장소 URL (예: https://github.com/user/repo)
 * @returns 서버 측 임시 디렉토리 경로
 */
export async function cloneRepo(githubUrl: string): Promise<string> {
  const res = await apiClient.post<ApiResponse<{ repoPath: string }>>('/git/clone', { githubUrl })
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data!.repoPath
}

export async function getBranches(repoPath: string) {
  const res = await apiClient.post<
    ApiResponse<{
      current: string
      all: string[]
      commits: Array<{ hash: string; message: string; date: string }>
      projectContextDocument?: string
    }>
  >('/git/branches', { repoPath })
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data!
}

export async function getDiff(payload: {
  repoPath: string
  compareType: 'branch' | 'commit' | 'recent'
  base?: string
  head?: string
  count?: number
}) {
  const res = await apiClient.post<ApiResponse>('/git/diff', payload)
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data
}

export async function analyzeImpact(diff: unknown, model?: string, projectContextDocument?: string) {
  const res = await apiClient.post<ApiResponse>('/analysis/impact', {
    diff,
    model,
    projectContextDocument: projectContextDocument || undefined,
  })
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data
}

export async function saveTestCase(payload: {
  content: string
  diff: unknown
  analysis: unknown
  projectName?: string
  compareSummary?: string
}) {
  const res = await apiClient.post<ApiResponse<{ filename: string }>>('/testcase/save', payload)
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data!
}

export async function savePdfTestCase(payload: {
  content: string
  diff: unknown
  analysis: unknown
  projectName?: string
  compareSummary?: string
}) {
  const res = await apiClient.post<ApiResponse<{ filename: string }>>('/testcase/save-pdf', payload, {
    timeout: 120000, // PDF 변환은 시간이 걸릴 수 있음
  })
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data!
}
