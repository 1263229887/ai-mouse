/**
 * 应用打开相关 API
 * 用于打开本地应用或网页
 */

import { ipcRenderer } from 'electron'

export const appLauncherApi = {
  /**
   * 打开本地应用
   * @param {object} options - { appName, winExeName, macAppName, macBundleId }
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  openApp: (options) => ipcRenderer.invoke('app-launcher:open-app', options),

  /**
   * 打开网页
   * @param {string} url - 网页地址
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  openUrl: (url) => ipcRenderer.invoke('app-launcher:open-url', url),

  /**
   * 检查应用是否安装
   * @param {object} options - { winExeName, macAppName, macBundleId }
   * @returns {Promise<boolean>}
   */
  checkAppInstalled: (options) => ipcRenderer.invoke('app-launcher:check-installed', options)
}
