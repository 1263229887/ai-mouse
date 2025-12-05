<template>
  <!-- 首页组件 - 功能卡片选择页面 -->
  <div class="container">
    <h1 class="title">AI Mouse</h1>
    <div class="cards">
      <!-- AI输入卡片 -->
      <div 
        class="card" 
        :class="{ 'card-selected': currentMode === 'typing' }"
        @click="selectMode('typing')"
      >
        <div class="card-icon">⌨️</div>
        <h2 class="card-title">语音识别输入</h2>
        <p class="card-desc">语音实时识别,追加AI修正并输入</p>
        <div class="shortcut" v-if="currentMode !== 'typing'">单击选择此模式</div>
        <div class="shortcut active" v-else>
          {{ isRecording ? '双击左键停止' : '双击左键启动' }}
        </div>
        <!-- 状态提示 -->
        <div class="status" v-if="currentMode === 'typing'">
          <span class="status-dot" :class="{ 'recording': isRecording }"></span>
          {{ isRecording ? '录音中...' : '已就绪，双击鼠标左键开始录音' }}
        </div>
      </div>
      <!-- AI翻译卡片 -->
      <div 
        class="card" 
        :class="{ 'card-selected': currentMode === 'translate' }"
        @click="selectMode('translate')"
      >
        <div class="card-icon">🌐</div>
        <h2 class="card-title">语音识别翻译</h2>
        <p class="card-desc">语音实时识别,自动翻译并输入</p>
        <div class="shortcut" v-if="currentMode !== 'translate'">单击选择此模式</div>
        <div class="shortcut active" v-else>
          {{ isRecording ? '双击左键停止' : '双击左键启动' }}
        </div>
        <!-- 状态提示 -->
        <div class="status" v-if="currentMode === 'translate'">
          <span class="status-dot" :class="{ 'recording': isRecording }"></span>
          {{ isRecording ? '录音中...' : '已就绪，双击鼠标左键开始录音' }}
        </div>
      </div>
    </div>
    <!-- 取消按钮 -->
    <div class="cancel-btn" v-if="currentMode" @click="cancelMode">
      取消选择 (ESC)
    </div>
  </div>
</template>

<script setup>
/**
 * Home.vue - 首页组件
 * 显示功能卡片，用于选择不同的AI模拟功能
 * - 单击卡片选择模式
 * - 选择后双击鼠标左键启动录音
 * - 再次双击左键停止并粘贴
 */

import { onMounted, onUnmounted, ref } from 'vue'

// ==================== 响应式状态 ====================
// 当前选中的模式：null-未选择, 'typing'-语音输入, 'translate'-语音翻译
const currentMode = ref(null)
// 是否正在录音
const isRecording = ref(false)

// ==================== 事件处理函数 ====================
/**
 * 选择模式
 */
const selectMode = (mode) => {
  if (currentMode.value === mode) {
    // 已选中该模式，不做处理（通过双击鼠标启动）
    return
  }
  currentMode.value = mode
  isRecording.value = false
  // 通知主进程
  window.electron.ipcRenderer.send('select-mode', mode)
}

/**
 * 取消模式选择
 */
const cancelMode = () => {
  currentMode.value = null
  isRecording.value = false
  // 通知主进程
  window.electron.ipcRenderer.send('cancel-mode')
}

/**
 * 处理录音状态变化
 */
const onRecordingStateChanged = (event, data) => {
  isRecording.value = data.isRecording
  // 如果录音停止且识别完成，重置模式
  if (!data.isRecording && data.completed) {
    currentMode.value = null
  }
}

/**
 * 处理模式已选中的确认
 */
const onModeSelected = (event, data) => {
  currentMode.value = data.mode
}

/**
 * 键盘事件处理 - ESC 取消选择
 */
const handleKeydown = (e) => {
  if (e.key === 'Escape' && currentMode.value) {
    cancelMode()
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 监听录音状态变化
  window.electron.ipcRenderer.on('recording-state-changed', onRecordingStateChanged)
  window.electron.ipcRenderer.on('mode-selected', onModeSelected)
  
  // 监听键盘事件
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  // 清理事件监听
  window.electron.ipcRenderer.removeAllListeners('recording-state-changed')
  window.electron.ipcRenderer.removeAllListeners('mode-selected')
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* 容器样式 */
.container {
  background-image: url('./wavy-lines.svg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  background-color: #1e1e1e;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 40px;
  width: 100%vw
}

/* 标题样式 */
.title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 50px;
  color: #fff;
}

/* 卡片容器 */
.cards {
  display: flex;
  gap: 40px;
}

/* 卡片样式 */
.card {
  width: 280px;
  height: 320px;
  background: linear-gradient(145deg, #2a2a3e, #1e1e2e);
  border-radius: 20px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 卡片悬停效果 */
.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  border-color: rgba(100, 200, 255, 0.3);
}

/* 卡片选中状态 */
.card-selected {
  border-color: rgba(74, 222, 128, 0.6);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.2);
  transform: translateY(-4px);
}

.card-selected:hover {
  border-color: rgba(74, 222, 128, 0.8);
}

/* 卡片图标 */
.card-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

/* 卡片标题 */
.card-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}

/* 卡片描述 */
.card-desc {
  font-size: 0.9rem;
  color: #888;
  text-align: center;
  margin-bottom: 20px;
}

/* 快捷键提示 */
.shortcut {
  background: rgba(100, 200, 255, 0.15);
  color: #64c8ff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

.shortcut.active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

/* 状态提示样式 */
.status {
  margin-top: 12px;
  color: #4ade80;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 状态指示点 */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  animation: pulse 2s ease-in-out infinite;
}

.status-dot.recording {
  background: #f87171;
  animation: pulse 0.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 取消按钮 */
.cancel-btn {
  margin-top: 30px;
  padding: 10px 24px;
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background: rgba(248, 113, 113, 0.25);
}
</style>
