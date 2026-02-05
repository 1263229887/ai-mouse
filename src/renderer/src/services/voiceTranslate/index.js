/**
 * 语音翻译服务
 * 整合录音器和 WebSocket，提供语音翻译功能
 * 支持电脑录音和鼠标录音两种模式
 */

import { VoiceRecorder } from '../voiceInput/recorder'
import { VoiceTranslateWebSocket } from './websocket'

// 录音来源常量
const RECORDING_SOURCE = {
  MOUSE: 'mouse',
  COMPUTER: 'computer'
}

/**
 * 语音翻译服务类
 */
export class VoiceTranslateService {
  constructor() {
    this.recorder = null
    this.websocket = null
    this.isRunning = false
    this.isInitialized = false
    this.onMessage = null // 服务端消息回调
    this.onStateChange = null // 状态变化回调
    this.recordingSource = RECORDING_SOURCE.COMPUTER // 默认电脑录音
    this.audioDataHandler = null // 鼠标音频数据处理函数
    // 翻译配置 - 完整的默认参数
    this.translateOptions = {
      mode: '2pass',
      language_id: 'ZH',
      is_denoiser: false,
      originalCode: 'ZH',
      sourceLanguage: 'ZH',
      targetLanguage: 'EN',
      openTranslate: true,
      openTts: false,
      timbre: '1',
      conversationId: '1111',
      is_use_timestamp_model: false,
      stopInterval: '1500'
    }
  }

  /**
   * 设置录音来源
   * @param {string} source - 'mouse' | 'computer'
   */
  setRecordingSource(source) {
    this.recordingSource = source
  }

  /**
   * 初始化服务
   * @param {string} source - 录音来源 'mouse' | 'computer'，可选
   */
  init(source) {
    if (source) {
      this.recordingSource = source
    }

    // 如果是电脑录音，初始化录音器
    if (this.recordingSource === RECORDING_SOURCE.COMPUTER) {
      // 防止重复初始化
      if (this.isInitialized && this.recorder) {
        console.log('[VoiceTranslateService] 已初始化，跳过')
        return
      }

      console.log('[VoiceTranslateService] 开始初始化录音器（电脑录音）...')

      // 初始化录音器
      this.recorder = new VoiceRecorder({
        onAudioChunk: (chunk) => {
          // 将音频数据发送到 WebSocket
          if (this.websocket && this.websocket.isConnected()) {
            this.websocket.sendAudio(chunk)
          }
        }
      })

      this.recorder.init()
    } else {
      console.log('[VoiceTranslateService] 初始化（鼠标录音模式）...')
    }

    this.isInitialized = true
    console.log('[VoiceTranslateService] 初始化完成，录音来源:', this.recordingSource)
  }

  /**
   * 设置翻译配置
   * @param {object} options - 翻译配置
   */
  setTranslateOptions(options) {
    this.translateOptions = {
      ...this.translateOptions,
      ...options
    }
  }

  /**
   * 开始语音翻译
   * @param {object} options - 可选的配置参数
   */
  async start(options = {}) {
    if (this.isRunning) {
      console.warn('[VoiceTranslateService] 已在运行中')
      return
    }

    // 确保已初始化
    if (!this.isInitialized) {
      console.log('[VoiceTranslateService] 未初始化，先初始化...')
      this.init()
    }

    // 合并配置，sourceLanguage 自动同步到 language_id 和 originalCode
    const mergedOptions = {
      ...this.translateOptions,
      ...options
    }

    // 如果传入了 sourceLanguage，同步到 language_id 和 originalCode
    if (options.sourceLanguage) {
      mergedOptions.language_id = options.sourceLanguage
      mergedOptions.originalCode = options.sourceLanguage
    }

    const wsOptions = {
      ...mergedOptions,
      onMessage: (data) => {
        if (this.onMessage) this.onMessage(data)
      },
      onConnected: () => {
        console.log('[VoiceTranslateService] WebSocket 已连接')
        if (this.onStateChange) this.onStateChange('connected')
      },
      onDisconnected: () => {
        console.log('[VoiceTranslateService] WebSocket 已断开')
        if (this.onStateChange) this.onStateChange('disconnected')
      },
      onError: (error) => {
        console.error('[VoiceTranslateService] WebSocket 错误:', error)
        if (this.onStateChange) this.onStateChange('error')
      }
    }

    // 初始化 WebSocket
    console.log('[VoiceTranslateService] 创建 WebSocket 实例...')
    this.websocket = new VoiceTranslateWebSocket(wsOptions)

    try {
      // 连接 WebSocket
      console.log('[VoiceTranslateService] 开始连接 WebSocket...')
      await this.websocket.connect()
      console.log('[VoiceTranslateService] WebSocket 连接成功')

      // 根据录音来源选择录音方式
      if (this.recordingSource === RECORDING_SOURCE.COMPUTER) {
        // 电脑录音
        console.log('[VoiceTranslateService] 开始电脑录音...')
        await this.recorder.start()
        console.log('[VoiceTranslateService] 电脑录音启动成功')
      } else {
        // 鼠标录音 - 监听设备音频数据
        console.log('[VoiceTranslateService] 开始鼠标录音...')
        this.startMouseRecording()
        console.log('[VoiceTranslateService] 鼠标录音监听已启动')
      }

      this.isRunning = true
      if (this.onStateChange) this.onStateChange('recording')

      console.log('[VoiceTranslateService] 开始语音翻译')
    } catch (error) {
      console.error('[VoiceTranslateService] 启动失败:', error)
      this.stop()
      throw error
    }
  }

  /**
   * 开始监听鼠标录音（SDK 音频数据回调）
   */
  startMouseRecording() {
    // 创建音频数据处理函数
    this.audioDataHandler = (data) => {
      const { audioData } = data
      if (audioData && this.websocket && this.websocket.isConnected()) {
        // 将音频数据发送到 WebSocket
        this.websocket.sendAudio(audioData)
      }
    }

    // 注册监听
    window.api?.device?.onAudioData(this.audioDataHandler)
    console.log('[VoiceTranslateService] 鼠标音频数据监听已注册')
  }

  /**
   * 停止鼠标录音监听
   */
  stopMouseRecording() {
    if (this.audioDataHandler) {
      window.api?.device?.removeAudioDataListener()
      this.audioDataHandler = null
      console.log('[VoiceTranslateService] 鼠标音频数据监听已移除')
    }
  }

  /**
   * 停止语音翻译
   */
  async stop() {
    if (!this.isRunning && !this.websocket) {
      return
    }

    // 根据录音来源停止录音
    if (this.recordingSource === RECORDING_SOURCE.COMPUTER) {
      // 停止电脑录音
      if (this.recorder) {
        await this.recorder.stop()
      }
    } else {
      // 停止鼠标录音
      this.stopMouseRecording()
    }

    // 发送停止信号并断开 WebSocket
    if (this.websocket) {
      this.websocket.sendStopSignal()
      // 延迟断开，等待服务端处理
      setTimeout(() => {
        if (this.websocket) {
          this.websocket.disconnect()
          this.websocket = null
        }
      }, 2000)
    }

    this.isRunning = false
    if (this.onStateChange) this.onStateChange('stopped')

    console.log('[VoiceTranslateService] 停止语音翻译')
  }

  /**
   * 销毁服务
   */
  destroy() {
    this.stop()
    if (this.recorder) {
      this.recorder.destroy()
      this.recorder = null
    }
    this.stopMouseRecording()
    this.isInitialized = false
  }

  /**
   * 获取运行状态
   */
  getIsRunning() {
    return this.isRunning
  }

  /**
   * 获取当前录音来源
   */
  getRecordingSource() {
    return this.recordingSource
  }
}

// 导出模块
export { VoiceTranslateWebSocket } from './websocket'

// 创建单例
let voiceTranslateInstance = null

/**
 * 获取语音翻译服务实例
 */
export function getVoiceTranslateService() {
  if (!voiceTranslateInstance) {
    voiceTranslateInstance = new VoiceTranslateService()
  }
  return voiceTranslateInstance
}
