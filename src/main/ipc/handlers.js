/**
 * IPC 处理器注册
 * 统一注册所有 IPC 事件处理
 */

import { ipcMain, app, nativeTheme } from 'electron'
import { IPC_CHANNELS } from './channels'
import {
  windowManager,
  createBusinessAWindow,
  createBusinessBWindow,
  createBusinessCWindow,
  MiniWindowType
} from '../windows'

/**
 * 注册窗口相关 IPC
 */
function registerWindowHandlers() {
  // 创建小窗口
  ipcMain.handle(IPC_CHANNELS.WINDOW.CREATE_MINI, (event, type) => {
    switch (type) {
      case MiniWindowType.BUSINESS_A:
        createBusinessAWindow()
        break
      case MiniWindowType.BUSINESS_B:
        createBusinessBWindow()
        break
      case MiniWindowType.BUSINESS_C:
        createBusinessCWindow()
        break
      default:
        console.warn(`Unknown mini window type: ${type}`)
    }
    return true
  })

  // 关闭窗口
  ipcMain.on(IPC_CHANNELS.WINDOW.CLOSE, (event, windowName) => {
    if (windowName) {
      windowManager.close(windowName)
    } else {
      // 关闭当前发送消息的窗口
      const webContents = event.sender
      const win = require('electron').BrowserWindow.fromWebContents(webContents)
      if (win) win.close()
    }
  })

  // 最小化窗口
  ipcMain.on(IPC_CHANNELS.WINDOW.MINIMIZE, (event) => {
    const webContents = event.sender
    const win = require('electron').BrowserWindow.fromWebContents(webContents)
    if (win) win.minimize()
  })

  // 最大化/还原窗口
  ipcMain.on(IPC_CHANNELS.WINDOW.MAXIMIZE, (event) => {
    const webContents = event.sender
    const win = require('electron').BrowserWindow.fromWebContents(webContents)
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })
}

/**
 * 注册应用相关 IPC
 */
function registerAppHandlers() {
  // 获取应用版本
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => {
    return app.getVersion()
  })

  // 退出应用
  ipcMain.on(IPC_CHANNELS.APP.QUIT, () => {
    app.quit()
  })
}

/**
 * 注册主题相关 IPC
 */
function registerThemeHandlers() {
  // 获取系统主题
  ipcMain.handle(IPC_CHANNELS.THEME.GET_SYSTEM, () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  })

  // 监听系统主题变化，通知所有窗口
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    windowManager.broadcast(IPC_CHANNELS.THEME.CHANGED, theme)
  })
}

/**
 * 注册所有 IPC 处理器
 */
export function registerAllHandlers() {
  registerWindowHandlers()
  registerAppHandlers()
  registerThemeHandlers()

  // 保留原有的 ping 测试
  ipcMain.on('ping', () => console.log('pong'))
}
