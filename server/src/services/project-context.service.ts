import fs from 'fs/promises'
import path from 'path'

/** README 등 텍스트 최대 길이 (토큰 절약) */
const MAX_README_CHARS = 3000
/** 디렉터리 트리 최대 깊이 */
const MAX_TREE_DEPTH = 2
/** 캐시 TTL: 5분 */
const CACHE_TTL_MS = 5 * 60 * 1000
/** 빌드/패키지 관련 디렉토리 제외 목록 */
const EXCLUDED_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', '.nuxt', 'out', '.cache',
  'coverage', '.nyc_output', '__pycache__', '.venv', 'venv', '.idea', '.vscode',
])

const contextCache = new Map<string, { doc: string; timestamp: number }>()

/**
 * 저장소 루트에서 '프로젝트 구조' 문서를 생성합니다 (5분 캐시).
 * AI가 프로젝트 종류·스택·구조를 알 수 있도록 package.json, 디렉터리 트리, README 요약을 합칩니다.
 */
export async function buildProjectContextDocument(repoPath: string): Promise<string> {
  const cached = contextCache.get(repoPath)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.doc
  }
  const sections: string[] = []

  // 1) 루트 package.json
  const pkgPath = path.join(repoPath, 'package.json')
  try {
    const raw = await fs.readFile(pkgPath, 'utf-8')
    const pkg = JSON.parse(raw) as Record<string, unknown>
    const name = pkg.name ?? '(이름 없음)'
    const scripts = pkg.scripts as Record<string, string> | undefined
    const deps = pkg.dependencies as Record<string, string> | undefined
    const devDeps = pkg.devDependencies as Record<string, string> | undefined
    const workspaces = pkg.workspaces as string[] | undefined

    let pkgSection = `## 프로젝트 (package.json)\n- name: ${name}\n`
    if (workspaces?.length) pkgSection += `- workspaces: ${workspaces.join(', ')}\n`
    if (scripts && Object.keys(scripts).length) {
      pkgSection += `- scripts: ${Object.keys(scripts).join(', ')}\n`
    }
    if (deps && Object.keys(deps).length) {
      pkgSection += `- dependencies: ${Object.keys(deps).slice(0, 20).join(', ')}${Object.keys(deps).length > 20 ? ' ...' : ''}\n`
    }
    if (devDeps && Object.keys(devDeps).length) {
      pkgSection += `- devDependencies: ${Object.keys(devDeps).slice(0, 15).join(', ')}${Object.keys(devDeps).length > 15 ? ' ...' : ''}\n`
    }
    sections.push(pkgSection)
  } catch {
    sections.push('## 프로젝트 (package.json)\n- (없음 또는 읽기 실패)\n')
  }

  // 2) 디렉터리 구조 (최대 2단계)
  try {
    const tree = await listDirTree(repoPath, '', MAX_TREE_DEPTH)
    sections.push('## 디렉터리 구조\n```\n' + tree + '\n```')
  } catch {
    sections.push('## 디렉터리 구조\n- (읽기 실패)\n')
  }

  // 3) README 앞부분
  for (const name of ['README.md', 'README.MD', 'readme.md']) {
    const readmePath = path.join(repoPath, name)
    try {
      const content = await fs.readFile(readmePath, 'utf-8')
      const excerpt = content.slice(0, MAX_README_CHARS)
      if (excerpt.trim()) {
        sections.push('## README (앞부분)\n' + excerpt + (content.length > MAX_README_CHARS ? '\n...' : ''))
      }
      break
    } catch {
      continue
    }
  }

  const doc = '# 프로젝트 구조 문서 (AI용 참고)\n\n' + sections.join('\n\n')
  contextCache.set(repoPath, { doc, timestamp: Date.now() })
  return doc
}

async function listDirTree(dirPath: string, prefix: string, depth: number): Promise<string> {
  if (depth <= 0) return ''
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && !EXCLUDED_DIRS.has(e.name))
  const files = entries.filter((e) => e.isFile() && !e.name.startsWith('.'))

  const lines: string[] = []
  const all = [...dirs, ...files].slice(0, 40)
  for (let i = 0; i < all.length; i++) {
    const isLast = i === all.length - 1
    const branch = isLast ? '└── ' : '├── '
    const name = all[i].name
    lines.push(prefix + branch + name)
    if (all[i].isDirectory() && depth > 1) {
      const nextPrefix = prefix + (isLast ? '    ' : '│   ')
      const subPath = path.join(dirPath, name)
      const subTree = await listDirTree(subPath, nextPrefix, depth - 1)
      if (subTree) lines.push(subTree)
    }
  }
  return lines.join('\n')
}
