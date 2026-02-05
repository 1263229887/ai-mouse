<script setup>
/**
 * AIAssistant/index.vue - AI语音助手小窗口
 * 可移动、无最大化最小化、点击关闭停止录音
 */
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { getAIAssistantService } from '@/services'
import { useAIAssistantStore } from '@/stores'
import { handleFunctionCall } from '@/services/aiAssistant/appService'
import SoundPlayingIcon from '@/components/SoundPlayingIcon/index.vue'

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

// 静音状态
const isMuted = ref(false)

// 智能滚动控制
const userScrolledUp = ref(false) // 用户是否手动上滑了

// 窗口高度管理
let windowBounds = null

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
let masterGainNode = null // 主音量控制节点

// 初始化音频上下文
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE
    })
    // 创建主音量控制节点
    masterGainNode = audioContext.createGain()
    masterGainNode.gain.value = isMuted.value ? 0 : 1
    masterGainNode.connect(audioContext.destination)
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
          gainNode.connect(masterGainNode) // 连接到主音量节点而不是直接到 destination

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
  masterGainNode = null
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
}

// 暴露给关闭时使用
const cleanupAudio = stopAudio

// 切换静音状态
const toggleMute = () => {
  isMuted.value = !isMuted.value
  // 实时更新音量
  if (masterGainNode) {
    masterGainNode.gain.value = isMuted.value ? 0 : 1
  }
  console.log('[AI语音助手] 静音状态:', isMuted.value ? '静音' : '播报')
}

// 计算语音图标状态
const soundIconStatus = computed(() => {
  if (isMuted.value) return 'off'
  if (isPlaying.value) return 'playing'
  return 'on'
})

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
      // 过滤掉纯表情消息（包含 emotion 字段且 text 为空或只有表情符号）
      if (data.text && !data.emotion) {
        currentAIText.value = data.text + ' '
      }
      break

    case 'function_call':
      // 处理 function_call（打开应用等）
      handleFunctionCallMessage(data)
      break

    default:
      break
  }
}

// 处理 function_call 消息（打开应用等）
const handleFunctionCallMessage = async (data) => {
  console.log('[AI语音助手] 处理 function_call:', data)

  try {
    const result = await handleFunctionCall(data)

    if (result) {
      // 将处理结果作为 AI 消息显示
      chatMessages.value.push({
        role: 'assistant',
        content: result.message
      })
      scrollToBottom()
    }
  } catch (error) {
    console.error('[AI语音助手] function_call 处理失败:', error)
    chatMessages.value.push({
      role: 'assistant',
      content: '操作执行失败，请重试'
    })
    scrollToBottom()
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
      // 过滤掉纯表情消息
      if (text && !data.emotion) {
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
      // 过滤掉纯表情消息
      if (currentAIText.value && !data.emotion) {
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

  // 配置加载和服务启动并行执行，不阻塞
  // 异步加载配置并添加开场白（不等待）
  if (!aiAssistantStore.isLoaded) {
    aiAssistantStore.fetchConfig().then(() => {
      // 配置加载完成后，如果有开场白且尚未添加，则插入到开头
      if (aiAssistantStore.prologue && chatMessages.value.length === 0) {
        chatMessages.value.unshift({
          role: 'assistant',
          content: aiAssistantStore.prologue
        })
      }
    })
  } else if (aiAssistantStore.prologue) {
    // 配置已加载，直接添加开场白
    chatMessages.value.push({
      role: 'assistant',
      content: aiAssistantStore.prologue
    })
  }

  // 立即启动服务（不等待配置加载）
  recordingStatus.value = '正在连接...'
  startService()
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

// ============ 窗口拖动功能（使用全局事件监听，避免某些系统上的 resize 问题） ============
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0

const handleMouseDown = (e) => {
  // 只有在标题栏区域才允许拖动
  if (e.target.closest('.drag-region')) {
    e.preventDefault()
    isDragging.value = true
    dragStartX = e.screenX
    dragStartY = e.screenY
    // 添加全局事件监听
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}

const handleMouseMove = (e) => {
  if (!isDragging.value) return
  const deltaX = e.screenX - dragStartX
  const deltaY = e.screenY - dragStartY
  dragStartX = e.screenX
  dragStartY = e.screenY
  window.api?.window?.moveBy?.(deltaX, deltaY)
}

const handleMouseUp = () => {
  isDragging.value = false
  // 移除全局事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-hidden select-none" @mousedown="handleMouseDown">
    <!-- 标题栏（顶部圆角） -->
    <div
      class="drag-region flex items-center justify-between px-16 py-12 bg-#1B2023 rd-t-12 b-b-1 b-b-solid b-b-#303030 cursor-move"
    >
      <span class="text-16 font-600 color-white">AI语音助手</span>
      <button
        class="close-btn flex items-center justify-center w-28 h-28 bg-#FF3B30 b-none rd-6 cursor-pointer"
        @click="handleClose"
      >
        <span class="text-20 color-white leading-none">×</span>
      </button>
    </div>

    <!-- 内容区域（底部圆角） -->
    <div class="flex-1 flex flex-col px-16 py-12 overflow-hidden min-h-0 bg-#101214 rd-b-12">
      <!-- 顶部状态栏 -->
      <div class="flex items-center gap-8 shrink-0 mb-12">
        <span
          class="status-dot w-10 h-10 rd-full"
          :class="isRecording ? 'bg-#34C759' : 'bg-#606C80'"
        ></span>
        <span class="text-13 color-#606C80">{{ recordingStatus }}</span>
      </div>

      <!-- 对话消息列表 -->
      <div
        ref="messagesContainer"
        class="scroll-container flex-1 flex flex-col gap-12 overflow-y-auto overflow-x-hidden p-6"
        @scroll="handleScroll"
      >
        <!-- 历史消息 -->
        <div
          v-for="(msg, index) in chatMessages"
          :key="index"
          class="message-item flex w-full"
          :class="msg.role"
        >
          <div class="message-bubble max-w-85% px-14 py-10 text-14 leading-relaxed break-words">
            {{ msg.content }}
          </div>
        </div>

        <!-- 当前用户输入 -->
        <div
          v-if="currentUserText"
          class="message-item user current flex w-full justify-end"
          :class="{ stt: sttText }"
        >
          <div class="message-bubble max-w-85% px-14 py-10 text-14 leading-relaxed break-words">
            {{ currentUserText }}
          </div>
        </div>

        <!-- 当前 AI 回复 -->
        <div v-if="currentAIText" class="message-item assistant current flex w-full justify-start">
          <div class="message-bubble max-w-85% px-14 py-10 text-14 leading-relaxed break-words">
            {{ currentAIText }}
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-if="chatMessages.length === 0 && !currentUserText && !currentAIText"
          class="flex-1 flex items-center justify-center color-#909399 text-14"
        >
          开始说话吧...
        </div>
      </div>

      <!-- 底部状态栏（常驻） -->
      <div
        class="flex items-center gap-8 shrink-0 mt-12 pt-8 b-t-1 b-t-solid b-t-#303030 cursor-pointer"
        @click="toggleMute"
      >
        <SoundPlayingIcon
          :status="soundIconStatus"
          :size="18"
          color="#fffffe"
          wave-color="#62c96c"
        />
        <span class="text-12 color-#909399">
          {{ isMuted ? '语音播报已关闭' : '语音播报已开启' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.close-btn {
  transition:
    background 0.2s,
    transform 0.2s;
}
.close-btn:hover {
  background: #ff6b6b;
  transform: scale(1.05);
}
.close-btn:active {
  transform: scale(0.95);
}
.status-dot {
  transition: background 0.3s;
  animation: pulse-dot 1.5s infinite;
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
/* Element Plus 风格滚动条 */
.scroll-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scroll-container::-webkit-scrollbar-thumb {
  background-color: #909399;
  border-radius: 3px;
}
.scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: #606c80;
}
.scroll-container::-webkit-scrollbar-track {
  background-color: transparent;
}
.message-item.user {
  justify-content: flex-end;
}
.message-item.user .message-bubble {
  background: #aaea79;
  color: #000000;
  border-radius: 12px 12px 3px 12px;
}
.message-item.assistant {
  justify-content: flex-start;
}
.message-item.assistant .message-bubble {
  background: #1b2023;
  color: white;
  border: 1px solid #303030;
  border-radius: 12px 12px 12px 3px;
}
.message-item.current .message-bubble {
  opacity: 0.8;
}
.message-item.stt .message-bubble {
  background: #909399;
  opacity: 0.6;
}
</style>
