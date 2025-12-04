<template>
  <!-- 语音识别窗口组件 -->
  <div class="typing-container">
    <!-- 连接状态提示 -->
    <div class="connection-status" v-if="!isComplete">
      <span class="status-icon">●</span>
      <span>{{ connectionStatus }}</span>
    </div>
    
    <!-- 显示识别文字的区域 -->
    <div class="typing-text">
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
import { ref, onMounted, onUnmounted } from 'vue'
import SpeechRecognition from '../utils/speechRecognition.js'

// ==================== 响应式状态 ====================
// 当前已显示的文字
const displayedText = ref('')
// 是否完成打字
const isComplete = ref(false)
// 连接状态
const connectionStatus = ref('等待启动...')
// 语音识别实例
let speechRecognizer = null
// IPC 监听器引用
let removeStartListener = null
let removeStopListener = null

// ==================== 配置项 ====================
// 打字完成后等待关闭的时间（毫秒）
const closeDelay = 800

// ==================== 语音识别功能 ====================
/**
 * 初始化语音识别
 * @param {string} wsUrl - WebSocket 服务器地址
 */
const initSpeechRecognition = async (wsUrl) => {
  try {
    connectionStatus.value = '正在连接...'

    // 创建语音识别实例
    speechRecognizer = new SpeechRecognition()

    // 设置文本回调 - 实时更新显示的文本
    speechRecognizer.onText((fullText, messageInfo) => {
      displayedText.value = fullText
      console.log('识别文本:', fullText, '消息信息:', messageInfo)
    })

    // 设置错误回调
    speechRecognizer.onError((error) => {
      console.error('语音识别错误:', error)
      connectionStatus.value = '连接失败'
    })

    // 设置状态变化回调
    speechRecognizer.onStateChange((state) => {
      if (state === 0) {
        connectionStatus.value = '录音中，鼠标中键长按2秒停止'
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

    console.log('语音识别初始化成功, wsUrl:', wsUrl)
  } catch (error) {
    console.error('初始化语音识别失败:', error)
    connectionStatus.value = '初始化失败'
  }
}

/**
 * 停止录音并处理结果
 */
const stopRecording = () => {
  if (!speechRecognizer) return

  console.log('停止录音')
  connectionStatus.value = '正在处理识别结果...'

  // 停止录音并发送结束消息
  speechRecognizer.stop()

  // 等待一下让服务器处理完成
  setTimeout(() => {
    handleRecognitionComplete(displayedText.value)
  }, 1500)
}

/**
 * 处理识别完成
 */
const handleRecognitionComplete = (finalText) => {
  isComplete.value = true
  connectionStatus.value = '识别完成'

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
onMounted(() => {
  // 监听主进程发送的启动语音识别消息
  removeStartListener = window.electron.ipcRenderer.on('start-speech-recognition', (event, data) => {
    console.log('收到启动语音识别消息:', data)
    if (data && data.wsUrl) {
      initSpeechRecognition(data.wsUrl)
    }
  })

  // 监听主进程发送的停止语音识别消息
  removeStopListener = window.electron.ipcRenderer.on('stop-speech-recognition', () => {
    console.log('收到停止语音识别消息')
    stopRecording()
  })
})

onUnmounted(() => {
  // 移除 IPC 监听器
  if (removeStartListener) {
    removeStartListener()
  }
  if (removeStopListener) {
    removeStopListener()
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
  padding: 20px 24px;
  background: linear-gradient(145deg, #1a1a2e, #16162a);
  border-radius: 12px;
  border: 1px solid rgba(100, 200, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-width: 280px;
  max-width: 400px;
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
  color: #64c8ff;
  animation: pulse 1.5s ease-in-out infinite;
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
</style>
