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
  paste: () => ipcRenderer.invoke('clipboard:paste'),

  /**
   * 删除指定数量的字符（模拟退格键）
   * @param {number} count - 要删除的字符数量
   * @returns {Promise<boolean>}
   */
  deleteChars: (count) => ipcRenderer.invoke('clipboard:delete-chars', count)
}
