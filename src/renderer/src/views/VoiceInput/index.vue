<script setup>
/**
 * VoiceInput/index.vue - 语音输入小圆球窗口
 * 显示音频状态，实时粘贴识别的文字
 * online文字累加粘贴，offline时删除所有online再粘贴offline
 * 支持拖拽移动，收到结束标识后自动关闭
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { getVoiceTranslateService } from '@/services'

// 使用语音翻译服务（复用WebSocket和录音逻辑）
const voiceService = getVoiceTranslateService()

// 录音状态
const isRecording = ref(false)
const connectionStatus = ref('connecting') // connecting, connected, recording, stopped, error

// 音频状态：有人说话 / 无人说话
const isSpeaking = ref(false)

// 记录已粘贴的 online 字符总数（用于 offline 时删除）
let onlineCharCount = 0

// 消息队列和处理锁，防止竞态条件
const messageQueue = []
let isProcessing = false

// 是否正在关闭中（防止重复触发）
let isClosing = false

// 拖拽相关状态
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0

// 处理WebSocket消息
const handleMessage = async (data) => {
  // 打印完整的服务端返回数据
  console.log('[语音输入] 收到完整消息对象:', JSON.stringify(data, null, 2))

  if (!data || typeof data !== 'object') {
    return
  }

  // 检测结束标识（服务端返回 is_final: true 或 status 为结束状态）
  const isEndSignal = data.is_final === true || data.status === 'end' || data.status === 'finished'
  if (isEndSignal) {
    console.log('[语音输入] 收到结束标识，准备延迟关闭窗口')
    handleAutoClose()
    return
  }

  const { mode, text } = data

  if (!mode || text === undefined) {
    return
  }

  // 有文字返回表示有人说话
  if (text && text.length > 0) {
    isSpeaking.value = true
    resetSpeakingTimer()
  }

  // 将消息加入队列
  messageQueue.push({ mode, text, data })

  // 尝试处理队列
  processQueue()
}

// 顺序处理消息队列
async function processQueue() {
  // 如果正在处理，直接返回（等当前处理完会继续处理队列）
  if (isProcessing) {
    console.log('[语音输入] 正在处理中，消息已加入队列，队列长度:', messageQueue.length)
    return
  }

  // 如果队列为空，返回
  if (messageQueue.length === 0) {
    return
  }

  // 设置处理锁
  isProcessing = true

  // 取出队列中的第一个消息
  const { mode, text, data } = messageQueue.shift()

  try {
    if (mode === 'online') {
      console.log('[语音输入] === 处理 ONLINE 消息 ===')
      console.log('[语音输入] text:', text, '长度:', text?.length)
      console.log('[语音输入] 当前onlineCharCount:', onlineCharCount)
      await handleOnlineText(text)
    } else if (mode === 'offline') {
      console.log('[语音输入] === 处理 OFFLINE 消息 ===')
      console.log('[语音输入] 完整对象:', data)
      console.log('[语音输入] text:', text, '长度:', text?.length)
      console.log('[语音输入] 当前onlineCharCount:', onlineCharCount)
      await handleOfflineText(text)
    }
  } catch (error) {
    console.error('[语音输入] 处理消息出错:', error)
  } finally {
    // 释放锁
    isProcessing = false

    // 继续处理队列中的下一个消息
    if (messageQueue.length > 0) {
      console.log('[语音输入] 继续处理队列，剩余:', messageQueue.length)
      processQueue()
    }
  }
}

// 处理online文字（实时识别，增量追加粘贴）
async function handleOnlineText(text) {
  if (!text) return

  console.log('[语音输入] 处理online: 追加粘贴', text.length, '个字符，内容:', text)

  // 直接粘贴（追加，不删除）
  await pasteText(text)

  // 累加 online 字符数
  onlineCharCount += text.length

  console.log('[语音输入] online处理完成，累计onlineCharCount:', onlineCharCount)
}

// 处理offline文字（最终确认，删除online，粘贴offline，offline保留）
async function handleOfflineText(text) {
  console.log('[语音输入] 处理offline: 删除', onlineCharCount, '个online字符，粘贴offline:', text)

  // 通过主进程打印 offline 信息（方便在终端查看）
  console.log('[语音输入] [OFFLINE] 即将删除字符数:', onlineCharCount, ', 即将粘贴文字:', text)

  // 删除之前所有的 online 字符
  if (onlineCharCount > 0) {
    const deleteCount = onlineCharCount
    // 先重置计数，防止并发问题
    onlineCharCount = 0
    await deleteChars(deleteCount)
    // 删除后等待一小段时间，确保系统响应
    await sleep(50)
  } else {
    onlineCharCount = 0
  }

  // 粘贴 offline 文字（这部分内容保留，不会被删除）
  if (text) {
    await pasteText(text)
  }

  console.log('[语音输入] offline处理完成，onlineCharCount已重置为0')
}

// 延迟函数
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 删除指定数量的字符（模拟退格键）
async function deleteChars(count) {
  if (count <= 0) return

  console.log('[语音输入] 删除字符:', count)

  try {
    await window.api?.clipboard?.deleteChars?.(count)
  } catch (error) {
    console.error('[语音输入] 删除字符失败:', error)
  }
}

// 粘贴文字
async function pasteText(text) {
  if (!text) return

  console.log('[语音输入] 粘贴文字:', text)

  try {
    await window.api?.clipboard?.writeText(text)
    await window.api?.clipboard?.paste()
  } catch (error) {
    console.error('[语音输入] 粘贴文字失败:', error)
  }
}

// 说话状态定时器
let speakingTimer = null
function resetSpeakingTimer() {
  if (speakingTimer) {
    clearTimeout(speakingTimer)
  }
  speakingTimer = setTimeout(() => {
    isSpeaking.value = false
  }, 1500)
}

// 状态变化处理
const handleStateChange = (state) => {
  console.log('[语音输入] 状态变化:', state)
  switch (state) {
    case 'connected':
      connectionStatus.value = 'connected'
      break
    case 'recording':
      isRecording.value = true
      connectionStatus.value = 'recording'
      break
    case 'stopped':
    case 'disconnected':
      isRecording.value = false
      connectionStatus.value = 'stopped'
      break
    case 'error':
      isRecording.value = false
      connectionStatus.value = 'error'
      break
  }
}

// 初始化并开始录音
onMounted(async () => {
  console.log('[语音输入] 组件挂载，开始初始化...')

  // 监听主进程发来的关闭消息
  window.electron?.ipcRenderer?.on('voice-input:close', () => {
    console.log('[语音输入] 收到关闭消息')
    handleClose()
  })

  try {
    voiceService.onMessage = handleMessage
    voiceService.onStateChange = handleStateChange

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
      console.warn('[语音输入] 获取录音源配置失败:', e)
    }

    voiceService.init(recordingSource)

    await voiceService.start({
      url: 'ws://chat.danaai.net/asr/speechTranslate',
      sourceLanguage: 'ZH',
      targetLanguage: 'EN',
      openTranslate: false,
      openTts: false
    })
    console.log('[语音输入] 启动成功')
  } catch (error) {
    console.error('[语音输入] 初始化失败:', error)
    connectionStatus.value = 'error'
  }
})

onUnmounted(() => {
  voiceService.stop()
  if (speakingTimer) {
    clearTimeout(speakingTimer)
  }
  window.electron?.ipcRenderer?.removeAllListeners?.('voice-input:close')
  // 清理拖拽事件监听器
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  // 重置状态
  onlineCharCount = 0
  messageQueue.length = 0 // 清空队列
  isProcessing = false
  isClosing = false
})

const handleClose = async () => {
  if (isClosing) return
  isClosing = true

  await voiceService.stop()
  isRecording.value = false
  connectionStatus.value = 'stopped'
  onlineCharCount = 0

  // 延迟后关闭窗口（麦克风由窗口 closed 事件自动检测并关闭）
  setTimeout(() => {
    window.api?.window?.close()
  }, 300)
}

// 自动关闭：收到后端结束标识后延迟2秒关闭
const handleAutoClose = async () => {
  if (isClosing) return
  isClosing = true

  console.log('[语音输入] 开始自动关闭流程，延迟2秒...')

  // 发送停止信号给服务端
  voiceService.stop()

  // 延迟2秒后关闭录音和窗口
  setTimeout(async () => {
    console.log('[语音输入] 延迟结束，关闭录音和窗口')
    isRecording.value = false
    connectionStatus.value = 'stopped'
    onlineCharCount = 0

    // 再延迟300ms关闭窗口
    setTimeout(() => {
      window.api?.window?.close()
    }, 300)
  }, 2000)
}

// ============ 拖拽功能 ============
// 记录是否发生了拖拽（用于区分点击和拖拽）
let hasDragged = false

const handleDragStart = (e) => {
  // 阻止默认行为
  e.preventDefault()

  isDragging.value = true
  hasDragged = false
  dragStartX = e.screenX
  dragStartY = e.screenY

  // 添加全局事件监听
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
}

const handleDragMove = (e) => {
  if (!isDragging.value) return

  const deltaX = e.screenX - dragStartX
  const deltaY = e.screenY - dragStartY

  // 如果移动距离超过阈值，标记为拖拽
  if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
    hasDragged = true
  }

  // 更新起始位置
  dragStartX = e.screenX
  dragStartY = e.screenY

  // 调用主进程移动窗口
  window.api?.window?.moveBy(deltaX, deltaY)
}

const handleDragEnd = () => {
  isDragging.value = false

  // 移除全局事件监听
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
}

// 点击事件：如果没有拖拽则关闭窗口
const handleBallClick = () => {
  // 如果发生了拖拽，不触发关闭
  if (hasDragged) {
    hasDragged = false
    return
  }
  handleClose()
}
</script>

<template>
  <div
    class="voice-input-ball"
    :class="{ dragging: isDragging }"
    @mousedown="handleDragStart"
    @click="handleBallClick"
  >
    <!-- 音频状态圆球 -->
    <div
      class="audio-ball"
      :class="{
        speaking: isSpeaking && isRecording,
        recording: isRecording && !isSpeaking,
        muted: !isRecording,
        error: connectionStatus === 'error'
      }"
    >
      <!-- 音频波形动画 -->
      <div v-if="isSpeaking && isRecording" class="wave-container">
        <div class="wave wave-1"></div>
        <div class="wave wave-2"></div>
        <div class="wave wave-3"></div>
      </div>

      <!-- 麦克风图标 -->
      <div v-else class="mic-icon">
        <svg viewBox="0 0 24 24" class="mic-svg">
          <path
            v-if="isRecording"
            fill="currentColor"
            d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"
          />
          <path
            v-else
            fill="currentColor"
            d="M19 11c0 1.19-.34 2.3-.9 3.28l-1.23-1.23c.27-.62.43-1.3.43-2.05H19zm-4.02.03c0-.03.02-.05.02-.08V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.85zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20h2v-2.28c.88-.11 1.71-.38 2.48-.79l4.25 4.25L21 19.73 4.27 3z"
          />
        </svg>
      </div>
    </div>

    <!-- 状态提示文字 -->
    <div v-if="connectionStatus === 'error'" class="status-tip">连接失败</div>
  </div>
</template>

<style lang="scss" scoped>
.voice-input-ball {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  cursor: grab;
  user-select: none;
  -webkit-app-region: no-drag;

  &.dragging {
    cursor: grabbing;
  }
}

.audio-ball {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition:
    background 0.3s ease,
    transform 0.2s ease,
    box-shadow 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  }

  &:active {
    transform: scale(0.95);
  }

  // 录音中但没人说话 - 蓝色脉冲
  &.recording {
    background: #409eff;
    animation: pulse-recording 2s infinite;
  }

  // 有人说话 - 绿色活跃
  &.speaking {
    background: #67c23a;
    animation: pulse-speaking 0.8s infinite;
  }

  // 静音/停止 - 灰色
  &.muted {
    background: #909399;
  }

  // 错误状态 - 红色
  &.error {
    background: #f56c6c;
  }
}

// 录音脉冲动画
@keyframes pulse-recording {
  0%,
  100% {
    box-shadow:
      0 0 0 0 rgba(var(--color-primary-rgb, 64, 158, 255), 0.4),
      0 4px 12px rgba(0, 0, 0, 0.15);
  }
  50% {
    box-shadow:
      0 0 0 10px rgba(var(--color-primary-rgb, 64, 158, 255), 0),
      0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

// 说话脉冲动画
@keyframes pulse-speaking {
  0%,
  100% {
    box-shadow:
      0 0 0 0 rgba(var(--color-success-rgb, 103, 194, 58), 0.6),
      0 4px 12px rgba(0, 0, 0, 0.15);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 0 8px rgba(var(--color-success-rgb, 103, 194, 58), 0),
      0 4px 12px rgba(0, 0, 0, 0.15);
    transform: scale(1.05);
  }
}

// 音频波形容器
.wave-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 24px;
}

.wave {
  width: 4px;
  background: #fff;
  border-radius: 2px;
  animation: wave-bounce 0.6s ease-in-out infinite;

  &.wave-1 {
    height: 12px;
    animation-delay: 0s;
  }

  &.wave-2 {
    height: 20px;
    animation-delay: 0.15s;
  }

  &.wave-3 {
    height: 12px;
    animation-delay: 0.3s;
  }
}

@keyframes wave-bounce {
  0%,
  100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
}

// 麦克风图标
.mic-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mic-svg {
  width: 28px;
  height: 28px;
  color: #fff;
}

// 状态提示
.status-tip {
  margin-top: 4px;
  font-size: 10px;
  color: #f56c6c;
  text-align: center;
}
</style>

<!-- 全局样式：让窗口背景透明 -->
<style lang="scss">
// 语音输入窗口专用：让 html 和 body 透明
html:has(.voice-input-ball),
body:has(.voice-input-ball) {
  background: transparent !important;
}
</style>
