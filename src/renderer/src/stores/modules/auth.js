import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

  // 是否已授权
  const isAuthorized = computed(() => !!accessToken.value)

  // 是否正在授权中
  const isPending = computed(() => authStatus.value === 'pending')

  /**
   * 设置授权信息
   */
  function setAuth(data) {
    if (data.access_token) {
      accessToken.value = data.access_token
    }
    if (data.refresh_token) {
      refreshToken.value = data.refresh_token
    }
    if (data.user_info || data.userInfo) {
      userInfo.value = data.user_info || data.userInfo
    }
    authStatus.value = 'success'
    errorMessage.value = ''
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
  }

  /**
   * 更新访问令牌
   */
  function updateToken(token) {
    accessToken.value = token
  }

  return {
    // 状态
    accessToken,
    refreshToken,
    userInfo,
    authStatus,
    errorMessage,

    // 计算属性
    isAuthorized,
    isPending,

    // 方法
    setAuth,
    setAuthStatus,
    clearAuth,
    updateToken
  }
})
