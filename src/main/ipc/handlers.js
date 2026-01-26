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
  createVoiceTranslateWindow,
  MiniWindowType
} from '../windows'
import {
  initSDK,
  closeSDK,
  getDeviceVendorId,
  addEventListener,
  generateOpenId,
  getCurrentDeviceState,
  updateDeviceVendorId,
  checkForUpdate,
  downloadUpdate,
  quitAndInstall
} from '../services'

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
      case MiniWindowType.VOICE_TRANSLATE:
        createVoiceTranslateWindow()
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

  // 移动窗口（相对位移）
  ipcMain.on(IPC_CHANNELS.WINDOW.MOVE_BY, (event, { deltaX, deltaY }) => {
    const webContents = event.sender
    const win = require('electron').BrowserWindow.fromWebContents(webContents)
    if (win) {
      const [x, y] = win.getPosition()
      win.setPosition(x + deltaX, y + deltaY)
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
 * 注册设备/SDK 相关 IPC
 */
function registerDeviceHandlers() {
  // 初始化 SDK
  initSDK(true)

  // 监听设备连接事件，转发给渲染进程
  addEventListener('deviceConnected', (data) => {
    windowManager.broadcast(IPC_CHANNELS.DEVICE.CONNECTED, data)
  })

  // 监听设备断开事件
  addEventListener('deviceDisconnected', (data) => {
    windowManager.broadcast(IPC_CHANNELS.DEVICE.DISCONNECTED, data)
  })

  // 监听设备消息（包含设备信息更新）
  addEventListener('deviceMessage', (data) => {
    windowManager.broadcast(IPC_CHANNELS.DEVICE.MESSAGE, data)
  })

  // 获取厂商ID（同步方法）
  ipcMain.handle(IPC_CHANNELS.DEVICE.GET_VENDOR_ID, (event, deviceId) => {
    const vendorId = getDeviceVendorId(deviceId)
    // 更新设备缓存
    if (vendorId) {
      updateDeviceVendorId(deviceId, vendorId)
    }
    return vendorId
  })

  // 获取当前设备状态（用于刷新后恢复）
  ipcMain.handle(IPC_CHANNELS.DEVICE.GET_CURRENT_STATE, () => {
    return getCurrentDeviceState()
  })
}

/**
 * 注册加密相关 IPC
 */
function registerCryptoHandlers() {
  // 生成加密的 open_id
  ipcMain.handle(IPC_CHANNELS.CRYPTO.GENERATE_OPEN_ID, (event, data) => {
    return generateOpenId(data)
  })
}

/**
 * 注册更新相关 IPC
 */
function registerUpdaterHandlers() {
  // 检查更新
  ipcMain.handle(IPC_CHANNELS.UPDATER.CHECK, async () => {
    return await checkForUpdate()
  })

  // 下载更新
  ipcMain.on(IPC_CHANNELS.UPDATER.DOWNLOAD, () => {
    downloadUpdate()
  })

  // 退出并安装
  ipcMain.on(IPC_CHANNELS.UPDATER.QUIT_AND_INSTALL, () => {
    quitAndInstall()
  })
}

/**
 * 关闭 SDK
 */
export function shutdownSDK() {
  closeSDK()
}

/**
 * 注册所有 IPC 处理器
 */
export function registerAllHandlers() {
  registerWindowHandlers()
  registerAppHandlers()
  registerThemeHandlers()
  registerDeviceHandlers()
  registerCryptoHandlers()
  registerUpdaterHandlers()

  // 保留原有的 ping 测试
  ipcMain.on('ping', () => console.log('pong'))
}
