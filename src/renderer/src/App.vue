<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '@/stores'

const themeStore = useThemeStore()

// 按键事件视觉反馈 - 需虹灯带状态
const showNeonBorder = ref(false)
let neonTimer = null

/**
 * 初始化按键事件监听（用于验证按键回调是否生效）
 */
function initKeyEventListener() {
  window.api?.device?.onKeyEvent((data) => {
    console.log('[App] Key event received:', data)
    // 监听 index 1 的按键事件
    if (data.index === 1) {
      if (data.status === 1) {
        // 按下 - 显示需虹灯带
        showNeonBorder.value = true
        // 清除之前的定时器
        if (neonTimer) {
          clearTimeout(neonTimer)
          neonTimer = null
        }
      } else if (data.status === 0) {
        // 松开 - 延迟 0.5s 后隐藏
        neonTimer = setTimeout(() => {
          showNeonBorder.value = false
        }, 500)
      }
    }
  })
}

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
  // 初始化按键事件监听
  initKeyEventListener()
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
  // 清理需虹灯带定时器
  if (neonTimer) {
    clearTimeout(neonTimer)
    neonTimer = null
  }
  // 移除按键事件监听
  window.api?.device?.removeKeyEventListener?.()
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
    <!-- 按键事件视觉反馈 - 需虹灯带（左、右、下三边） -->
    <div v-if="showNeonBorder" class="neon-border">
      <div class="neon-left"></div>
      <div class="neon-right"></div>
      <div class="neon-bottom"></div>
      <div class="neon-corner bottom-left"></div>
      <div class="neon-corner bottom-right"></div>
    </div>

    <router-view />

    <!-- 可拖动的主题切换浮动球---暂时先不要切换主题了--预留吧 -->
    <div
      v-if="false"
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

// 按键事件视觉反馈 - 需虹灯带样式（只显示左、右、下三边）
.neon-border {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 99999;
  overflow: hidden;
}

// 左侧灯带
.neon-left {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    #00f9ff 10%,
    #00ff87 30%,
    #ffea00 50%,
    #ff00ea 70%,
    #00f9ff 90%,
    transparent 100%
  );
  background-size: 100% 300%;
  animation: neon-flow-vertical 2s linear infinite;
  box-shadow:
    0 0 4px #00f9ff,
    0 0 8px #00f9ff,
    0 0 12px rgba(0, 249, 255, 0.5);
}

// 右侧灯带
.neon-right {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    #ff00ea 10%,
    #ffea00 30%,
    #00ff87 50%,
    #00f9ff 70%,
    #ff00ea 90%,
    transparent 100%
  );
  background-size: 100% 300%;
  animation: neon-flow-vertical 2s linear infinite reverse;
  box-shadow:
    0 0 4px #ff00ea,
    0 0 8px #ff00ea,
    0 0 12px rgba(255, 0, 234, 0.5);
}

// 底部灯带
.neon-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #00f9ff, #00ff87, #ffea00, #ff00ea, #00f9ff);
  background-size: 300% 100%;
  animation: neon-flow-horizontal 2s linear infinite;
  box-shadow:
    0 0 4px #00f9ff,
    0 0 8px #00ff87,
    0 0 12px rgba(0, 255, 135, 0.5);
}

// 角落发光点
.neon-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00f9ff;
  box-shadow:
    0 0 6px #00f9ff,
    0 0 12px #00f9ff,
    0 0 18px rgba(0, 249, 255, 0.6);
  animation: neon-pulse 1s ease-in-out infinite;

  &.bottom-left {
    left: -1px;
    bottom: -1px;
  }

  &.bottom-right {
    right: -1px;
    bottom: -1px;
  }
}

@keyframes neon-flow-vertical {
  0% {
    background-position: 0% 0%;
    filter: hue-rotate(0deg);
  }
  100% {
    background-position: 0% 300%;
    filter: hue-rotate(360deg);
  }
}

@keyframes neon-flow-horizontal {
  0% {
    background-position: 0% 0%;
    filter: hue-rotate(0deg);
  }
  100% {
    background-position: 300% 0%;
    filter: hue-rotate(360deg);
  }
}

@keyframes neon-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.8);
  }
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
