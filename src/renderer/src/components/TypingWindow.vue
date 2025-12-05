<template>
  <!-- 语音识别窗口组件 -->
  <div class="typing-container" ref="containerRef">
    <!-- 连接状态提示 -->
    <div class="connection-status" v-if="!isComplete">
      <span class="status-icon" :class="statusIconClass">●</span>
      <span>{{ connectionStatus }}</span>
    </div>
    
    <!-- 详细状态信息（调试模式） -->
    <div class="status-detail" v-if="showDebugInfo && !isComplete">
      <div class="detail-item">
        <span class="label">录音支持:</span>
        <span :class="statusDetail.recorderSupported ? 'success' : 'error'">{{ statusDetail.recorderSupported ? '✓' : '✗' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">麦克风:</span>
        <span :class="statusDetail.recorderOpened ? 'success' : 'pending'">{{ statusDetail.recorderOpened ? '已打开' : '未打开' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">录音:</span>
        <span :class="statusDetail.recorderStarted ? 'success' : 'pending'">{{ statusDetail.recorderStarted ? '进行中' : '未开始' }}</span>
      </div>
      <div class="detail-item">
        <span class="label">WebSocket:</span>
        <span :class="statusDetail.wsConnected ? 'success' : (statusDetail.wsConnecting ? 'pending' : 'error')">
          {{ statusDetail.wsConnected ? '已连接' : (statusDetail.wsConnecting ? '连接中...' : '未连接') }}
        </span>
      </div>
      <div class="detail-item">
        <span class="label">音频块:</span>
        <span class="info">{{ statusDetail.audioChunksSent }}</span>
      </div>
      <div class="detail-item error-msg" v-if="statusDetail.lastError">
        <span class="label">错误:</span>
        <span class="error">{{ statusDetail.lastError }}</span>
      </div>
    </div>
    
    <!-- 显示识别文字的区域 -->
    <div class="typing-text" ref="textRef">
      <span class="text-content">{{ displayedText }}</span>
      <!-- 闪烁的光标 -->
      <span class="cursor" v-if="!isComplete && displayedText">|</span>
    </div>
    
    <!-- 完成提示 -->
    <div class="status" v-if="isComplete">
      <span class="complete-icon">✓</span>
      <span>识别完成</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import SpeechRecognition from '../utils/speechRecognition.js'

// ==================== 日志工具 ====================
const log = {
  info: (message, data) => {
    console.log(`[TypingWindow] ${message}`, data)
    window.api?.logger?.info('TypingWindow', message, data)
  },
  error: (message, data) => {
    console.error(`[TypingWindow] ${message}`, data)
    window.api?.logger?.error('TypingWindow', message, data)
  },
  debug: (message, data) => {
    console.log(`[TypingWindow] ${message}`, data)
    window.api?.logger?.debug('TypingWindow', message, data)
  }
}

// ==================== 响应式状态 ====================
// 当前已显示的文字
const displayedText = ref('')
// 是否完成打字
const isComplete = ref(false)
// 连接状态
const connectionStatus = ref('等待启动...')
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
// 是否显示调试信息
const showDebugInfo = ref(false)
// 容器引用
const containerRef = ref(null)
const textRef = ref(null)
// 语音识别实例
let speechRecognizer = null
// IPC 监听器引用
let removeStartListener = null
let removeStopListener = null
let removeDebugListener = null
// 是否已初始化
let isInitialized = false

// ==================== 动态窗口高度 ====================
/**
 * 调整窗口高度以适应内容
 */
const adjustWindowHeight = () => {
  nextTick(() => {
    if (containerRef.value) {
      const contentHeight = containerRef.value.scrollHeight + 20 // 加一些边距
      window.api?.adjustWindowHeight(contentHeight)
    }
  })
}

// 监听文本变化，动态调整窗口高度
watch(displayedText, () => {
  adjustWindowHeight()
})

// 监听完成状态变化
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
// 打字完成后等待关闭的时间（毫秒）
const closeDelay = 800

// ==================== 语音识别功能 ====================
/**
 * 初始化语音识别
 * @param {string} wsUrl - WebSocket 服务器地址
 */
const initSpeechRecognition = async (wsUrl) => {
  // 防止重复初始化
  if (isInitialized) {
    log.info('已经初始化，跳过')
    return
  }
  isInitialized = true
  
  log.info('开始初始化', { wsUrl })
  
  try {
    connectionStatus.value = '正在连接...'

    // 创建语音识别实例
    speechRecognizer = new SpeechRecognition()
    
    // 设置详细状态回调
    speechRecognizer.onStatusDetail((detail) => {
      Object.assign(statusDetail, detail)
    })

    // 设置文本回调 - 实时更新显示的文本
    speechRecognizer.onText((fullText, messageInfo) => {
      displayedText.value = fullText
      log.debug('识别文本', { fullText, messageInfo })
      
      // 检查是否收到 is_final: true，表示服务端处理完成
      if (messageInfo && messageInfo.is_final === true) {
        log.info('收到服务端完成消息', messageInfo)
        handleRecognitionComplete(fullText)
      }
    })

    // 设置错误回调
    speechRecognizer.onError((error) => {
      log.error('语音识别错误', { message: error?.message })
      connectionStatus.value = '连接失败'
      statusDetail.lastError = error?.message || '未知错误'
    })

    // 设置状态变化回调
    speechRecognizer.onStateChange((state) => {
      log.info('连接状态变化', { state })
      if (state === 0) {
        connectionStatus.value = '录音中，双击鼠标左键停止'
      } else if (state === 1) {
        connectionStatus.value = '连接已断开'
      } else if (state === 2) {
        connectionStatus.value = '连接错误'
      }
    })

    // 连接到 WebSocket 服务器并开始录音
    await speechRecognizer.connect(wsUrl, {
      mode: '2pass',
      language: 'ZH',
      denoiser: false
    })

    log.info('语音识别初始化成功', { wsUrl })
  } catch (error) {
    log.error('初始化语音识别失败', { 
      message: error?.message,
      stack: error?.stack,
      statusDetail 
    })
    connectionStatus.value = '初始化失败'
    statusDetail.lastError = error?.message || '初始化失败'
  }
}

/**
 * 停止录音并发送结束消息
 */
const stopRecording = () => {
  if (!speechRecognizer) return

  log.info('停止录音')
  connectionStatus.value = '正在处理识别结果...'

  // 停止录音并发送结束消息
  speechRecognizer.stop()
  
  // 注意：不再使用 setTimeout，而是等待服务端返回 is_final: true
}

/**
 * 处理识别完成
 */
const handleRecognitionComplete = (finalText) => {
  // 防止重复触发
  if (isComplete.value) return
  
  isComplete.value = true
  connectionStatus.value = '识别完成'
  log.info('识别完成，准备粘贴', { finalText })

  // 延迟后通知主进程完成
  setTimeout(() => {
    // 通过 IPC 通知主进程打字完成，可以执行粘贴操作
    window.electron.ipcRenderer.send('typing-complete', finalText)

    // 关闭语音识别连接
    if (speechRecognizer) {
      speechRecognizer.close()
    }
  }, closeDelay)
}

// ==================== 生命周期钩子 ====================
onMounted(async () => {
  log.info('组件已挂载')
  
  // 初始调整窗口高度
  adjustWindowHeight()
  
  // 监听主进程发送的启动语音识别消息
  removeStartListener = window.electron.ipcRenderer.on('start-speech-recognition', (event, data) => {
    log.info('收到启动语音识别消息', data)
    if (data && data.wsUrl) {
      initSpeechRecognition(data.wsUrl)
    }
  })

  // 监听主进程发送的停止语音识别消息
  removeStopListener = window.electron.ipcRenderer.on('stop-speech-recognition', () => {
    log.info('收到停止语音识别消息')
    stopRecording()
  })
  
  // 监听调试日志消息
  removeDebugListener = window.electron.ipcRenderer.on('debug-log', (event, data) => {
    log.info('收到调试消息', data)
    if (data.logPath) {
      logPath.value = data.logPath
    }
    connectionStatus.value = `调试: ${data.message}`
  })
})

onUnmounted(() => {
  log.info('组件即将卸载')
  
  // 移除 IPC 监听器
  if (removeStartListener) {
    removeStartListener()
  }
  if (removeStopListener) {
    removeStopListener()
  }
  if (removeDebugListener) {
    removeDebugListener()
  }

  // 组件卸载时关闭连接
  if (speechRecognizer) {
    speechRecognizer.close()
    speechRecognizer = null
  }
})
</script>

<style scoped>
/* 容器样式 - 圆角卡片效果 */
.typing-container {
  padding: 16px 20px;
  background: linear-gradient(145deg, #1a1a2e, #16162a);
  border-radius: 12px;
  border: 1px solid rgba(100, 200, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-width: 280px;
  max-width: 400px;
  min-height: 150px;
  overflow-y: auto; /* 内容超出时显示滚动条 */
}

/* 自定义滚动条样式 */
.typing-container::-webkit-scrollbar {
  width: 6px;
}

.typing-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.typing-container::-webkit-scrollbar-thumb {
  background: rgba(100, 200, 255, 0.3);
  border-radius: 3px;
}

.typing-container::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 200, 255, 0.5);
}

/* 连接状态样式 */
.connection-status {
  font-size: 12px;
  color: #a0a0a0;
  margin-bottom: 12px;
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
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

/* 文字显示区域 */
.typing-text {
  font-size: 16px;
  color: #e0e0e0;
  line-height: 1.6;
  font-family: 'Microsoft YaHei', sans-serif;
  min-height: 24px;
}

/* 文字内容 */
.text-content {
  color: #fff;
}

/* 闪烁光标动画 */
.cursor {
  color: #64c8ff;
  animation: blink 0.8s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

/* 完成状态提示 */
.status {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4ade80;
}

.complete-icon {
  font-size: 14px;
}

/* 详细状态信息 */
.status-detail {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 12px;
  font-size: 11px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item .label {
  color: #888;
}

.detail-item .success {
  color: #4ade80;
}

.detail-item .error {
  color: #f87171;
}

.detail-item .pending {
  color: #fbbf24;
}

.detail-item .info {
  color: #64c8ff;
}

.error-msg {
  flex-direction: column;
  gap: 2px;
}

.error-msg .error {
  word-break: break-all;
  font-size: 10px;
}

/* 日志文件路径 */
.log-path {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 10px;
  color: #666;
}

.log-path .label {
  margin-right: 4px;
}

.log-path .path {
  color: #888;
  word-break: break-all;
}
</style>
