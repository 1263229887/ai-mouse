<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { useDeviceStore, useAuthStore, useAppStore } from '@/stores'
import { activateDevice } from '@/api'
import SvgIcon from '@/components/SvgIcon/index.vue'

const router = useRouter()

// 应用状态
const appStore = useAppStore()

// 设备状态
const deviceStore = useDeviceStore()

// 授权状态
const authStore = useAuthStore()

// 点击按键设置，设置状态并跳转到设备设置页
const goToSettings = () => {
  appStore.setHasEnteredApp(true)
  router.push('/settings')
}

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
 * 检查并执行设备授权
 * 当设备信息完整时自动调用授权接口
 * 如果设备信息与已授权缓存完全匹配，则跳过授权接口调用
 */
async function checkAndActivateDevice() {
  const { serialNumber, vendorId, version, isOnline } = deviceStore

  // 检查设备信息是否完整
  if (!isOnline || !serialNumber || !vendorId || !version) {
    console.log('[Auth] 设备信息不完整，等待...')
    return
  }

  // 已经授权过或正在授权中，跳过
  if (authStore.isAuthorized || authStore.isPending) {
    console.log('[Auth] 已授权或正在授权中')
    return
  }

  const deviceInfo = { serialNumber, vendorId, version }

  // 检查是否与已授权设备信息匹配（跳过授权接口调用）
  if (authStore.isDeviceAuthorized(deviceInfo)) {
    console.log('[Auth] 设备信息匹配缓存，跳过授权接口调用')
    authStore.setAuthorizedFromCache()
    return
  }

  console.log('[Auth] 设备信息完整，开始授权...')
  authStore.setAuthStatus('pending')

  try {
    const result = await activateDevice({
      tenantId: vendorId,
      deviceId: serialNumber,
      deviceType: 'smart_mouse',
      deviceModel: version
    })

    console.log('[Auth] 授权成功:', result)
    authStore.setAuth(result)

    // 授权成功后，保存设备信息到缓存
    authStore.saveAuthorizedDevice(deviceInfo)
  } catch (error) {
    console.error('[Auth] 授权失败:', error)
    authStore.setAuthStatus('failed', error.message)
  }
}

// 监听设备信息变化，自动触发授权
watch(
  () => ({
    sn: deviceStore.serialNumber,
    vid: deviceStore.vendorId,
    ver: deviceStore.version,
    online: deviceStore.isOnline
  }),
  (newVal) => {
    if (newVal.sn && newVal.vid && newVal.ver && newVal.online) {
      checkAndActivateDevice()
    }
  },
  { deep: true }
)

/**
 * 初始化设备状态
 * 页面加载时主动查询当前设备状态，用于刷新后恢复
 */
async function initDeviceState() {
  try {
    const state = await window.api?.device?.getCurrentState()
    console.log('[Home] 当前设备状态:', state)

    if (state) {
      currentDeviceId = state.deviceId

      // 恢复设备信息
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

      // 如果设备已连接但缺少厂商ID，开始轮询
      if (state.isOnline && !state.vendorId && currentDeviceId) {
        startVendorIdPolling(currentDeviceId)
      }
    }
  } catch (error) {
    console.error('[Home] 获取设备状态失败:', error)
  }
}

/**
 * 初始化设备监听（仅设备连接/断开/消息，按键事件由全局 keyEventService 处理）
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
          // 其他消息类型暂不处理
          break
      }
    }
  })
}

onMounted(() => {
  // 先查询当前设备状态（用于刷新后恢复）
  initDeviceState()
  // 注册设备事件监听
  initDeviceListeners()
})

onUnmounted(() => {
  // 停止轮询
  stopVendorIdPolling()
})
</script>

<template>
  <div class="home-container">
    <div class="content-wrapper">
      <!-- 鼠标图标 -->
      <div class="mouse-icon">
        <SvgIcon name="mouse" size="100%" themed />
      </div>

      <!-- 标题 -->
      <h1 class="title">AI Mouse</h1>

      <!-- 授权成功状态 -->
      <template v-if="authStore.isAuthorized">
        <span class="auth-status success">授权成功</span>

        <div class="device-info">
          <span class="info-text">设备序列号: {{ deviceStore.serialNumber || '--' }}</span>
          <span class="info-text">设备版本号: {{ deviceStore.version || '--' }}</span>
          <span class="info-text">厂商ID: {{ deviceStore.vendorId || '--' }}</span>
        </div>

        <button class="settings-btn" @click="goToSettings">按键设置</button>
      </template>

      <!-- 授权中状态 -->
      <template v-else-if="authStore.isPending">
        <span class="auth-status pending">授权中...</span>
        <div class="device-info">
          <span class="info-text">设备序列号: {{ deviceStore.serialNumber || '--' }}</span>
          <span class="info-text">设备版本号: {{ deviceStore.version || '--' }}</span>
          <span class="info-text">厂商ID: {{ deviceStore.vendorId || '--' }}</span>
        </div>
      </template>

      <!-- 授权失败状态 -->
      <template v-else-if="authStore.authStatus === 'failed'">
        <span class="auth-status error">授权失败</span>
        <div class="device-info">
          <span class="info-text">设备序列号: {{ deviceStore.serialNumber || '--' }}</span>
          <span class="info-text">设备版本号: {{ deviceStore.version || '--' }}</span>
          <span class="info-text">厂商ID: {{ deviceStore.vendorId || '--' }}</span>
        </div>
      </template>

      <!-- 离线/等待连接状态 -->
      <template v-else>
        <div class="device-loading">
          <el-icon class="loading-icon" :size="32">
            <Loading />
          </el-icon>
          <span class="loading-text">检测鼠标设备连接中...</span>
        </div>
      </template>
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

.content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.mouse-icon {
  width: clamp(10rem, 20vw, 12.5rem); // 200px
  height: clamp(10rem, 20vw, 12.5rem);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-family: 'Inter', sans-serif;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  margin-top: clamp(1rem, 2vh, 1.5rem); // 24px
  transition: color 0.3s ease;
}

.auth-status {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.875rem, 1.5vw, 1rem);
  font-weight: 500;
  margin-top: clamp(0.375rem, 0.8vw, 0.5rem);
  transition: color 0.3s ease;

  &.success {
    color: var(--color-success);
  }

  &.pending {
    color: var(--color-warning);
  }

  &.error {
    color: var(--color-danger);
  }
}

.device-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.375rem, 0.8vw, 0.5rem);
  margin-top: clamp(1.25rem, 2.5vw, 1.5rem);
}

.info-text {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.8rem, 1.4vw, 1rem);
  font-weight: 400;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.settings-btn {
  margin-top: clamp(1.25rem, 2.5vw, 1.5rem);
  padding: clamp(0.625rem, 1.2vw, 0.75rem) clamp(2rem, 4vw, 3rem);
  border: none;
  border-radius: clamp(0.4rem, 0.8vw, 0.5rem);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.8rem, 1.3vw, 0.875rem);
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.3s ease,
    transform 0.2s ease,
    opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }
}

.device-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.75rem, 2vh, 1.5rem);
  margin-top: clamp(1.5rem, 3vh, 2rem);

  .loading-icon {
    color: var(--color-primary);
    animation: rotate 1.5s linear infinite;
  }

  .loading-text {
    font-family:
      'PingFang SC',
      -apple-system,
      BlinkMacSystemFont,
      sans-serif;
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
