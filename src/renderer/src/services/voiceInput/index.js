/**
 * 语音输入服务
 * 整合录音器和 WebSocket，提供语音输入功能
 */

import { VoiceRecorder } from './recorder'
import { VoiceInputWebSocket } from './websocket'

/**
 * 语音输入服务类
 */
export class VoiceInputService {
  constructor() {
    this.recorder = null
    this.websocket = null
    this.isRunning = false
    this.onMessage = null // 服务端消息回调
    this.onStateChange = null // 状态变化回调
  }

  /**
   * 初始化服务
   */
  init() {
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
    console.log('[VoiceInputService] 初始化完成')
  }

  /**
   * 开始语音输入
   */
  async start() {
    if (this.isRunning) {
      console.warn('[VoiceInputService] 已在运行中')
      return
    }

    // 初始化 WebSocket
    this.websocket = new VoiceInputWebSocket({
      onMessage: (data) => {
        if (this.onMessage) this.onMessage(data)
      },
      onConnected: () => {
        console.log('[VoiceInputService] WebSocket 已连接')
        if (this.onStateChange) this.onStateChange('connected')
      },
      onDisconnected: () => {
        console.log('[VoiceInputService] WebSocket 已断开')
        if (this.onStateChange) this.onStateChange('disconnected')
      },
      onError: (error) => {
        console.error('[VoiceInputService] WebSocket 错误:', error)
        if (this.onStateChange) this.onStateChange('error')
      }
    })

    try {
      // 连接 WebSocket
      await this.websocket.connect()

      // 开始录音
      await this.recorder.start()

      this.isRunning = true
      if (this.onStateChange) this.onStateChange('recording')

      console.log('[VoiceInputService] 开始语音输入')
    } catch (error) {
      console.error('[VoiceInputService] 启动失败:', error)
      this.stop()
      throw error
    }
  }

  /**
   * 停止语音输入
   */
  async stop() {
    if (!this.isRunning && !this.websocket) {
      return
    }

    // 停止录音
    if (this.recorder) {
      await this.recorder.stop()
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

    console.log('[VoiceInputService] 停止语音输入')
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
  }

  /**
   * 获取运行状态
   */
  getIsRunning() {
    return this.isRunning
  }
}

// 导出模块
export { VoiceRecorder } from './recorder'
export { VoiceInputWebSocket } from './websocket'

// 创建单例
let voiceInputInstance = null

/**
 * 获取语音输入服务实例
 */
export function getVoiceInputService() {
  if (!voiceInputInstance) {
    voiceInputInstance = new VoiceInputService()
  }
  return voiceInputInstance
}
