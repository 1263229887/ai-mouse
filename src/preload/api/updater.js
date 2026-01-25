/**
 * 更新相关 API
 */

import { ipcRenderer } from 'electron'

export const updaterApi = {
  /**
   * 检查更新
   * @returns {Promise<{hasUpdate: boolean, currentVersion: string, newVersion?: string, error?: string}>}
   */
  check: () => ipcRenderer.invoke('updater:check'),

  /**
   * 下载更新
   */
  download: () => ipcRenderer.send('updater:download'),

  /**
   * 退出并安装更新
   */
  quitAndInstall: () => ipcRenderer.send('updater:quit-and-install'),

  /**
   * 监听下载进度
   * @param {Function} callback
   */
  onDownloadProgress: (callback) => {
    ipcRenderer.on('updater:download-progress', callback)
  },

  /**
   * 移除下载进度监听
   * @param {Function} callback
   */
  offDownloadProgress: (callback) => {
    ipcRenderer.removeListener('updater:download-progress', callback)
  },

  /**
   * 监听下载完成
   * @param {Function} callback
   */
  onDownloaded: (callback) => {
    ipcRenderer.on('updater:downloaded', callback)
  },

  /**
   * 移除下载完成监听
   * @param {Function} callback
   */
  offDownloaded: (callback) => {
    ipcRenderer.removeListener('updater:downloaded', callback)
  },

  /**
   * 监听更新错误
   * @param {Function} callback
   */
  onError: (callback) => {
    ipcRenderer.on('updater:error', callback)
  },

  /**
   * 移除更新错误监听
   * @param {Function} callback
   */
  offError: (callback) => {
    ipcRenderer.removeListener('updater:error', callback)
  }
}
