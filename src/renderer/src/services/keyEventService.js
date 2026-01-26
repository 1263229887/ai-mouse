/**
 * 按键事件服务
 * 全局监听设备按键事件，根据配置触发对应业务
 * 单例模式，应用启动时初始化一次
 */

import { useDeviceStore, useAuthStore, KEY_INDEX, KEY_STATUS, BUSINESS_MODE } from '@/stores'
import { getVoiceTranslateService } from '@/services'

class KeyEventService {
  constructor() {
    this.isInitialized = false
    this.isListening = false

    // 当前激活的业务
    this.activeBusinessMode = null
    this.activeKeyIndex = null

    // 录音状态
    this.isRecording = false

    // 语音翻译服务
    this.voiceTranslateService = null
  }

  /**
   * 初始化服务
   * 应用启动时调用一次
   */
  init() {
    if (this.isInitialized) {
      console.log('[KeyEventService] Already initialized')
      return
    }

    console.log('[KeyEventService] Initializing...')

    // 获取语音翻译服务
    this.voiceTranslateService = getVoiceTranslateService()

    // 注册按键事件监听
    this.registerKeyEventListener()

    this.isInitialized = true
    console.log('[KeyEventService] Initialized')
  }

  /**
   * 注册按键事件监听
   */
  registerKeyEventListener() {
    if (this.isListening) {
      console.log('[KeyEventService] Already listening')
      return
    }

    window.api?.device?.onKeyEvent((data) => {
      console.log('[KeyEventService] Key event received:', data)
      this.handleKeyEvent(data)
    })

    this.isListening = true
    console.log('[KeyEventService] Key event listener registered')
  }

  /**
   * 处理按键事件
   * @param {object} data - { deviceId, index, status }
   */
  handleKeyEvent(data) {
    const { index, status } = data

    // 检查授权状态（获取最新的 store 状态）
    const authStore = useAuthStore()
    console.log('[KeyEventService] Auth status:', {
      isAuthorized: authStore.isAuthorized,
      authStatus: authStore.authStatus,
      hasToken: !!authStore.accessToken
    })

    if (!authStore.isAuthorized) {
      console.log('[KeyEventService] Not authorized, ignoring key event')
      return
    }

    // 判断按键类型
    const isClickKey = index === KEY_INDEX.VOICE_CLICK || index === KEY_INDEX.AI_CLICK
    const isLongPressKey = index === KEY_INDEX.VOICE_LONG_PRESS || index === KEY_INDEX.AI_LONG_PRESS

    // 只处理有效的按键索引
    if (!isClickKey && !isLongPressKey) {
      console.log('[KeyEventService] Invalid key index:', index)
      return
    }

    // 获取按键对应的业务模式
    const deviceStore = useDeviceStore()
    const businessMode = deviceStore.getKeyMapping(index)

    console.log('[KeyEventService] Key event:', {
      index,
      status,
      isClickKey,
      isLongPressKey,
      businessMode
    })

    if (!businessMode) {
      console.log('[KeyEventService] No business mode for key:', index)
      return
    }

    // 根据按键类型处理
    if (isClickKey) {
      // 单击模式：按下时 toggle（开始/停止）
      if (status === KEY_STATUS.PRESSED) {
        if (this.activeBusinessMode === businessMode && this.activeKeyIndex === index) {
          // 已在运行中，再次单击停止
          console.log('[KeyEventService] Click to stop business:', businessMode)
          this.stopBusiness(businessMode)
        } else {
          // 未运行，单击开始
          console.log('[KeyEventService] Click to start business:', businessMode)
          this.startBusiness(businessMode, index)
        }
      }
      // 单击模式下忽略松开事件
    } else if (isLongPressKey) {
      // 长按模式：按下开始，松开停止
      if (status === KEY_STATUS.PRESSED) {
        console.log('[KeyEventService] Long press start business:', businessMode)
        this.startBusiness(businessMode, index)
      } else if (status === KEY_STATUS.RELEASED) {
        // 松开时停止（只有当前正在运行的是这个按键触发的业务时才停止）
        if (this.activeKeyIndex === index) {
          console.log('[KeyEventService] Long press release stop business:', businessMode)
          this.stopBusiness(businessMode)
        }
      }
    }
  }

  /**
   * 开始业务
   * @param {string} mode - 业务模式
   * @param {number} keyIndex - 按键索引
   */
  async startBusiness(mode, keyIndex) {
    // 如果已经有业务在运行，先停止
    if (this.activeBusinessMode) {
      console.log('[KeyEventService] Stopping previous business:', this.activeBusinessMode)
      await this.stopBusiness(this.activeBusinessMode)
    }

    console.log('[KeyEventService] Starting business:', mode, 'key:', keyIndex)
    this.activeBusinessMode = mode
    this.activeKeyIndex = keyIndex

    switch (mode) {
      case BUSINESS_MODE.VOICE_TRANSLATE:
        await this.startVoiceTranslate()
        break
      case BUSINESS_MODE.VOICE_INPUT:
        await this.startVoiceInput()
        break
      case BUSINESS_MODE.AI_ASSISTANT:
        await this.startAIAssistant()
        break
      default:
        console.log('[KeyEventService] Unknown business mode:', mode)
    }
  }

  /**
   * 停止业务
   * @param {string} mode - 业务模式
   */
  async stopBusiness(mode) {
    console.log('[KeyEventService] Stopping business:', mode)

    switch (mode) {
      case BUSINESS_MODE.VOICE_TRANSLATE:
        await this.stopVoiceTranslate()
        break
      case BUSINESS_MODE.VOICE_INPUT:
        await this.stopVoiceInput()
        break
      case BUSINESS_MODE.AI_ASSISTANT:
        await this.stopAIAssistant()
        break
    }

    this.activeBusinessMode = null
    this.activeKeyIndex = null
  }

  /**
   * 停止所有业务
   */
  async stopAllBusiness() {
    if (this.activeBusinessMode) {
      await this.stopBusiness(this.activeBusinessMode)
    }
    this.activeBusinessMode = null
    this.activeKeyIndex = null
  }

  // ============ 语音翻译业务 ============
  async startVoiceTranslate() {
    try {
      console.log('[KeyEventService] Starting voice translate...')
      this.isRecording = true

      // 获取全局配置的录音来源
      const deviceStore = useDeviceStore()
      const recordingSource = deviceStore.recordingSource
      console.log('[KeyEventService] Recording source:', recordingSource)

      // 创建语音翻译小窗口（类型必须与 MiniWindowType 匹配）
      await window.api?.window?.createMini('mini-voice-translate')

      // 设置录音来源并初始化服务
      this.voiceTranslateService.setRecordingSource(recordingSource)
      this.voiceTranslateService.init()

      // 设置回调
      this.voiceTranslateService.onMessage = (data) => {
        console.log('[KeyEventService] Voice translate message:', data)
      }
      this.voiceTranslateService.onStateChange = (state) => {
        console.log('[KeyEventService] Voice translate state:', state)
        if (state === 'stopped' || state === 'disconnected' || state === 'error') {
          this.isRecording = false
        }
      }

      // 开始录音翻译
      await this.voiceTranslateService.start({
        url: 'ws://chat.danaai.net/asr/speechTranslate',
        sourceLanguage: 'ZH',
        targetLanguage: 'EN'
      })

      console.log('[KeyEventService] Voice translate started')
    } catch (error) {
      console.error('[KeyEventService] Failed to start voice translate:', error)
      this.isRecording = false
      this.activeBusinessMode = null
    }
  }

  async stopVoiceTranslate() {
    try {
      console.log('[KeyEventService] Stopping voice translate...')
      await this.voiceTranslateService?.stop()
      this.isRecording = false

      // 关闭语音翻译小窗口
      window.api?.window?.close('mini-voice-translate')

      console.log('[KeyEventService] Voice translate stopped')
    } catch (error) {
      console.error('[KeyEventService] Failed to stop voice translate:', error)
      this.isRecording = false
    }
  }

  // ============ 语音输入业务 ============
  async startVoiceInput() {
    // TODO: 实现语音输入业务
    console.log('[KeyEventService] Voice input not implemented yet')
  }

  async stopVoiceInput() {
    // TODO: 停止语音输入业务
    console.log('[KeyEventService] Stop voice input not implemented yet')
  }

  // ============ AI语音助手业务 ============
  async startAIAssistant() {
    // TODO: 实现AI语音助手业务
    console.log('[KeyEventService] AI assistant not implemented yet')
  }

  async stopAIAssistant() {
    // TODO: 停止AI语音助手业务
    console.log('[KeyEventService] Stop AI assistant not implemented yet')
  }

  /**
   * 销毁服务
   */
  destroy() {
    console.log('[KeyEventService] Destroying...')
    this.stopAllBusiness()
    window.api?.device?.removeKeyEventListener()
    this.isListening = false
    this.isInitialized = false
  }
}

// 单例实例
let instance = null

/**
 * 获取按键事件服务实例
 * @returns {KeyEventService}
 */
export function getKeyEventService() {
  if (!instance) {
    instance = new KeyEventService()
  }
  return instance
}

/**
 * 初始化按键事件服务
 * 应用启动时调用
 */
export function initKeyEventService() {
  const service = getKeyEventService()
  service.init()
  return service
}
