<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '@/stores'

const themeStore = useThemeStore()

// 浮动球位置和拖动状态
const floatBall = ref(null)
const isDragging = ref(false)
const position = ref({ x: 0, y: 0 })
const dragStart = ref({ x: 0, y: 0 })

// 初始化位置（右下角）
onMounted(() => {
  position.value = {
    x: window.innerWidth - 80,
    y: window.innerHeight - 80
  }
})

// 开始拖动
const handleMouseDown = (e) => {
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  }
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 拖动中
const handleMouseMove = (e) => {
  if (!isDragging.value) return
  
  const newX = e.clientX - dragStart.value.x
  const newY = e.clientY - dragStart.value.y
  
  // 限制在窗口范围内
  const maxX = window.innerWidth - 60
  const maxY = window.innerHeight - 60
  
  position.value = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY))
  }
}

// 结束拖动
const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// 组件销毁时清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

// 切换主题
const handleThemeToggle = () => {
  if (!isDragging.value) {
    themeStore.toggleTheme()
  }
}
</script>

<template>
  <div class="app-container">
    <router-view />
    
    <!-- 可拖动的主题切换浮动球 -->
    <div
      ref="floatBall"
      class="theme-float-ball"
      :class="{ dragging: isDragging }"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }"
      @mousedown="handleMouseDown"
      @click="handleThemeToggle"
    >
      <SvgIcon name="theme" :size="24" themed />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.theme-float-ball {
  position: fixed;
  width: clamp(3rem, 5vw, 3.75rem);
  height: clamp(3rem, 5vw, 3.75rem);
  border-radius: 50%;
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  z-index: 9999;
  transition:
    background 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.2s ease;
  user-select: none;

  &:hover {
    background: var(--bg-color-hover);
    box-shadow: var(--card-shadow-hover);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  &.dragging {
    box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.2);
    transform: scale(1.1);
    cursor: grabbing;
  }
}
</style>
