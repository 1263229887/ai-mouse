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

  // 基准比例 (16:9 比例，基于 1920x1080)
  const aspectRatio = 16 / 9

  // 初始窗口：屏幕的 3/4 宽度，高度按比例计算
  const initialWidth = Math.round((screenWidth * 3) / 4)
  const initialHeight = Math.round(initialWidth / aspectRatio)

  // 最小窗口：屏幕的 1/2 宽度，高度按比例计算
  const minWidth = Math.round(screenWidth / 2)
  const minHeight = Math.round(minWidth / aspectRatio)

  const mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: minWidth,
    minHeight: minHeight,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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
