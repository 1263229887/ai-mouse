/**
 * 设备相关 API
 */

import { ipcRenderer } from 'electron'

export const deviceApi = {
  /**
   * 获取厂商ID（同步方法，返回 int）
   * @param {string} deviceId - 设备ID
   * @returns {Promise<number|null>}
   */
  getVendorId: (deviceId) => ipcRenderer.invoke('device:get-vendor-id', deviceId),

  /**
   * 获取当前设备状态
   * 用于页面刷新后恢复设备状态
   * @returns {Promise<Object|null>}
   */
  getCurrentState: () => ipcRenderer.invoke('device:get-current-state'),

  /**
   * 设置设备麦克风启用状态
   * @param {string} deviceId - 设备ID
   * @param {number} enable - 1: 启用, 0: 禁用
   * @returns {Promise<boolean>}
   */
  setMicEnable: (deviceId, enable) =>
    ipcRenderer.invoke('device:set-mic-enable', { deviceId, enable }),

  /**
   * 获取设备音频启用状态
   * @param {string} deviceId - 设备ID
   * @returns {Promise<boolean|null>}
   */
  getAudioEnable: (deviceId) => ipcRenderer.invoke('device:get-audio-enable', deviceId),

  /**
   * 同步设备配置到主进程
   * @param {object} config - { recordingSource, keyMappings }
   */
  syncConfig: (config) => ipcRenderer.send('device:sync-config', config),

  /**
   * 获取主进程的设备配置
   * @returns {Promise<object>}
   */
  getConfig: () => ipcRenderer.invoke('device:get-config'),

  /**
   * 监听设备连接
   * @param {Function} callback - 回调函数
   */
  onDeviceConnected: (callback) => {
    ipcRenderer.on('device:connected', (event, data) => callback(data))
  },

  /**
   * 监听设备断开
   * @param {Function} callback - 回调函数
   */
  onDeviceDisconnected: (callback) => {
    ipcRenderer.on('device:disconnected', (event, data) => callback(data))
  },

  /**
   * 监听设备消息（包含设备信息更新）
   * @param {Function} callback - 回调函数
   */
  onDeviceMessage: (callback) => {
    ipcRenderer.on('device:message', (event, data) => callback(data))
  },

  /**
   * 监听设备按键事件
   * @param {Function} callback - 回调函数 ({ deviceId, index, status })
   *   index: 100(语音键短按), 102(语音键长按), 96(AI键短按), 97(AI键长按)
   *   status: 1(按下), 0(松开)
   */
  onKeyEvent: (callback) => {
    ipcRenderer.on('device:key-event', (event, data) => callback(data))
  },

  /**
   * 监听设备音频数据（鼠标录音）
   * @param {Function} callback - 回调函数 ({ deviceId, audioData, length })
   */
  onAudioData: (callback) => {
    ipcRenderer.on('device:audio-data', (event, data) => callback(data))
  },

  /**
   * 移除所有设备监听器
   */
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('device:connected')
    ipcRenderer.removeAllListeners('device:disconnected')
    ipcRenderer.removeAllListeners('device:message')
    ipcRenderer.removeAllListeners('device:key-event')
    ipcRenderer.removeAllListeners('device:audio-data')
  },

  /**
   * 移除按键事件监听器
   */
  removeKeyEventListener: () => {
    ipcRenderer.removeAllListeners('device:key-event')
  },

  /**
   * 移除音频数据监听器
   */
  removeAudioDataListener: () => {
    ipcRenderer.removeAllListeners('device:audio-data')
  }
}
