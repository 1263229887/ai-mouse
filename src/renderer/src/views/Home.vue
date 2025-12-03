<template>
  <!-- 首页组件 - 功能卡片选择页面 -->
  <div class="container">
    <h1 class="title">AI Mouse</h1>
    <div class="cards">
      <!-- AI输入卡片 -->
      <div class="card" @click="triggerInput">
        <div class="card-icon">⌨️</div>
        <h2 class="card-title">模拟AI输入</h2>
        <p class="card-desc">模拟键盘输入AI生成的内容</p>
        <div class="shortcut">Ctrl + Shift + Y</div>
        <!-- 状态提示 -->
        <div class="status" v-if="inputStatus">{{ inputStatus }}</div>
      </div>
      <!-- AI翻译卡片 -->
      <div class="card" @click="triggerTranslate">
        <div class="card-icon">🌐</div>
        <h2 class="card-title">模拟AI翻译</h2>
        <p class="card-desc">选中文本后自动翻译并输入</p>
        <div class="shortcut">Ctrl + Shift + U</div>
        <!-- 状态提示 -->
        <div class="status" v-if="translateStatus">{{ translateStatus }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Home.vue - 首页组件
 * 显示功能卡片，用于选择不同的AI模拟功能
 * - 模拟AI输入：Ctrl+Shift+Y
 * - 模拟AI翻译：Ctrl+Shift+U
 */

import { onMounted, onUnmounted, ref } from 'vue'

// ==================== 响应式状态 ====================
// AI输入状态提示
const inputStatus = ref('')
// AI翻译状态提示
const translateStatus = ref('')

// ==================== 事件处理函数 ====================
/**
 * 触发AI输入功能
 * 通知主进程创建打字机窗口
 */
const triggerInput = () => {
  inputStatus.value = '正在启动...'
  // 通知主进程触发AI输入
  window.electron.ipcRenderer.send('start-ai-input')
  // 2秒后清除状态
  setTimeout(() => {
    inputStatus.value = ''
  }, 2000)
}

/**
 * 触发AI翻译功能
 * 通知主进程创建翻译窗口
 */
const triggerTranslate = () => {
  translateStatus.value = '正在启动...'
  // 通知主进程触发AI翻译
  window.electron.ipcRenderer.send('start-ai-translate')
  // 2秒后清除状态
  setTimeout(() => {
    translateStatus.value = ''
  }, 2000)
}

/**
 * 快捷键触发AI翻译时的回调
 */
const onAiTranslateTriggered = () => {
  translateStatus.value = '正在翻译...'
  setTimeout(() => {
    translateStatus.value = ''
  }, 5000)
}

/**
 * 快捷键触发AI输入时的回调
 */
const onAiInputTriggered = () => {
  inputStatus.value = '正在输入...'
  setTimeout(() => {
    inputStatus.value = ''
  }, 3000)
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 监听快捷键触发事件
  window.electron.ipcRenderer.on('trigger-ai-input', onAiInputTriggered)
  window.electron.ipcRenderer.on('trigger-ai-translate', onAiTranslateTriggered)
})

onUnmounted(() => {
  // 清理事件监听
  window.electron.ipcRenderer.removeAllListeners('trigger-ai-input')
  window.electron.ipcRenderer.removeAllListeners('trigger-ai-translate')
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

/* 状态提示样式 */
.status {
  margin-top: 12px;
  color: #4ade80;
  font-size: 0.8rem;
}
</style>
