<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDeviceStore, useAuthStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const deviceStore = useDeviceStore()
const authStore = useAuthStore()

// ============ 全局设备状态管理 ============
/**
 * 初始化设备状态
 * 应用启动时从主进程获取当前设备状态
 */
async function initDeviceState() {
  try {
    const state = await window.api?.device?.getCurrentState()
    console.log('[App] 当前设备状态:', state)

    if (state) {
      // 恢复设备信息到 store
      deviceStore.updateDeviceInfo({
        deviceId: state.deviceId,
        connectionMode: state.connectionMode
      })

      if (state.serialNumber) {
        deviceStore.setSerialNumber(state.serialNumber)
      }
      if (state.version) {
        deviceStore.setVersion(state.version)
      }
      if (state.vendorId) {
        deviceStore.setVendorId(state.vendorId)
      }
      if (state.isOnline) {
        deviceStore.setOnlineStatus(true)
      }
    }
  } catch (error) {
    console.error('[App] 获取设备状态失败:', error)
  }
}

/**
 * 判断当前路由是否需要断开跳转
 * 小窗口路由不需要跳转，它们有自己的处理逻辑
 */
function shouldRedirectOnDisconnect() {
  const currentPath = route.path
  // 小窗口路由不需要跳转
  if (currentPath.startsWith('/mini/')) {
    return false
  }
  // 已经在独立授权页，不需要跳转
  if (currentPath === '/auth') {
    return false
  }
  return true
}

/**
 * 初始化全局设备事件监听
 */
function initGlobalDeviceListeners() {
  // 监听设备连接
  window.api?.device?.onDeviceConnected((data) => {
    console.log('[App] Device connected:', data)
    deviceStore.updateDeviceInfo({
      deviceId: data.deviceId,
      connectionMode: data.connectionMode
    })
  })

  // 监听设备断开 - 全局统一处理
  window.api?.device?.onDeviceDisconnected((data) => {
    console.log('[App] Device disconnected:', data)
    // 重置设备状态
    deviceStore.resetDevice()
    // 清除授权状态
    authStore.clearAuth()
    // 判断是否需要跳转到授权页
    if (shouldRedirectOnDisconnect()) {
      console.log('[App] 设备断开，跳转到授权页')
      router.push('/auth')
    }
  })

  // 监听设备消息
  window.api?.device?.onDeviceMessage((data) => {
    console.log('[App] Device message:', data)
    const { data: messageData } = data

    if (messageData && messageData.type) {
      switch (messageData.type) {
        case 'deviceSN':
          deviceStore.setSerialNumber(messageData.sn || '')
          break
        case 'deviceVersion':
          deviceStore.setVersion(messageData.version || '')
          break
        case 'deviceActive':
          deviceStore.setOnlineStatus(messageData.active === 1)
          break
        default:
          break
      }
    }
  })
}

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

onMounted(() => {
  // 初始化按键事件监听
  initKeyEventListener()
  // 初始化设备状态（从主进程恢复）
  initDeviceState()
  // 初始化全局设备事件监听
  initGlobalDeviceListeners()
})

// 组件销毁时清理事件监听
onUnmounted(() => {
  // 清理需虹灯带定时器
  if (neonTimer) {
    clearTimeout(neonTimer)
    neonTimer = null
  }
  // 移除设备事件监听
  window.api?.device?.removeAllListeners?.()
})
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
</style>
