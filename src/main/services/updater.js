/**
 * 自动更新服务模块
 * 负责检查更新、下载更新、安装更新
 */

import { app, BrowserWindow, globalShortcut } from 'electron'
import updater from 'electron-updater'
import { is } from '@electron-toolkit/utils'
import { windowManager } from '../windows'
import { IPC_CHANNELS } from '../ipc/channels'

const { autoUpdater } = updater

// 更新状态标志
let isUpdating = false

/**
 * 初始化自动更新服务
 */
export function setupUpdater() {
  // 禁用自动下载和自动安装
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  // 开发环境使用 dev-app-update.yml 配置
  if (is.dev) {
    autoUpdater.forceDevUpdateConfig = true
    console.log('[Updater] 开发环境，使用 dev-app-update.yml 配置')
  }

  // 检查更新中
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] 正在检查更新...')
  })

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] 发现新版本', info.version)
  })

  // 已是最新版本
  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] 已是最新版本', info.version)
  })

  // 下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    console.log('[Updater] 下载进度', `${Math.round(progressObj.percent)}%`)
    const mainWindow = windowManager.getMain()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.UPDATER.DOWNLOAD_PROGRESS, {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      })
    }
  })

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] 更新已下载', info.version)
    const mainWindow = windowManager.getMain()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.UPDATER.DOWNLOADED, {
        version: info.version
      })
    }
  })

  // 更新错误
  autoUpdater.on('error', (err) => {
    console.error('[Updater] 更新错误', err.message)
    const mainWindow = windowManager.getMain()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.UPDATER.ERROR, {
        message: err.message || '检查更新失败'
      })
    }
  })

  // 准备退出安装更新
  autoUpdater.on('before-quit-for-update', () => {
    console.log('[Updater] 准备退出并安装更新...')
    isUpdating = true
  })

  console.log('[Updater] 自动更新服务已初始化')
}

/**
 * 检查更新
 * @returns {Promise<{hasUpdate: boolean, currentVersion: string, newVersion?: string, error?: string}>}
 */
export async function checkForUpdate() {
  const currentVersion = app.getVersion()

  try {
    console.log('[Updater] 开始检查更新', { currentVersion, isDev: is.dev })

    // 设置超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('检查更新超时，请检查网络连接')), 10000)
    })

    const result = await Promise.race([autoUpdater.checkForUpdates(), timeoutPromise])

    console.log('[Updater] 检查更新结果', {
      hasUpdateInfo: !!result?.updateInfo,
      version: result?.updateInfo?.version
    })

    if (result?.updateInfo?.version) {
      const serverVersion = result.updateInfo.version
      const hasUpdate = serverVersion !== currentVersion && serverVersion > currentVersion

      console.log('[Updater] 版本比较', { currentVersion, serverVersion, hasUpdate })

      return {
        hasUpdate,
        currentVersion,
        newVersion: serverVersion
      }
    }

    console.warn('[Updater] 未获取到有效的更新信息')
    return {
      hasUpdate: false,
      currentVersion,
      error: '服务器未配置更新信息'
    }
  } catch (error) {
    console.error('[Updater] 检查更新失败', error.message)
    return {
      hasUpdate: false,
      currentVersion,
      error: error.message || '检查更新失败'
    }
  }
}

/**
 * 下载更新
 */
export function downloadUpdate() {
  console.log('[Updater] 开始下载更新')
  autoUpdater.downloadUpdate()
}

/**
 * 退出并安装更新
 */
export async function quitAndInstall() {
  console.log('[Updater] 用户确认重启并安装')

  isUpdating = true

  // 注销所有全局快捷键
  globalShortcut.unregisterAll()

  // 关闭所有窗口
  console.log('[Updater] 关闭所有窗口...')
  BrowserWindow.getAllWindows().forEach((win) => {
    try {
      win.removeAllListeners('close')
      win.destroy()
    } catch {
      // 忽略错误
    }
  })

  // 等待资源释放
  console.log('[Updater] 等待资源释放...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 执行安装
  console.log('[Updater] 执行 quitAndInstall')
  autoUpdater.quitAndInstall(false, true)
}

/**
 * 获取更新状态
 * @returns {boolean}
 */
export function getIsUpdating() {
  return isUpdating
}
