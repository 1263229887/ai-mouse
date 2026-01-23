import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 应用全局状态 Store
 * 管理应用级别的状态
 */
export const useAppStore = defineStore('app', () => {
  // 应用是否已初始化
  const isInitialized = ref(false)

  // 应用版本
  const version = ref('')

  // 全局加载状态
  const isLoading = ref(false)

  // 当前窗口类型
  const windowType = ref('main')

  /**
   * 设置初始化状态
   * @param {boolean} status
   */
  function setInitialized(status) {
    isInitialized.value = status
  }

  /**
   * 设置应用版本
   * @param {string} ver
   */
  function setVersion(ver) {
    version.value = ver
  }

  /**
   * 设置加载状态
   * @param {boolean} loading
   */
  function setLoading(loading) {
    isLoading.value = loading
  }

  /**
   * 设置窗口类型
   * @param {string} type - 'main' | 'mini-business-a' | 'mini-business-b' | 'mini-business-c'
   */
  function setWindowType(type) {
    windowType.value = type
  }

  /**
   * 初始化应用
   */
  async function initApp() {
    if (isInitialized.value) return

    try {
      setLoading(true)

      // 获取应用版本
      if (window.electron?.ipcRenderer) {
        const ver = await window.electron.ipcRenderer.invoke('app:get-version')
        setVersion(ver)
      }

      // 判断当前窗口类型（通过路由hash判断）
      const hash = window.location.hash
      if (hash.includes('mini-business-a')) {
        setWindowType('mini-business-a')
      } else if (hash.includes('mini-business-b')) {
        setWindowType('mini-business-b')
      } else if (hash.includes('mini-business-c')) {
        setWindowType('mini-business-c')
      } else {
        setWindowType('main')
      }

      setInitialized(true)
    } finally {
      setLoading(false)
    }
  }

  return {
    isInitialized,
    version,
    isLoading,
    windowType,
    setInitialized,
    setVersion,
    setLoading,
    setWindowType,
    initApp
  }
})
