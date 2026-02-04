<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { useDeviceStore, useAuthStore, useLanguageStore, useAIAssistantStore } from '@/stores'
import { activateDevice } from '@/api'
import SvgIcon from '@/components/SvgIcon/index.vue'

// 等待样式应用后再显示内容
const isReady = ref(false)

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
 * 只监听设备连接和消息（用于厂商ID轮询）
 * 断开处理已由 App.vue 全局统一处理
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

  // 断开处理已由 App.vue 全局统一处理，这里只需要清理本组件状态
  window.api?.device?.onDeviceDisconnected(() => {
    console.log('[Auth] Device disconnected')
    stopVendorIdPolling()
    currentDeviceId = null
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
  // 等待样式应用后再显示内容
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        isReady.value = true
      }, 100)
    })
  })

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
  // 注意：不要调用 removeAllListeners()，否则会移除 App.vue 的全局监听器
})

/**
 * 跳转到按键设置页
 */
function goToSettings() {
  router.push('/main/settings')
}
</script>

<template>
  <div
    v-show="isReady"
    class="w-full flex-1 flex justify-center items-center bg-#101214 select-none"
    :class="isInMenu ? '' : 'min-h-100vh'"
  >
    <div class="flex flex-col items-center justify-center">
      <!-- 鼠标图标 -->
      <div class="w-200 h-200 f-c-c">
        <SvgIcon name="mouse" size="100%" themed />
      </div>

      <!-- 标题 -->
      <h1 class="text-32 font-500 color-#fff m-0 mt-24">AI Mouse</h1>

      <!-- 授权成功状态 -->
      <template v-if="authStore.isAuthorized">
        <span class="text-16 font-700 mt-8 color-#67C23A">授权成功</span>

        <div class="flex flex-col items-center gap-8 mt-24">
          <span class="text-14 color-#909399"
            >设备序列号: {{ deviceStore.serialNumber || '--' }}</span
          >
          <span class="text-14 color-#909399">设备版本号: {{ deviceStore.version || '--' }}</span>
          <span class="text-14 color-#909399">厂商ID: {{ deviceStore.vendorId || '--' }}</span>
        </div>

        <!-- 只在独立授权页显示按键设置按钮 -->
        <button
          v-if="!isInMenu"
          class="mt-32 py-12 w-200 text-14 font-500 color-#111 bg-#fff b-none rd-8 cursor-pointer hover:op-90"
          @click="goToSettings"
        >
          按键设置
        </button>
      </template>

      <!-- 授权中状态 -->
      <template v-else-if="authStore.isPending">
        <div class="flex flex-col items-center gap-16 mt-32">
          <el-icon class="color-#8BE6B0 loading-icon" :size="32">
            <Loading />
          </el-icon>
          <span class="text-16 font-700 color-#34C759">授权检测中...</span>
        </div>
        <div class="flex flex-col items-center gap-8 mt-24">
          <span class="text-14 color-#909399"
            >设备序列号: {{ deviceStore.serialNumber || '--' }}</span
          >
          <span class="text-14 color-#909399">设备版本号: {{ deviceStore.version || '--' }}</span>
          <span class="text-14 color-#909399">厂商ID: {{ deviceStore.vendorId || '--' }}</span>
        </div>
      </template>

      <!-- 授权失败状态 -->
      <template v-else-if="authStore.authStatus === 'failed'">
        <span class="text-16 font-500 mt-8 color-#F56C6C">{{
          authStore.errorMessage || '授权失败'
        }}</span>
        <div class="flex flex-col items-center gap-8 mt-24">
          <span class="text-14 color-#909399"
            >设备序列号: {{ deviceStore.serialNumber || '--' }}</span
          >
          <span class="text-14 color-#909399">设备版本号: {{ deviceStore.version || '--' }}</span>
          <span class="text-14 color-#909399">厂商ID: {{ deviceStore.vendorId || '--' }}</span>
        </div>
      </template>

      <!-- 离线/等待连接状态 -->
      <template v-else>
        <div class="flex flex-col items-center gap-16 mt-32">
          <el-icon class="color-#8BE6B0 loading-icon" :size="32">
            <Loading />
          </el-icon>
          <span class="text-16 color-#606C80">检测鼠标设备连接中...</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.loading-icon {
  animation: rotate 1.5s linear infinite;
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
