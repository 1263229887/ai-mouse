/**
 * 主窗口创建模块
 */

import { BrowserWindow, shell } from 'electron'
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

  // 固定窗口尺寸 1200x800
  const windowWidth = 1200
  const windowHeight = 800

  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    resizable: false, // 禁止拉伸缩放
    maximizable: false, // 禁止最大化
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
