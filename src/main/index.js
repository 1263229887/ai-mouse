/**
 * 主进程入口
 */

import { app, BrowserWindow, nativeImage } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './windows'
import { registerAllHandlers, shutdownSDK, initDeviceSDK } from './ipc'
import { setupUpdater, getIsUpdating } from './services'
import icon from '../../resources/icon.png?asset'

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

  // 注册所有 IPC 处理器
  registerAllHandlers()

  // 初始化自动更新服务
  setupUpdater()

  // 在创建窗口之前先初始化 SDK
  console.log('[Main] Initializing SDK before window creation...')
  initDeviceSDK()
  console.log('[Main] SDK initialization completed')

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
  if (process.platform !== 'darwin' && !getIsUpdating()) {
    // 关闭 SDK 后退出
    console.log('[Main] Closing SDK before quit...')
    shutdownSDK()
    app.quit()
  }
})

// 应用退出前关闭 SDK
app.on('before-quit', () => {
  console.log('[Main] before-quit: Closing SDK...')
  shutdownSDK()
})
