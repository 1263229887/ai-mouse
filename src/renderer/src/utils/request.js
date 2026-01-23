/**
 * HTTP 请求工具模块
 * 基于 axios 封装，提供统一的请求拦截、响应拦截
 */

import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * 创建 axios 实例
 * @param {Object} config - axios 配置
 * @returns {AxiosInstance}
 */
export function createRequest(config = {}) {
  const instance = axios.create({
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    },
    ...config
  })

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      console.log('[Request]', config.method?.toUpperCase(), config.url)
      console.log('[Request] params:', config.params)
      console.log('[Request] data:', config.data)
      return config
    },
    (error) => {
      console.error('[Request] 请求配置错误:', error)
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  instance.interceptors.response.use(
    (response) => {
      console.log('[Response]', response.config.url, response.status)
      console.log('[Response] data:', response.data)

      // 根据业务状态码处理
      const { data } = response
      if (data && data.code !== undefined && data.code !== 200) {
        // 业务错误
        const errorMsg = data.msg || data.message || '请求失败'
        console.error('[Response] 业务错误:', errorMsg)
        return Promise.reject(new Error(errorMsg))
      }

      return response
    },
    (error) => {
      console.error('[Response] 请求失败:', error)

      // 处理 HTTP 错误
      if (error.response) {
        const { status, data } = error.response
        let message = '请求失败'

        switch (status) {
          case 400:
            message = data?.message || '请求参数错误'
            break
          case 401:
            message = '未授权，请重新认证'
            break
          case 403:
            message = '访问被拒绝'
            break
          case 404:
            message = '请求的资源不存在'
            break
          case 500:
            message = '服务器内部错误'
            break
          case 502:
            message = '网关错误'
            break
          case 503:
            message = '服务暂不可用'
            break
          default:
            message = data?.message || `请求失败 (${status})`
        }

        ElMessage.error(message)
      } else if (error.code === 'ECONNABORTED') {
        ElMessage.error('请求超时，请检查网络')
      } else {
        ElMessage.error('网络错误，请检查网络连接')
      }

      return Promise.reject(error)
    }
  )

  return instance
}

/**
 * 通用业务接口请求实例
 * 可根据需要添加 Token 等认证方式
 */
export const request = createRequest({
  baseURL: import.meta.env.VITE_API_BASE_URL
})

/**
 * 设置通用请求的 Token
 * @param {string} token - Bearer token
 */
export function setRequestToken(token) {
  if (token) {
    request.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete request.defaults.headers.common['Authorization']
  }
}

export default request
