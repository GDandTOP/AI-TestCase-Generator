import simpleGit, { SimpleGit } from 'simple-git'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { GitDiffResult, DiffFile } from '../types'

export class GitService {
  private git: SimpleGit

  constructor(repoPath: string) {
    this.git = simpleGit(repoPath)
  }

  static async validateRepo(repoPath: string): Promise<boolean> {
    try {
      if (!path.isAbsolute(repoPath)) return false
      const realPath = await fs.realpath(repoPath)
      const stat = await fs.stat(realPath)
      if (!stat.isDirectory()) return false
      const git = simpleGit(realPath)
      await git.status()
      return true
    } catch {
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
    const git = simpleGit()
    await git.clone(githubUrl, tmpPath, ['--depth', '50'])
    // 2시간 후 임시 디렉토리 자동 정리
    setTimeout(() => GitService.cleanupPath(tmpPath), 2 * 60 * 60 * 1000)
    return tmpPath
  }

  static async cleanupPath(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true })
    } catch {
      // 정리 실패는 무시
    }
  }

  async getBranches(): Promise<{ current: string; all: string[] }> {
    const result = await this.git.branch(['-a'])
    const all = result.all
      .filter((b) => !b.includes('HEAD'))
      .map((b) => b.replace(/^remotes\/origin\//, '').trim())
      .filter((v, i, a) => a.indexOf(v) === i)
    return {
      current: result.current,
      all,
    }
  }

  async getDiffByBranch(base: string, head: string): Promise<GitDiffResult> {
    const rawDiff = await this.git.diff([`${base}...${head}`])
    const numStat = await this.git.diff([`${base}...${head}`, '--numstat'])
    return this.parseDiff(rawDiff, numStat)
  }

  async getDiffByCommit(base: string, head: string): Promise<GitDiffResult> {
    const rawDiff = await this.git.diff([`${base}..${head}`])
    const numStat = await this.git.diff([`${base}..${head}`, '--numstat'])
    return this.parseDiff(rawDiff, numStat)
  }

  async getDiffByRecentCommits(count: number): Promise<GitDiffResult> {
    const log = await this.git.log({ maxCount: count + 1 })
    if (log.all.length < 2) {
      throw new Error('비교할 커밋이 충분하지 않습니다')
    }
    const head = log.all[0].hash
    const base = log.all[count - 1]?.hash || log.all[log.all.length - 1].hash
    return this.getDiffByCommit(base, head)
  }

  async getRecentCommits(count: number = 10): Promise<Array<{ hash: string; message: string; date: string }>> {
    const log = await this.git.log({ maxCount: count })
    return log.all.map((commit) => ({
      hash: commit.hash.slice(0, 7),
      message: commit.message,
      date: commit.date,
    }))
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
