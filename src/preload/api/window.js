/**
 * 窗口操作 API
 * 提供给渲染进程的窗口控制接口
 */

import { ipcRenderer } from 'electron'

/**
 * 小窗口类型
 */
export const MiniWindowType = {
  BUSINESS_A: 'mini-business-a',
  BUSINESS_B: 'mini-business-b',
  BUSINESS_C: 'mini-business-c'
}

export const windowApi = {
  /**
   * 创建小窗口
   * @param {string} type - 窗口类型，使用 MiniWindowType
   */
  createMini: (type) => ipcRenderer.invoke('window:create-mini', type),

  /**
   * 关闭当前窗口
   */
  close: () => ipcRenderer.send('window:close'),

  /**
   * 最小化当前窗口
   */
  minimize: () => ipcRenderer.send('window:minimize'),

  /**
   * 最大化/还原当前窗口
   */
  maximize: () => ipcRenderer.send('window:maximize'),

  /**
   * 监听窗口状态变化
   * @param {Function} callback - 回调函数
   */
  onStateChanged: (callback) => {
    ipcRenderer.on('window:state-changed', (event, state) => callback(state))
  }
}
