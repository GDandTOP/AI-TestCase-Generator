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
    const filename = generateFilename(projectName)
    const filePath = path.join(this.outputDir, filename)
    await fs.writeFile(filePath, content, 'utf-8')
    return filename
  }

  async getFilePath(filename: string): Promise<string> {
    const filePath = path.join(this.outputDir, filename)
    await fs.access(filePath)
    return filePath
  }

  async listFiles(): Promise<Array<{ filename: string; size: number; createdAt: Date }>> {
    await this.ensureOutputDir()
    const files = await fs.readdir(this.outputDir)
    const mdFiles = files.filter((f) => f.endsWith('.md'))

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
