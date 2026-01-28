<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import LanguageSelect from '@/components/LanguageSelect/index.vue'
import { useDeviceStore, useLanguageStore, useAuthStore } from '@/stores'

const deviceStore = useDeviceStore()
const languageStore = useLanguageStore()
const authStore = useAuthStore()

// 设备连接状态（已授权且设备在线才算已连接）
const isDeviceConnected = computed(() => authStore.isAuthorized && deviceStore.isOnline)

// 翻转状态（用于交换按钮动画）
const isFlipped = ref(false)

// 语音输入选择的语言（从 store 读取）
const voiceInputIsoCode = computed(() => deviceStore.voiceInputSource.isoCode)
const voiceInputAreaId = computed(() => deviceStore.voiceInputSource.areaId)

// 语音翻译源语言（从 store 读取）
const translateSourceIsoCode = computed(() => deviceStore.translateSource.isoCode)
const translateSourceAreaId = computed(() => deviceStore.translateSource.areaId)

// 语音翻译目标语言（从 store 读取）
const translateTargetIsoCode = computed(() => deviceStore.translateTarget.isoCode)
const translateTargetAreaId = computed(() => deviceStore.translateTarget.areaId)

/**
 * 初始化语言的 areaId 和 chinese（根据当前 isoCode 从接口匹配）
 */
function initLanguageInfo() {
  // 语音输入：根据 isoCode 获取对应的 areaId 和 chinese
  const voiceInfo = languageStore.getLanguageInfo(deviceStore.voiceInputSource.isoCode)
  if (voiceInfo) {
    deviceStore.setVoiceInputSource(voiceInfo.isoCode, voiceInfo.areaId, voiceInfo.chinese)
  }
  // 翻译源语言
  const sourceInfo = languageStore.getLanguageInfo(deviceStore.translateSource.isoCode)
  if (sourceInfo) {
    deviceStore.setTranslateSource(sourceInfo.isoCode, sourceInfo.areaId, sourceInfo.chinese)
  }
  // 翻译目标语言
  const targetInfo = languageStore.getLanguageInfo(deviceStore.translateTarget.isoCode)
  if (targetInfo) {
    deviceStore.setTranslateTarget(targetInfo.isoCode, targetInfo.areaId, targetInfo.chinese)
  }
  console.log('[Dashboard] 语言信息初始化完成:', {
    voiceInputSource: deviceStore.voiceInputSource,
    translateSource: deviceStore.translateSource,
    translateTarget: deviceStore.translateTarget
  })
}

/**
 * 交换语音翻译语言
 */
function swapTranslateLanguages() {
  deviceStore.swapTranslateLanguages()
  // 触发翻转动画
  isFlipped.value = !isFlipped.value
}

/**
 * 语言选择变化回调
 */
function handleVoiceInputChange(option) {
  console.log('[Dashboard] 语音输入语言变更:', option)
  deviceStore.setVoiceInputSource(option.isoCode, option.areaId || '', option.chinese || '')
}

function handleTranslateSourceChange(option) {
  console.log('[Dashboard] 翻译源语言变更:', option)
  deviceStore.setTranslateSource(option.isoCode, option.areaId || '', option.chinese || '')
}

function handleTranslateTargetChange(option) {
  console.log('[Dashboard] 翻译目标语言变更:', option)
  deviceStore.setTranslateTarget(option.isoCode, option.areaId || '', option.chinese || '')
}

// 监听语言列表加载状态，加载完成后初始化语言信息
watch(
  () => languageStore.isLoaded,
  (isLoaded) => {
    if (isLoaded) {
      initLanguageInfo()
    }
  },
  { immediate: true }
)

// 组件挂载时，如果语言列表未加载则主动加载
onMounted(() => {
  // 如果语言列表未加载，主动调用（处理用户刷新页面的情况）
  if (!languageStore.isLoaded && !languageStore.isLoading) {
    console.log('[Dashboard] 语言列表未加载，主动调用')
    languageStore.fetchLanguageList()
  } else if (languageStore.isLoaded) {
    initLanguageInfo()
  }

  // 注册设备事件监听
  initDeviceListeners()
})

onUnmounted(() => {
  // 移除设备监听器
  window.api?.device?.removeAllListeners()
})

/**
 * 初始化设备监听
 */
function initDeviceListeners() {
  // 监听设备连接
  window.api?.device?.onDeviceConnected((data) => {
    console.log('[Dashboard] Device connected:', data)
    deviceStore.updateDeviceInfo({
      deviceId: data.deviceId,
      connectionMode: data.connectionMode
    })
  })

  // 监听设备断开
  window.api?.device?.onDeviceDisconnected((data) => {
    console.log('[Dashboard] Device disconnected:', data)
    deviceStore.resetDevice()
    // 设备断开时清除授权状态
    authStore.clearAuth()
  })

  // 监听设备消息
  window.api?.device?.onDeviceMessage((data) => {
    console.log('[Dashboard] Device message:', data)
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
</script>

<template>
  <div class="dashboard-container">
    <!-- AI Mouse 标题 -->
    <h1 class="main-title">AI Mouse</h1>

    <!-- 连接状态标签 -->
    <div class="status-badge" :class="{ disconnected: !isDeviceConnected }">
      <span class="status-dot" :class="{ disconnected: !isDeviceConnected }"></span>
      <span class="status-text">{{ isDeviceConnected ? 'AI鼠标已连接' : 'AI鼠标未连接' }}</span>
    </div>

    <!-- 卡片容器 -->
    <div class="cards-wrapper">
      <!-- 语音输入卡片 -->
      <div class="feature-card">
        <h2 class="card-title">语音输入</h2>
        <div class="card-icon">
          <img src="@/assets/icons/voice-input-feature.svg" alt="语音输入" />
        </div>
        <LanguageSelect
          :model-value="voiceInputIsoCode"
          :selected-area-id="voiceInputAreaId"
          :options="languageStore.languageList"
          placeholder="选择语言"
          search-placeholder="搜索语言"
          class="language-select"
          @change="handleVoiceInputChange"
        />
      </div>

      <!-- 语音翻译卡片 -->
      <div class="feature-card">
        <h2 class="card-title">语音翻译</h2>
        <div class="card-icon">
          <img src="@/assets/icons/voice-translate-feature.svg" alt="语音翻译" />
        </div>
        <div class="translate-selects">
          <LanguageSelect
            :model-value="translateSourceIsoCode"
            :selected-area-id="translateSourceAreaId"
            :options="languageStore.languageList"
            placeholder="源语言"
            search-placeholder="搜索语言"
            class="language-select"
            @change="handleTranslateSourceChange"
          />
          <button class="swap-btn" :class="{ flipped: isFlipped }" @click="swapTranslateLanguages">
            <img src="@/assets/icons/swap.svg" alt="交换语言" />
          </button>
          <LanguageSelect
            :model-value="translateTargetIsoCode"
            :selected-area-id="translateTargetAreaId"
            :options="languageStore.languageList"
            placeholder="目标语言"
            search-placeholder="搜索语言"
            class="language-select"
            @change="handleTranslateTargetChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: clamp(3rem, 8vh, 5rem);
  background: var(--bg-color-page);
  transition: background 0.3s ease;
  box-sizing: border-box;
}

.main-title {
  font-family: Inter, sans-serif;
  font-size: clamp(1.5rem, 3vw, 2rem); // ~32px
  font-weight: 500;
  background: linear-gradient(180deg, #8be6b0 31.25%, #27acc2 71.88%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  margin-bottom: clamp(1rem, 2vh, 1.25rem); // ~16-20px
}

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.375rem, 0.8vw, 0.5rem); // ~8px
  width: clamp(8rem, 15vw, 10rem); // ~160px
  height: clamp(1.75rem, 3vh, 2.125rem); // ~30-34px (调高)
  border-radius: 999px;
  background: #ffffff0d;
  margin-bottom: clamp(2.5rem, 5vh, 3.5rem); // 增加底部间距
}

.status-dot {
  width: clamp(0.375rem, 0.8vw, 0.5rem); // ~8px
  height: clamp(0.375rem, 0.8vw, 0.5rem);
  border-radius: 50%;
  background: #34c759;
  animation: breathing 2s ease-in-out infinite;
  transition: background 0.3s ease;

  &.disconnected {
    background: #ff3b30;
  }
}

@keyframes breathing {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}

.status-text {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.75rem, 1.3vw, 0.875rem); // ~14px
  color: #34c759;
  transition: color 0.3s ease;

  .disconnected & {
    color: #ff3b30;
  }
}

.cards-wrapper {
  display: flex;
  gap: clamp(1.5rem, 3vw, 2.5rem);
  align-items: center;
  justify-content: center;
}

.feature-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: clamp(22rem, 38vw, 32rem); // 放宽卡片 ~512px
  height: clamp(18rem, 32vh, 22rem); // ~320px+
  border-radius: clamp(0.75rem, 1.5vw, 1rem); // ~16px
  background: linear-gradient(141.56deg, #24f1dd2b 13.73%, #07b2fa2b 88.57%);
  backdrop-filter: blur(150px);
  padding: clamp(2rem, 4vh, 2.5rem) clamp(1.5rem, 3vw, 2rem);
  box-sizing: border-box;
}

.card-title {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(1.25rem, 2.2vw, 1.5rem); // ~24px
  font-weight: 500;
  color: #ffffff;
  margin: 0;
  margin-bottom: clamp(1.25rem, 2.5vh, 1.75rem);
}

.card-icon {
  width: clamp(5rem, 10vw, 7.25rem); // ~116px
  height: clamp(5rem, 10vw, 7.25rem);
  margin-bottom: clamp(1.25rem, 2.5vh, 1.75rem);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.language-select {
  width: clamp(12rem, 20vw, 15rem); // 放宽选择框 ~240px
  height: clamp(2rem, 3.5vh, 2.5rem); // ~40px

  :deep(.select-trigger) {
    height: 100%;
    border: 1px solid #606c80;
    border-radius: clamp(0.3rem, 0.6vw, 0.375rem); // ~6px
    background: transparent;
    color: #ffffff;
    font-size: clamp(0.75rem, 1.3vw, 0.875rem); // ~14px
    font-family:
      'PingFang SC',
      -apple-system,
      BlinkMacSystemFont,
      sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(0.375rem, 0.8vw, 0.5rem); // 文字和箭头靠拢
    padding: 0 clamp(0.75rem, 1.5vw, 1rem);
  }

  :deep(.select-options) {
    background: rgba(30, 30, 30, 0.95);
    border: 1px solid #606c80;
    border-radius: clamp(0.3rem, 0.6vw, 0.375rem);
  }

  :deep(.select-option) {
    color: #ffffff;
    font-size: clamp(0.75rem, 1.3vw, 0.875rem);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.translate-selects {
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1vw, 0.75rem);

  .language-select {
    width: clamp(8.5rem, 14vw, 10.5rem); // 翻译选择框更窄 ~168px
  }
}

.swap-btn {
  width: clamp(1.5rem, 3vw, 2rem); // ~32px
  height: clamp(1.5rem, 3vw, 2rem);
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
  flex-shrink: 0;

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  &.flipped {
    transform: scaleX(-1);
  }

  &.flipped:hover {
    transform: scaleX(-1) scale(1.1);
  }

  &.flipped:active {
    transform: scaleX(-1) scale(0.95);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}
</style>
