<script setup>
/**
 * VoiceTranslate/index.vue - 语音翻译小窗口
 * 可移动、无最大化最小化、点击关闭停止录音
 */
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { getVoiceTranslateService } from '@/services'

// 语音翻译服务实例
const voiceTranslateService = getVoiceTranslateService()

// 录音状态
const isRecording = ref(false)
const recordingStatus = ref('准备中...')

// 原文数据 - 按id存储
const originalTexts = reactive({
  online: '', // online临时文字（灰色）
  offline: new Map() // offline确定文字（按id存储）
})

// 译文数据 - 按id存储
const translateTexts = reactive(new Map())

// 计算原文显示内容
const originalDisplay = computed(() => {
  // 如果有offline文字，显示offline，否则显示online
  if (originalTexts.offline.size > 0) {
    // 按id排序拼接offline文字
    const sortedTexts = Array.from(originalTexts.offline.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, text]) => text)
      .join('')
    return { text: sortedTexts, isOnline: false }
  }
  return { text: originalTexts.online, isOnline: true }
})

// 计算译文显示内容
const translateDisplay = computed(() => {
  if (translateTexts.size === 0) return ''
  // 按id排序拼接译文
  const sortedTexts = Array.from(translateTexts.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, text]) => text)
    .join('')
  return sortedTexts
})

// 翻译语言配置
const sourceLanguage = ref('中文')
const targetLanguage = ref('英语')

// 处理WebSocket消息
const handleMessage = (data) => {
  // 先打印原始数据
  console.log('[语音翻译] 收到原始消息:', data, typeof data)

  if (!data || typeof data !== 'object') {
    console.log('[语音翻译] 数据格式不正确，跳过')
    return
  }

  const { mode, id, text } = data

  console.log('[语音翻译] 解构后:', { mode, id, text })

  if (!mode || text === undefined) {
    console.log('[语音翻译] mode 或 text 缺失，跳过')
    return
  }

  if (mode === 'online') {
    // online模式：直接拼接显示（临时文字）
    originalTexts.online += text
  } else if (mode === 'offline') {
    // offline模式：清空online，按id存储
    originalTexts.online = '' // 清空online临时文字
    if (id !== undefined) {
      // 同id替换，不同id新增
      originalTexts.offline.set(String(id), text)
    }
  } else if (mode === 'translate') {
    // translate模式：译文，同id替换，不同id拼接
    if (id !== undefined) {
      translateTexts.set(String(id), text)
    }
  }
}

// 状态变化处理
const handleStateChange = (state) => {
  console.log('[语音翻译] 状态变化:', state)
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
  console.log('[语音翻译] 组件挂载，开始初始化...')

  try {
    // 设置回调
    voiceTranslateService.onMessage = handleMessage
    voiceTranslateService.onStateChange = handleStateChange
    console.log('[语音翻译] 回调设置完成')

    // 初始化服务（初始化录音器）
    console.log('[语音翻译] 开始初始化服务...')
    voiceTranslateService.init()
    console.log('[语音翻译] 服务初始化完成')

    // 开始录音（连接 WebSocket + 开始录音）
    console.log('[语音翻译] 开始连接 WebSocket 并录音...')
    await voiceTranslateService.start({
      // 临时使用生产环境地址测试
      url: 'ws://chat.danaai.net/asr/speechTranslate',
      sourceLanguage: 'ZH',
      targetLanguage: 'EN'
    })
    console.log('[语音翻译] 启动成功')
  } catch (error) {
    console.error('[语音翻译] 初始化失败:', error)
    recordingStatus.value = '启动失败: ' + (error.message || '未知错误')
  }
})

// 组件卸载时停止录音
onUnmounted(() => {
  voiceTranslateService.stop()
})

// 关闭窗口
const handleClose = async () => {
  // 停止录音
  await voiceTranslateService.stop()
  // 关闭窗口
  window.api?.window?.close()
}

// ============ 窗口拖动功能 ============
const isDragging = ref(false)
const dragOffset = reactive({ x: 0, y: 0 })

const handleMouseDown = (e) => {
  // 只有在标题栏区域才允许拖动
  if (e.target.closest('.drag-region')) {
    isDragging.value = true
    dragOffset.x = e.screenX
    dragOffset.y = e.screenY
  }
}

const handleMouseMove = (e) => {
  if (isDragging.value) {
    const deltaX = e.screenX - dragOffset.x
    const deltaY = e.screenY - dragOffset.y

    // 使用 Electron IPC 移动窗口
    window.api?.window?.moveBy?.(deltaX, deltaY)

    dragOffset.x = e.screenX
    dragOffset.y = e.screenY
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}
</script>

<template>
  <div
    class="voice-translate-window"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- 标题栏 -->
    <div class="title-bar drag-region">
      <span class="title">语音翻译</span>
      <button class="close-btn" @click="handleClose">
        <span class="close-icon">×</span>
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- 录音状态 -->
      <div class="recording-status">
        <span class="status-dot" :class="{ active: isRecording }"></span>
        <span class="status-text">{{ recordingStatus }}</span>
      </div>

      <!-- 原文区域 -->
      <div class="text-section original-section">
        <div class="section-label">原文</div>
        <div class="text-content" :class="{ 'is-online': originalDisplay.isOnline }">
          {{ originalDisplay.text || '等待语音输入...' }}
        </div>
      </div>

      <!-- 语言指示 -->
      <div class="language-indicator">
        <span>{{ sourceLanguage }}</span>
        <span class="arrow">→</span>
        <span>{{ targetLanguage }}</span>
      </div>

      <!-- 译文区域 -->
      <div class="text-section translate-section">
        <div class="section-label">译文</div>
        <div class="text-content translate-text">
          {{ translateDisplay || '等待翻译结果...' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.voice-translate-window {
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
  padding: clamp(0.75rem, 2vw, 1rem);
  overflow-y: auto;
  gap: clamp(0.5rem, 1.5vw, 0.75rem);
}

// 录音状态
.recording-status {
  display: flex;
  align-items: center;
  gap: clamp(0.375rem, 1vw, 0.5rem);
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

// 文本区域
.text-section {
  display: flex;
  flex-direction: column;
  gap: clamp(0.25rem, 0.5vw, 0.375rem);
}

.section-label {
  font-size: clamp(0.75rem, 1.2vw, 0.8125rem);
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.text-content {
  font-size: clamp(0.875rem, 1.5vw, 1rem);
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
  transition: color 0.3s ease;

  // online临时文字显示为灰色
  &.is-online {
    color: var(--text-secondary);
  }
}

// 译文使用主题色
.translate-text {
  color: var(--color-primary);
}

// 语言指示
.language-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.5rem, 1vw, 0.75rem);
  padding: clamp(0.375rem, 1vw, 0.5rem) 0;
  font-size: clamp(0.75rem, 1.2vw, 0.8125rem);
  color: var(--text-secondary);
  border-top: 1px solid var(--border-color-light);
  border-bottom: 1px solid var(--border-color-light);
  transition:
    color 0.3s ease,
    border-color 0.3s ease;
}

.arrow {
  color: var(--color-primary);
}
</style>
