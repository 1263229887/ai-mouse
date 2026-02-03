<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LanguageSelect from '@/components/LanguageSelect/index.vue'
import { useDeviceStore, useLanguageStore, useAuthStore } from '@/stores'

// 导入AI工具集图标
import deepseekIcon from '@/assets/images/ai-tools/deepseek.png'
import qwenIcon from '@/assets/images/ai-tools/qwen.png'
import doubaoIcon from '@/assets/images/ai-tools/doubao.png'
import yuanbaoIcon from '@/assets/images/ai-tools/yuanbao.png'
import chatgptIcon from '@/assets/images/ai-tools/chatgpt.png'
import geminiIcon from '@/assets/images/ai-tools/gemini.png'
import grokIcon from '@/assets/images/ai-tools/grok.png'
import nanoBananaIcon from '@/assets/images/ai-tools/nano-banana.png'

const router = useRouter()
const deviceStore = useDeviceStore()
const languageStore = useLanguageStore()
const authStore = useAuthStore()

// AI语音助手的快捷命令
const aiCommands = [
  '打开钉钉',
  '深圳明天天气怎么样',
  '打开腾讯会议',
  '打开微信',
  '把这段话翻译成英文',
  '帮我润色这段文字',
  '用更正式的语气改写'
]

// AI工具集的图标
const aiTools = [
  { name: 'DeepSeek', icon: deepseekIcon },
  { name: '通义千问', icon: qwenIcon },
  { name: '豆包', icon: doubaoIcon },
  { name: '腾讯元宝', icon: yuanbaoIcon },
  { name: 'ChatGPT', icon: chatgptIcon },
  { name: 'Gemini', icon: geminiIcon },
  { name: 'Grok', icon: grokIcon },
  { name: 'Nano Banana', icon: nanoBananaIcon }
]

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
  // 设备事件监听已由 App.vue 全局统一处理
})
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
      <div class="feature-card ai-assistant-card">
        <h2 class="card-title">AI语音助手</h2>
        <div class="card-icon">
          <img src="@/assets/icons/ai-assistant.svg" alt="AI语音助手" />
        </div>
        <div class="commands-container">
          <div v-for="(command, index) in aiCommands" :key="index" class="command-tag">
            {{ command }}
          </div>
        </div>
      </div>

      <!-- AI工具集卡片 -->
      <div class="feature-card ai-tools-card clickable" @click="router.push('/main/ai-tools')">
        <h2 class="card-title">AI工具集</h2>
        <div class="tools-grid">
          <div v-for="(tool, index) in aiTools" :key="index" class="tool-item">
            <img :src="tool.icon" :alt="tool.name" class="tool-icon" />
          </div>
        </div>
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

  // 上面两个卡片需要更高的z-index，确保下拉框不被遮挡
  .feature-card:nth-child(1),
  .feature-card:nth-child(2) {
    z-index: 100;
  }
}

.feature-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: clamp(22rem, 40vw, 32rem); // 调整到适中宽度
  height: clamp(14rem, 24vh, 17rem); // 稍微调高
  border-radius: clamp(1rem, 2vw, 1.25rem); // 增加圆角
  background: linear-gradient(141.56deg, #24f1dd2b 13.73%, #07b2fa2b 88.57%);
  backdrop-filter: blur(150px);
  padding: clamp(1.5rem, 3vh, 2rem); // 增加内边距
  box-sizing: border-box;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  // AI语音助手卡片特殊样式
  &.ai-assistant-card {
    .card-icon {
      margin-bottom: clamp(0.375rem, 0.8vh, 0.5rem);
    }

    .commands-container {
      display: flex;
      flex-wrap: wrap;
      gap: clamp(0.25rem, 0.5vw, 0.375rem);
      justify-content: center;
      align-content: flex-start;
      width: 100%;
      max-height: clamp(3.5rem, 6vh, 4.5rem);
      overflow: hidden;
    }
  }

  // AI工具集卡片特殊样式
  &.ai-tools-card {
    .tools-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: clamp(0.25rem, 0.5vw, 0.375rem);
      width: auto;
      justify-content: center;
      max-width: 80%;
      margin: 0 auto;
    }
  }

  // 可点击卡片样式
  &.clickable {
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(139, 230, 176, 0.15);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

.card-title {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(1.125rem, 2vw, 1.375rem); // 稍微增大字体
  font-weight: 500;
  color: #ffffff;
  margin: 0;
  margin-bottom: clamp(1rem, 2vh, 1.5rem); // 增加底部间距
  align-self: flex-start;
  width: 100%;
  text-align: center;
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
  width: clamp(4rem, 7vw, 5.5rem); // 增大图标
  height: clamp(4rem, 7vw, 5.5rem);
  margin-bottom: clamp(1rem, 2vh, 1.5rem); // 增加底部间距

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.language-select {
  width: clamp(12rem, 18vw, 14rem); // 调宽选择框
  height: clamp(1.75rem, 3vh, 2rem);
  position: relative;
  z-index: 10;

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
    background: rgba(30, 30, 30, 0.98);
    border: 1px solid #606c80;
    border-radius: clamp(0.3rem, 0.6vw, 0.375rem);
    z-index: 9999;
    position: absolute;
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
  position: relative;
  z-index: 10;

  .language-select {
    width: clamp(8rem, 12vw, 9.5rem); // 调宽翻译选择框
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
// 命令标签样式
.command-tag {
  height: 24px;
  border-radius: 12px;
  background: #606c8033;
  padding: 0px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #98a7c0;
  font-family: 'PingFang SC';
  font-size: 9px;
  white-space: nowrap;
}

// 工具图标样式
.tool-item {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border-radius: clamp(0.375rem, 0.8vw, 0.5rem);
  padding: clamp(0.25rem, 0.5vw, 0.375rem);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.tool-icon {
  width: clamp(2rem, 3.5vw, 2.5rem);
  height: clamp(2rem, 3.5vw, 2.5rem);
  object-fit: contain;
}
</style>
