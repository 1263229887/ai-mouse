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
   * 监听设备消息（包含设备信息）
   * @param {Function} callback - 回调函数
   */
  onDeviceMessage: (callback) => {
    ipcRenderer.on('device:message', (event, data) => callback(data))
  },

  /**
   * 移除所有设备监听器
   */
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('device:connected')
    ipcRenderer.removeAllListeners('device:disconnected')
    ipcRenderer.removeAllListeners('device:message')
  }
}
