/**
 * AI鼠标语音识别工具类
 * 基于AI鼠标硬件SDK获取音频数据，通过WebSocket发送到语音识别服务
 * 
 * 与旧版 speechRecognition.js 的区别：
 * - 旧版：使用浏览器 Web Audio API 录音（RecorderCore）
 * - 新版：接收来自AI鼠标硬件的音频数据（通过主进程IPC传递）
 */

// 获取日志器
const getLogger = () => {
  if (window.api && window.api.logger) {
    return window.api.logger
  }
  // 回退到 console
  return {
    info: (source, message, data) => console.log(`[${source}] ${message}`, data),
    debug: (source, message, data) => console.log(`[${source}] ${message}`, data),
    warn: (source, message, data) => console.warn(`[${source}] ${message}`, data),
    error: (source, message, data) => console.error(`[${source}] ${message}`, data)
  }
}

class MouseSpeechRecognition {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.messageMap = new Map() // 存储不同 id 的消息
    this.onTextCallback = null
    this.onErrorCallback = null
    this.onStateChangeCallback = null
    this.onStatusDetailCallback = null

    // 音频相关
    this.isRecording = false
    this.sampleBuffer = new Int16Array(0) // 音频数据缓冲区
    this.chunkSize = 1920 // 每次发送的数据大小 (120ms @ 16kHz)
    this.audioDataListener = null // IPC音频数据监听器
    
    // 状态跟踪
    this.statusDetail = {
      mouseConnected: false,      // 鼠标设备是否已连接
      microphoneEnabled: false,   // 鼠标麦克风是否已启用
      recorderStarted: false,     // 是否正在接收音频
      wsConnecting: false,
      wsConnected: false,
      wsSentInitConfig: false,
      audioChunksSent: 0,
      lastError: null
    }
    
    const logger = getLogger()
    logger.info('MouseSpeechRecognition', '实例已创建')
  }

  /**
   * 更新状态详情并通知回调
   */
  updateStatus(key, value) {
    this.statusDetail[key] = value
    this.onStatusDetailCallback?.(this.statusDetail)
    const logger = getLogger()
    logger.debug('MouseSpeechRecognition', `状态更新: ${key}`, value)
  }

  /**
   * 连接 WebSocket 服务器并开始接收鼠标音频
   * @param {string} wsUrl - WebSocket 服务器地址
   * @param {object} options - 配置选项
   */
  async connect(wsUrl, options = {}) {
    const logger = getLogger()
    logger.info('MouseSpeechRecognition', '开始连接', { wsUrl, options })
    
    try {
      // 检查鼠标SDK状态
      const sdkStatus = await window.api.mouseSDK.getSDKStatus()
      logger.info('MouseSpeechRecognition', 'SDK状态', sdkStatus)
      
      this.updateStatus('mouseConnected', sdkStatus.isConnected)
      
      if (!sdkStatus.isInitialized) {
        const error = new Error('AI鼠标SDK未初始化')
        this.updateStatus('lastError', error.message)
        throw error
      }

      if (!sdkStatus.isConnected) {
        const error = new Error('AI鼠标设备未连接')
        this.updateStatus('lastError', error.message)
        throw error
      }

      // 连接 WebSocket
      logger.info('MouseSpeechRecognition', '正在连接 WebSocket...', { wsUrl })
      this.updateStatus('wsConnecting', true)
      await this.connectWebSocket(wsUrl, options)
      this.updateStatus('wsConnecting', false)
      this.updateStatus('wsConnected', true)
      logger.info('MouseSpeechRecognition', 'WebSocket 已连接')

      // 启用鼠标麦克风
      logger.info('MouseSpeechRecognition', '启用鼠标麦克风...')
      const micResult = await window.api.mouseSDK.setMicrophoneEnable(true)
      this.updateStatus('microphoneEnabled', micResult)
      
      if (!micResult) {
        logger.warn('MouseSpeechRecognition', '启用麦克风可能失败，但继续尝试接收音频')
      }

      // 开始监听音频数据
      this.startReceivingAudio()
      this.updateStatus('recorderStarted', true)
      logger.info('MouseSpeechRecognition', '语音识别已启动')
    } catch (error) {
      logger.error('MouseSpeechRecognition', '启动失败', { 
        message: error.message, 
        stack: error.stack,
        status: this.statusDetail 
      })
      this.updateStatus('lastError', error.message)
      this.onErrorCallback?.(error)
      throw error
    }
  }

  /**
   * 连接 WebSocket
   */
  connectWebSocket(wsUrl, options = {}) {
    const logger = getLogger()
    return new Promise((resolve, reject) => {
      try {
        logger.info('MouseSpeechRecognition', '创建 WebSocket 连接', { wsUrl })
        
        // 验证 URL 格式
        if (!wsUrl || (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://'))) {
          const error = new Error(`无效的 WebSocket URL: ${wsUrl}`)
          logger.error('MouseSpeechRecognition', 'URL 格式错误', { wsUrl })
          reject(error)
          return
        }
        
        // 开发环境下使用vite代理
        let actualWsUrl = wsUrl
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          const port = window.location.port || '5173'
          // 根据原始 URL 判断使用哪个代理路径
          if (wsUrl.includes('/asr/speechTranslate')) {
            // 翻译服务
            actualWsUrl = `ws://${window.location.hostname}:${port}/ws-translate`
            logger.info('MouseSpeechRecognition', '开发环境使用翻译代理', { originalUrl: wsUrl, proxyUrl: actualWsUrl })
          } else {
            // 语音识别服务
            actualWsUrl = `ws://${window.location.hostname}:${port}/ws-asr`
            logger.info('MouseSpeechRecognition', '开发环境使用识别代理', { originalUrl: wsUrl, proxyUrl: actualWsUrl })
          }
        }
        
        // 设置超时
        const timeout = setTimeout(() => {
          const error = new Error('WebSocket 连接超时 (10秒)')
          logger.error('MouseSpeechRecognition', 'WebSocket 连接超时')
          this.updateStatus('lastError', error.message)
          reject(error)
        }, 10000)
        
        logger.info('MouseSpeechRecognition', '正在创建 WebSocket 对象...', { actualWsUrl })
        this.ws = new WebSocket(actualWsUrl)
        logger.info('MouseSpeechRecognition', 'WebSocket 对象已创建', { readyState: this.ws.readyState })

        this.ws.onopen = () => {
          clearTimeout(timeout)
          logger.info('MouseSpeechRecognition', 'WebSocket 连接成功')
          this.isConnected = true

          // 发送初始化配置
          const config = {
            chunk_size: [5, 10, 5],
            wav_name: 'h5',
            is_speaking: true,
            chunk_interval: 10,
            mode: options.mode || '2pass',
            language_id: options.language || 'ZH',
            is_denoiser: options.denoiser || false,
            originalCode: options.originalCode || 'ZH',
            sourceLanguage: options.sourceLanguage || 'EN',
            targetLanguage: options.targetLanguage || 'EN',
            openTranslate: options.openTranslate ?? true,
            openTts: options.openTts ?? true,
            timbre: options.timbre || '1',
            conversationId: options.conversationId || '1111',
            is_use_timestamp_model: options.is_use_timestamp_model || false,
            stopInterval: options.stopInterval || '1500',
            ...options.extraParams
          }

          logger.info('MouseSpeechRecognition', '发送初始化配置', config)
          this.ws.send(JSON.stringify(config))
          this.updateStatus('wsSentInitConfig', true)
          this.onStateChangeCallback?.(0) // 连接成功
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeout)
          const errorInfo = {
            type: error.type,
            message: error.message || 'Unknown WebSocket error',
            wsUrl,
            readyState: this.ws?.readyState,
            readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.ws?.readyState] || 'UNKNOWN'
          }
          logger.error('MouseSpeechRecognition', 'WebSocket 错误', errorInfo)
          this.isConnected = false
          this.updateStatus('wsConnected', false)
          this.updateStatus('lastError', `WebSocket 错误: ${errorInfo.readyStateText}`)
          this.onStateChangeCallback?.(2) // 连接错误
          this.onErrorCallback?.(new Error(`WebSocket 连接失败: ${errorInfo.readyStateText}`))
          reject(new Error(`WebSocket 连接失败: ${errorInfo.readyStateText}`))
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeout)
          logger.info('MouseSpeechRecognition', 'WebSocket 连接关闭', { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean
          })
          this.isConnected = false
          this.updateStatus('wsConnected', false)
          this.onStateChangeCallback?.(1) // 连接关闭
        }
      } catch (error) {
        logger.error('MouseSpeechRecognition', '连接失败', { message: error.message })
        this.updateStatus('lastError', error.message)
        reject(error)
      }
    })
  }

  /**
   * 开始接收鼠标音频数据
   */
  startReceivingAudio() {
    const logger = getLogger()
    if (this.isRecording) {
      logger.warn('MouseSpeechRecognition', '已在接收音频中')
      return
    }

    logger.info('MouseSpeechRecognition', '开始接收鼠标音频数据')
    this.isRecording = true
    this.sampleBuffer = new Int16Array(0)

    // 监听来自主进程的音频数据
    this.audioDataListener = window.api.mouseSDK.onAudioData(({ audioBuffer, length }) => {
      if (!this.isRecording || !this.isConnected) {
        return
      }
      
      // audioBuffer 通过 IPC 传递后可能被序列化为普通对象
      // 需要将其转换回 ArrayBuffer
      let rawData
      if (audioBuffer instanceof ArrayBuffer) {
        rawData = new Uint8Array(audioBuffer)
      } else if (audioBuffer instanceof Uint8Array) {
        rawData = audioBuffer
      } else if (audioBuffer && audioBuffer.data) {
        // IPC 序列化后的 Buffer 格式: { type: 'Buffer', data: [...] }
        rawData = new Uint8Array(audioBuffer.data)
      } else if (Array.isArray(audioBuffer)) {
        rawData = new Uint8Array(audioBuffer)
      } else {
        // 尝试直接使用
        rawData = new Uint8Array(audioBuffer)
      }
      
      // SDK 返回的是 16bit PCM 音频的字节数据
      // 转换为 Int16Array：每 2 个字节 = 1 个采样点
      const pcmData = new Int16Array(rawData.buffer, rawData.byteOffset, Math.floor(rawData.length / 2))
      
      // 每收到50个包打印一次详细调试信息
      if (this.statusDetail.audioChunksSent % 50 === 0) {
        const logger = getLogger()
        // 打印原始数据的前20个字节用于分析头部格式
        const headerBytes = Array.from(rawData.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')
        // 打印PCM数据的前几个采样值
        const sampleValues = Array.from(pcmData.slice(0, 5))
        // 计算音频振幅（检查数据是否有效）
        const maxAmplitude = Math.max(...Array.from(pcmData.slice(0, 100)).map(Math.abs))
        logger.info('MouseSpeechRecognition', '收到音频数据（调试）', { 
          rawLength: rawData.length,
          headerBytes,
          pcmLength: pcmData.length,
          sampleValues,
          maxAmplitude,
          chunksSent: this.statusDetail.audioChunksSent 
        })
      }
      
      this.handleAudioData(pcmData)
    })

    this.updateStatus('recorderStarted', true)
  }

  /**
   * 处理音频数据
   */
  handleAudioData(pcmData) {
    if (!this.isRecording || !this.isConnected) {
      return
    }

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
      // 更新发送统计
      this.statusDetail.audioChunksSent++
    }
  }

  /**
   * 处理接收到的消息
   * @param {MessageEvent} event - WebSocket 消息事件
   */
  handleMessage(event) {
    const logger = getLogger()
    try {
      const data = JSON.parse(event.data)
      const { id, text, is_final, mode, end, channel } = data

      logger.debug('MouseSpeechRecognition', '收到消息', data)

      // 检查是否是服务端的结束消息（is_final: true）
      if (is_final === true) {
        logger.info('MouseSpeechRecognition', '收到服务端结束消息', data)
        // 合并所有消息
        const fullText = Array.from(this.messageMap.values()).join('')
        // 回调传递完整文本和is_final标志
        this.onTextCallback?.(fullText, {
          id,
          text: fullText,
          is_final: true,
          mode,
          end,
          channel
        })
        return
      }

      // 根据 id 处理普通识别消息
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
      logger.error('MouseSpeechRecognition', '解析消息失败', { message: error.message })
      this.onErrorCallback?.(error)
    }
  }

  /**
   * 发送音频数据
   * @param {ArrayBuffer|Uint8Array|Int16Array} audioData - 音频数据
   */
  sendAudio(audioData) {
    const logger = getLogger()
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      // 每发送10个包打印一次日志
      if (this.statusDetail.audioChunksSent % 10 === 0) {
        logger.info('MouseSpeechRecognition', '发送音频数据到WebSocket', {
          chunkIndex: this.statusDetail.audioChunksSent,
          dataLength: audioData.length,
          byteLength: audioData.byteLength,
          wsReadyState: this.ws.readyState
        })
      }
      this.ws.send(audioData)
    } else {
      logger.warn('MouseSpeechRecognition', 'WebSocket 未连接，无法发送音频数据', {
        wsExists: !!this.ws,
        isConnected: this.isConnected,
        readyState: this.ws?.readyState
      })
    }
  }

  /**
   * 停止接收音频并发送结束消息
   */
  stop() {
    const logger = getLogger()
    logger.info('MouseSpeechRecognition', '停止接收音频', {
      totalChunksSent: this.statusDetail.audioChunksSent,
      remainingBuffer: this.sampleBuffer.length
    })
    
    // 停止接收音频
    this.isRecording = false
    this.updateStatus('recorderStarted', false)
    
    // 禁用鼠标麦克风
    window.api.mouseSDK.setMicrophoneEnable(false).then(() => {
      logger.info('MouseSpeechRecognition', '鼠标麦克风已禁用')
    }).catch((err) => {
      logger.warn('MouseSpeechRecognition', '禁用麦克风失败', { error: err.message })
    })

    // 发送剩余的音频数据
    if (this.sampleBuffer.length > 0 && this.isConnected) {
      logger.info('MouseSpeechRecognition', '发送剩余音频数据', { length: this.sampleBuffer.length })
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
        mode: '2pass',
        max_end_silence_time: 500
      }
      logger.info('MouseSpeechRecognition', '发送停止消息', stopMessage)
      this.ws.send(JSON.stringify(stopMessage))
    }
  }

  /**
   * 关闭连接并释放资源
   */
  close() {
    const logger = getLogger()
    logger.info('MouseSpeechRecognition', '关闭连接并释放资源')
    
    // 停止接收音频
    this.isRecording = false
    this.sampleBuffer = new Int16Array(0)

    // 移除音频数据监听
    if (window.api?.mouseSDK) {
      window.api.mouseSDK.removeAudioDataListener()
      // 禁用麦克风
      window.api.mouseSDK.setMicrophoneEnable(false).catch(() => {})
    }

    // 关闭 WebSocket
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }

    // 清空消息缓存
    this.messageMap.clear()
    
    // 重置状态
    this.statusDetail = {
      mouseConnected: false,
      microphoneEnabled: false,
      recorderStarted: false,
      wsConnecting: false,
      wsConnected: false,
      wsSentInitConfig: false,
      audioChunksSent: 0,
      lastError: null
    }
    
    logger.info('MouseSpeechRecognition', '资源已释放')
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

  /**
   * 设置详细状态回调
   * @param {Function} callback - 回调函数 (statusDetail) => {}
   */
  onStatusDetail(callback) {
    this.onStatusDetailCallback = callback
  }

  /**
   * 获取当前状态详情
   */
  getStatusDetail() {
    return this.statusDetail
  }
}

export default MouseSpeechRecognition
