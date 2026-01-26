/**
 * 小窗口创建模块
 * 用于创建右下角固定大小的业务小窗口
 * 小窗口禁止放大拉伸
 */

import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { windowManager } from './windowManager'

/**
 * 小窗口类型枚举
 */
export const MiniWindowType = {
  // 业务类型1（预留）
  BUSINESS_A: 'mini-business-a',
  // 业务类型2（预留）
  BUSINESS_B: 'mini-business-b',
  // 业务类型3（预留）
  BUSINESS_C: 'mini-business-c',
  // 语音翻译
  VOICE_TRANSLATE: 'mini-voice-translate',
  // 语音输入
  VOICE_INPUT: 'mini-voice-input'
}

/**
 * 小窗口默认配置
 */
const DEFAULT_MINI_CONFIG = {
  width: 360,
  height: 480,
  resizable: false, // 禁止拉伸
  minimizable: false,
  maximizable: false, // 禁止最大化
  alwaysOnTop: true, // 始终置顶
  skipTaskbar: true, // 不显示在任务栏
  frame: false, // 无边框
  transparent: false,
  autoHideMenuBar: true
}

/**
 * 获取右下角位置
 * @param {number} width - 窗口宽度
 * @param {number} height - 窗口高度
 * @param {number} margin - 边距
 * @returns {{ x: number, y: number }}
 */
function getBottomRightPosition(width, height, margin = 16) {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  return {
    x: screenWidth - width - margin,
    y: screenHeight - height - margin
  }
}

/**
 * 创建小窗口
 * @param {string} type - 窗口类型，使用 MiniWindowType 枚举
 * @param {string} route - 路由路径（如 '/mini/business-a'）
 * @param {object} options - 额外配置选项
 * @returns {BrowserWindow}
 */
export function createMiniWindow(type, route, options = {}) {
  // 如果该类型窗口已存在，直接返回并聚焦
  if (windowManager.has(type)) {
    const existingWindow = windowManager.get(type)
    existingWindow.focus()
    return existingWindow
  }

  const config = {
    ...DEFAULT_MINI_CONFIG,
    ...options,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      ...options.webPreferences
    }
  }

  // 计算右下角位置
  const position = getBottomRightPosition(config.width, config.height)

  const miniWindow = new BrowserWindow({
    ...config,
    x: position.x,
    y: position.y,
    show: false
  })

  // 注册到窗口管理器
  windowManager.register(type, miniWindow)

  miniWindow.on('ready-to-show', () => {
    miniWindow.show()
    // 开发环境下自动打开开发者工具
    if (is.dev) {
      miniWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // 加载页面（带路由）
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    miniWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${route}`)
  } else {
    miniWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: route
    })
  }

  return miniWindow
}

/**
 * 创建业务A小窗口
 * @param {object} options - 额外配置
 * @returns {BrowserWindow}
 */
export function createBusinessAWindow(options = {}) {
  return createMiniWindow(MiniWindowType.BUSINESS_A, '/mini/business-a', options)
}

/**
 * 创建业务B小窗口
 * @param {object} options - 额外配置
 * @returns {BrowserWindow}
 */
export function createBusinessBWindow(options = {}) {
  return createMiniWindow(MiniWindowType.BUSINESS_B, '/mini/business-b', options)
}

/**
 * 创建业务C小窗口
 * @param {object} options - 额外配置
 * @returns {BrowserWindow}
 */
export function createBusinessCWindow(options = {}) {
  return createMiniWindow(MiniWindowType.BUSINESS_C, '/mini/business-c', options)
}

/**
 * 创建语音翻译小窗口
 * @param {object} options - 额外配置
 * @returns {BrowserWindow}
 */
export function createVoiceTranslateWindow(options = {}) {
  return createMiniWindow(MiniWindowType.VOICE_TRANSLATE, '/mini/voice-translate', {
    width: 380,
    height: 420,
    minHeight: 200,
    maxHeight: 600,
    ...options
  })
}

/**
 * 创建语音输入小圆球窗口
 * @param {object} options - 额外配置
 * @returns {BrowserWindow}
 */
export function createVoiceInputWindow(options = {}) {
  return createMiniWindow(MiniWindowType.VOICE_INPUT, '/mini/voice-input', {
    width: 80,
    height: 80,
    transparent: true, // 透明背景
    hasShadow: false, // 移除窗口阴影
    backgroundColor: '#00000000', // 完全透明背景色
    ...options
  })
}
