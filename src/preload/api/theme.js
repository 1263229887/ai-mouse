/**
 * 主题相关 API
 */

import { ipcRenderer } from 'electron'

export const themeApi = {
  /**
   * 获取系统主题
   * @returns {Promise<'light' | 'dark'>}
   */
  getSystemTheme: () => ipcRenderer.invoke('theme:get-system'),

  /**
   * 监听系统主题变化
   * @param {Function} callback - 回调函数
   */
  onSystemThemeChanged: (callback) => {
    ipcRenderer.on('theme:changed', (event, theme) => callback(theme))
  }
}
