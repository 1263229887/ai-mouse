/**
 * AI 语音助手 WebSocket 模块
 * 负责与 AI 语音助手服务端通信
 * 参照 temp/websocket_test_old/old_test_page.html 协议格式
 * 支持 PCM 转 Opus 编码
 */

import { OpusEncoder } from './opusEncoder'

/**
 * AI 语音助手 WebSocket 服务类
 */
export class AIAssistantWebSocket {
  constructor(options = {}) {
    this.ws = null
    this.url = options.url || import.meta.env.VITE_AI_ASSISTANT_WS_URL
    this.onMessage = options.onMessage || null
    this.onConnected = options.onConnected || null
    this.onDisconnected = options.onDisconnected || null
    this.onError = options.onError || null
    // 保存初始配置参数
    this.initOptions = options
    // 会话 ID（从服务端 hello 响应获取）
    this.sessionId = null
    // Opus 编码器
    this.opusEncoder = null
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

      if (!this.url) {
        const error = new Error('WebSocket URL 未配置，请检查环境变量 VITE_AI_ASSISTANT_WS_URL')
        console.error('[AIAssistantWS]', error.message)
        reject(error)
        return
      }

      this.ws = new WebSocket(this.url)
      // 设置接收二进制数据的类型为 ArrayBuffer
      this.ws.binaryType = 'arraybuffer'

      this.ws.onopen = async () => {
        // 初始化 Opus 编码器
        this._initOpusEncoder()
        // 发送 hello 握手消息
        const helloSuccess = await this._sendHelloMessage()
        if (helloSuccess) {
          if (this.onConnected) this.onConnected()
          resolve()
        } else {
          reject(new Error('hello 握手失败'))
        }
      }

      this.ws.onmessage = (event) => {
        // 处理二进制消息（服务端返回的音频数据）
        if (event.data instanceof ArrayBuffer) {
          console.log('[AIAssistantWS] 收到二进制音频数据:', event.data.byteLength, '字节')
          if (this.onMessage) this.onMessage({ type: 'audio_data', data: event.data })
          return
        }

        // 处理文本消息
        try {
          const data = JSON.parse(event.data)
          console.log('[AIAssistantWS] 收到消息:', data)
          if (this.onMessage) this.onMessage(data)
        } catch {
          console.log('[AIAssistantWS] 非JSON消息:', event.data)
          if (this.onMessage) this.onMessage(event.data)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[AIAssistantWS] 连接错误:', error)
        if (this.onError) this.onError(error)
        reject(error)
      }

      this.ws.onclose = () => {
        if (this.onDisconnected) this.onDisconnected()
      }
    })
  }

  /**
   * 初始化 Opus 编码器
   */
  _initOpusEncoder() {
    try {
      this.opusEncoder = new OpusEncoder()
      const success = this.opusEncoder.init()
      if (!success) {
        this.opusEncoder = null
      }
    } catch (error) {
      console.error('[AIAssistantWS] Opus 编码器初始化异常:', error)
      this.opusEncoder = null
    }
  }

  /**
   * 发送 hello 握手消息
   */
  async _sendHelloMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false

    // 构建 hello 消息
    const helloMessage = {
      type: 'hello',
      version: 1,
      transport: 'websocket',
      audio_params: {
        format: 'opus',
        sample_rate: 16000,
        channels: 1,
        frame_duration: 60
      },

      extend_params: {
        language: 'ZH',
        user_id: '1947150171772293120',
        last_reply: '',
        is_say_hello_play: false,
        speaker_id: '1',
        en_speaker_id: '13',
        system_prompt:
          '请扮演由大拿(Dana)开发团队所创建的智能助手，名字叫做小拿。无论在何种情况下，你都需要记住自己的身份，但在对话过程中无需特别强调这一点。当前时间为：${date_time} ${weeks}。 \n注意事项：\n1、请使用中文简体进行回复。 \n2、回答时不得使用任何不礼貌不耐烦或冒犯性的语言。\n3、对待用户要始终保持友好和尊重的态度，将用户视为你的主人。 \n4、回复风格应符合人机交互的标准模式，避免过于口语化或非正式的表达方式。',
        is_asr_online: true,
        // scene_id: '2011376998588403714',
        scene_id: '2011378369609912321',
        length_scale: '1.0',
        asr_version: 'v2',
        company_id: '1854468734006071297'
      }
    }

    console.log('[AIAssistantWS] 发送 hello:', helloMessage)
    this.ws.send(JSON.stringify(helloMessage))

    // 等待服务器 hello 响应
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.error('[AIAssistantWS] 等待 hello 响应超时')
        resolve(false)
      }, 5000)

      const onMessageHandler = (event) => {
        try {
          if (event.data instanceof ArrayBuffer) return // 忽略二进制消息

          const response = JSON.parse(event.data)
          if (response.type === 'hello' && response.session_id) {
            this.sessionId = response.session_id
            clearTimeout(timeout)
            this.ws.removeEventListener('message', onMessageHandler)
            resolve(true)
          }
        } catch {
          // 忽略非 JSON 消息
        }
      }

      this.ws.addEventListener('message', onMessageHandler)
    })
  }

  /**
   * 发送录音开始消息
   */
  sendListenStart() {
    // 暂时注释，等服务端确认后再启用
    // const message = {
    //   type: 'listen',
    //   mode: 'manual',
    //   state: 'start'
    // }
    // this.sendMessage(message)
  }

  /**
   * 发送录音停止消息
   */
  sendListenStop() {
    // 刷新 Opus 编码器剩余数据
    if (this.opusEncoder && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const lastFrame = this.opusEncoder.flush()
      if (lastFrame) {
        this.ws.send(lastFrame.buffer)
      }
    }

    // 发送空帧作为结束标志
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const emptyFrame = new Uint8Array(0)
      this.ws.send(emptyFrame)
    }

    // 暂时注释，等服务端确认后再启用
    // const message = {
    //   type: 'listen',
    //   mode: 'manual',
    //   state: 'stop'
    // }
    // this.sendMessage(message)
  }

  /**
   * 发送音频数据（自动编码为 Opus）
   * @param {ArrayBuffer|Uint8Array|Int16Array|Buffer|Object} audioData - PCM 音频数据
   */
  sendAudio(audioData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        // 确保数据是 Int16Array 格式
        let int16Data

        if (audioData instanceof Int16Array) {
          int16Data = audioData
        } else if (audioData instanceof ArrayBuffer) {
          int16Data = new Int16Array(audioData)
        } else if (audioData instanceof Uint8Array) {
          // Uint8Array 或通过 IPC 传递的 Buffer
          int16Data = new Int16Array(
            audioData.buffer,
            audioData.byteOffset,
            audioData.byteLength / 2
          )
        } else if (audioData && typeof audioData === 'object') {
          // 处理通过 IPC 传递的 Buffer-like 对象
          // IPC 传递后可能变成普通对象，需要转换
          let uint8Data
          if (audioData.data) {
            // { type: 'Buffer', data: [...] } 格式
            uint8Data = new Uint8Array(audioData.data)
          } else if (Array.isArray(audioData)) {
            // 纯数组格式
            uint8Data = new Uint8Array(audioData)
          } else {
            console.warn('[AIAssistantWS] 未知的音频数据对象格式:', typeof audioData)
            return
          }
          int16Data = new Int16Array(
            uint8Data.buffer,
            uint8Data.byteOffset,
            uint8Data.byteLength / 2
          )
        } else {
          console.warn('[AIAssistantWS] 未知的音频数据格式:', typeof audioData)
          return
        }

        // 如果 Opus 编码器可用，编码后发送
        if (this.opusEncoder) {
          const opusFrames = this.opusEncoder.process(int16Data)
          for (const frame of opusFrames) {
            this.ws.send(frame.buffer)
          }
        } else {
          // 没有 Opus 编码器，直接发送 PCM
          this.ws.send(int16Data.buffer)
        }
      } catch (error) {
        console.error('[AIAssistantWS] 音频发送失败:', error)
      }
    }
  }

  /**
   * 发送文字消息（参照 old_test_page.html 的 sendTextMessage）
   * @param {string} text - 文字内容
   */
  sendTextToAI(text) {
    if (!text || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      type: 'listen',
      mode: 'manual',
      state: 'detect',
      text: text
    }
    console.log('[AIAssistantWS] 发送文字:', message)
    this.ws.send(JSON.stringify(message))
  }

  /**
   * 发送 JSON 消息
   * @param {object} message - 消息对象
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    // 清理 Opus 编码器
    if (this.opusEncoder) {
      this.opusEncoder.destroy()
      this.opusEncoder = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.sessionId = null
  }

  /**
   * 获取连接状态
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }
}
