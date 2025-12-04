/**
 * WebSocket 语音识别工具类
 * 基于 FunASR 实时语音识别服务
 */

class SpeechRecognition {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.messageMap = new Map() // 存储不同 id 的消息
    this.onTextCallback = null
    this.onErrorCallback = null
    this.onStateChangeCallback = null
  }

  /**
   * 连接 WebSocket 服务器
   * @param {string} wsUrl - WebSocket 服务器地址
   * @param {object} options - 配置选项
   */
  connect(wsUrl, options = {}) {
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
   * 停止识别
   */
  stop() {
    if (this.ws && this.isConnected) {
      const stopMessage = {
        chunk_size: [5, 10, 5],
        wav_name: 'h5',
        is_speaking: false,
        chunk_interval: 30,
        max_end_silence_time: 500
      }
      this.ws.send(JSON.stringify(stopMessage))
    }
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
      this.messageMap.clear()
    }
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
