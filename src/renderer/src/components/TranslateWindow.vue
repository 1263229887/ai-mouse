<template>
  <!-- AI翻译窗口组件 -->
  <div class="translate-container">
    <!-- 原文区域（上半部分） -->
    <div class="section original">
      <div class="label">原文</div>
      <div class="text-content">
        <span>{{ displayedOriginal }}</span>
        <!-- 原文输入时的闪烁光标 -->
        <span class="cursor" v-if="isTypingOriginal">|</span>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="divider"></div>

    <!-- 译文区域（下半部分） -->
    <div class="section translation">
      <div class="label">译文</div>
      <div class="text-content">
        <span>{{ displayedTranslation }}</span>
        <!-- 译文输入时的闪烁光标 -->
        <span class="cursor" v-if="isTypingTranslation">|</span>
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
import { ref, onMounted } from 'vue'

// ==================== 响应式状态 ====================
// 当前已显示的原文
const displayedOriginal = ref('')
// 当前已显示的译文
const displayedTranslation = ref('')
// 是否正在打字显示原文
const isTypingOriginal = ref(true)
// 是否正在打字显示译文
const isTypingTranslation = ref(false)
// 是否全部完成
const isComplete = ref(false)

// ==================== 配置项 ====================
// 原文文本
const originalText = '你好，我现在在模拟鼠标AI翻译。'
// 译文文本
const translationText = 'Hello, I am currently simulating mouse AI translation.'
// 将译文按空格分词
const translationWords = translationText.split(' ')
// 每个字符的打字间隔（毫秒）
const typingSpeed = 100
// 每个词的显示间隔（毫秒）
const wordSpeed = 150
// 原文显示完后等待显示译文的时间（毫秒）
const translateDelay = 500
// 翻译完成后等待关闭的时间（毫秒）
const closeDelay = 800

// ==================== 打字机效果实现 ====================
/**
 * 执行原文的打字机效果
 * 逐字显示原文，完成后触发译文显示
 */
const startTypingOriginal = () => {
  let currentIndex = 0
  
  const timer = setInterval(() => {
    if (currentIndex < originalText.length) {
      // 逐字添加到显示文本
      displayedOriginal.value += originalText[currentIndex]
      currentIndex++
    } else {
      // 原文打字完成
      clearInterval(timer)
      isTypingOriginal.value = false
      
      // 延迟后显示译文
      setTimeout(() => {
        showTranslation()
      }, translateDelay)
    }
  }, typingSpeed)
}

/**
 * 分词显示译文
 * 每次显示一个单词，产生打字机效果
 */
const showTranslation = () => {
  isTypingTranslation.value = true
  let wordIndex = 0
  
  const timer = setInterval(() => {
    if (wordIndex < translationWords.length) {
      // 添加单词，单词之间加空格
      if (wordIndex > 0) {
        displayedTranslation.value += ' '
      }
      displayedTranslation.value += translationWords[wordIndex]
      wordIndex++
    } else {
      // 译文显示完成
      clearInterval(timer)
      isTypingTranslation.value = false
      isComplete.value = true
      
      // 延迟后通知主进程完成，粘贴译文
      setTimeout(() => {
        window.electron.ipcRenderer.send('typing-complete', translationText)
      }, closeDelay)
    }
  }, wordSpeed)
}

// ==================== 生命周期钩子 ====================
onMounted(() => {
  // 组件挂载后开始原文打字效果
  startTypingOriginal()
})
</script>

<style scoped>
/* 容器样式 */
.translate-container {
  padding: 16px 20px;
  background: linear-gradient(145deg, #1a1a2e, #16162a);
  border-radius: 12px;
  border: 1px solid rgba(100, 200, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-width: 320px;
  max-width: 450px;
}

/* 区域通用样式 */
.section {
  padding: 8px 0;
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
  margin: 8px 0;
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
  margin-top: 10px;
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
