<script setup>
/**
 * Dashboard/index.vue - 首页
 * 展示四个业务卡片：语音输入、语音翻译、AI助手、AI工具集
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { getVoiceInputService } from '@/services'

// 语音输入服务实例
const voiceInputService = getVoiceInputService()
const isVoiceRecording = ref(false)
const voiceServiceReady = ref(false)

// 业务卡片数据
const businessCards = [
  { id: 'voice-input', name: '语音输入', icon: '🎙️' },
  { id: 'voice-translate', name: '语音翻译', icon: '🌐' },
  { id: 'ai-assistant', name: 'AI助手', icon: '🤖' },
  { id: 'ai-tools', name: 'AI工具集', icon: '🛠️' }
]

// 初始化语音输入服务
onMounted(() => {
  try {
    // 设置服务端消息回调
    voiceInputService.onMessage = (data) => {
      console.log('[语音输入] 服务端返回:', data)
    }

    // 设置状态变化回调
    voiceInputService.onStateChange = (state) => {
      console.log('[语音输入] 状态变化:', state)
      if (state === 'recording') {
        isVoiceRecording.value = true
      } else if (state === 'stopped' || state === 'disconnected' || state === 'error') {
        isVoiceRecording.value = false
      }
    }

    voiceInputService.init()
    voiceServiceReady.value = true
    console.log('[语音输入] 服务初始化完成')
  } catch (error) {
    console.error('[语音输入] 服务初始化失败:', error)
  }
})

onUnmounted(() => {
  // 组件卸载时停止录音
  if (isVoiceRecording.value) {
    voiceInputService.stop()
  }
})

// 处理语音输入卡片点击
const handleVoiceInput = async () => {
  if (!voiceServiceReady.value) {
    console.warn('[语音输入] 服务未就绪')
    return
  }

  try {
    if (isVoiceRecording.value) {
      // 正在录音，停止
      console.log('[语音输入] 停止录音')
      await voiceInputService.stop()
    } else {
      // 未录音，开始
      console.log('[语音输入] 开始录音')
      await voiceInputService.start()
    }
  } catch (error) {
    console.error('[语音输入] 操作失败:', error)
  }
}

// 处理语音翻译卡片点击
const handleVoiceTranslate = () => {
  console.log('[语音翻译] 打开语音翻译窗口')
  // 创建语音翻译小窗口
  window.api?.window?.createMini('mini-voice-translate')
}

// 点击卡片
const handleCardClick = (card) => {
  console.log('点击业务卡片:', card.name)

  switch (card.id) {
    case 'voice-input':
      handleVoiceInput()
      break
    case 'voice-translate':
      handleVoiceTranslate()
      break
    case 'ai-assistant':
      console.log('[AI助手] 功能待实现')
      break
    case 'ai-tools':
      console.log('[AI工具集] 功能待实现')
      break
  }
}
</script>

<template>
  <div class="dashboard-container">
    <div class="cards-wrapper">
      <div
        v-for="card in businessCards"
        :key="card.id"
        class="business-card"
        :class="{ 'is-recording': card.id === 'voice-input' && isVoiceRecording }"
        @click="handleCardClick(card)"
      >
        <span class="card-icon">{{ card.icon }}</span>
        <span class="card-name">{{ card.name }}</span>
        <span v-if="card.id === 'voice-input' && isVoiceRecording" class="recording-indicator">
          录音中...
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-color-page);
  transition: background 0.3s ease;
}

.cards-wrapper {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(1rem, 2vw, 1.5rem);
}

.business-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: clamp(8rem, 15vw, 10rem);
  height: clamp(8rem, 15vw, 10rem);
  background: var(--card-bg);
  border: 1px solid var(--border-color-light);
  border-radius: clamp(0.75rem, 1.5vw, 1rem);
  cursor: pointer;
  transition:
    background 0.3s ease,
    border-color 0.3s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-shadow-hover);
    border-color: var(--border-color);
  }

  &:active {
    transform: scale(0.98);
  }
}

.card-icon {
  font-size: clamp(2rem, 4vw, 2.5rem);
  margin-bottom: clamp(0.5rem, 1vh, 0.75rem);
}

.card-name {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.875rem, 1.5vw, 1rem);
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.business-card.is-recording {
  border-color: var(--color-danger);
  background: rgba(255, 77, 79, 0.1);
  animation: pulse 1.5s infinite;
}

.recording-indicator {
  font-size: clamp(0.75rem, 1.2vw, 0.875rem);
  color: var(--color-danger);
  margin-top: clamp(0.25rem, 0.5vh, 0.5rem);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 77, 79, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0);
  }
}
</style>
