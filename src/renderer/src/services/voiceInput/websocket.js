/**
 * 语音输入 WebSocket 模块
 * 负责与语音识别服务端通信
 */

/**
 * 语音输入 WebSocket 服务类
 */
export class VoiceInputWebSocket {
  constructor(options = {}) {
    this.ws = null
    this.url = options.url || import.meta.env.VITE_VOICE_INPUT_WS_URL
    this.onMessage = options.onMessage || null
    this.onConnected = options.onConnected || null
    this.onDisconnected = options.onDisconnected || null
    this.onError = options.onError || null
  }

  /**
   * 连接 WebSocket
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      console.log('[VoiceInputWS] 连接:', this.url)
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('[VoiceInputWS] 连接成功')
        // 发送初始配置
        this._sendInitConfig()
        if (this.onConnected) this.onConnected()
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[VoiceInputWS] 收到消息:', data)
          if (this.onMessage) this.onMessage(data)
        } catch {
          console.log('[VoiceInputWS] 收到原始消息:', event.data)
          if (this.onMessage) this.onMessage(event.data)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[VoiceInputWS] 连接错误:', error)
        if (this.onError) this.onError(error)
        reject(error)
      }

      this.ws.onclose = () => {
        console.log('[VoiceInputWS] 连接关闭')
        if (this.onDisconnected) this.onDisconnected()
      }
    })
  }

  /**
   * 发送初始配置
   */
  _sendInitConfig() {
    const config = {
      chunk_size: [5, 10, 5],
      wav_name: 'h5',
      is_speaking: true,
      chunk_interval: 10,
      mode: '2pass',
      is_denoiser: false,
      originalCode: 'ZH',
      sourceLanguage: 'ZH',
      targetLanguage: 'EN',
      openTranslate: true,
      openTts: true,
      timbre: '1',
      conversationId: Date.now().toString(),
      is_use_timestamp_model: false,
      stopInterval: '1500'
    }

    console.log('[VoiceInputWS] 发送初始配置:', config)
    this.ws.send(JSON.stringify(config))
  }

  /**
   * 发送音频数据
   * @param {Int16Array|ArrayBuffer} audioData - 音频数据
   */
  sendAudio(audioData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData)
    }
  }

  /**
   * 发送停止信号
   */
  sendStopSignal() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const stopConfig = {
        chunk_size: [5, 10, 5],
        wav_name: 'h5',
        is_speaking: false,
        chunk_interval: 30,
        mode: '2pass',
        max_end_silence_time: 500
      }
      console.log('[VoiceInputWS] 发送停止信号:', stopConfig)
      this.ws.send(JSON.stringify(stopConfig))
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 获取连接状态
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }
}
