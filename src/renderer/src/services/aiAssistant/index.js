/**
 * AI 语音助手服务
 * 整合录音器和 WebSocket，提供 AI 语音助手功能
 * 支持电脑录音和鼠标录音两种模式
 * 参照 temp/websocket_test_old/old_test_page.html 协议格式
 */

import { VoiceRecorder } from '../voiceInput/recorder'
import { AIAssistantWebSocket } from './websocket'

// 录音来源常量
const RECORDING_SOURCE = {
  MOUSE: 'mouse',
  COMPUTER: 'computer'
}

/**
 * AI 语音助手服务类
 */
export class AIAssistantService {
  constructor() {
    this.recorder = null
    this.websocket = null
    this.isRunning = false
    this.isInitialized = false
    this.onMessage = null // 服务端消息回调
    this.onStateChange = null // 状态变化回调
    this.recordingSource = RECORDING_SOURCE.COMPUTER // 默认电脑录音
    this.audioDataHandler = null // 鼠标音频数据处理函数
    // AI 助手配置
    this.assistantOptions = {
      language: 'ZH',
      user_id: '',
      speaker_id: '14',
      en_speaker_id: '13',
      scene_id: '1933044829273460738',
      company_id: '1854468734006071297'
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
        return
      }

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
    }

    this.isInitialized = true
  }

  /**
   * 设置 AI 助手配置
   * @param {object} options - 配置参数
   */
  setAssistantOptions(options) {
    this.assistantOptions = {
      ...this.assistantOptions,
      ...options
    }
  }

  /**
   * 开始 AI 语音助手
   * @param {object} options - 可选的配置参数
   */
  async start(options = {}) {
    if (this.isRunning) {
      return
    }

    // 确保已初始化
    if (!this.isInitialized) {
      this.init()
    }

    const wsOptions = {
      ...this.assistantOptions,
      ...options,
      onMessage: (data) => {
        if (this.onMessage) this.onMessage(data)
      },
      onConnected: () => {
        if (this.onStateChange) this.onStateChange('connected')
      },
      onDisconnected: () => {
        if (this.onStateChange) this.onStateChange('disconnected')
      },
      onError: (error) => {
        console.error('[AIAssistantService] WebSocket 错误:', error)
        if (this.onStateChange) this.onStateChange('error')
      }
    }

    // 初始化 WebSocket
    this.websocket = new AIAssistantWebSocket(wsOptions)

    try {
      // 连接 WebSocket
      await this.websocket.connect()

      // 根据录音来源选择录音方式
      if (this.recordingSource === RECORDING_SOURCE.COMPUTER) {
        // 电脑录音
        this.websocket.sendListenStart()
        await this.recorder.start()
      } else {
        // 鼠标录音 - 监听设备音频数据
        const mouseResult = await this.startMouseRecording()
        if (!mouseResult) {
          throw new Error('鼠标录音启动失败')
        }
        this.websocket.sendListenStart()
      }

      this.isRunning = true
      if (this.onStateChange) this.onStateChange('recording')
    } catch (error) {
      console.error('[AIAssistantService] 启动失败:', error)
      this.stop()
      throw error
    }
  }

  /**
   * 开始监听鼠标录音（SDK 音频数据回调）
   */
  async startMouseRecording() {
    // 获取当前设备ID
    const deviceState = await window.api?.device?.getCurrentState()
    const deviceId = deviceState?.deviceId

    if (!deviceId) {
      console.error('[AIAssistantService] 无法获取设备ID，鼠标录音启动失败')
      return false
    }

    // 保存设备ID以便停止时使用
    this.currentDeviceId = deviceId

    // 启用鼠标麦克风
    const micResult = await window.api?.device?.setMicEnable(deviceId, 1)

    if (!micResult) {
      console.error('[AIAssistantService] 启用鼠标麦克风失败')
      return false
    }

    // 创建音频数据处理函数
    this.audioDataHandler = (data) => {
      const { audioData } = data

      if (audioData && this.websocket && this.websocket.isConnected()) {
        // 鼠标 SDK 回调的数据可能是 Buffer（通过 IPC 变成 Uint8Array）
        // 格式：PCM 16000Hz 16bit 单声道
        // 将音频数据发送到 WebSocket（websocket.sendAudio 会处理格式转换）
        this.websocket.sendAudio(audioData)
      }
    }

    // 注册监听
    window.api?.device?.onAudioData(this.audioDataHandler)
    return true
  }

  /**
   * 停止鼠标录音监听
   */
  async stopMouseRecording() {
    // 移除音频数据监听
    if (this.audioDataHandler) {
      window.api?.device?.removeAudioDataListener()
      this.audioDataHandler = null
    }

    // 禁用鼠标麦克风
    if (this.currentDeviceId) {
      await window.api?.device?.setMicEnable(this.currentDeviceId, 0)
      this.currentDeviceId = null
    }
  }

  /**
   * 停止 AI 语音助手
   */
  async stop() {
    if (!this.isRunning && !this.websocket) {
      return
    }

    // 发送录音停止消息
    if (this.websocket && this.websocket.isConnected()) {
      this.websocket.sendListenStop()
    }

    // 根据录音来源停止录音
    if (this.recordingSource === RECORDING_SOURCE.COMPUTER) {
      // 停止电脑录音
      if (this.recorder) {
        await this.recorder.stop()
      }
    } else {
      // 停止鼠标录音
      await this.stopMouseRecording()
    }

    // 断开 WebSocket
    if (this.websocket) {
      this.websocket.disconnect()
      this.websocket = null
    }

    this.isRunning = false
    if (this.onStateChange) this.onStateChange('stopped')
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
export { AIAssistantWebSocket } from './websocket'

// 创建单例
let aiAssistantInstance = null

/**
 * 获取 AI 语音助手服务实例
 */
export function getAIAssistantService() {
  if (!aiAssistantInstance) {
    aiAssistantInstance = new AIAssistantService()
  }
  return aiAssistantInstance
}

// 导出单例实例
export const aiAssistantService = getAIAssistantService()
