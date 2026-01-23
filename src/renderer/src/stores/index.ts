/**
 * Pinia Store 统一导出
 */

// 应用状态
export { useAppStore } from './modules/app'

// 主题状态
export { useThemeStore } from './modules/theme'

// 用户状态
export { useUserStore } from './modules/user'

// 预留：业务模块 Store
// export { useBusinessAStore } from './modules/businessA'
// export { useBusinessBStore } from './modules/businessB'
// export { useBusinessCStore } from './modules/businessC'
