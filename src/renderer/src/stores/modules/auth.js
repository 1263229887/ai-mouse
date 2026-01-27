import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 本地存储 key
const AUTH_STORAGE_KEY = 'app-auth'

/**
 * 授权状态 Store
 * 管理设备授权状态和 Token（授权即登录）
 */
export const useAuthStore = defineStore('auth', () => {
  // 访问令牌
  const token = ref('')

  // 刷新令牌
  const refreshToken = ref('')

  // 令牌过期时间
  const expiresAt = ref(null)

  // 用户信息
  const userInfo = ref(null)

  // 授权状态
  const authStatus = ref('idle') // idle | pending | success | failed

  // 错误信息
  const errorMessage = ref('')

  // 是否已授权（有token或者授权状态为成功）
  const isAuthorized = computed(() => !!token.value || authStatus.value === 'success')

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
        if (data.token) token.value = data.token
        if (data.refreshToken) refreshToken.value = data.refreshToken
        if (data.expiresAt) expiresAt.value = data.expiresAt
        if (data.userInfo) userInfo.value = data.userInfo
        if (data.token) {
          authStatus.value = 'success'
        }
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
        token: token.value,
        refreshToken: refreshToken.value,
        expiresAt: expiresAt.value,
        userInfo: userInfo.value
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('[Auth] 保存授权信息失败:', error)
    }
  }

  /**
   * 设置授权信息
   * 适配 API 返回的数据结构：
   * {
   *   token: "xxx",
   *   refreshToken: { value: "xxx", expiration: xxx },
   *   expiresAt: xxx,
   *   userInfo: {...}
   * }
   */
  function setAuth(data) {
    // 访问令牌
    if (data.token) {
      token.value = data.token
    }

    // 刷新令牌（API 返回的是对象 { value, expiration }）
    if (data.refreshToken) {
      if (typeof data.refreshToken === 'object') {
        refreshToken.value = data.refreshToken.value || ''
      } else {
        refreshToken.value = data.refreshToken
      }
    }

    // 令牌过期时间
    if (data.expiresAt) {
      expiresAt.value = data.expiresAt
    }

    // 用户信息
    if (data.userInfo) {
      userInfo.value = data.userInfo
    }

    authStatus.value = 'success'
    errorMessage.value = ''

    // 保存到本地存储
    saveAuth()

    console.log('[Auth] 授权信息已保存:', {
      token: token.value ? '***' : '',
      refreshToken: refreshToken.value ? '***' : '',
      expiresAt: expiresAt.value,
      userInfo: userInfo.value
    })
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
    token.value = ''
    refreshToken.value = ''
    expiresAt.value = null
    userInfo.value = null
    authStatus.value = 'idle'
    errorMessage.value = ''
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  // 初始化时恢复授权信息
  restoreAuth()

  return {
    // 状态
    token,
    refreshToken,
    expiresAt,
    userInfo,
    authStatus,
    errorMessage,

    // 计算属性
    isAuthorized,
    isPending,

    // 方法
    setAuth,
    setAuthStatus,
    clearAuth
  }
})
