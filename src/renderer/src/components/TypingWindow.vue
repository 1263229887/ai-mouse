<template>
  <!-- 打字机效果窗口组件 -->
  <div class="typing-container">
    <!-- 显示打字机效果的文字区域 -->
    <div class="typing-text">
      <span class="text-content">{{ displayedText }}</span>
      <!-- 闪烁的光标 -->
      <span class="cursor" v-if="!isComplete">|</span>
    </div>
    <!-- 完成提示 -->
    <div class="status" v-if="isComplete">
      <span class="complete-icon">✓</span>
      <span>输入完成</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// ==================== 响应式状态 ====================
// 当前已显示的文字
const displayedText = ref('')
// 是否完成打字
const isComplete = ref(false)

// ==================== 配置项 ====================
// 要显示的完整文本
const fullText = '你好，我现在在模拟鼠标语音输入文字。'
// 每个字符的打字间隔（毫秒）
const typingSpeed = 100
// 打字完成后等待关闭的时间（毫秒）
const closeDelay = 800

// ==================== 打字机效果实现 ====================
/**
 * 执行打字机效果
 * 逐字显示文本，完成后通知主进程
 */
const startTyping = () => {
  let currentIndex = 0

  // 使用 setInterval 逐字显示
  const timer = setInterval(() => {
    if (currentIndex < fullText.length) {
      // 逐字添加到显示文本
      displayedText.value += fullText[currentIndex]
      currentIndex++
    } else {
      // 打字完成
      clearInterval(timer)
      isComplete.value = true
      // 延迟后通知主进程完成
      setTimeout(() => {
        // 通过 IPC 通知主进程打字完成，可以执行粘贴操作
        window.electron.ipcRenderer.send('typing-complete', fullText)
      }, closeDelay)
    }
  }, typingSpeed)
}

// ==================== 生命周期钩子 ====================
onMounted(() => {
  // 组件挂载后开始打字效果
  startTyping()
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

/* 文字显示区域 */
.typing-text {
  font-size: 16px;
  color: #e0e0e0;
  line-height: 1.6;
  font-family: 'Microsoft YaHei', sans-serif;
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
