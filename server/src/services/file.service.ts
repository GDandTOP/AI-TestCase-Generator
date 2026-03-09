import fs from 'fs/promises'
import path from 'path'
import { env } from '../config/env'
import { generateFilename } from '../utils/markdown.util'

export class FileService {
  private outputDir: string

  constructor() {
    this.outputDir = env.OUTPUT_DIR
  }

  async ensureOutputDir(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true })
  }

  async saveMarkdown(content: string, projectName?: string): Promise<string> {
    await this.ensureOutputDir()
    const filename = generateFilename(projectName, 'md')
    const filePath = path.join(this.outputDir, filename)
    await fs.writeFile(filePath, content, 'utf-8')
    return filename
  }

  async savePdf(pdfBuffer: Buffer, projectName?: string): Promise<string> {
    await this.ensureOutputDir()
    const filename = generateFilename(projectName, 'pdf')
    const filePath = path.join(this.outputDir, filename)
    await fs.writeFile(filePath, pdfBuffer)
    return filename
  }

  async getFilePath(filename: string): Promise<string> {
    const resolvedOutput = path.resolve(this.outputDir)
    const filePath = path.join(resolvedOutput, filename)
    // 경로 순회 방지: 최종 경로가 outputDir 내에 있는지 검증
    if (!filePath.startsWith(resolvedOutput + path.sep) && filePath !== resolvedOutput) {
      throw new Error('유효하지 않은 파일 경로입니다')
    }
    await fs.access(filePath)
    return filePath
  }

  async listFiles(): Promise<Array<{ filename: string; size: number; createdAt: Date }>> {
    await this.ensureOutputDir()
    const files = await fs.readdir(this.outputDir)
    const mdFiles = files.filter((f) => f.endsWith('.md') || f.endsWith('.pdf'))

    const result = await Promise.all(
      mdFiles.map(async (filename) => {
        const filePath = path.join(this.outputDir, filename)
        const stat = await fs.stat(filePath)
        return { filename, size: stat.size, createdAt: stat.birthtime }
      })
    )

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}
