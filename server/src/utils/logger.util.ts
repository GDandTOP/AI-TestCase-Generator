/**
 * 간단한 레벨별 로거 유틸
 * 출력 형식: [HH:MM:SS.mmm] [LEVEL] [TAG] message
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 23)
}

function format(level: LogLevel, tag: string, message: string, meta?: unknown): string {
  const metaStr = meta !== undefined ? ' ' + JSON.stringify(meta) : ''
  return `[${timestamp()}] [${level}] [${tag}] ${message}${metaStr}`
}

export function createLogger(tag: string) {
  return {
    debug(message: string, meta?: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(format('DEBUG', tag, message, meta))
      }
    },
    info(message: string, meta?: unknown) {
      console.info(format('INFO', tag, message, meta))
    },
    warn(message: string, meta?: unknown) {
      console.warn(format('WARN', tag, message, meta))
    },
    error(message: string, meta?: unknown) {
      if (meta instanceof Error) {
        console.error(format('ERROR', tag, message, { message: meta.message, stack: meta.stack }))
      } else {
        console.error(format('ERROR', tag, message, meta))
      }
    },
  }
}
