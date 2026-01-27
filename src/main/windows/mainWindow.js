/**
 * 主窗口创建模块
 */

import { BrowserWindow, shell, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { windowManager } from './windowManager'
import icon from '../../../resources/icon.png?asset'

/**
 * 创建主窗口
 * @returns {BrowserWindow}
 */
export function createMainWindow() {
  // 如果主窗口已存在，直接返回
  if (windowManager.has('main')) {
    const existingWindow = windowManager.get('main')
    existingWindow.focus()
    return existingWindow
  }

  // 获取主屏幕尺寸
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize

  // 基准比例 (3:2 比例，基于 1200x800)
  const aspectRatio = 3 / 2

  // 初始窗口：屏幕的 66% 宽度，高度按比例计算
  const initialWidth = Math.round(screenWidth * 0.6)
  const initialHeight = Math.round(initialWidth / aspectRatio)

  // 最小窗口：屏幕的 50% 宽度，高度按比例计算
  const minWidth = Math.round(screenWidth * 0.5)
  const minHeight = Math.round(minWidth / aspectRatio)

  const mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: minWidth,
    minHeight: minHeight,
    show: false,
    autoHideMenuBar: true,
    // Windows 和 Linux 需要显式设置图标，macOS 使用 .icns 文件
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 注册到窗口管理器
  windowManager.register('main', mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 注册开发者快捷键
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // DevTools: Ctrl+Shift+I / Cmd+Option+I
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools()
      event.preventDefault()
    }
    // 刷新: Ctrl+R / Cmd+R 或 F5
    if (((input.control || input.meta) && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      mainWindow.webContents.reload()
      event.preventDefault()
    }
    // 强制刷新: Ctrl+Shift+R / Cmd+Shift+R
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'r') {
      mainWindow.webContents.reloadIgnoringCache()
      event.preventDefault()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
