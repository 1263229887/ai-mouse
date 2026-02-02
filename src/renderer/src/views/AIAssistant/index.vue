<script setup>
/**
 * AIAssistant/index.vue - AI语音助手小窗口
 * 可移动、无最大化最小化、点击关闭停止录音
 */
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { getAIAssistantService } from '@/services'
import { useAIAssistantStore } from '@/stores'

// AI 语音助手服务实例
const aiAssistantService = getAIAssistantService()

// AI 助手配置 Store
const aiAssistantStore = useAIAssistantStore()

// 录音状态
const isRecording = ref(false)
const recordingStatus = ref('准备中...')

// 对话消息列表
const chatMessages = ref([])
// 消息容器引用（用于滚动和高度计算）
const messagesContainer = ref(null)

// 当前用户输入文字（实时更新）
const currentUserText = ref('')
// stt 累加文字（灰色显示）
const sttText = ref('')
// 当前 AI 回复文字
const currentAIText = ref('')
// 是否正在播放语音
const isPlaying = ref(false)

// 智能滚动控制
const userScrolledUp = ref(false) // 用户是否手动上滑了

// 窗口高度管理
let windowBounds = null

// 延迟启动状态
const isDelayStarting = ref(true)
const delayCountdown = ref(2)

// ============ 音频播放相关 ============
// 采样参数
const SAMPLE_RATE = 16000
const CHANNELS = 1
const FRAME_SIZE = 960
const BUFFER_THRESHOLD = 3 // 缓冲包数量阈值
const MIN_AUDIO_DURATION = 0.1 // 最小音频长度(秒)

let audioContext = null
let opusDecoder = null
let audioBufferQueue = [] // 存储接收到的音频包
let isAudioBuffering = false
let isAudioPlaying = false
let streamingContext = null

// 初始化音频上下文
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE
    })
  }
  return audioContext
}

// 初始化 Opus 解码器
const initOpusDecoder = async () => {
  if (opusDecoder) return opusDecoder

  try {
    // 检查 libopus 是否已加载
    if (typeof window.Module === 'undefined') {
      throw new Error('Opus库未加载')
    }

    const mod = window.Module.instance || window.Module
    if (typeof mod._opus_decoder_get_size !== 'function') {
      throw new Error('Opus解码函数未找到')
    }

    // 创建解码器对象
    opusDecoder = {
      channels: CHANNELS,
      rate: SAMPLE_RATE,
      frameSize: FRAME_SIZE,
      module: mod,
      decoderPtr: null,

      init() {
        if (this.decoderPtr) return true

        const decoderSize = mod._opus_decoder_get_size(this.channels)
        this.decoderPtr = mod._malloc(decoderSize)
        if (!this.decoderPtr) throw new Error('无法分配解码器内存')

        const err = mod._opus_decoder_init(this.decoderPtr, this.rate, this.channels)
        if (err < 0) {
          this.destroy()
          throw new Error(`Opus解码器初始化失败: ${err}`)
        }
        return true
      },

      decode(opusData) {
        if (!this.decoderPtr && !this.init()) {
          throw new Error('解码器未初始化')
        }

        const opusPtr = mod._malloc(opusData.length)
        mod.HEAPU8.set(opusData, opusPtr)

        const pcmPtr = mod._malloc(this.frameSize * 2)

        const decodedSamples = mod._opus_decode(
          this.decoderPtr,
          opusPtr,
          opusData.length,
          pcmPtr,
          this.frameSize,
          0
        )

        if (decodedSamples < 0) {
          mod._free(opusPtr)
          mod._free(pcmPtr)
          throw new Error(`Opus解码失败: ${decodedSamples}`)
        }

        const decodedData = new Int16Array(decodedSamples)
        for (let i = 0; i < decodedSamples; i++) {
          decodedData[i] = mod.HEAP16[(pcmPtr >> 1) + i]
        }

        mod._free(opusPtr)
        mod._free(pcmPtr)
        return decodedData
      },

      destroy() {
        if (this.decoderPtr) {
          this.module._free(this.decoderPtr)
          this.decoderPtr = null
        }
      }
    }

    opusDecoder.init()
    console.log('[AI语音助手] Opus解码器初始化成功')
    return opusDecoder
  } catch (error) {
    console.error('[AI语音助手] Opus解码器初始化失败:', error)
    opusDecoder = null
    throw error
  }
}

// Int16 转 Float32
const convertInt16ToFloat32 = (int16Data) => {
  const float32Data = new Float32Array(int16Data.length)
  for (let i = 0; i < int16Data.length; i++) {
    float32Data[i] = int16Data[i] / (int16Data[i] < 0 ? 0x8000 : 0x7fff)
  }
  return float32Data
}

// 开始音频缓冲
const startAudioBuffering = () => {
  if (isAudioBuffering || isAudioPlaying) return

  isAudioBuffering = true

  // 预初始化解码器
  initOpusDecoder().catch(() => {})

  // 超时处理
  setTimeout(() => {
    if (isAudioBuffering && audioBufferQueue.length > 0) {
      playBufferedAudio()
    }
  }, 300)

  // 监控缓冲进度
  const bufferCheckInterval = setInterval(() => {
    if (!isAudioBuffering) {
      clearInterval(bufferCheckInterval)
      return
    }
    if (audioBufferQueue.length >= BUFFER_THRESHOLD) {
      clearInterval(bufferCheckInterval)
      playBufferedAudio()
    }
  }, 50)
}

// 播放已缓冲的音频
const playBufferedAudio = async () => {
  if (isAudioPlaying || audioBufferQueue.length === 0) return

  isAudioPlaying = true
  isAudioBuffering = false

  try {
    const ctx = initAudioContext()
    if (ctx.state === 'suspended') await ctx.resume()

    if (!opusDecoder) {
      await initOpusDecoder()
    }

    if (!streamingContext) {
      streamingContext = {
        queue: [],
        playing: false,
        endOfStream: false,

        async decodeOpusFrames(opusFrames) {
          const decodedSamples = []

          for (const frame of opusFrames) {
            try {
              const frameData = opusDecoder.decode(frame)
              if (frameData && frameData.length > 0) {
                const floatData = convertInt16ToFloat32(frameData)
                for (let i = 0; i < floatData.length; i++) {
                  decodedSamples.push(floatData[i])
                }
              }
            } catch {
              // 解码失败跳过
            }
          }

          if (decodedSamples.length > 0) {
            for (let i = 0; i < decodedSamples.length; i++) {
              this.queue.push(decodedSamples[i])
            }

            const minSamples = SAMPLE_RATE * MIN_AUDIO_DURATION
            if (!this.playing && this.queue.length >= minSamples) {
              this.startPlaying()
            }
          }
        },

        startPlaying() {
          if (this.playing || this.queue.length === 0) return

          this.playing = true

          const minPlaySamples = Math.min(this.queue.length, SAMPLE_RATE)
          const currentSamples = this.queue.splice(0, minPlaySamples)

          const audioBuffer = audioContext.createBuffer(
            CHANNELS,
            currentSamples.length,
            SAMPLE_RATE
          )
          audioBuffer.copyToChannel(new Float32Array(currentSamples), 0)

          const source = audioContext.createBufferSource()
          source.buffer = audioBuffer

          // 淡入淡出避免爆音
          const gainNode = audioContext.createGain()
          const fadeDuration = 0.02
          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + fadeDuration)

          const duration = audioBuffer.duration
          if (duration > fadeDuration * 2) {
            gainNode.gain.setValueAtTime(1, audioContext.currentTime + duration - fadeDuration)
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration)
          }

          source.connect(gainNode)
          gainNode.connect(audioContext.destination)

          console.log(
            `[AI语音助手] 开始播放 ${currentSamples.length} 个样本，约 ${(currentSamples.length / SAMPLE_RATE).toFixed(2)} 秒`
          )

          source.onended = () => {
            this.playing = false

            setTimeout(() => {
              if (this.queue.length > 0) {
                this.startPlaying()
              } else if (audioBufferQueue.length > 0) {
                const frames = [...audioBufferQueue]
                audioBufferQueue = []
                this.decodeOpusFrames(frames)
              } else if (this.endOfStream) {
                console.log('[AI语音助手] 音频播放完成')
                isAudioPlaying = false
                isPlaying.value = false
                this.endOfStream = false
                streamingContext = null
              } else {
                setTimeout(() => {
                  if (this.queue.length === 0 && audioBufferQueue.length > 0) {
                    const frames = [...audioBufferQueue]
                    audioBufferQueue = []
                    this.decodeOpusFrames(frames)
                  } else if (this.queue.length === 0 && audioBufferQueue.length === 0) {
                    console.log('[AI语音助手] 音频播放完成 (超时)')
                    isAudioPlaying = false
                    isPlaying.value = false
                    streamingContext = null
                  }
                }, 500)
              }
            }, 10)
          }

          source.start()
        }
      }
    }

    const frames = [...audioBufferQueue]
    audioBufferQueue = []
    await streamingContext.decodeOpusFrames(frames)
  } catch (error) {
    console.error('[AI语音助手] 播放音频失败:', error)
    isAudioPlaying = false
    streamingContext = null
  }
}

// 处理二进制音频数据
const handleAudioData = async (data) => {
  try {
    let arrayBuffer
    if (data instanceof ArrayBuffer) {
      arrayBuffer = data
    } else if (data instanceof Blob) {
      arrayBuffer = await data.arrayBuffer()
    } else {
      return
    }

    const opusData = new Uint8Array(arrayBuffer)

    if (opusData.length > 0) {
      audioBufferQueue.push(opusData)

      if (audioBufferQueue.length === 1 && !isAudioBuffering && !isAudioPlaying) {
        startAudioBuffering()
      }
    } else {
      // 空数据表示结束
      if (audioBufferQueue.length > 0 && !isAudioPlaying) {
        playBufferedAudio()
      }
      if (isAudioPlaying && streamingContext) {
        streamingContext.endOfStream = true
      }
    }
  } catch (error) {
    console.error('[AI语音助手] 处理音频数据失败:', error)
  }
}

// 停止音频播放
const stopAudio = () => {
  audioBufferQueue = []
  isAudioBuffering = false
  isAudioPlaying = false
  streamingContext = null
  if (opusDecoder) {
    opusDecoder.destroy()
    opusDecoder = null
  }
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
}

// 暴露给关闭时使用
const cleanupAudio = stopAudio

// 丝滑滚动到底部
const scrollToBottom = () => {
  // 如果用户手动上滑了，不自动滚动
  if (userScrolledUp.value) return

  nextTick(() => {
    if (messagesContainer.value) {
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTo({
            top: messagesContainer.value.scrollHeight,
            behavior: 'smooth'
          })
        }
      })
    }
  })
}

// 监听滚动事件，检测用户是否手动上滑
const handleScroll = () => {
  if (!messagesContainer.value) return

  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 30 // 容差 30px

  if (isAtBottom) {
    // 用户滑到底部，恢复自动滚动
    userScrolledUp.value = false
  } else {
    // 用户上滑了，停止自动滚动
    userScrolledUp.value = true
  }
}

// 动态调整窗口高度
const adjustWindowHeight = async () => {
  if (!messagesContainer.value) return

  // 获取窗口信息
  if (!windowBounds) {
    windowBounds = await window.api?.window?.getBounds?.()
    if (!windowBounds) {
      console.log('[AI语音助手] 无法获取窗口信息')
      return
    }
    console.log('[AI语音助手] 窗口信息:', windowBounds)
  }

  // 计算消息容器的实际内容高度
  const messagesScrollHeight = messagesContainer.value.scrollHeight
  const messagesClientHeight = messagesContainer.value.clientHeight

  // 如果内容超出可见区域，需要增加窗口高度
  if (messagesScrollHeight > messagesClientHeight) {
    // 计算需要增加的高度
    const extraHeight = messagesScrollHeight - messagesClientHeight
    const targetHeight = Math.min(windowBounds.height + extraHeight + 20, windowBounds.maxHeight)

    // 只有需要增加高度时才调整
    if (targetHeight > windowBounds.height) {
      console.log(`[AI语音助手] 调整窗口高度: ${windowBounds.height} -> ${targetHeight}`)
      window.api?.window?.setHeight?.(targetHeight, true)
      windowBounds.height = targetHeight
    }
  }
}

// 监听消息变化，自动调整窗口高度并滚动到底部
watch(
  [chatMessages, currentUserText, currentAIText],
  () => {
    nextTick(() => {
      adjustWindowHeight()
      scrollToBottom()
    })
  },
  { deep: true }
)

// ============ 消息处理 ============

// 处理WebSocket消息
const handleMessage = (data) => {
  // 打印完整的服务端返回数据到控制台
  console.log('[AI语音助手] 收到完整消息:', JSON.stringify(data, null, 2))

  if (!data || typeof data !== 'object') return

  const { type } = data

  switch (type) {
    case 'stt':
      // 实时语音转文字（灰色拼接显示）
      sttText.value += data.text || ''
      currentUserText.value = sttText.value
      scrollToBottom()
      break

    case 'stt-offline':
      // 离线语音识别最终结果，清空 stt，正常显示
      sttText.value = ''
      currentUserText.value = data.text || ''
      scrollToBottom()
      break

    case 'stt-final':
      // 语音识别结束，将用户消息添加到对话列表
      if (currentUserText.value) {
        chatMessages.value.push({
          role: 'user',
          content: currentUserText.value
        })
        scrollToBottom()
        currentUserText.value = '' // 清空实时显示
        sttText.value = '' // 清空 stt 累加
      }
      break

    case 'tts':
      handleTTSMessage(data)
      break

    case 'audio_data':
      // 处理 Opus 音频数据
      if (data.data && data.data instanceof ArrayBuffer) {
        handleAudioData(data.data)
      }
      break

    case 'llm':
      // LLM 回复（可能包含表情）
      if (data.text) {
        currentAIText.value = data.text + ' '
      }
      break

    default:
      break
  }
}

// 处理 TTS 消息
const handleTTSMessage = (data) => {
  const { state, text } = data

  switch (state) {
    case 'start':
      // TTS 开始
      isPlaying.value = true
      currentAIText.value = ''
      // 重置音频播放状态
      audioBufferQueue = []
      isAudioBuffering = false
      isAudioPlaying = false
      streamingContext = null
      break

    case 'sentence_start':
      // 句子开始，记录当前句子文字
      if (text) {
        currentAIText.value = text
      }
      break

    case 'sentence_end':
      // 句子结束，将该句子作为一条独立的 AI 消息
      if (text) {
        chatMessages.value.push({
          role: 'assistant',
          content: text
        })
        scrollToBottom()
        currentAIText.value = ''
      }
      break

    case 'stop':
      // TTS 结束
      // 如果还有未添加的文字（正常情况下不会）
      if (currentAIText.value) {
        chatMessages.value.push({
          role: 'assistant',
          content: currentAIText.value
        })
        scrollToBottom()
        currentAIText.value = ''
      }
      // 等待音频播完后再关闭播放状态
      setTimeout(() => {
        isPlaying.value = false
      }, 500)
      break
  }
}

// 状态变化处理
const handleStateChange = (state) => {
  switch (state) {
    case 'connected':
      recordingStatus.value = '连接成功'
      break
    case 'recording':
      isRecording.value = true
      recordingStatus.value = '录音中'
      break
    case 'stopped':
    case 'disconnected':
      isRecording.value = false
      recordingStatus.value = '已停止'
      break
    case 'error':
      isRecording.value = false
      recordingStatus.value = '连接错误'
      break
  }
}

// 实际启动服务
const startService = async () => {
  try {
    // 设置回调
    aiAssistantService.onMessage = handleMessage
    aiAssistantService.onStateChange = handleStateChange

    // 获取录音源配置
    let recordingSource = 'computer'
    try {
      const stored = localStorage.getItem('device-settings')
      if (stored) {
        const data = JSON.parse(stored)
        if (data.recordingSource) {
          recordingSource = data.recordingSource
        }
      }
    } catch (e) {
      console.warn('[AI语音助手] 获取录音源配置失败:', e)
      // 获取录音源配置失败，使用默认值
    }

    // 初始化服务（根据录音源初始化录音器）
    aiAssistantService.init(recordingSource)

    // 开始录音（连接 WebSocket + 开始录音）
    await aiAssistantService.start()
  } catch (error) {
    console.error('[AI语音助手] 初始化失败:', error)
    recordingStatus.value = '启动失败: ' + (error.message || '未知错误')
  }
}

// 初始化并开始录音
onMounted(async () => {
  // 监听主进程发来的关闭消息
  window.electron?.ipcRenderer?.on('ai-assistant:close', () => {
    handleClose()
  })

  // 添加开场白作为第一条 AI 消息
  if (aiAssistantStore.prologue) {
    chatMessages.value.push({
      role: 'assistant',
      content: aiAssistantStore.prologue
    })
  }

  // 延迟启动，让用户有时间打开控制台查看网络请求
  recordingStatus.value = `${delayCountdown.value} 秒后连接...`

  const countdownTimer = setInterval(() => {
    delayCountdown.value--
    if (delayCountdown.value > 0) {
      recordingStatus.value = `${delayCountdown.value} 秒后连接...`
    } else {
      clearInterval(countdownTimer)
      isDelayStarting.value = false
      recordingStatus.value = '正在连接...'
      startService()
    }
  }, 1000)
})

// 组件卸载时停止录音和清理监听器
onUnmounted(() => {
  aiAssistantService.stop()
  // 移除 IPC 监听器
  window.electron?.ipcRenderer?.removeAllListeners?.('ai-assistant:close')
})

// 关闭窗口
const handleClose = async () => {
  // 停止音频播放
  cleanupAudio()

  // 停止录音
  await aiAssistantService.stop()

  // 更新状态
  isRecording.value = false
  recordingStatus.value = '已关闭'

  // 延迟后关闭窗口
  setTimeout(() => {
    window.api?.window?.close()
  }, 300)
}

// 立即启动（跳过延迟）
const startNow = () => {
  isDelayStarting.value = false
  recordingStatus.value = '正在连接...'
  startService()
}

// ============ 窗口拖动功能 ============
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const handleMouseDown = (e) => {
  // 只有在标题栏区域才允许拖动
  if (e.target.closest('.drag-region')) {
    isDragging.value = true
    dragOffset.value.x = e.screenX
    dragOffset.value.y = e.screenY
  }
}

const handleMouseMove = (e) => {
  if (isDragging.value) {
    const deltaX = e.screenX - dragOffset.value.x
    const deltaY = e.screenY - dragOffset.value.y

    // 使用 Electron IPC 移动窗口
    window.api?.window?.moveBy?.(deltaX, deltaY)

    dragOffset.value.x = e.screenX
    dragOffset.value.y = e.screenY
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}
</script>

<template>
  <div
    class="ai-assistant-window"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- 标题栏 -->
    <div class="title-bar drag-region">
      <span class="title">AI语音助手</span>
      <button class="close-btn" @click="handleClose">
        <span class="close-icon">×</span>
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- 录音状态栏（顶部） -->
      <div class="top-status-bar">
        <span class="status-dot" :class="{ active: isRecording }"></span>
        <span class="status-text">{{ recordingStatus }}</span>
        <button v-if="isDelayStarting" class="start-now-btn" @click="startNow">立即连接</button>
      </div>

      <!-- 对话消息列表 -->
      <div ref="messagesContainer" class="messages-container" @scroll="handleScroll">
        <!-- 历史消息 -->
        <div
          v-for="(msg, index) in chatMessages"
          :key="index"
          class="message-item"
          :class="msg.role"
        >
          <div class="message-bubble">
            {{ msg.content }}
          </div>
        </div>

        <!-- 当前用户输入（实时显示） -->
        <div v-if="currentUserText" class="message-item user current" :class="{ stt: sttText }">
          <div class="message-bubble">
            {{ currentUserText }}
          </div>
        </div>

        <!-- 当前 AI 回复（实时显示） -->
        <div v-if="currentAIText" class="message-item assistant current">
          <div class="message-bubble">
            {{ currentAIText }}
          </div>
        </div>

        <!-- 空状态提示 -->
        <div
          v-if="chatMessages.length === 0 && !currentUserText && !currentAIText"
          class="empty-tip"
        >
          开始说话吧...
        </div>
      </div>

      <!-- 播报状态栏（底部） -->
      <div class="bottom-status-bar">
        <span class="playing-indicator" :class="{ active: isPlaying }">
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-assistant-window {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  border-radius: clamp(0.5rem, 1vw, 0.75rem);
  overflow: hidden;
  user-select: none;
}

// 标题栏
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1rem);
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color-light);
  cursor: move;
  transition:
    background 0.3s ease,
    border-color 0.3s ease;
}

.title {
  font-size: clamp(0.875rem, 1.5vw, 1rem);
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(1.5rem, 3vw, 1.75rem);
  height: clamp(1.5rem, 3vw, 1.75rem);
  background: var(--color-danger);
  border: none;
  border-radius: clamp(0.25rem, 0.5vw, 0.375rem);
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: #ff6b6b;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

.close-icon {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: #fff;
  line-height: 1;
}

// 内容区域
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1rem);
  overflow: hidden;
  min-height: 0;
}

// 顶部状态栏
.top-status-bar {
  display: flex;
  align-items: center;
  gap: clamp(0.375rem, 1vw, 0.5rem);
  flex-shrink: 0;
  margin-bottom: clamp(0.5rem, 1vw, 0.75rem);
}

// 底部状态栏
.bottom-status-bar {
  display: flex;
  align-items: center;
  gap: clamp(0.375rem, 1vw, 0.5rem);
  flex-shrink: 0;
  margin-top: clamp(0.5rem, 1vw, 0.75rem);
  padding-top: clamp(0.375rem, 0.8vw, 0.5rem);
  border-top: 1px solid var(--border-color-light);
}

.start-now-btn {
  margin-left: auto;
  padding: clamp(0.2rem, 0.5vw, 0.3rem) clamp(0.5rem, 1vw, 0.75rem);
  font-size: clamp(0.65rem, 1vw, 0.75rem);
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: clamp(0.2rem, 0.4vw, 0.25rem);
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: var(--color-primary-light, #66b1ff);
  }
}

.status-dot {
  width: clamp(0.5rem, 1vw, 0.625rem);
  height: clamp(0.5rem, 1vw, 0.625rem);
  background: var(--text-secondary);
  border-radius: 50%;
  transition: background 0.3s ease;

  &.active {
    background: var(--color-success);
    animation: pulse-dot 1.5s infinite;
  }
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: clamp(0.75rem, 1.2vw, 0.8125rem);
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

// 对话消息列表
.messages-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1vw, 0.75rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding: clamp(0.25rem, 0.5vw, 0.375rem);

  // Element Plus 风格滚动条
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--text-placeholder);
    border-radius: 3px;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: var(--text-secondary);
    }
  }

  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
}

// 消息条目
.message-item {
  display: flex;
  width: 100%;

  // 用户消息 - 靠右
  &.user {
    justify-content: flex-end;

    .message-bubble {
      background: var(--color-primary);
      color: #fff;
      border-radius: clamp(0.5rem, 1vw, 0.75rem) clamp(0.5rem, 1vw, 0.75rem)
        clamp(0.125rem, 0.25vw, 0.1875rem) clamp(0.5rem, 1vw, 0.75rem);
    }
  }

  // AI 消息 - 靠左
  &.assistant {
    justify-content: flex-start;

    .message-bubble {
      background: var(--card-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-color-light);
      border-radius: clamp(0.5rem, 1vw, 0.75rem) clamp(0.5rem, 1vw, 0.75rem)
        clamp(0.5rem, 1vw, 0.75rem) clamp(0.125rem, 0.25vw, 0.1875rem);
    }
  }

  // 当前输入中的消息
  &.current .message-bubble {
    opacity: 0.8;
  }

  // stt 灰色显示
  &.stt .message-bubble {
    background: var(--text-placeholder);
    opacity: 0.6;
  }
}

// 消息气泡
.message-bubble {
  max-width: 85%;
  padding: clamp(0.5rem, 1vw, 0.75rem) clamp(0.625rem, 1.25vw, 0.875rem);
  font-size: clamp(0.8rem, 1.3vw, 0.875rem);
  line-height: 1.5;
  word-break: break-word;
  transition:
    background 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}

// 空状态提示
.empty-tip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-placeholder);
  font-size: clamp(0.8rem, 1.3vw, 0.875rem);
}

// 播报动画指示器
.playing-indicator {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: clamp(0.75rem, 1.2vw, 0.875rem);

  .wave-bar {
    width: 3px;
    background: var(--text-placeholder);
    border-radius: 1px;
    transition: background 0.3s ease;

    &:nth-child(1) {
      height: 40%;
    }
    &:nth-child(2) {
      height: 70%;
    }
    &:nth-child(3) {
      height: 50%;
    }
    &:nth-child(4) {
      height: 80%;
    }
  }

  // 播报中 - 启动动画
  &.active {
    .wave-bar {
      background: var(--color-primary);
      animation: wave-animation 1.2s ease-in-out infinite;

      &:nth-child(1) {
        animation-delay: 0s;
      }
      &:nth-child(2) {
        animation-delay: 0.2s;
      }
      &:nth-child(3) {
        animation-delay: 0.4s;
      }
      &:nth-child(4) {
        animation-delay: 0.6s;
      }
    }
  }
}

@keyframes wave-animation {
  0%,
  100% {
    transform: scaleY(0.5);
    opacity: 0.6;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}
</style>
