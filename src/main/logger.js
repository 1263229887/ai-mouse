/**
 * 文件日志工具模块
 * 将日志写入本地文件，解决控制台中文乱码问题
 */
import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'

// 日志目录和文件路径
let logDir = null
let logFilePath = null

/**
 * 初始化日志系统
 */
function initLogger() {
  // 使用用户数据目录存放日志
  logDir = join(app.getPath('userData'), 'logs')
  
  // 确保日志目录存在
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
  
  // 日志文件名：使用日期
  const date = new Date()
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  logFilePath = join(logDir, `ai-smart-stylus-${dateStr}.log`)
  
  // 写入日志启动标记
  const startMsg = `
${'='.repeat(60)}
[${getTimestamp()}] AI-Mouse 日志系统启动
日志文件路径: ${logFilePath}
${'='.repeat(60)}
`
  
  try {
    appendFileSync(logFilePath, startMsg, { encoding: 'utf8' })
  } catch (err) {
    console.error('初始化日志文件失败:', err)
  }
  
  return logFilePath
}

/**
 * 获取时间戳
 */
function getTimestamp() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ` +
         `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.` +
         `${String(now.getMilliseconds()).padStart(3, '0')}`
}

/**
 * 格式化日志消息
 */
function formatMessage(level, source, message, data) {
  let logLine = `[${getTimestamp()}] [${level}] [${source}] ${message}`
  if (data !== undefined) {
    try {
      if (typeof data === 'object') {
        logLine += ` | ${JSON.stringify(data, null, 0)}`
      } else {
        logLine += ` | ${data}`
      }
    } catch (e) {
      logLine += ` | [无法序列化的数据]`
    }
  }
  return logLine + '\n'
}

/**
 * 写入日志到文件
 */
function writeLog(level, source, message, data) {
  if (!logFilePath) {
    initLogger()
  }
  
  const logLine = formatMessage(level, source, message, data)
  
  try {
    appendFileSync(logFilePath, logLine, { encoding: 'utf8' })
  } catch (err) {
    console.error('写入日志失败:', err)
  }
  
  // 同时输出到控制台（原始消息可能乱码，但日志文件是正确的）
  if (level === 'ERROR') {
    console.error(`[${source}] ${message}`, data !== undefined ? data : '')
  } else {
    console.log(`[${source}] ${message}`, data !== undefined ? data : '')
  }
}

/**
 * 日志 API
 */
const logger = {
  /**
   * 初始化日志系统
   * @returns {string} 日志文件路径
   */
  init: initLogger,
  
  /**
   * 获取日志文件路径
   */
  getLogPath: () => logFilePath,
  
  /**
   * 获取日志目录
   */
  getLogDir: () => logDir,
  
  /**
   * INFO 级别日志
   */
  info: (source, message, data) => {
    writeLog('INFO', source, message, data)
  },
  
  /**
   * DEBUG 级别日志
   */
  debug: (source, message, data) => {
    writeLog('DEBUG', source, message, data)
  },
  
  /**
   * WARN 级别日志
   */
  warn: (source, message, data) => {
    writeLog('WARN', source, message, data)
  },
  
  /**
   * ERROR 级别日志
   */
  error: (source, message, data) => {
    writeLog('ERROR', source, message, data)
  },
  
  /**
   * 记录渲染进程发来的日志
   */
  fromRenderer: (level, source, message, data) => {
    writeLog(level, `Renderer:${source}`, message, data)
  }
}

export default logger
