/**
 * 主进程入口
 */

import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow, windowManager } from './windows'
import { registerAllHandlers } from './ipc'

// 应用就绪后初始化
app.whenReady().then(() => {
  // 设置应用 ID (Windows)
  electronApp.setAppUserModelId('com.electron')

  // 监听窗口创建，配置快捷键
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册所有 IPC 处理器
  registerAllHandlers()

  // 创建主窗口
  createMainWindow()

  // macOS: 点击 Dock 图标重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  windowManager.closeAll()
})
