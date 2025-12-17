<template>
  <!-- AI翻译窗口组件 -->
  <div class="translate-container" ref="containerRef">
    <!-- 标题栏：拖动和关闭 -->
    <div class="title-bar" @mousedown="startDrag">
      <span class="title">语音翻译</span>
      <button class="close-btn" @click="closeWindow" @mousedown.stop>×</button>
    </div>
    
    <!-- 连接状态提示 -->
    <div class="connection-status" v-if="!isComplete">
      <span class="status-icon" :class="statusIconClass">●</span>
      <span>{{ connectionStatus }}</span>
    </div>
    
    <!-- 原文区域（上半部分） -->
    <div class="section original">
      <div class="label">原文</div>
      <div class="text-content">
        <span>{{ displayedOriginal }}</span>
        <!-- 原文输入时的闪烁光标 -->
        <span class="cursor" v-if="!isComplete && displayedOriginal">｜</span>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="divider">
      <span class="divider-text">{{ directionText }}</span>
    </div>

    <!-- 译文区域（下半部分） -->
    <div class="section translation">
      <div class="label">译文</div>
      <div class="text-content">
        <span>{{ displayedTranslation }}</span>
        <!-- 译文输入时的闪烁光标 -->
        <span class="cursor" v-if="!isComplete && displayedTranslation">｜</span>
      </div>
    </div>

    <!-- 完成状态提示 -->
    <div class="status" v-if="isComplete">
      <span class="complete-icon">✓</span>
      <span>翻译完成</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import SpeechRecognition from '../utils/speechRecognition.js'

// ==================== 日志工具 ====================
const log = {
  info: (message, data) => {
    console.log(`[TranslateWindow] ${message}`, data)
    window.api?.logger?.info('TranslateWindow', message, data)
  },
  error: (message, data) => {
    console.error(`[TranslateWindow] ${message}`, data)
    window.api?.logger?.error('TranslateWindow', message, data)
  },
  debug: (message, data) => {
    console.log(`[TranslateWindow] ${message}`, data)
    window.api?.logger?.debug('TranslateWindow', message, data)
  }
}

// ==================== 响应式状态 ====================
// 当前已显示的原文
const displayedOriginal = ref('')
// 当前已显示的译文
const displayedTranslation = ref('')
// 是否完成翻译
const isComplete = ref(false)
// 连接状态
const connectionStatus = ref('等待启动...')
// 翻译方向显示文本
const directionText = ref('中文 → 英文')
// 详细状态信息
const statusDetail = reactive({
  recorderSupported: false,
  recorderOpened: false,
  recorderStarted: false,
  wsConnecting: false,
  wsConnected: false,
  wsSentInitConfig: false,
  audioChunksSent: 0,
  lastError: null
})
// 容器引用
const containerRef = ref(null)
// 语音识别实例
let speechRecognizer = null
// IPC 监听器引用
let removeStartListener = null
let removeStopListener = null
let removeDebugListener = null
// 是否已初始化
let isInitialized = false
// 拖动相关
let isDragging = false
let dragStartX = 0
let dragStartY = 0

// ==================== 窗口控制 ====================
const closeWindow = () => {
  log.info('用户点击关闭按钮')
  if (speechRecognizer) {
    speechRecognizer.close()
  }
  window.api?.closePopup()
}

const startDrag = (e) => {
  isDragging = true
  dragStartX = e.screenX
  dragStartY = e.screenY
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging) return
  const deltaX = e.screenX - dragStartX
  const deltaY = e.screenY - dragStartY
  dragStartX = e.screenX
  dragStartY = e.screenY
  window.api?.dragPopup(deltaX, deltaY)
}

const stopDrag = () => {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// ==================== 原文/译文消息管理 ====================
// 原文消息Map（mode: offline）
const originalMessageMap = new Map()
// 译文消息Map（mode: translate）
const translateMessageMap = new Map()

// ==================== 动态窗口高度 ====================
const adjustWindowHeight = () => {
  nextTick(() => {
    if (containerRef.value) {
      const contentHeight = containerRef.value.scrollHeight + 20
      window.api?.adjustWindowHeight(contentHeight)
    }
  })
}

// 监听文本变化，动态调整窗口高度
watch([displayedOriginal, displayedTranslation], () => {
  adjustWindowHeight()
})

watch(isComplete, () => {
  adjustWindowHeight()
})

// 状态图标样式
const statusIconClass = computed(() => {
  if (statusDetail.lastError) return 'error'
  if (statusDetail.wsConnected && statusDetail.recorderStarted) return 'success'
  if (statusDetail.wsConnecting) return 'connecting'
  return 'pending'
})

// ==================== 配置项 ====================
const closeDelay = 800

// ==================== 语音识别功能 ====================
const initSpeechRecognition = async (wsUrl, extraParams = {}) => {
  if (isInitialized) {
    log.info('已经初始化，跳过')
    return
  }
  isInitialized = true
  
  // 设置翻译方向显示
  if (extraParams.displayDirection) {
    directionText.value = extraParams.displayDirection
  }
  
  log.info('开始初始化翻译识别', { wsUrl, extraParams, direction: directionText.value })
  
  try {
    connectionStatus.value = '正在连接...'

    speechRecognizer = new SpeechRecognition()
    
    speechRecognizer.onStatusDetail((detail) => {
      Object.assign(statusDetail, detail)
    })

    // 设置文本回调 - 根据 mode 区分原文和译文
    speechRecognizer.onText((fullText, messageInfo) => {
      const { mode, id, text, is_final } = messageInfo || {}
      
      // 根据 mode 区分原文和译文
      if (mode === 'offline') {
        // 原文：同 id 替换，不同 id 拼接
        originalMessageMap.set(id, text)
        displayedOriginal.value = Array.from(originalMessageMap.values()).join('')
      } else if (mode === 'translate') {
        // 译文：同 id 替换，不同 id 拼接
        translateMessageMap.set(id, text)
        displayedTranslation.value = Array.from(translateMessageMap.values()).join('')
      }
      
      // 检查是否收到 is_final: true
      if (is_final === true) {
        log.info('=== 完成 ===', { 原文: displayedOriginal.value, 译文: displayedTranslation.value })
        // 粘贴译文
        handleRecognitionComplete(displayedTranslation.value)
      }
    })

    speechRecognizer.onError((error) => {
      connectionStatus.value = '连接失败'
      statusDetail.lastError = error?.message || '未知错误'
    })

    speechRecognizer.onStateChange((state) => {
      if (state === 0) {
        connectionStatus.value = '录音中，按 Ctrl+Shift+F 停止'
      } else if (state === 1) {
        connectionStatus.value = '连接已断开'
      } else if (state === 2) {
        connectionStatus.value = '连接错误'
      }
    })

    // 连接时传入额外参数
    await speechRecognizer.connect(wsUrl, {
      mode: '2pass',
      language: 'ZH',
      denoiser: false,
      ...extraParams  // 传入 sourceLanguage, targetLanguage, openTranslate
    })

    log.info('翻译识别初始化成功')
  } catch (error) {
    connectionStatus.value = '初始化失败'
    statusDetail.lastError = error?.message || '初始化失败'
  }
}

const stopRecording = () => {
  if (!speechRecognizer) return
  connectionStatus.value = '正在处理翻译结果...'
  speechRecognizer.stop()
}

const handleRecognitionComplete = (translationText) => {
  if (isComplete.value) return
  
  isComplete.value = true
  connectionStatus.value = '翻译完成'
  
  // 粘贴译文，如果译文为空则粘贴原文
  const textToPaste = translationText || displayedTranslation.value || displayedOriginal.value
  log.info('=== 粘贴 ===', textToPaste)

  setTimeout(() => {
    window.electron.ipcRenderer.send('typing-complete', textToPaste)
    if (speechRecognizer) {
      speechRecognizer.close()
    }
  }, closeDelay)
}

// ==================== 生命周期钩子 ====================
onMounted(async () => {
  adjustWindowHeight()
  
  // 监听主进程发送的启动语音识别消息
  removeStartListener = window.electron.ipcRenderer.on('start-speech-recognition', (event, data) => {
    if (data && data.wsUrl) {
      initSpeechRecognition(data.wsUrl, data.extraParams || {})
    }
  })

  // 监听主进程发送的停止语音识别消息
  removeStopListener = window.electron.ipcRenderer.on('stop-speech-recognition', () => {
    stopRecording()
  })
  
  // 监听调试日志消息
  removeDebugListener = window.electron.ipcRenderer.on('debug-log', (event, data) => {
  })
})

onUnmounted(() => {
  if (removeStartListener) removeStartListener()
  if (removeStopListener) removeStopListener()
  if (removeDebugListener) removeDebugListener()

  if (speechRecognizer) {
    speechRecognizer.close()
    speechRecognizer = null
  }
})
</script>

<style scoped>
/* 容器样式 */
.translate-container {
  padding: 0 0 16px 0;
  background: linear-gradient(145deg, #1a1a2e, #16162a);
  border-radius: 12px;
  border: 1px solid rgba(100, 200, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-width: 320px;
  max-width: 450px;
}

/* 标题栏 */
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px 12px 0 0;
  cursor: move;
  user-select: none;
  margin-bottom: 12px;
}

.title-bar .title {
  font-size: 13px;
  color: #a0a0a0;
  font-weight: 500;
}

.title-bar .close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 100, 100, 0.2);
  color: #f87171;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.title-bar .close-btn:hover {
  background: rgba(255, 100, 100, 0.4);
  color: #fff;
}

/* 连接状态样式 */
.connection-status {
  font-size: 12px;
  color: #a0a0a0;
  margin-bottom: 12px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-icon {
  animation: pulse 1.5s ease-in-out infinite;
}

.status-icon.success {
  color: #4ade80;
}

.status-icon.error {
  color: #f87171;
}

.status-icon.connecting {
  color: #fbbf24;
}

.status-icon.pending {
  color: #64c8ff;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 区域通用样式 */
.section {
  padding: 8px 16px;
}

/* 标签样式 */
.label {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* 文字内容样式 */
.text-content {
  font-size: 15px;
  line-height: 1.5;
  min-height: 24px;
  font-family: 'Microsoft YaHei', sans-serif;
}

/* 原文样式 */
.original .text-content {
  color: #e0e0e0;
}

/* 译文样式 */
.translation .text-content {
  color: #64c8ff;
  font-style: italic;
}

/* 分隔线 */
.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 12px 16px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.divider-text {
  background: linear-gradient(145deg, #1a1a2e, #16162a);
  padding: 0 12px;
  font-size: 11px;
  color: #64c8ff;
  letter-spacing: 1px;
}

/* 闪烁光标动画 */
.cursor {
  color: #64c8ff;
  animation: blink 0.8s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 完成状态提示 */
.status {
  margin: 10px 16px 0 16px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #4ade80;
}

.complete-icon {
  font-size: 12px;
}
</style>
