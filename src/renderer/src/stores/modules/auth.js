import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 本地存储 key
const AUTH_STORAGE_KEY = 'app-auth'
const AUTHORIZED_DEVICE_KEY = 'authorized-device'

/**
 * 授权状态 Store
 * 管理设备授权状态和 Token
 */
export const useAuthStore = defineStore('auth', () => {
  // 访问令牌
  const accessToken = ref('')

  // 刷新令牌
  const refreshToken = ref('')

  // 用户信息
  const userInfo = ref(null)

  // 授权状态
  const authStatus = ref('idle') // idle | pending | success | failed

  // 错误信息
  const errorMessage = ref('')

  // 已授权的设备信息（用于比对，避免重复授权）
  const authorizedDevice = ref(null)

  // 是否已授权（有token或者授权状态为成功）
  const isAuthorized = computed(() => !!accessToken.value || authStatus.value === 'success')

  // 是否正在授权中
  const isPending = computed(() => authStatus.value === 'pending')

  /**
   * 从本地存储恢复授权信息
   */
  function restoreAuth() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.accessToken) accessToken.value = data.accessToken
        if (data.refreshToken) refreshToken.value = data.refreshToken
        if (data.userInfo) userInfo.value = data.userInfo
        if (data.accessToken) {
          authStatus.value = 'success'
        }
      }

      // 恢复已授权设备信息
      const storedDevice = localStorage.getItem(AUTHORIZED_DEVICE_KEY)
      if (storedDevice) {
        authorizedDevice.value = JSON.parse(storedDevice)
        console.log('[Auth] 恢复已授权设备信息:', authorizedDevice.value)
      }
    } catch (error) {
      console.error('[Auth] 恢复授权信息失败:', error)
    }
  }

  /**
   * 保存授权信息到本地存储
   */
  function saveAuth() {
    try {
      const data = {
        accessToken: accessToken.value,
        refreshToken: refreshToken.value,
        userInfo: userInfo.value
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('[Auth] 保存授权信息失败:', error)
    }
  }

  /**
   * 保存已授权设备信息
   * @param {object} deviceInfo - { serialNumber, version, vendorId }
   */
  function saveAuthorizedDevice(deviceInfo) {
    try {
      authorizedDevice.value = {
        serialNumber: deviceInfo.serialNumber,
        version: deviceInfo.version,
        vendorId: deviceInfo.vendorId
      }
      localStorage.setItem(AUTHORIZED_DEVICE_KEY, JSON.stringify(authorizedDevice.value))
      console.log('[Auth] 保存已授权设备信息:', authorizedDevice.value)
    } catch (error) {
      console.error('[Auth] 保存已授权设备信息失败:', error)
    }
  }

  /**
   * 检查设备是否已授权（比对设备信息）
   * @param {object} deviceInfo - { serialNumber, version, vendorId }
   * @returns {boolean} 是否已授权
   */
  function isDeviceAuthorized(deviceInfo) {
    if (!authorizedDevice.value) return false

    const { serialNumber, version, vendorId } = deviceInfo
    const cached = authorizedDevice.value

    // 三个值都必须完全匹配
    const isMatch =
      cached.serialNumber === serialNumber &&
      cached.version === version &&
      String(cached.vendorId) === String(vendorId)

    console.log('[Auth] 设备授权比对:', {
      cached,
      current: { serialNumber, version, vendorId },
      isMatch
    })

    return isMatch
  }

  /**
   * 设置授权信息
   * 适配 API 返回的数据结构
   */
  function setAuth(data) {
    // 访问令牌
    if (data.token) {
      accessToken.value = data.token
    }
    // 刷新令牌
    if (data.refreshToken) {
      if (typeof data.refreshToken === 'object') {
        refreshToken.value = data.refreshToken.value || ''
      } else {
        refreshToken.value = data.refreshToken
      }
    }
    // 用户信息
    if (data.userInfo) {
      userInfo.value = data.userInfo
    }

    authStatus.value = 'success'
    errorMessage.value = ''

    // 保存到本地存储
    saveAuth()
  }

  /**
   * 设置授权成功（用于缓存命中跳过授权接口）
   */
  function setAuthorizedFromCache() {
    authStatus.value = 'success'
    errorMessage.value = ''
    console.log('[Auth] 从缓存恢复授权状态')
  }

  /**
   * 设置授权状态
   */
  function setAuthStatus(status, error = '') {
    authStatus.value = status
    errorMessage.value = error
  }

  /**
   * 清除授权信息
   */
  function clearAuth() {
    accessToken.value = ''
    refreshToken.value = ''
    userInfo.value = null
    authStatus.value = 'idle'
    errorMessage.value = ''
    localStorage.removeItem(AUTH_STORAGE_KEY)
    // 注意：不清除已授权设备信息，保留用于下次比对
  }

  /**
   * 完全清除（包括已授权设备信息）
   */
  function clearAll() {
    clearAuth()
    authorizedDevice.value = null
    localStorage.removeItem(AUTHORIZED_DEVICE_KEY)
  }

  // 初始化时恢复授权信息
  restoreAuth()

  return {
    // 状态
    accessToken,
    refreshToken,
    userInfo,
    authStatus,
    errorMessage,
    authorizedDevice,

    // 计算属性
    isAuthorized,
    isPending,

    // 方法
    setAuth,
    setAuthStatus,
    setAuthorizedFromCache,
    saveAuthorizedDevice,
    isDeviceAuthorized,
    clearAuth,
    clearAll
  }
})
