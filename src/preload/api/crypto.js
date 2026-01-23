/**
 * 加密相关 API
 */

import { ipcRenderer } from 'electron'

export const cryptoApi = {
  /**
   * 生成加密的 open_id
   * 用于设备授权请求
   * @param {Object} data - 需要加密的数据
   * @param {string} data.tenantId - 厂商ID
   * @param {string} data.deviceId - 设备SN
   * @param {string} data.deviceType - 设备类型
   * @param {string} data.deviceModel - 设备型号
   * @param {string} data.timestamp - 时间戳
   * @returns {Promise<{success: boolean, openId?: string, error?: string}>}
   */
  generateOpenId: (data) => ipcRenderer.invoke('crypto:generate-open-id', data)
}
