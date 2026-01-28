/**
 * 主进程入口
 */

import { app, BrowserWindow, nativeImage } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './windows'
import { registerAllHandlers, shutdownSDK, initDeviceSDK } from './ipc'
import { setupUpdater, getIsUpdating } from './services'
import icon from '../../resources/icon.png?asset'

// SDK 清理延迟时间（毫秒）
const SDK_CLEANUP_DELAY = 1500

// 是否正在执行优雅退出
let isGracefullyQuitting = false

// SDK 是否已初始化（防止刷新页面时重复初始化）
let isSDKInitialized = false

/**
 * 优雅退出应用
 * 先隐藏窗口（用户无感），然后异步清理 SDK，最后退出
 */
async function gracefulQuit() {
  if (isGracefullyQuitting) return
  isGracefullyQuitting = true

  console.log('[Main] Starting graceful quit...')

  // 1. 立即隐藏所有窗口（用户无感）
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    try {
      win.hide()
    } catch {
      /* ignore */
    }
  })
  console.log('[Main] Windows hidden')

  // 2. 关闭 SDK
  console.log('[Main] Closing SDK...')
  try {
    shutdownSDK()
  } catch (error) {
    console.error('[Main] SDK shutdown error:', error)
  }

  // 3. 等待 SDK 内部清理完成
  console.log(`[Main] Waiting ${SDK_CLEANUP_DELAY}ms for SDK cleanup...`)
  await new Promise((resolve) => setTimeout(resolve, SDK_CLEANUP_DELAY))

  // 4. 真正退出
  console.log('[Main] Exiting application')
  app.exit(0)
}

// 应用就绪后初始化
app.whenReady().then(() => {
  // 设置应用 ID (Windows)
  electronApp.setAppUserModelId('com.electron')

  // macOS: 设置 Dock 图标（开发模式下也显示正确图标）
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(icon))
  }

  // 监听窗口创建，配置快捷键
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册所有 IPC 处理器（不包括 SDK 初始化）
  registerAllHandlers()

  // 初始化自动更新服务
  setupUpdater()

  // 创建主窗口
  const mainWindow = createMainWindow()

  // 窗口完全加载后再初始化 SDK，确保渲染进程已准备好接收事件
  // 注意：只在第一次加载时初始化 SDK，刷新页面时不重复初始化
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Window did-finish-load')
    
    // 防止刷新页面时重复初始化 SDK
    if (isSDKInitialized) {
      console.log('[Main] SDK already initialized, skipping...')
      return
    }
    
    // 稍微延迟一下，确保渲染进程的事件监听器已注册
    setTimeout(() => {
      initDeviceSDK()
      isSDKInitialized = true
      console.log('[Main] SDK initialization completed')
    }, 500)
  })

  // macOS: 点击 Dock 图标重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

// 所有窗口关闭时退出应用（macOS 除外）
// 使用优雅退出，先隐藏窗口再清理 SDK
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !getIsUpdating()) {
    gracefulQuit()
  }
})

// 应用退出前清理（处理其他退出方式，如 app.quit()）
app.on('before-quit', (event) => {
  // 如果还没有开始优雅退出，则启动优雅退出流程
  if (!isGracefullyQuitting) {
    event.preventDefault()
    gracefulQuit()
  }
})
