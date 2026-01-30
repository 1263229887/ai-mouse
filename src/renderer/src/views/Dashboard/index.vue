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
  console.log('[Dashboard] initLanguageInfo 开始执行')
  console.log('[Dashboard] 当前 deviceStore 语言配置:', {
    voiceInputSource: { ...deviceStore.voiceInputSource },
    translateSource: { ...deviceStore.translateSource },
    translateTarget: { ...deviceStore.translateTarget }
  })

  // 语音输入：根据 isoCode 获取对应的 areaId 和 chinese
  const voiceInfo = languageStore.getLanguageInfo(deviceStore.voiceInputSource.isoCode)
  console.log('[Dashboard] voiceInfo:', voiceInfo)
  if (voiceInfo) {
    deviceStore.setVoiceInputSource(voiceInfo.isoCode, voiceInfo.areaId, voiceInfo.chinese)
  }
  // 翻译源语言
  const sourceInfo = languageStore.getLanguageInfo(deviceStore.translateSource.isoCode)
  console.log('[Dashboard] sourceInfo:', sourceInfo)
  if (sourceInfo) {
    deviceStore.setTranslateSource(sourceInfo.isoCode, sourceInfo.areaId, sourceInfo.chinese)
  }
  // 翻译目标语言
  const targetInfo = languageStore.getLanguageInfo(deviceStore.translateTarget.isoCode)
  console.log('[Dashboard] targetInfo:', targetInfo)
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

/**
 * 点击AI语音助手卡片 - 临时开发测试入口
 * 只打开窗口，小窗口组件负责初始化和启动录音
 */
async function handleAIAssistantClick() {
  console.log('[Dashboard] 点击AI语音助手卡片，打开小窗口')
  // 打开AI语音助手小窗口（小窗口组件会自己初始化和启动录音）
  await window.api?.window?.openAIAssistantWindow()
}

/**
 * 点击AI工具集卡片
 */
function handleAIToolsClick() {
  console.log('[Dashboard] 点击AI工具集卡片，功能待开发')
  // TODO: 功能待开发
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

      <!-- AI语音助手卡片 -->
      <div class="feature-card simple-card" @click="handleAIAssistantClick">
        <h2 class="card-title-center">AI语音助手</h2>
      </div>

      <!-- AI工具集卡片 -->
      <div class="feature-card simple-card" @click="handleAIToolsClick">
        <h2 class="card-title-center">AI工具集</h2>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: clamp(3rem, 8vh, 5rem);
  padding-bottom: clamp(2rem, 4vh, 3rem);
  background: var(--bg-color-page);
  transition: background 0.3s ease;
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
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(1rem, 2vw, 1.5rem);
  align-items: center;
  justify-content: center;
}

.feature-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: clamp(14rem, 24vw, 18rem); // 缩小卡片
  height: clamp(11rem, 20vh, 14rem); // 缩小高度
  border-radius: clamp(0.75rem, 1.5vw, 1rem); // ~16px
  background: linear-gradient(141.56deg, #24f1dd2b 13.73%, #07b2fa2b 88.57%);
  backdrop-filter: blur(150px);
  padding: clamp(1rem, 2vh, 1.5rem) clamp(1rem, 2vw, 1.5rem);
  box-sizing: border-box;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &.simple-card {
    cursor: pointer;

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 20px rgba(36, 241, 221, 0.2);
    }

    &:active {
      transform: scale(0.98);
    }
  }
}

.card-title {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(1rem, 1.8vw, 1.25rem); // 缩小字体
  font-weight: 500;
  color: #ffffff;
  margin: 0;
  margin-bottom: clamp(0.75rem, 1.5vh, 1rem);
}

.card-title-center {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(1rem, 1.8vw, 1.25rem);
  font-weight: 500;
  color: #ffffff;
  margin: 0;
}

.card-icon {
  width: clamp(3rem, 6vw, 4.5rem); // 缩小图标
  height: clamp(3rem, 6vw, 4.5rem);
  margin-bottom: clamp(0.75rem, 1.5vh, 1rem);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.language-select {
  width: clamp(10rem, 16vw, 12rem); // 缩小选择框
  height: clamp(1.75rem, 3vh, 2rem); // 缩小高度

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
  gap: clamp(0.375rem, 0.8vw, 0.5rem);

  .language-select {
    width: clamp(6rem, 10vw, 7.5rem); // 翻译选择框更窄
  }
}

.swap-btn {
  width: clamp(1.25rem, 2.5vw, 1.5rem); // 缩小交换按钮
  height: clamp(1.25rem, 2.5vw, 1.5rem);
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
