/**
 * 设备相关 API 接口
 * 包含设备授权、语言列表等接口
 */

import { createRequest, request } from '@/utils/request'

/**
 * 授权接口专用请求实例
 * 开发环境使用代理，生产环境直接访问线上地址
 */
const authBaseURL = import.meta.env.VITE_AUTH_BASE_URL
console.log('[DeviceAPI] 当前环境:', import.meta.env.MODE)
console.log('[DeviceAPI] 授权接口 baseURL:', authBaseURL)

const authRequest = createRequest({
  baseURL: authBaseURL
})

// ============ 设备授权 API ============

/**
 * 设备激活（授权登录）
 * 使用主进程的 Node.js crypto 模块进行加密
 *
 * @param {Object} params
 * @param {string|number} params.tenantId - 厂商ID
 * @param {string} params.deviceId - 设备SN（唯一序列号）
 * @param {string} params.deviceType - 设备类型 (smart_mouse=智能鼠标)
 * @param {string} params.deviceModel - 设备型号 (传设备版本号)
 * @returns {Promise} 返回授权结果
 */
export async function activateDevice(params) {
  // 构建需要加密的数据
  const encryptData = {
    tenantId: String(params.tenantId),
    deviceId: String(params.deviceId),
    deviceType: params.deviceType || 'smart_mouse',
    deviceModel: String(params.deviceModel),
    timestamp: String(Date.now())
  }

  console.log('[DeviceAPI] 授权请求参数:', encryptData)

  // 调用主进程生成加密后的 open_id
  const result = await window.api?.crypto?.generateOpenId(encryptData)

  if (!result || !result.success) {
    throw new Error(result?.error || '加密失败')
  }

  const openId = result.openId
  console.log('[DeviceAPI] 加密后的 open_id 长度:', openId.length)

  // 调用授权接口
  const url = `/auth/open-id/form?type=pc&open_id=${openId}`
  console.log('[DeviceAPI] 请求 URL:', url)

  const response = await authRequest.get(url)
  console.log('[DeviceAPI] 授权响应:', response.data)

  return response.data
}

// ============ 语言列表 API ============

/**
 * 获取所有语言列表
 * @param {string} version - 版本类型 (lang_pro=高级版)
 * @returns {Promise} 返回语言列表
 */
export async function getAllLanguageList(version = 'lang_pro') {
  const response = await request.get('/ai-api/sysMultiLanguage/list', {
    params: { version }
  })
  return response.data
}
