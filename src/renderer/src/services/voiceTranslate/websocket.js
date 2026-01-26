/**
 * 语音翻译 WebSocket 模块
 * 负责与语音翻译服务端通信
 */

/**
 * 语音翻译 WebSocket 服务类
 */
export class VoiceTranslateWebSocket {
  constructor(options = {}) {
    this.ws = null
    this.url = options.url || import.meta.env.VITE_VOICE_INPUT_WS_URL
    this.onMessage = options.onMessage || null
    this.onConnected = options.onConnected || null
    this.onDisconnected = options.onDisconnected || null
    this.onError = options.onError || null
    // 保存初始配置参数
    this.initOptions = options
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

      console.log('[VoiceTranslateWS] 连接:', this.url)
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('[VoiceTranslateWS] 连接成功')
        // 发送初始配置
        this._sendInitConfig()
        if (this.onConnected) this.onConnected()
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[VoiceTranslateWS] 收到消息:', data)
          if (this.onMessage) this.onMessage(data)
        } catch {
          console.log('[VoiceTranslateWS] 收到原始消息:', event.data)
          if (this.onMessage) this.onMessage(event.data)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[VoiceTranslateWS] 连接错误:', error)
        if (this.onError) this.onError(error)
        reject(error)
      }

      this.ws.onclose = () => {
        console.log('[VoiceTranslateWS] 连接关闭')
        if (this.onDisconnected) this.onDisconnected()
      }
    })
  }

  /**
   * 发送初始配置
   */
  _sendInitConfig() {
    const options = this.initOptions
    // 直接使用传入的配置，不提供默认值
    const config = {
      chunk_size: options.chunk_size || [5, 10, 5],
      wav_name: options.wav_name || 'h5',
      is_speaking: options.is_speaking ?? true,
      chunk_interval: options.chunk_interval || 10,
      mode: options.mode,
      language_id: options.language_id,
      is_denoiser: options.is_denoiser,
      originalCode: options.originalCode,
      sourceLanguage: options.sourceLanguage,
      targetLanguage: options.targetLanguage,
      openTranslate: options.openTranslate,
      openTts: options.openTts,
      timbre: options.timbre,
      conversationId: options.conversationId,
      is_use_timestamp_model: options.is_use_timestamp_model,
      stopInterval: options.stopInterval,
      ...options.extraParams
    }

    console.log('[VoiceTranslateWS] 发送初始配置:', config)
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
      console.log('[VoiceTranslateWS] 发送停止信号:', stopConfig)
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
