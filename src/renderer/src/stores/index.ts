/**
 * Pinia Store 统一导出
 */

// 应用状态
export { useAppStore } from './modules/app'

// 用户状态
export { useUserStore } from './modules/user'

// 设备状态（包含按键映射、录音来源配置、语言配置）
export {
  useDeviceStore,
  KEY_INDEX,
  KEY_STATUS,
  BUSINESS_MODE,
  RECORDING_SOURCE
} from './modules/device'

// 授权状态
export { useAuthStore } from './modules/auth'

// 语言列表状态
export { useLanguageStore } from './modules/language'

// AI 语音助手配置状态
export { useAIAssistantStore } from './modules/aiAssistant'

// 业务状态（互斥控制、主窗口锁定）
export { useBusinessStore } from './modules/business'
