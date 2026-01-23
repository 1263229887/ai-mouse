<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { useDeviceStore, useThemeStore } from '@/stores'

// 设备状态
const deviceStore = useDeviceStore()

// 主题
const themeStore = useThemeStore()

// 厂商ID轮询定时器
let vendorIdTimer = null
const vendorIdMaxAttempts = 120 // 最多尝试120次 = 60秒
const vendorIdAttempts = ref(0)

// 当前设备ID（用于轮询）
let currentDeviceId = null

/**
 * 开始轮询获取厂商ID
 */
function startVendorIdPolling(deviceId) {
  // 清除之前的定时器
  stopVendorIdPolling()
  vendorIdAttempts.value = 0

  vendorIdTimer = setInterval(async () => {
    vendorIdAttempts.value++
    console.log(`[VendorID] 尝试获取厂商ID，第 ${vendorIdAttempts.value} 次`)

    try {
      const vendorId = await window.api?.device?.getVendorId(deviceId)
      console.log(`[VendorID] 获取结果:`, vendorId)

      if (vendorId) {
        deviceStore.setVendorId(vendorId)
        console.log(`[VendorID] 成功获取厂商ID: ${vendorId}`)
        stopVendorIdPolling()
        return
      }
    } catch (error) {
      console.error(`[VendorID] 获取失败:`, error)
    }

    // 达到最大尝试次数，停止轮询
    if (vendorIdAttempts.value >= vendorIdMaxAttempts) {
      console.log(`[VendorID] 达到最大尝试次数，停止轮询`)
      stopVendorIdPolling()
    }
  }, 500)
}

/**
 * 停止轮询获取厂商ID
 */
function stopVendorIdPolling() {
  if (vendorIdTimer) {
    clearInterval(vendorIdTimer)
    vendorIdTimer = null
  }
}

/**
 * 初始化设备监听
 */
function initDeviceListeners() {
  // 监听设备连接
  window.api?.device?.onDeviceConnected((data) => {
    console.log('Device connected:', data)
    currentDeviceId = data.deviceId
    deviceStore.updateDeviceInfo({
      deviceId: data.deviceId,
      connectionMode: data.connectionMode
    })
    // 注意：不在这里开始轮询，等待 deviceActive 确认设备已激活后再轮询
  })

  // 监听设备断开
  window.api?.device?.onDeviceDisconnected((data) => {
    console.log('Device disconnected:', data)
    stopVendorIdPolling()
    currentDeviceId = null
    deviceStore.resetDevice()
  })

  // 监听设备消息（包含设备信息更新）
  window.api?.device?.onDeviceMessage((data) => {
    console.log('Device message:', data)
    const { data: messageData } = data

    // 根据消息类型更新设备信息
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
          // 设备已激活，开始轮询获取厂商ID
          if (messageData.active === 1 && currentDeviceId && !deviceStore.vendorId) {
            startVendorIdPolling(currentDeviceId)
          }
          break
        default:
          // 其他消息类型（如 deviceKeyEvent）暂不处理
          break
      }
    }
  })
}

onMounted(() => {
  initDeviceListeners()
})

onUnmounted(() => {
  // 停止轮询
  stopVendorIdPolling()
  // 移除监听器
  window.api?.device?.removeAllListeners()
})
</script>

<template>
  <div class="home-container">
    <!-- 主题切换按钮 -->
    <button class="theme-toggle" @click="themeStore.toggleTheme">
      {{ themeStore.isDark() ? '☀️' : '🌙' }}
    </button>

    <div class="content-wrapper">
      <!-- 鼠标图片 -->
      <div class="mouse-image">
        <SvgIcon name="mouse" size="100%" themed />
      </div>

      <!-- 标题 -->
      <h1 class="title">AI Mouse</h1>

      <!-- 设备信息 -->
      <div v-if="deviceStore.isOnline" class="device-info">
        <div class="info-item">
          <span class="label">设备序列号:</span>
          <span class="value">{{ deviceStore.serialNumber || '--' }}</span>
        </div>
        <div class="info-item">
          <span class="label">厂商ID:</span>
          <span class="value">{{ deviceStore.vendorId || '--' }}</span>
        </div>
        <div class="info-item">
          <span class="label">设备版本号:</span>
          <span class="value">{{ deviceStore.version || '--' }}</span>
        </div>
        <div class="info-item">
          <span class="label">在线状态:</span>
          <span class="value online">在线</span>
        </div>
      </div>

      <!-- 离线状态 - Loading -->
      <div v-else class="device-loading">
        <el-icon class="loading-icon" :size="32">
          <Loading />
        </el-icon>
        <span class="loading-text">检测鼠标设备连接中...</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.home-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-color-page);
  overflow: hidden;
  transition: background 0.3s ease;
  position: relative;
}

.theme-toggle {
  position: absolute;
  top: clamp(1rem, 2vh, 1.5rem);
  right: clamp(1rem, 2vw, 1.5rem);
  width: clamp(2rem, 4vw, 2.5rem);
  height: clamp(2rem, 4vw, 2.5rem);
  border: none;
  border-radius: 50%;
  background: var(--bg-color-hover);
  cursor: pointer;
  font-size: clamp(1rem, 2vw, 1.25rem);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.3s ease,
    transform 0.2s ease;

  &:hover {
    background: var(--bg-color-active);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.mouse-image {
  width: clamp(120px, 20vw, 200px);
  height: clamp(120px, 20vw, 200px);
  margin-bottom: clamp(1rem, 3vh, 2rem);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: clamp(1.5rem, 4vh, 3rem);
  transition: color 0.3s ease;
}

.device-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.5rem, 1.5vh, 1rem);
}

.info-item {
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1vw, 1rem);
  font-size: clamp(0.8rem, 1.5vw, 1rem);

  .label {
    color: var(--text-secondary);
    transition: color 0.3s ease;
  }

  .value {
    color: var(--text-primary);
    font-family: 'Courier New', monospace;
    transition: color 0.3s ease;

    &.online {
      color: var(--color-success);
    }
  }
}

.device-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.75rem, 2vh, 1.5rem);

  .loading-icon {
    color: var(--color-primary);
    animation: rotate 1.5s linear infinite;
  }

  .loading-text {
    color: var(--text-secondary);
    font-size: clamp(0.85rem, 1.5vw, 1rem);
    transition: color 0.3s ease;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
