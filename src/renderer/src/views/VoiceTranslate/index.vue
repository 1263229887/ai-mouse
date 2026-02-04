<script setup>
/**
 * VoiceTranslate/index.vue - 语音翻译小窗口
 * 可移动、无最大化最小化、点击关闭停止录音
 */
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { getVoiceTranslateService } from '@/services'
import { useDeviceStore } from '@/stores'

// 语音翻译服务实例
const voiceTranslateService = getVoiceTranslateService()

// 设备 Store
const deviceStore = useDeviceStore()

// 录音状态（原文区域顶部显示）
const isRecording = ref(false)
const recordingStatus = ref('准备中...')

// 翻译/粘贴状态（译文区域底部显示）
const translateStatus = ref('waiting') // 'waiting' | 'translating' | 'paste_waiting' | 'pasting' | 'success' | 'error'
const translateStatusText = computed(() => {
  switch (translateStatus.value) {
    case 'waiting':
      return '等待翻译中...'
    case 'translating':
      return '翻译中...'
    case 'paste_waiting':
      return '等待粘贴...'
    case 'pasting':
      return '粘贴中...'
    case 'success':
      return '粘贴完成'
    case 'error':
      return '粘贴失败'
    default:
      return ''
  }
})

// 原文数据
const originalTexts = ref({
  offline: '', // offline确定文字（白色）
  online: '' // online临时文字（灰色）
})

// 译文数据 - 按id存储
const translateTexts = ref(new Map())

// 计算原文显示内容（offline + online）
const originalDisplay = computed(() => {
  const offline = originalTexts.value.offline
  const online = originalTexts.value.online
  return {
    offlineText: offline,
    onlineText: online,
    hasContent: !!(offline || online)
  }
})

// 计算译文显示内容
const translateDisplay = computed(() => {
  if (translateTexts.value.size === 0) return ''
  // 按id排序拼接译文
  const sortedTexts = Array.from(translateTexts.value.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, text]) => text)
    .join('')
  return sortedTexts
})

// 判断是否有译文内容
const hasTranslateContent = computed(
  () => translateDisplay.value && translateDisplay.value.trim() !== ''
)

// 翻译语言配置（从 store 读取）
const sourceLanguage = computed(() => deviceStore.translateSource.chinese || '中文')
const targetLanguage = computed(() => deviceStore.translateTarget.chinese || '英语')

// 获取源语言和目标语言的isoCode（用于WebSocket连接）
const sourceIsoCode = computed(() => deviceStore.translateSource.isoCode || 'ZH')
const targetIsoCode = computed(() => deviceStore.translateTarget.isoCode || 'EN')

// ============ 动态高度和智能滚动 ============
const originalContainer = ref(null)
const translateContainer = ref(null)
const userScrolledUpOriginal = ref(false)
const userScrolledUpTranslate = ref(false)
let windowBounds = null

// 丝滑滚动到底部
const scrollToBottom = (container, userScrolledUp) => {
  if (userScrolledUp.value) return

  nextTick(() => {
    if (container.value) {
      requestAnimationFrame(() => {
        if (container.value) {
          container.value.scrollTo({
            top: container.value.scrollHeight,
            behavior: 'smooth'
          })
        }
      })
    }
  })
}

// 监听滚动事件
const handleScroll = (container, userScrolledUp) => {
  if (!container.value) return

  const { scrollTop, scrollHeight, clientHeight } = container.value
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 30

  if (isAtBottom) {
    userScrolledUp.value = false
  } else {
    userScrolledUp.value = true
  }
}

// 动态调整窗口高度
const adjustWindowHeight = async () => {
  if (!originalContainer.value || !translateContainer.value) return

  // 获取窗口信息
  if (!windowBounds) {
    windowBounds = await window.api?.window?.getBounds?.()
    if (!windowBounds) return
  }

  // 计算原文和译文的实际内容高度
  const originalScrollHeight = originalContainer.value.scrollHeight
  const originalClientHeight = originalContainer.value.clientHeight
  const translateScrollHeight = translateContainer.value.scrollHeight
  const translateClientHeight = translateContainer.value.clientHeight

  // 如果内容超出可见区域，需要增加窗口高度
  const originalExtra = Math.max(0, originalScrollHeight - originalClientHeight)
  const translateExtra = Math.max(0, translateScrollHeight - translateClientHeight)
  const maxExtra = Math.max(originalExtra, translateExtra)

  if (maxExtra > 0) {
    // 计算屏幕高度的70%
    const screenHeight = window.screen.height
    const maxHeight = Math.floor(screenHeight * 0.7)
    const targetHeight = Math.min(windowBounds.height + maxExtra + 20, maxHeight)

    if (targetHeight > windowBounds.height) {
      window.api?.window?.setHeight?.(targetHeight, true)
      windowBounds.height = targetHeight
    }
  }
}

// 监听内容变化
watch(
  [originalTexts, translateTexts],
  () => {
    nextTick(() => {
      adjustWindowHeight()
      scrollToBottom(originalContainer, userScrolledUpOriginal)
      scrollToBottom(translateContainer, userScrolledUpTranslate)
    })
  },
  { deep: true }
)

// 处理WebSocket消息
const handleMessage = (data) => {
  if (!data || typeof data !== 'object') return

  const { mode, id, text } = data

  if (!mode || text === undefined) return

  if (mode === 'online') {
    // online模式：直接拼接显示（临时文字，灰色），没有id
    originalTexts.value.online += text
  } else if (mode === 'offline') {
    // offline模式：将online内容加到offline，然后清空online
    originalTexts.value.offline += originalTexts.value.online + text
    originalTexts.value.online = ''
  } else if (mode === 'translate') {
    // translate模式：译文，按id存储
    if (id !== undefined) {
      translateTexts.value.set(String(id), text)
      // 收到译文时更新状态为"翻译中"
      if (translateStatus.value === 'waiting') {
        translateStatus.value = 'translating'
      }
    }
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

// 初始化并开始录音
onMounted(async () => {
  // 监听主进程发来的关闭并粘贴消息
  window.electron?.ipcRenderer?.on('voice-translate:close-and-paste', () => {
    handleClose()
  })

  try {
    // 设置回调
    voiceTranslateService.onMessage = handleMessage
    voiceTranslateService.onStateChange = handleStateChange

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
      console.warn('[语音翻译] 获取录音源配置失败:', e)
    }

    // 初始化服务
    voiceTranslateService.init(recordingSource)

    // 开始录音
    await voiceTranslateService.start({
      url: 'ws://chat.danaai.net/asr/speechTranslate',
      sourceLanguage: sourceIsoCode.value,
      targetLanguage: targetIsoCode.value
    })
  } catch (error) {
    console.error('[语音翻译] 初始化失败:', error)
    recordingStatus.value = '启动失败: ' + (error.message || '未知错误')
  }
})

// 组件卸载时停止录音和清理监听器
onUnmounted(() => {
  voiceTranslateService.stop()
  window.electron?.ipcRenderer?.removeAllListeners?.('voice-translate:close-and-paste')
})

// 关闭窗口并粘贴译文
const handleClose = async () => {
  await voiceTranslateService.stop()
  isRecording.value = false
  recordingStatus.value = '停止录制'

  const translation = translateDisplay.value
  if (translation && translation !== '等待翻译结果...') {
    try {
      await window.api?.clipboard?.writeText(translation)
      translateStatus.value = 'paste_waiting'
      await new Promise((resolve) => setTimeout(resolve, 1000))
      translateStatus.value = 'pasting'
      await window.api?.clipboard?.paste()
      translateStatus.value = 'success'
      recordingStatus.value = '已完成'
      setTimeout(() => window.api?.window?.close(), 1500)
    } catch (error) {
      console.error('[语音翻译] 粘贴译文失败:', error)
      translateStatus.value = 'error'
      recordingStatus.value = '粘贴失败'
      setTimeout(() => window.api?.window?.close(), 1000)
    }
  } else {
    recordingStatus.value = '无译文'
    setTimeout(() => window.api?.window?.close(), 300)
  }
}

// ============ 窗口拖动功能 ============
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const handleMouseDown = (e) => {
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
    class="w-full h-full flex flex-col overflow-hidden select-none"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- 标题栏（顶部圆角） -->
    <div
      class="drag-region flex items-center justify-between px-16 py-12 bg-#1B2023 b-b-1 b-b-solid b-b-#303030 cursor-move"
    >
      <span class="text-16 font-600 color-white">语音翻译</span>
      <button
        class="close-btn flex items-center justify-center w-28 h-28 bg-#FF3B30 b-none rd-6 cursor-pointer"
        @click="handleClose"
      >
        <span class="text-20 color-white leading-none">×</span>
      </button>
    </div>

    <!-- 内容区域（底部圆角） -->
    <div class="flex-1 flex flex-col px-20 py-16 overflow-hidden min-h-0 bg-#101214 rd-b-12">
      <!-- 顶部：录音状态（固定） -->
      <div class="flex items-center gap-8 shrink-0 mb-8">
        <span
          class="status-dot w-10 h-10 rd-full"
          :class="isRecording ? 'bg-#34C759' : 'bg-#606C80'"
        ></span>
        <span class="text-13 color-#606C80">{{ recordingStatus }}</span>
      </div>

      <!-- 中间：原文 + 分隔线 + 译文（可伸缩，4:6 分配） -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <!-- 原文区域 (占40%) -->
        <div class="h-40% flex flex-col min-h-0 overflow-hidden">
          <div class="text-12 color-#606C80 shrink-0 mb-4">原文</div>
          <div
            ref="originalContainer"
            class="scroll-container flex-1 text-14 leading-relaxed color-white break-words overflow-y-auto"
            @scroll="handleScroll(originalContainer, userScrolledUpOriginal)"
          >
            <template v-if="originalDisplay.hasContent">
              <span class="color-white">{{ originalDisplay.offlineText }}</span>
              <span class="color-#606C80">{{ originalDisplay.onlineText }}</span>
            </template>
            <template v-else>
              <span class="color-#909399">等待语音输入...</span>
            </template>
          </div>
        </div>

        <!-- 语言指示器 -->
        <div class="flex items-center gap-12 py-8 shrink-0">
          <span class="flex-1 h-1px bg-#303030"></span>
          <span class="text-12 color-#606C80 whitespace-nowrap"
            >{{ sourceLanguage }} → {{ targetLanguage }}</span
          >
          <span class="flex-1 h-1px bg-#303030"></span>
        </div>

        <!-- 译文区域 (占60%) -->
        <div class="h-60% flex flex-col min-h-0 overflow-hidden">
          <div class="text-12 color-#606C80 shrink-0 mb-4">译文</div>
          <div
            ref="translateContainer"
            class="scroll-container flex-1 text-14 leading-relaxed break-words overflow-y-auto"
            :class="hasTranslateContent ? 'color-#8BE6B0' : 'color-#909399'"
            @scroll="handleScroll(translateContainer, userScrolledUpTranslate)"
          >
            {{ translateDisplay || '等待翻译结果...' }}
          </div>
        </div>
      </div>

      <!-- 底部：翻译/粘贴状态（固定） -->
      <div class="flex items-center gap-6 shrink-0 mt-8 pt-6 b-t-1 b-t-solid b-t-#303030">
        <span v-if="translateStatus === 'success'" class="flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l5 5L20 7"
              stroke="#34C759"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span
          class="text-12"
          :class="translateStatus === 'success' ? 'color-#34C759' : 'color-#606C80'"
          >{{ translateStatusText }}</span
        >
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
</style>
