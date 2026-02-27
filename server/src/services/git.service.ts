import simpleGit, { SimpleGit } from 'simple-git'
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
      const git = simpleGit(repoPath)
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
    return tmpPath
  }

  async getBranches(): Promise<{ current: string; all: string[] }> {
    const result = await this.git.branch(['-a'])
    const all = result.all
      .map((b) => b.replace('remotes/origin/', '').trim())
      .filter((b, i, arr) => arr.indexOf(b) === i)
      .filter((b) => !b.includes('HEAD'))
    return {
      current: result.current,
      all,
    }
  }

  async getDiffByBranch(base: string, head: string): Promise<GitDiffResult> {
    const rawDiff = await this.git.diff([`${base}...${head}`])
    const diffStat = await this.git.diff([`${base}...${head}`, '--stat'])
    return this.parseDiff(rawDiff, diffStat)
  }

  async getDiffByCommit(base: string, head: string): Promise<GitDiffResult> {
    const rawDiff = await this.git.diff([`${base}..${head}`])
    const diffStat = await this.git.diff([`${base}..${head}`, '--stat'])
    return this.parseDiff(rawDiff, diffStat)
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

  private parseDiff(rawDiff: string, diffStat: string): GitDiffResult {
    const files: DiffFile[] = []
    let totalInsertions = 0
    let totalDeletions = 0

    const statLines = diffStat.split('\n').filter((line) => line.includes('|'))
    for (const line of statLines) {
      const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([+-]*)/)
      if (match) {
        const filePath = match[1].trim()
        const changes = match[3] || ''
        const insertions = (changes.match(/\+/g) || []).length
        const deletions = (changes.match(/-/g) || []).length

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
    }

    // diff --stat에서 파일이 파싱 안 된 경우 rawDiff에서 직접 파싱
    if (files.length === 0 && rawDiff) {
      const diffFileRegex = /^diff --git a\/.+ b\/(.+)$/gm
      let match
      while ((match = diffFileRegex.exec(rawDiff)) !== null) {
        const filePath = match[1]
        const ins = (rawDiff.match(new RegExp(`^\\+(?!\\+\\+)`, 'gm')) || []).length
        const del = (rawDiff.match(new RegExp(`^-(?!--)`, 'gm')) || []).length
        files.push({ path: filePath, status: 'modified', insertions: ins, deletions: del })
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
