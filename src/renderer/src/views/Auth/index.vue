<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { useDeviceStore, useAuthStore, useLanguageStore, useAIAssistantStore } from '@/stores'
import { activateDevice } from '@/api'
import SvgIcon from '@/components/SvgIcon/index.vue'

const router = useRouter()
const route = useRoute()

// 设备状态
const deviceStore = useDeviceStore()

// 授权状态
const authStore = useAuthStore()

// 语言列表
const languageStore = useLanguageStore()

// AI 助手配置
const aiAssistantStore = useAIAssistantStore()

// 判断是否在菜单栏内（通过路由路径判断）
const isInMenu = computed(() => route.path.startsWith('/main'))

// 厂商ID轮询定时器
let vendorIdTimer = null
const vendorIdMaxAttempts = 120
const vendorIdAttempts = ref(0)

// 当前设备ID
let currentDeviceId = null

// 本次会话是否已调用过授权接口（防止重复调用）
let hasCalledAuth = false

/**
 * 开始轮询获取厂商ID
 */
function startVendorIdPolling(deviceId) {
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
 */
async function checkAndActivateDevice() {
  // 如果在菜单栏内且已经授权，跳过授权接口调用
  if (isInMenu.value && authStore.isAuthorized) {
    console.log('[Auth] 在菜单栏内且已授权，跳过授权接口调用')
    return
  }

  // 本次会话已调用过授权接口，不重复调用
  if (hasCalledAuth) {
    console.log('[Auth] 本次会话已调用过授权接口，跳过')
    return
  }

  const { serialNumber, vendorId, version, isOnline } = deviceStore

  if (!isOnline || !serialNumber || !vendorId || !version) {
    console.log('[Auth] 设备信息不完整，等待...')
    return
  }

  console.log('[Auth] 设备信息完整，开始授权...')
  hasCalledAuth = true // 标记本次会话已调用授权
  authStore.setAuthStatus('pending')

  try {
    const result = await activateDevice({
      tenantId: vendorId,
      deviceId: serialNumber,
      deviceType: 'smart_mouse',
      deviceModel: version
    })
    console.log('[Auth] 授权成功--result?.data:', result?.data)
    authStore.setAuth(result?.data)

    // 授权成功后立即加载语言列表
    languageStore.fetchLanguageList()
    console.log('[Auth] 授权成功，开始加载语言列表')

    // 授权成功后立即加载 AI 助手配置
    aiAssistantStore.fetchConfig()
    console.log('[Auth] 授权成功，开始加载 AI 助手配置')
  } catch (error) {
    console.error('[Auth] 授权失败:', error)
    authStore.setAuthStatus('failed', error.message)
  }
}

// 监听设备信息变化
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
 */
async function initDeviceState() {
  try {
    const state = await window.api?.device?.getCurrentState()
    console.log('[Auth] 当前设备状态:', state)

    if (state) {
      currentDeviceId = state.deviceId

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

      if (state.isOnline && !state.vendorId && currentDeviceId) {
        startVendorIdPolling(currentDeviceId)
      }

      // 如果设备信息已完整，主动触发授权检查
      if (state.serialNumber && state.vendorId && state.version && state.isOnline) {
        checkAndActivateDevice()
      }
    }
  } catch (error) {
    console.error('[Auth] 获取设备状态失败:', error)
  }
}

/**
 * 初始化设备监听
 */
function initDeviceListeners() {
  window.api?.device?.onDeviceConnected((data) => {
    console.log('[Auth] Device connected:', data)
    currentDeviceId = data.deviceId
    deviceStore.updateDeviceInfo({
      deviceId: data.deviceId,
      connectionMode: data.connectionMode
    })
    // 设备重新连接后，启动厂商ID轮询（因为断开时已清除vendorId）
    if (!deviceStore.vendorId && currentDeviceId) {
      startVendorIdPolling(currentDeviceId)
    }
  })

  window.api?.device?.onDeviceDisconnected((data) => {
    console.log('Device disconnected:', data)
    stopVendorIdPolling()
    currentDeviceId = null
    deviceStore.resetDevice()
    // 设备断开时清除授权状态，重置授权标志
    authStore.clearAuth()
    hasCalledAuth = false
  })

  window.api?.device?.onDeviceMessage((data) => {
    console.log('Device message:', data)
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
          if (messageData.active === 1 && currentDeviceId && !deviceStore.vendorId) {
            startVendorIdPolling(currentDeviceId)
          }
          break
        default:
          break
      }
    }
  })
}

onMounted(() => {
  // 独立授权页（非菜单栏内）：每次都要重新授权，清除缓存并重置状态
  if (!isInMenu.value) {
    console.log('[Auth] 独立授权页，清除缓存并强制重新授权')
    authStore.clearAuth() // 清除缓存的 token，确保重新授权
  }

  initDeviceState()
  initDeviceListeners()
})

onUnmounted(() => {
  stopVendorIdPolling()
  window.api?.device?.removeAllListeners()
})

/**
 * 跳转到按键设置页
 */
function goToSettings() {
  router.push('/main/settings')
}
</script>

<template>
  <div class="auth-container" :class="{ standalone: !isInMenu }">
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

        <!-- 只在独立授权页显示按键设置按钮 -->
        <button v-if="!isInMenu" class="settings-btn" @click="goToSettings">按键设置</button>
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
        <span class="auth-status error">{{ authStore.errorMessage || '授权失败' }}</span>
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
.auth-container {
  width: 100%;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-color-page);
  transition: background 0.3s ease;
  position: relative;

  // 独立页面时占满整个视口
  &.standalone {
    min-height: 100vh;
  }
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
  margin-top: clamp(0.375rem, 0.8vh, 0.5rem);
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
  gap: clamp(0.375rem, 0.8vh, 0.5rem);
  margin-top: clamp(1.25rem, 2.5vh, 1.5rem);
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
  margin-top: clamp(1.5rem, 3vh, 2rem);
  padding: clamp(0.625rem, 1.2vh, 0.75rem) clamp(2rem, 4vw, 3rem);
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.75rem, 1.3vw, 0.875rem);
  font-weight: 500;
  color: #111111;
  background: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition:
    opacity 0.3s ease,
    transform 0.2s ease,
    box-shadow 0.3s ease;

  &:hover {
    opacity: 0.9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
