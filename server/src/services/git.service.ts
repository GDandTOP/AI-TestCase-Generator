import simpleGit, { SimpleGit } from 'simple-git'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { GitDiffResult, DiffFile } from '../types'
import { createLogger } from '../utils/logger.util'

const logger = createLogger('GitService')

export class GitService {
  private git: SimpleGit

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath)
  }

  static async validateRepo(repoPath: string): Promise<boolean> {
    logger.debug('저장소 유효성 검사', { repoPath })
    try {
      if (!path.isAbsolute(repoPath)) {
        logger.debug('저장소 유효성 검사 실패: 절대 경로 아님', { repoPath })
        return false
      }
      const realPath = await fs.realpath(repoPath)
      const stat = await fs.stat(realPath)
      if (!stat.isDirectory()) {
        logger.debug('저장소 유효성 검사 실패: 디렉토리 아님', { realPath })
        return false
      }
      const git = simpleGit(realPath)
      await git.status()
      logger.debug('저장소 유효성 검사 성공', { realPath })
      return true
    } catch (error) {
      logger.debug('저장소 유효성 검사 실패 (git status 오류)', { repoPath, error: error instanceof Error ? error.message : error })
      return false
    }
  }

  static async cloneRepo(githubUrl: string): Promise<string> {
    const repoName = githubUrl
      .replace(/\.git$/, '')
      .split('/')
      .slice(-2)
      .join('-')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
    const tmpPath = path.join(os.tmpdir(), `testplanner-${repoName}-${Date.now()}`)
    logger.info('저장소 클론 시작', { githubUrl, tmpPath })
    const git = simpleGit()
    await git.clone(githubUrl, tmpPath, ['--depth', '50'])
    logger.info('저장소 클론 완료', { tmpPath })
    // 2시간 후 임시 디렉토리 자동 정리
    setTimeout(() => GitService.cleanupPath(tmpPath), 2 * 60 * 60 * 1000)
    return tmpPath
  }

  static async cleanupPath(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true })
      logger.info('임시 디렉토리 정리 완료', { dirPath })
    } catch (error) {
      logger.warn('임시 디렉토리 정리 실패 (무시됨)', { dirPath, error: error instanceof Error ? error.message : error })
    }
  }

  async getBranches(): Promise<{ current: string; all: string[] }> {
    logger.debug('브랜치 목록 조회')
    const result = await this.git.branch(['-a'])
    const all = result.all
      .filter((b) => !b.includes('HEAD'))
      .map((b) => b.replace(/^remotes\/origin\//, '').trim())
      .filter((v, i, a) => a.indexOf(v) === i)
    logger.debug('브랜치 목록 조회 완료', { current: result.current, count: all.length })
    return {
      current: result.current,
      all,
    }
  }

  async getDiffByBranch(base: string, head: string): Promise<GitDiffResult> {
    logger.info('브랜치 비교 diff 추출', { base, head })
    const rawDiff = await this.git.diff([`${base}...${head}`])
    const numStat = await this.git.diff([`${base}...${head}`, '--numstat'])
    const result = this.parseDiff(rawDiff, numStat)
    logger.info('브랜치 비교 diff 완료', { base, head, filesChanged: result.stats.filesChanged })
    return result
  }

  async getDiffByCommit(base: string, head: string): Promise<GitDiffResult> {
    logger.info('커밋 비교 diff 추출', { base, head })
    const rawDiff = await this.git.diff([`${base}..${head}`])
    const numStat = await this.git.diff([`${base}..${head}`, '--numstat'])
    const result = this.parseDiff(rawDiff, numStat)
    logger.info('커밋 비교 diff 완료', { base, head, filesChanged: result.stats.filesChanged })
    return result
  }

  async getDiffByRecentCommits(count: number): Promise<GitDiffResult> {
    logger.info('최근 커밋 diff 추출', { count })
    const log = await this.git.log({ maxCount: count + 1 })
    if (log.all.length < 2) {
      logger.warn('최근 커밋 diff 실패: 커밋 부족', { logCount: log.all.length })
      throw new Error('비교할 커밋이 충분하지 않습니다')
    }
    const head = log.all[0].hash
    const base = log.all[count - 1]?.hash || log.all[log.all.length - 1].hash
    logger.debug('최근 커밋 범위 결정', { base: base.slice(0, 7), head: head.slice(0, 7) })
    return this.getDiffByCommit(base, head)
  }

  async getRecentCommits(count: number = 10): Promise<Array<{ hash: string; message: string; date: string }>> {
    logger.debug('최근 커밋 목록 조회', { count })
    const log = await this.git.log({ maxCount: count })
    const commits = log.all.map((commit) => ({
      hash: commit.hash.slice(0, 7),
      message: commit.message,
      date: commit.date,
    }))
    logger.debug('최근 커밋 목록 조회 완료', { count: commits.length })
    return commits
  }

  /**
   * --numstat 출력 파싱 (형식: <insertions>\t<deletions>\t<filepath>)
   * --stat보다 안정적 (파일명에 특수문자가 있어도 정확히 파싱됨)
   */
  private parseDiff(rawDiff: string, numStat: string): GitDiffResult {
    const files: DiffFile[] = []
    let totalInsertions = 0
    let totalDeletions = 0

    const statLines = numStat.split('\n').filter((line) => line.trim())
    for (const line of statLines) {
      // 형식: <insertions>\t<deletions>\t<filepath>
      // 바이너리 파일은 -\t-\t<filepath>
      const match = line.match(/^(-|\d+)\t(-|\d+)\t(.+)$/)
      if (!match) continue

      const insertions = match[1] === '-' ? 0 : parseInt(match[1], 10)
      const deletions = match[2] === '-' ? 0 : parseInt(match[2], 10)
      const filePath = match[3].trim()

      let status: DiffFile['status'] = 'modified'
      if (rawDiff.includes(`new file mode`) && rawDiff.includes(`+++ b/${filePath}`)) {
        status = 'added'
      } else if (rawDiff.includes(`deleted file mode`) && rawDiff.includes(`--- a/${filePath}`)) {
        status = 'deleted'
      }

      files.push({ path: filePath, status, insertions, deletions })
      totalInsertions += insertions
      totalDeletions += deletions
    }

    // numstat에서 파일이 파싱 안 된 경우 rawDiff에서 직접 파싱
    if (files.length === 0 && rawDiff) {
      const diffFileRegex = /^diff --git a\/.+ b\/(.+)$/gm
      let match
      while ((match = diffFileRegex.exec(rawDiff)) !== null) {
        files.push({ path: match[1], status: 'modified', insertions: 0, deletions: 0 })
      }
    }

    return {
      files,
      rawDiff,
      stats: {
        filesChanged: files.length,
        insertions: totalInsertions,
        deletions: totalDeletions,
      },
    }
  }
}
