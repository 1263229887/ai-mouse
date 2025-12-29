/**
 * WebSocket 语音识别工具类
 * 基于 FunASR 实时语音识别服务
 * 
 * ==================== 重要说明 ====================
 * 这是旧的录音方式，使用浏览器 Web Audio API (RecorderCore) 录音
 * 
 * 新的方式请使用 mouseSpeechRecognition.js
 * 新方式通过AI鼠标硬件SDK获取音频数据
 * 
 * 如果新方式有数据格式不对的问题，可以参考本文件的实现：
 * - 音频数据格式: 16kHz 采样率, 16bit PCM, 单声道
 * - 数据块大小: chunkSize = 1920 (120ms @ 16kHz)
 * - WebSocket初始化配置: 见 connectWebSocket 函数
 * - 停止消息格式: 见 stop 函数
 * 
 * 如果需要切换回这个旧方式，请在组件中修改导入：
 * - TypingWindow.vue: import SpeechRecognition from '../utils/speechRecognition.js'
 * - TranslateWindow.vue: import SpeechRecognition from '../utils/speechRecognition.js'
 * ==================== 重要说明 ====================
 */

import RecorderCore from './recorder.js'

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

class SpeechRecognition {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.messageMap = new Map() // 存储不同 id 的消息
    this.onTextCallback = null
    this.onErrorCallback = null
    this.onStateChangeCallback = null
    this.onStatusDetailCallback = null // 新增：详细状态回调

    // 录音相关
    this.recorder = null
    this.isRecording = false
    this.sampleBuffer = new Int16Array(0) // 音频数据缓冲区
    this.chunkSize = 1920 // 每次发送的数据大小 (120ms @ 16kHz)
    
    // 状态跟踪
    this.statusDetail = {
      recorderSupported: false,
      recorderOpened: false,
      recorderStarted: false,
      wsConnecting: false,
      wsConnected: false,
      wsSentInitConfig: false,
      audioChunksSent: 0,
      lastError: null
    }
    
    const logger = getLogger()
    logger.info('SpeechRecognition', '实例已创建')
  }

  /**
   * 更新状态详情并通知回调
   */
  updateStatus(key, value) {
    this.statusDetail[key] = value
    this.onStatusDetailCallback?.(this.statusDetail)
    const logger = getLogger()
    logger.debug('SpeechRecognition', `状态更新: ${key}`, value)
  }

  /**
   * 连接 WebSocket 服务器并开始录音
   * @param {string} wsUrl - WebSocket 服务器地址
   * @param {object} options - 配置选项
   */
  async connect(wsUrl, options = {}) {
    const logger = getLogger()
    logger.info('SpeechRecognition', '开始连接', { wsUrl, options })
    
    try {
      // 检查浏览器支持
      const isSupported = RecorderCore.Support()
      this.updateStatus('recorderSupported', isSupported)
      
      if (!isSupported) {
        const error = new Error('浏览器不支持录音')
        this.updateStatus('lastError', error.message)
        throw error
      }
      logger.info('SpeechRecognition', '浏览器支持录音检查通过')

      // 初始化录音器
      this.recorder = new RecorderCore({
        type: 'pcm',
        bitRate: 16,
        sampleRate: 16000,
        onProcess: (buffers, powerLevel, bufferDuration, bufferSampleRate, newBufferIdx, asyncEnd, resampledData) => {
          // 使用重采样后的数据
          if (resampledData && resampledData.length > 0) {
            this.handleAudioData(resampledData, powerLevel)
          }
        }
      })

      // 打开麦克风
      logger.info('SpeechRecognition', '正在打开麦克风...')
      await this.recorder.open()
      this.updateStatus('recorderOpened', true)
      logger.info('SpeechRecognition', '麦克风已打开')

      // 连接 WebSocket
      logger.info('SpeechRecognition', '正在连接 WebSocket...', { wsUrl })
      this.updateStatus('wsConnecting', true)
      await this.connectWebSocket(wsUrl, options)
      this.updateStatus('wsConnecting', false)
      this.updateStatus('wsConnected', true)
      logger.info('SpeechRecognition', 'WebSocket 已连接')

      // 开始录音
      this.startRecording()
      this.updateStatus('recorderStarted', true)
      logger.info('SpeechRecognition', '语音识别已启动')
    } catch (error) {
      const logger = getLogger()
      logger.error('SpeechRecognition', '启动失败', { 
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
        logger.info('SpeechRecognition', '创建 WebSocket 连接', { wsUrl })
        
        // 验证 URL 格式
        if (!wsUrl || (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://'))) {
          const error = new Error(`无效的 WebSocket URL: ${wsUrl}`)
          logger.error('SpeechRecognition', 'URL 格式错误', { wsUrl })
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
            logger.info('SpeechRecognition', '开发环境使用翻译代理', { originalUrl: wsUrl, proxyUrl: actualWsUrl })
          } else {
            // 语音识别服务
            actualWsUrl = `ws://${window.location.hostname}:${port}/ws-asr`
            logger.info('SpeechRecognition', '开发环境使用识别代理', { originalUrl: wsUrl, proxyUrl: actualWsUrl })
          }
        }
        
        // 设置超时
        const timeout = setTimeout(() => {
          const error = new Error('WebSocket 连接超时 (10秒)')
          logger.error('SpeechRecognition', 'WebSocket 连接超时')
          this.updateStatus('lastError', error.message)
          reject(error)
        }, 10000)
        
        logger.info('SpeechRecognition', '正在创建 WebSocket 对象...', { actualWsUrl })
        this.ws = new WebSocket(actualWsUrl)
        logger.info('SpeechRecognition', 'WebSocket 对象已创建', { readyState: this.ws.readyState })

        this.ws.onopen = () => {
          clearTimeout(timeout)
          logger.info('SpeechRecognition', 'WebSocket 连接成功')
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

          logger.info('SpeechRecognition', '发送初始化配置', config)
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
          // 尝试获取更详细的错误信息
          const errorInfo = {
            type: error.type,
            message: error.message || 'Unknown WebSocket error',
            wsUrl,
            readyState: this.ws?.readyState,
            readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.ws?.readyState] || 'UNKNOWN'
          }
          logger.error('SpeechRecognition', 'WebSocket 错误', errorInfo)
          this.isConnected = false
          this.updateStatus('wsConnected', false)
          this.updateStatus('lastError', `WebSocket 错误: ${errorInfo.readyStateText}`)
          this.onStateChangeCallback?.(2) // 连接错误
          this.onErrorCallback?.(new Error(`WebSocket 连接失败: ${errorInfo.readyStateText}`))
          reject(new Error(`WebSocket 连接失败: ${errorInfo.readyStateText}`))
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeout)
          logger.info('SpeechRecognition', 'WebSocket 连接关闭', { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean
          })
          this.isConnected = false
          this.updateStatus('wsConnected', false)
          this.onStateChangeCallback?.(1) // 连接关闭
        }
      } catch (error) {
        logger.error('SpeechRecognition', '连接失败', { message: error.message })
        this.updateStatus('lastError', error.message)
        reject(error)
      }
    })
  }

  /**
   * 开始录音
   */
  startRecording() {
    const logger = getLogger()
    if (this.recorder && !this.isRecording) {
      logger.info('SpeechRecognition', '开始录音')
      this.isRecording = true
      this.sampleBuffer = new Int16Array(0)
      this.recorder.start()
      this.updateStatus('recorderStarted', true)
    }
  }

  /**
   * 处理录音数据
   */
  handleAudioData(pcmData, powerLevel) {
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

      logger.debug('SpeechRecognition', '收到消息', data)

      // 检查是否是服务端的结束消息（is_final: true）
      if (is_final === true) {
        logger.info('SpeechRecognition', '收到服务端结束消息', data)
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
      const logger = getLogger()
      logger.error('SpeechRecognition', '解析消息失败', { message: error.message })
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
      const logger = getLogger()
      logger.warn('SpeechRecognition', 'WebSocket 未连接，无法发送音频数据', {
        wsExists: !!this.ws,
        isConnected: this.isConnected,
        readyState: this.ws?.readyState
      })
    }
  }

  /**
   * 停止录音并发送结束消息
   */
  stop() {
    const logger = getLogger()
    logger.info('SpeechRecognition', '停止录音')
    
    // 停止录音
    if (this.recorder && this.isRecording) {
      this.isRecording = false
      this.updateStatus('recorderStarted', false)
      this.recorder.stop(() => {
        logger.info('SpeechRecognition', '录音已停止')
      }, (err) => {
        logger.error('SpeechRecognition', '停止录音失败', { message: err?.message })
      })
    }

    // 发送剩余的音频数据
    if (this.sampleBuffer.length > 0 && this.isConnected) {
      logger.info('SpeechRecognition', '发送剩余音频数据', { length: this.sampleBuffer.length })
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
      logger.info('SpeechRecognition', '发送停止消息', stopMessage)
      this.ws.send(JSON.stringify(stopMessage))
    }
  }

  /**
   * 关闭连接并释放资源
   */
  close() {
    const logger = getLogger()
    logger.info('SpeechRecognition', '关闭连接并释放资源')
    
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
    
    // 重置状态
    this.statusDetail = {
      recorderSupported: false,
      recorderOpened: false,
      recorderStarted: false,
      wsConnecting: false,
      wsConnected: false,
      wsSentInitConfig: false,
      audioChunksSent: 0,
      lastError: null
    }
    
    logger.info('SpeechRecognition', '资源已释放')
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

export default SpeechRecognition
