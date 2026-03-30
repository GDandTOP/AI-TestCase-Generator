import { Request, Response } from 'express'
import { execFile } from 'child_process'
import { GitService } from '../services/git.service'
import { buildProjectContextDocument } from '../services/project-context.service'
import { env } from '../config/env'
import { ApiResponse, GitDiffRequest } from '../types'
import { createLogger } from '../utils/logger.util'

const logger = createLogger('GitController')

/**
 * macOS 네이티브 폴더 선택 다이얼로그를 열고 선택된 경로를 반환합니다.
 * osascript(AppleScript)를 사용하여 Finder 스타일 폴더 선택창을 띄웁니다.
 * macOS 전용입니다. (Windows/Linux에서는 사용 불가)
 */
export async function openFolderDialog(_req: Request, res: Response): Promise<void> {
  logger.info('폴더 선택 다이얼로그 요청', { platform: process.platform })
  if (process.platform !== 'darwin') {
    logger.warn('폴더 선택 다이얼로그 실패: macOS 아님', { platform: process.platform })
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
        // 사용자가 취소하거나 창을 닫은 경우 모두 cancelled로 처리
        logger.info('폴더 선택 다이얼로그: 취소 또는 닫힘', { stderr: stderr?.slice(0, 100) })
        res.json({ success: true, data: { cancelled: true, path: null } } as ApiResponse)
        return
      }

      // stdout에서 개행 문자 제거하여 깨끗한 경로 문자열 반환
      const selectedPath = stdout.trim()
      logger.info('폴더 선택 완료', { selectedPath })
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
    logger.warn('cloneRepo: githubUrl 누락')
    res.status(400).json({ success: false, error: 'GitHub URL을 입력해주세요' } as ApiResponse)
    return
  }

  // 기본적인 GitHub URL 형식 검증
  const isGithubUrl = /^https?:\/\/(www\.)?github\.com\/.+\/.+/.test(githubUrl)
  if (!isGithubUrl) {
    logger.warn('cloneRepo: 유효하지 않은 GitHub URL', { githubUrl })
    res.status(400).json({ success: false, error: '유효한 GitHub URL을 입력해주세요 (예: https://github.com/user/repo)' } as ApiResponse)
    return
  }

  logger.info('GitHub 저장소 클론 시작', { githubUrl })
  try {
    const localPath = await GitService.cloneRepo(githubUrl)
    logger.info('GitHub 저장소 클론 완료', { localPath })
    res.json({ success: true, data: { repoPath: localPath } } as ApiResponse)
  } catch (error) {
    logger.error('GitHub 저장소 클론 실패', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      error: `GitHub 저장소 클론 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}

export async function validateRepo(req: Request, res: Response): Promise<void> {
  const { repoPath } = req.body as { repoPath: string }

  if (!repoPath) {
    logger.warn('validateRepo: repoPath 누락')
    res.status(400).json({ success: false, error: '저장소 경로를 입력해주세요' } as ApiResponse)
    return
  }

  logger.info('저장소 유효성 검사', { repoPath })
  const isValid = await GitService.validateRepo(repoPath)
  if (!isValid) {
    logger.warn('저장소 유효성 검사 실패: 유효하지 않은 Git 저장소', { repoPath })
    res.status(400).json({ success: false, error: '유효하지 않은 Git 저장소입니다' } as ApiResponse)
    return
  }

  logger.info('저장소 유효성 검사 성공', { repoPath })
  res.json({ success: true, data: { repoPath } } as ApiResponse)
}

export async function getBranches(req: Request, res: Response): Promise<void> {
  const { repoPath } = req.body as { repoPath: string }

  if (!repoPath) {
    logger.warn('getBranches: repoPath 누락')
    res.status(400).json({ success: false, error: '저장소 경로를 입력해주세요' } as ApiResponse)
    return
  }

  logger.info('브랜치/커밋 목록 조회 시작', { repoPath })
  try {
    const gitService = new GitService(repoPath)
    const branches = await gitService.getBranches()
    logger.debug('브랜치 목록 조회 완료', { current: branches.current, count: branches.all.length })
    const commits = await gitService.getRecentCommits(20)
    logger.debug('최근 커밋 조회 완료', { count: commits.length })
    // 프로젝트 구조 문서는 한 번만 생성해 두고, 이후 API 호출 시 재사용
    const document = await buildProjectContextDocument(repoPath)
    logger.info('브랜치/커밋/프로젝트 구조 조회 완료', { repoPath, branchCount: branches.all.length, commitCount: commits.length })
    res.json({ success: true, data: { ...branches, commits, projectContextDocument: document } } as ApiResponse)
  } catch (error) {
    logger.error('브랜치 조회 실패', error instanceof Error ? error : { error })
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
    logger.warn('getProjectContext: repoPath 누락')
    res.status(400).json({ success: false, error: '저장소 경로를 입력해주세요' } as ApiResponse)
    return
  }
  logger.info('프로젝트 구조 문서 생성 요청', { repoPath })
  try {
    const document = await buildProjectContextDocument(repoPath)
    logger.info('프로젝트 구조 문서 생성 완료', { repoPath, docLength: document.length })
    res.json({ success: true, data: { document } } as ApiResponse)
  } catch (error) {
    logger.error('프로젝트 구조 문서 생성 실패', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      error: `프로젝트 구조 문서 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}

export async function getDiff(req: Request, res: Response): Promise<void> {
  const body = req.body as GitDiffRequest

  if (!body.repoPath) {
    logger.warn('getDiff: repoPath 누락')
    res.status(400).json({ success: false, error: '저장소 경로를 입력해주세요' } as ApiResponse)
    return
  }

  logger.info('diff 추출 시작', { repoPath: body.repoPath, compareType: body.compareType, base: body.base, head: body.head, count: body.count })

  try {
    const gitService = new GitService(body.repoPath)
    let diffResult

    switch (body.compareType) {
      case 'branch':
        if (!body.base || !body.head) {
          logger.warn('getDiff: 브랜치 미선택')
          res.status(400).json({ success: false, error: '비교할 브랜치를 선택해주세요' } as ApiResponse)
          return
        }
        logger.debug('브랜치 비교 diff 추출', { base: body.base, head: body.head })
        diffResult = await gitService.getDiffByBranch(body.base, body.head)
        break

      case 'commit':
        if (!body.base || !body.head) {
          logger.warn('getDiff: 커밋 미선택')
          res.status(400).json({ success: false, error: '비교할 커밋을 선택해주세요' } as ApiResponse)
          return
        }
        logger.debug('커밋 비교 diff 추출', { base: body.base, head: body.head })
        diffResult = await gitService.getDiffByCommit(body.base, body.head)
        break

      case 'recent':
        logger.debug('최근 커밋 diff 추출', { count: body.count || 1 })
        diffResult = await gitService.getDiffByRecentCommits(body.count || 1)
        break

      default:
        logger.warn('getDiff: 유효하지 않은 compareType', { compareType: body.compareType })
        res.status(400).json({ success: false, error: '유효하지 않은 비교 방식입니다' } as ApiResponse)
        return
    }

    // diff 크기 제한
    const originalSize = diffResult.rawDiff.length
    if (originalSize > env.MAX_DIFF_SIZE) {
      logger.warn('diff 크기 초과 → 잘림 처리', { originalSize, maxSize: env.MAX_DIFF_SIZE })
      diffResult.rawDiff = diffResult.rawDiff.slice(0, env.MAX_DIFF_SIZE) + '\n\n... (diff가 너무 커서 잘렸습니다)'
    }

    logger.info('diff 추출 완료', {
      filesChanged: diffResult.stats.filesChanged,
      insertions: diffResult.stats.insertions,
      deletions: diffResult.stats.deletions,
      rawDiffSize: diffResult.rawDiff.length,
    })
    res.json({ success: true, data: diffResult } as ApiResponse)
  } catch (error) {
    logger.error('diff 추출 실패', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      error: `diff 추출 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    } as ApiResponse)
  }
}
