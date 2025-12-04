/**
 * WebSocket 语音识别工具类
 * 基于 FunASR 实时语音识别服务
 */

import AudioRecorder from './audioRecorder.js'

class SpeechRecognition {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.messageMap = new Map() // 存储不同 id 的消息
    this.onTextCallback = null
    this.onErrorCallback = null
    this.onStateChangeCallback = null

    // 录音相关
    this.recorder = null
    this.isRecording = false
    this.sampleBuffer = new Int16Array(0) // 音频数据缓冲区
    this.chunkSize = 1920 // 每次发送的数据大小 (120ms @ 16kHz)
  }

  /**
   * 连接 WebSocket 服务器并开始录音
   * @param {string} wsUrl - WebSocket 服务器地址
   * @param {object} options - 配置选项
   */
  async connect(wsUrl, options = {}) {
    try {
      // 初始化录音器
      this.recorder = new AudioRecorder({ sampleRate: 16000 })

      // 设置录音数据处理回调
      this.recorder.onProcess((pcmData, powerLevel) => {
        this.handleAudioData(pcmData, powerLevel)
      })

      this.recorder.onError((error) => {
        console.error('录音错误:', error)
        this.onErrorCallback?.(error)
      })

      // 打开麦克风
      await this.recorder.open()

      // 连接 WebSocket
      await this.connectWebSocket(wsUrl, options)

      // 开始录音
      this.startRecording()

      console.log('语音识别已启动')
    } catch (error) {
      console.error('启动语音识别失败:', error)
      this.onErrorCallback?.(error)
      throw error
    }
  }

  /**
   * 连接 WebSocket
   */
  connectWebSocket(wsUrl, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket 连接成功')
          this.isConnected = true

          // 发送初始化配置
          const config = {
            chunk_size: [5, 10, 5],
            wav_name: 'h5',
            is_speaking: true,
            chunk_interval: 10,
            mode: options.mode || '2pass',
            language_id: options.language || 'ZH',
            max_end_silence_time: 500,
            is_denoiser: options.denoiser || false,
            ...options.extraParams
          }

          this.ws.send(JSON.stringify(config))
          this.onStateChangeCallback?.(0) // 连接成功
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error)
          this.isConnected = false
          this.onStateChangeCallback?.(2) // 连接错误
          this.onErrorCallback?.(error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket 连接关闭')
          this.isConnected = false
          this.onStateChangeCallback?.(1) // 连接关闭
        }
      } catch (error) {
        console.error('连接失败:', error)
        reject(error)
      }
    })
  }

  /**
   * 开始录音
   */
  startRecording() {
    if (this.recorder && !this.isRecording) {
      this.isRecording = true
      this.sampleBuffer = new Int16Array(0)
      this.recorder.start()
    }
  }

  /**
   * 处理录音数据
   */
  handleAudioData(pcmData, powerLevel) {
    if (!this.isRecording || !this.isConnected) return

    // 缓冲音频数据
    const newBuffer = new Int16Array(this.sampleBuffer.length + pcmData.length)
    newBuffer.set(this.sampleBuffer, 0)
    newBuffer.set(pcmData, this.sampleBuffer.length)
    this.sampleBuffer = newBuffer

    // 分块发送
    while (this.sampleBuffer.length >= this.chunkSize) {
      const sendBuffer = this.sampleBuffer.slice(0, this.chunkSize)
      this.sampleBuffer = this.sampleBuffer.slice(this.chunkSize)
      this.sendAudio(sendBuffer)
    }
  }

  /**
   * 处理接收到的消息
   * @param {MessageEvent} event - WebSocket 消息事件
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data)
      const { id, text, is_final, mode, end } = data

      console.log('收到消息:', data)

      // 根据 id 处理消息
      if (id !== undefined) {
        if (this.messageMap.has(id)) {
          // id 相同，替换文本
          this.messageMap.set(id, text)
        } else {
          // id 不同，追加新消息
          this.messageMap.set(id, text)
        }

        // 合并所有消息
        const fullText = Array.from(this.messageMap.values()).join('')

        // 回调传递完整文本和当前消息信息
        this.onTextCallback?.(fullText, {
          id,
          text,
          is_final,
          mode,
          end
        })
      }
    } catch (error) {
      console.error('解析消息失败:', error)
      this.onErrorCallback?.(error)
    }
  }

  /**
   * 发送音频数据
   * @param {ArrayBuffer|Uint8Array|Int16Array} audioData - 音频数据
   */
  sendAudio(audioData) {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData)
    } else {
      console.warn('WebSocket 未连接，无法发送音频数据')
    }
  }

  /**
   * 停止录音并发送结束消息
   */
  stop() {
    // 停止录音
    if (this.recorder && this.isRecording) {
      this.isRecording = false
      this.recorder.stop()
    }

    // 发送剩余的音频数据
    if (this.sampleBuffer.length > 0 && this.isConnected) {
      this.sendAudio(this.sampleBuffer)
      this.sampleBuffer = new Int16Array(0)
    }

    // 发送结束消息
    if (this.ws && this.isConnected) {
      const stopMessage = {
        chunk_size: [5, 10, 5],
        wav_name: 'h5',
        is_speaking: false,
        chunk_interval: 30,
        max_end_silence_time: 500
      }
      this.ws.send(JSON.stringify(stopMessage))
      console.log('已发送停止消息')
    }
  }

  /**
   * 关闭连接并释放资源
   */
  close() {
    // 停止录音
    if (this.recorder) {
      this.recorder.close()
      this.recorder = null
    }
    this.isRecording = false
    this.sampleBuffer = new Int16Array(0)

    // 关闭 WebSocket
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }

    // 清空消息缓存
    this.messageMap.clear()
  }

  /**
   * 清空消息缓存
   */
  clearMessages() {
    this.messageMap.clear()
  }

  /**
   * 设置文本回调
   * @param {Function} callback - 回调函数 (fullText, messageInfo) => {}
   */
  onText(callback) {
    this.onTextCallback = callback
  }

  /**
   * 设置错误回调
   * @param {Function} callback - 回调函数 (error) => {}
   */
  onError(callback) {
    this.onErrorCallback = callback
  }

  /**
   * 设置状态变化回调
   * @param {Function} callback - 回调函数 (state) => {}
   *                               state: 0-连接成功, 1-连接关闭, 2-连接错误
   */
  onStateChange(callback) {
    this.onStateChangeCallback = callback
  }
}

export default SpeechRecognition
