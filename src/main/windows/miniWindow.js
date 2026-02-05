/**
 * 小窗口创建模块
 * 用于创建右下角固定大小的业务小窗口
 * 小窗口禁止放大拉伸
 */

import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { windowManager } from './windowManager'
import {
  getCurrentDeviceState,
  getDeviceMicrophoneEnable,
  setDeviceMicrophoneEnable
} from '../services'
import { IPC_CHANNELS } from '../ipc/channels'

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
  VOICE_INPUT: 'mini-voice-input',
  // AI 语音助手
  AI_ASSISTANT: 'mini-ai-assistant',
  // Toast 提示窗口
  TOAST: 'mini-toast'
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
    // 暂时关闭开发者工具，测试是否影响鼠标录音--已确认鼠标录音过程中指针卡死是硬件问题
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
  // 获取屏幕工作区域高度
  const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  const maxWindowHeight = Math.floor(screenHeight * 0.7) // 最高 70% 屏幕高度

  const win = createMiniWindow(MiniWindowType.VOICE_TRANSLATE, '/mini/voice-translate', {
    width: 380,
    height: 420,
    minHeight: 200,
    maxHeight: maxWindowHeight,
    transparent: true, // 透明背景，让页面圆角可见
    hasShadow: false, // 移除窗口阴影，避免方形阴影
    ...options
  })

  // 窗口关闭时检测并关闭麦克风，并广播业务停止消息
  win.on('closed', () => {
    checkAndDisableMicrophone('VoiceTranslate')
    // 广播业务停止消息，解锁主窗口
    windowManager.broadcast(IPC_CHANNELS.BUSINESS.STOP, {
      businessMode: 'voice-translate'
    })
  })

  return win
}

/**
 * 创建语音输入小圆球窗口
 * @param {object} options - 额外配置
 * @returns {BrowserWindow}
 */
export function createVoiceInputWindow(options = {}) {
  const win = createMiniWindow(MiniWindowType.VOICE_INPUT, '/mini/voice-input', {
    width: 80,
    height: 80,
    transparent: true, // 透明背景
    hasShadow: false, // 移除窗口阴影
    // backgroundColor: '#00000000', // 完全透明背景色
    ...options
  })

  // 窗口关闭时检测并关闭麦克风，并广播业务停止消息
  win.on('closed', () => {
    checkAndDisableMicrophone('VoiceInput')
    // 广播业务停止消息，解锁主窗口
    windowManager.broadcast(IPC_CHANNELS.BUSINESS.STOP, {
      businessMode: 'voice-input'
    })
  })

  return win
}

/**
 * 创建 AI 语音助手小窗口
 * @param {object} options - 额外配置
 * @returns {BrowserWindow}
 */
export function createAIAssistantWindow(options = {}) {
  // 获取屏幕工作区域高度
  const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  const maxWindowHeight = Math.floor(screenHeight * 0.6) // 最高 60% 屏幕高度

  const win = createMiniWindow(MiniWindowType.AI_ASSISTANT, '/mini/ai-assistant', {
    width: 380,
    height: 360, // 初始高度
    minHeight: 280,
    maxHeight: maxWindowHeight,
    transparent: true, // 透明背景，让页面圆角可见
    hasShadow: false, // 移除窗口阴影，避免方形阴影
    ...options
  })

  // 窗口关闭时检测并关闭麦克风，并广播业务停止消息
  win.on('closed', () => {
    checkAndDisableMicrophone('AIAssistant')
    // 广播业务停止消息，解锁主窗口
    windowManager.broadcast(IPC_CHANNELS.BUSINESS.STOP, {
      businessMode: 'ai-assistant'
    })
  })

  return win
}

/**
 * 检测并关闭麦克风
 * 在语音业务小窗口关闭时调用，检查麦克风状态，如果开启则关闭
 * @param {string} source - 来源标识（用于日志）
 */
function checkAndDisableMicrophone(source) {
  try {
    const deviceState = getCurrentDeviceState()
    if (!deviceState || !deviceState.deviceId) {
      console.log(`[${source}] 窗口关闭 - 无设备连接，跳过麦克风检测`)
      return
    }

    const deviceId = deviceState.deviceId
    const micStatus = getDeviceMicrophoneEnable(deviceId)
    console.log(`[${source}] 窗口关闭 - 麦克风状态:`, micStatus)

    if (micStatus === true) {
      console.log(`[${source}] 麦克风开启中，执行关闭`)
      setDeviceMicrophoneEnable(deviceId, 0)
      console.log(`[${source}] 麦克风已关闭`)
    } else {
      console.log(`[${source}] 麦克风已关闭或未开启，无需操作`)
    }
  } catch (error) {
    console.error(`[${source}] 检测/关闭麦克风异常:`, error)
  }
}

/**
 * 创建 Toast 提示窗口
 * 屏幕居中显示，完全透明窗口，最上层显示
 * @param {string} message - 提示消息
 * @param {number} duration - 显示时长（毫秒）
 * @returns {BrowserWindow}
 */
export function createToastWindow(message = '', duration = 2000) {
  console.log('[Toast] 创建 Toast 窗口:', message)

  // 如果已有 Toast 窗口，先关闭
  if (windowManager.has(MiniWindowType.TOAST)) {
    const existingWindow = windowManager.get(MiniWindowType.TOAST)
    if (existingWindow && !existingWindow.isDestroyed()) {
      existingWindow.close()
    }
  }

  // 获取屏幕完整尺寸，确保居中
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().bounds
  const windowWidth = 360
  const windowHeight = 100
  const x = Math.floor((screenWidth - windowWidth) / 2)
  const y = Math.floor((screenHeight - windowHeight) / 2)

  console.log('[Toast] 窗口位置:', { x, y, windowWidth, windowHeight })

  const toastWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    focusable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 设置最高层级的置顶
  toastWindow.setAlwaysOnTop(true, 'screen-saver')

  // 注册到窗口管理器
  windowManager.register(MiniWindowType.TOAST, toastWindow)

  // 加载 Toast 页面
  const encodedMessage = encodeURIComponent(message)
  const route = `/mini/toast?message=${encodedMessage}&duration=${duration}`

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    toastWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${route}`)
  } else {
    toastWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: route
    })
  }

  // 页面加载完成后显示（添加延迟确保 Vue 组件渲染完成）
  toastWindow.webContents.once('did-finish-load', () => {
    // 延迟 150ms 确保 Vue 组件完全渲染
    setTimeout(() => {
      console.log('[Toast] 页面渲染完成，显示')
      if (!toastWindow.isDestroyed()) {
        toastWindow.show()
        toastWindow.setAlwaysOnTop(true, 'screen-saver')
      }
    }, 150)
  })

  // 自动关闭
  setTimeout(() => {
    if (toastWindow && !toastWindow.isDestroyed()) {
      console.log('[Toast] 自动关闭')
      toastWindow.close()
    }
  }, duration)

  return toastWindow
}

/**
 * 检查是否有业务窗口正在运行
 * @returns {string|null} 返回正在运行的业务窗口类型，没有则返回 null
 */
export function getRunningBusinessWindow() {
  const businessWindows = [
    MiniWindowType.VOICE_TRANSLATE,
    MiniWindowType.VOICE_INPUT,
    MiniWindowType.AI_ASSISTANT
  ]

  for (const windowType of businessWindows) {
    if (windowManager.has(windowType)) {
      const win = windowManager.get(windowType)
      if (win && !win.isDestroyed()) {
        return windowType
      }
    }
  }

  return null
}

/**
 * 获取业务窗口类型的中文名称
 * @param {string} windowType - 窗口类型
 * @returns {string}
 */
export function getBusinessWindowName(windowType) {
  switch (windowType) {
    case MiniWindowType.VOICE_TRANSLATE:
      return '语音翻译'
    case MiniWindowType.VOICE_INPUT:
      return '语音输入'
    case MiniWindowType.AI_ASSISTANT:
      return 'AI语音助手'
    default:
      return '未知业务'
  }
}
