<script setup>
/**
 * VoiceTranslate/index.vue - 语音翻译小窗口
 * 可移动、无最大化最小化、点击关闭停止录音
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getVoiceTranslateService } from '@/services'

// 语音翻译服务实例
const voiceTranslateService = getVoiceTranslateService()

// 录音状态
const isRecording = ref(false)
const recordingStatus = ref('准备中...')

// 粘贴状态
const pasteStatus = ref('') // '', 'pasting', 'success', 'error'

// 原文数据
const originalTexts = ref({
  offline: '', // offline确定文字（黑色）
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
    // online模式：直接拼接显示（临时文字，灰色），没有id
    originalTexts.value.online += text
  } else if (mode === 'offline') {
    // offline模式：将online内容加到offline，然后清空online
    originalTexts.value.offline += originalTexts.value.online + text
    originalTexts.value.online = '' // 清空online临时文字
  } else if (mode === 'translate') {
    // translate模式：译文，按id存储
    if (id !== undefined) {
      translateTexts.value.set(String(id), text)
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

  // 监听主进程发来的关闭并粘贴消息
  window.electron?.ipcRenderer?.on('voice-translate:close-and-paste', () => {
    console.log('[语音翻译] 收到关闭并粘贴消息')
    handleClose()
  })

  try {
    // 设置回调
    voiceTranslateService.onMessage = handleMessage
    voiceTranslateService.onStateChange = handleStateChange
    console.log('[语音翻译] 回调设置完成')

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
    console.log('[语音翻译] 录音源:', recordingSource)

    // 初始化服务（根据录音源初始化录音器）
    console.log('[语音翻译] 开始初始化服务...')
    voiceTranslateService.init(recordingSource)
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

// 组件卸载时停止录音和清理监听器
onUnmounted(() => {
  voiceTranslateService.stop()
  // 移除 IPC 监听器
  window.electron?.ipcRenderer?.removeAllListeners?.('voice-translate:close-and-paste')
})

// 关闭窗口并粘贴译文
const handleClose = async () => {
  // 停止录音
  await voiceTranslateService.stop()

  // 更新状态：停止录制
  isRecording.value = false
  recordingStatus.value = '停止录制'

  // 获取译文并粘贴
  const translation = translateDisplay.value
  if (translation && translation !== '等待翻译结果...') {
    console.log('[语音翻译] 准备粘贴译文:', translation)

    try {
      // 1. 写入剪贴板
      await window.api?.clipboard?.writeText(translation)
      console.log('[语音翻译] 已写入剪贴板')

      // 2. 更新状态：执行粘贴译文中
      pasteStatus.value = 'pasting'
      recordingStatus.value = '执行粘贴译文中...'

      // 3. 执行粘贴（主进程会模拟 Ctrl+V）
      await window.api?.clipboard?.paste()
      console.log('[语音翻译] 粘贴命令已执行')

      // 4. 更新状态：粘贴成功
      pasteStatus.value = 'success'
      recordingStatus.value = '粘贴成功 ✓'

      // 5. 延迟后关闭窗口（麦克风由窗口 closed 事件自动检测并关闭）
      setTimeout(() => {
        window.api?.window?.close()
      }, 2000)
    } catch (error) {
      console.error('[语音翻译] 粘贴译文失败:', error)
      pasteStatus.value = 'error'
      recordingStatus.value = '粘贴失败'

      setTimeout(() => {
        window.api?.window?.close()
      }, 1000)
    }
  } else {
    // 没有译文，直接关闭
    recordingStatus.value = '无译文'
    setTimeout(() => {
      window.api?.window?.close()
    }, 300)
  }
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
        <span
          class="status-dot"
          :class="{
            active: isRecording,
            pasting: pasteStatus === 'pasting',
            success: pasteStatus === 'success',
            error: pasteStatus === 'error'
          }"
        ></span>
        <span class="status-text">{{ recordingStatus }}</span>
      </div>

      <!-- 原文区域 -->
      <div class="text-section original-section">
        <div class="section-label">原文</div>
        <div class="text-content">
          <template v-if="originalDisplay.hasContent">
            <span class="offline-text">{{ originalDisplay.offlineText }}</span>
            <span class="online-text">{{ originalDisplay.onlineText }}</span>
          </template>
          <template v-else>
            <span class="placeholder-text">等待语音输入...</span>
          </template>
        </div>
      </div>

      <!-- 语言指示器（横线中间文字） -->
      <div class="language-divider">
        <span class="divider-line"></span>
        <span class="divider-text">{{ sourceLanguage }} → {{ targetLanguage }}</span>
        <span class="divider-line"></span>
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
  padding: clamp(0.75rem, 2vw, 1rem) clamp(1rem, 2.5vw, 1.25rem);
  overflow: hidden;
  min-height: 0;
}

// 录音状态
.recording-status {
  display: flex;
  align-items: center;
  gap: clamp(0.375rem, 1vw, 0.5rem);
  flex-shrink: 0;
  margin-bottom: clamp(0.375rem, 1vw, 0.5rem);
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

  &.pasting {
    background: var(--color-warning);
    animation: pulse-dot 0.8s infinite;
  }

  &.success {
    background: var(--color-success);
    animation: none;
  }

  &.error {
    background: var(--color-danger);
    animation: none;
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

// 文本区域（原文和译文各占一半）
.text-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.section-label {
  font-size: clamp(0.7rem, 1.1vw, 0.75rem);
  color: var(--text-secondary);
  transition: color 0.3s ease;
  flex-shrink: 0;
  margin-bottom: clamp(0.2rem, 0.4vw, 0.25rem);
}

.text-content {
  flex: 1;
  font-size: clamp(0.8rem, 1.3vw, 0.875rem);
  line-height: 1.5;
  color: var(--text-primary);
  word-break: break-word;
  transition: color 0.3s ease;
  overflow-y: auto;

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

// 确定文字（黑色）
.offline-text {
  color: var(--text-primary);
}

// 临时文字（灰色）
.online-text {
  color: var(--text-secondary);
}

// 占位文字
.placeholder-text {
  color: var(--text-placeholder);
}

// 译文使用主题色
.translate-text {
  color: var(--color-primary);
}

// 语言分隔线（横线中间文字）
.language-divider {
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1vw, 0.75rem);
  padding: clamp(0.375rem, 0.8vw, 0.5rem) 0;
  flex-shrink: 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: var(--border-color-light);
  transition: background 0.3s ease;
}

.divider-text {
  font-size: clamp(0.7rem, 1.1vw, 0.75rem);
  color: var(--text-secondary);
  white-space: nowrap;
  transition: color 0.3s ease;
}
</style>
