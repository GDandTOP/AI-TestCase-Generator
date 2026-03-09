import { Request, Response } from 'express'
import { execFile } from 'child_process'
import { GitService } from '../services/git.service'
import { buildProjectContextDocument } from '../services/project-context.service'
import { env } from '../config/env'
import { ApiResponse, GitDiffRequest } from '../types'

/**
 * macOS 네이티브 폴더 선택 다이얼로그를 열고 선택된 경로를 반환합니다.
 * osascript(AppleScript)를 사용하여 Finder 스타일 폴더 선택창을 띄웁니다.
 * macOS 전용입니다. (Windows/Linux에서는 사용 불가)
 */
export async function openFolderDialog(_req: Request, res: Response): Promise<void> {
  if (process.platform !== 'darwin') {
    res.status(400).json({
      success: false,
      error: '폴더 선택 다이얼로그는 macOS 환경에서만 지원됩니다',
    } as ApiResponse)
    return
  }

  // execFile 사용으로 쉘 인젝션 방지 (exec과 달리 쉘을 거치지 않음)
  execFile(
    'osascript',
    ['-e', 'POSIX path of (choose folder with prompt "Git 저장소 폴더를 선택하세요")'],
    (error, stdout, stderr) => {
      if (error) {
        // 사용자가 취소 버튼을 누른 경우
        if (stderr.includes('User canceled') || stderr.includes('cancel')) {
          res.json({ success: true, data: { cancelled: true, path: null } } as ApiResponse)
        } else {
          res.status(500).json({
            success: false,
            error: '폴더 선택 다이얼로그를 열 수 없습니다. macOS 환경인지 확인하세요.',
          } as ApiResponse)
        }
        return
      }

      // stdout에서 개행 문자 제거하여 깨끗한 경로 문자열 반환
      const selectedPath = stdout.trim()
      res.json({ success: true, data: { cancelled: false, path: selectedPath } } as ApiResponse)
    }
  )
}

/**
 * GitHub URL을 받아 임시 디렉토리에 클론하고 로컬 경로를 반환합니다.
 * shallow clone(--depth 50)으로 빠르게 받아옵니다.
 */
export async function cloneRepo(req: Request, res: Response): Promise<void> {
  const { githubUrl } = req.body as { githubUrl: string }

  if (!githubUrl) {
    res.status(400).json({ success: false, error: 'GitHub URL을 입력해주세요' } as ApiResponse)
    return
  }

  // 기본적인 GitHub URL 형식 검증
  const isGithubUrl = /^https?:\/\/(www\.)?github\.com\/.+\/.+/.test(githubUrl)
  if (!isGithubUrl) {
    res.status(400).json({ success: false, error: '유효한 GitHub URL을 입력해주세요 (예: https://github.com/user/repo)' } as ApiResponse)
    return
  }

  try {
    const localPath = await GitService.cloneRepo(githubUrl)
    res.json({ success: true, data: { repoPath: localPath } } as ApiResponse)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `GitHub 저장소 클론 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}

export async function validateRepo(req: Request, res: Response): Promise<void> {
  const { repoPath } = req.body as { repoPath: string }

  if (!repoPath) {
    res.status(400).json({ success: false, error: '저장소 경로를 입력해주세요' } as ApiResponse)
    return
  }

  const isValid = await GitService.validateRepo(repoPath)
  if (!isValid) {
    res.status(400).json({ success: false, error: '유효하지 않은 Git 저장소입니다' } as ApiResponse)
    return
  }

  res.json({ success: true, data: { repoPath } } as ApiResponse)
}

export async function getBranches(req: Request, res: Response): Promise<void> {
  const { repoPath } = req.body as { repoPath: string }

  if (!repoPath) {
    res.status(400).json({ success: false, error: '저장소 경로를 입력해주세요' } as ApiResponse)
    return
  }

  try {
    const gitService = new GitService(repoPath)
    const branches = await gitService.getBranches()
    const commits = await gitService.getRecentCommits(20)
    // 프로젝트 구조 문서는 한 번만 생성해 두고, 이후 API 호출 시 재사용
    const document = await buildProjectContextDocument(repoPath)
    res.json({ success: true, data: { ...branches, commits, projectContextDocument: document } } as ApiResponse)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `브랜치 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}

/**
 * 저장소 경로로 프로젝트 구조 문서만 따로 요청할 때 사용 (선택).
 * 현재는 getBranches 응답에 projectContextDocument를 포함해 한 번에 내려줍니다.
 */
export async function getProjectContext(req: Request, res: Response): Promise<void> {
  const { repoPath } = req.body as { repoPath: string }
  if (!repoPath) {
    res.status(400).json({ success: false, error: '저장소 경로를 입력해주세요' } as ApiResponse)
    return
  }
  try {
    const document = await buildProjectContextDocument(repoPath)
    res.json({ success: true, data: { document } } as ApiResponse)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `프로젝트 구조 문서 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}

export async function getDiff(req: Request, res: Response): Promise<void> {
  const body = req.body as GitDiffRequest

  if (!body.repoPath) {
    res.status(400).json({ success: false, error: '저장소 경로를 입력해주세요' } as ApiResponse)
    return
  }

  try {
    const gitService = new GitService(body.repoPath)
    let diffResult

    switch (body.compareType) {
      case 'branch':
        if (!body.base || !body.head) {
          res.status(400).json({ success: false, error: '비교할 브랜치를 선택해주세요' } as ApiResponse)
          return
        }
        diffResult = await gitService.getDiffByBranch(body.base, body.head)
        break

      case 'commit':
        if (!body.base || !body.head) {
          res.status(400).json({ success: false, error: '비교할 커밋을 선택해주세요' } as ApiResponse)
          return
        }
        diffResult = await gitService.getDiffByCommit(body.base, body.head)
        break

      case 'recent':
        diffResult = await gitService.getDiffByRecentCommits(body.count || 1)
        break

      default:
        res.status(400).json({ success: false, error: '유효하지 않은 비교 방식입니다' } as ApiResponse)
        return
    }

    // diff 크기 제한
    if (diffResult.rawDiff.length > env.MAX_DIFF_SIZE) {
      diffResult.rawDiff = diffResult.rawDiff.slice(0, env.MAX_DIFF_SIZE) + '\n\n... (diff가 너무 커서 잘렸습니다)'
    }

    res.json({ success: true, data: diffResult } as ApiResponse)
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `diff 추출 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}
