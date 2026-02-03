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
  BUSINESS_C: 'mini-business-c',
  VOICE_TRANSLATE: 'mini-voice-translate',
  VOICE_INPUT: 'mini-voice-input',
  AI_ASSISTANT: 'mini-ai-assistant'
}

export const windowApi = {
  /**
   * 创建小窗口
   * @param {string} type - 窗口类型，使用 MiniWindowType
   */
  createMini: (type) => ipcRenderer.invoke('window:create-mini', type),

  /**
   * 打开 AI 语音助手窗口
   */
  openAIAssistantWindow: () =>
    ipcRenderer.invoke('window:create-mini', MiniWindowType.AI_ASSISTANT),

  /**
   * 关闭 AI 语音助手窗口
   */
  closeAIAssistantWindow: () => ipcRenderer.send('window:close', MiniWindowType.AI_ASSISTANT),

  /**
   * 关闭窗口
   * @param {string} [windowName] - 可选，指定窗口名称；不传则关闭当前窗口
   */
  close: (windowName) => ipcRenderer.send('window:close', windowName),

  /**
   * 最小化当前窗口
   */
  minimize: () => ipcRenderer.send('window:minimize'),

  /**
   * 最大化/还原当前窗口
   */
  maximize: () => ipcRenderer.send('window:maximize'),

  /**
   * 移动窗口（相对位移）
   * @param {number} deltaX - X轴位移
   * @param {number} deltaY - Y轴位移
   */
  moveBy: (deltaX, deltaY) => ipcRenderer.send('window:move-by', { deltaX, deltaY }),

  /**
   * 调整窗口高度
   * @param {number} height - 目标高度
   * @param {boolean} animate - 是否动画过渡
   */
  setHeight: (height, animate = true) => ipcRenderer.send('window:set-height', { height, animate }),

  /**
   * 获取窗口信息
   * @returns {Promise<{x: number, y: number, width: number, height: number, maxHeight: number}>}
   */
  getBounds: () => ipcRenderer.invoke('window:get-bounds'),

  /**
   * 监听窗口状态变化
   * @param {Function} callback - 回调函数
   */
  onStateChanged: (callback) => {
    ipcRenderer.on('window:state-changed', (event, state) => callback(state))
  }
}
