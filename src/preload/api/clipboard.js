/**
 * 剪贴板相关 API
 */

import { ipcRenderer } from 'electron'

export const clipboardApi = {
  /**
   * 写入文本到剪贴板
   * @param {string} text - 要写入的文本
   * @returns {Promise<boolean>}
   */
  writeText: (text) => ipcRenderer.invoke('clipboard:write-text', text),

  /**
   * 执行粘贴操作（模拟 Ctrl+V / Cmd+V）
   * @returns {Promise<boolean>}
   */
  paste: () => ipcRenderer.invoke('clipboard:paste')
}
