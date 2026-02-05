<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import AppNavbar from '@/components/AppNavbar/index.vue'
import { useBusinessStore } from '@/stores'

const businessStore = useBusinessStore()

// 计算属性：是否锁定主窗口
const isLocked = computed(() => businessStore.isMainWindowLocked)
const currentBusinessName = computed(() => businessStore.currentBusinessName)

// 监听业务状态变化
const handleBusinessStart = (data) => {
  console.log('[MainLayout] 收到业务开始通知:', data)
  businessStore.startBusiness(data.businessMode)
}

const handleBusinessStop = (data) => {
  console.log('[MainLayout] 收到业务停止通知:', data)
  businessStore.stopBusiness()
}

onMounted(() => {
  // 预加载 AITools 组件和首页组件，避免首次进入时闪烁
  import('@/views/AITools/index.vue')
  import('@/views/Dashboard/index.vue')

  // 监听业务状态变化
  window.electron?.ipcRenderer?.on('business:start', (event, data) => {
    handleBusinessStart(data)
  })
  window.electron?.ipcRenderer?.on('business:stop', (event, data) => {
    handleBusinessStop(data)
  })
})

onUnmounted(() => {
  // 移除监听器
  window.electron?.ipcRenderer?.removeAllListeners?.('business:start')
  window.electron?.ipcRenderer?.removeAllListeners?.('business:stop')
})
</script>

<template>
  <div class="main-layout">
    <AppNavbar />
    <div class="main-content">
      <router-view />
    </div>

    <!-- 业务进行中的遮罩层 -->
    <Transition name="fade">
      <div v-if="isLocked" class="business-overlay">
        <div class="overlay-content">
          <div class="loading-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
          <p class="overlay-text">{{ currentBusinessName }}进行中...</p>
          <p class="overlay-hint">请等待当前业务结束后再操作</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.main-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #0e1012;
}

// 业务进行中的遮罩层
.business-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.overlay-content {
  text-align: center;
  color: white;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;

  .dot {
    width: 10px;
    height: 10px;
    background: #4a9eff;
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite both;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      animation-delay: -0.16s;
    }
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.overlay-text {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.overlay-hint {
  font-size: 14px;
  color: #909399;
}

// 淡入淡出动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
