import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 主题类型
export type ThemeType = 'light' | 'dark'

// 本地存储的 key
const THEME_STORAGE_KEY = 'app-theme'

export const useThemeStore = defineStore('theme', () => {
  // 从本地存储读取主题，默认 light
  const getInitialTheme = (): ThemeType => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
    // 跟随系统偏好
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }

  // 当前主题
  const theme = ref<ThemeType>(getInitialTheme())

  // 是否为深色模式
  const isDark = () => theme.value === 'dark'

  // 设置主题
  const setTheme = (newTheme: ThemeType) => {
    theme.value = newTheme
  }

  // 切换主题
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  // 应用主题到 DOM
  const applyTheme = (themeValue: ThemeType) => {
    document.documentElement.setAttribute('data-theme', themeValue)
    localStorage.setItem(THEME_STORAGE_KEY, themeValue)
  }

  // 监听主题变化，自动应用
  watch(
    theme,
    (newTheme) => {
      applyTheme(newTheme)
    },
    { immediate: true }
  )

  // 监听系统主题变化
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // 只有在没有手动设置过的情况下才跟随系统
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    })
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  }
})
