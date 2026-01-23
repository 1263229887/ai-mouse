import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 用户信息 Store
 * 管理用户登录状态和基本信息
 */
export const useUserStore = defineStore('user', () => {
  // 用户信息
  const userInfo = ref(null)

  // 登录状态
  const isLoggedIn = computed(() => !!userInfo.value)

  // Token
  const token = ref('')

  /**
   * 设置用户信息
   * @param {object} info - 用户信息
   */
  function setUserInfo(info) {
    userInfo.value = info
  }

  /**
   * 设置 Token
   * @param {string} newToken - Token
   */
  function setToken(newToken) {
    token.value = newToken
    // 持久化存储
    if (newToken) {
      localStorage.setItem('user-token', newToken)
    } else {
      localStorage.removeItem('user-token')
    }
  }

  /**
   * 登录
   * @param {object} loginData - 登录数据
   */
  async function login(loginData) {
    // TODO: 实现登录逻辑
    // const response = await api.login(loginData)
    // setUserInfo(response.user)
    // setToken(response.token)
    console.log('Login:', loginData)
  }

  /**
   * 登出
   */
  function logout() {
    userInfo.value = null
    setToken('')
  }

  /**
   * 初始化（从本地存储恢复）
   */
  function init() {
    const storedToken = localStorage.getItem('user-token')
    if (storedToken) {
      token.value = storedToken
      // TODO: 根据 token 获取用户信息
    }
  }

  return {
    userInfo,
    isLoggedIn,
    token,
    setUserInfo,
    setToken,
    login,
    logout,
    init
  }
})
