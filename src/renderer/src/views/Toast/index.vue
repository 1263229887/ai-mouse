<script setup>
/**
 * Toast/index.vue - 全局 Toast 提示小窗口
 * 屏幕居中显示，圆角半透明背景，自动消失
 */
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 从路由参数获取消息和时长
const message = ref(decodeURIComponent(route.query.message || '提示信息'))
const duration = ref(parseInt(route.query.duration) || 2000)

// 显示状态（用于动画）
const isVisible = ref(false)

onMounted(() => {
  // 延迟显示，触发进入动画
  requestAnimationFrame(() => {
    isVisible.value = true
  })

  // 提前触发消失动画
  setTimeout(() => {
    isVisible.value = false
  }, duration.value - 300)
})
</script>

<template>
  <div class="toast-container" :class="{ visible: isVisible }">
    <div class="toast-content">
      <span class="toast-icon">!</span>
      <span class="toast-message">{{ message }}</span>
    </div>
  </div>
</template>

<style scoped>
/* 窗口完全透明，背景由内容区控制 */
.toast-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent !important;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.25s ease-out;
}

.toast-container.visible {
  opacity: 1;
  transform: scale(1);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 32px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.toast-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ff9500;
  color: white;
  border-radius: 50%;
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-message {
  color: white;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.4;
  max-width: 260px;
  word-break: break-word;
}
</style>
