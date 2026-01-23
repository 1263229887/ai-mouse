/**
 * 应用相关 API
 */

import { ipcRenderer } from 'electron'

export const appApi = {
  /**
   * 获取应用版本
   * @returns {Promise<string>}
   */
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  /**
   * 退出应用
   */
  quit: () => ipcRenderer.send('app:quit')
}
