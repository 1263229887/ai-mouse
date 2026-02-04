<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LanguageSelect from '@/components/LanguageSelect/index.vue'
import { useDeviceStore, useLanguageStore, useAuthStore } from '@/stores'

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

// Anti-FOUC
const isReady = ref(false)
onMounted(() => {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      isReady.value = true
    })
  )
})

const aiCommands = [
  '打开钉钉',
  '深圳明天天气怎么样',
  '打开腾讯会议',
  '打开微信',
  '把这段话翻译成英文',
  '帮我润色这段文字',
  '用更正式的语气改写'
]

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

const isDeviceConnected = computed(() => authStore.isAuthorized && deviceStore.isOnline)
const isFlipped = ref(false)

const voiceInputIsoCode = computed(() => deviceStore.voiceInputSource.isoCode)
const voiceInputAreaId = computed(() => deviceStore.voiceInputSource.areaId)
const translateSourceIsoCode = computed(() => deviceStore.translateSource.isoCode)
const translateSourceAreaId = computed(() => deviceStore.translateSource.areaId)
const translateTargetIsoCode = computed(() => deviceStore.translateTarget.isoCode)
const translateTargetAreaId = computed(() => deviceStore.translateTarget.areaId)

function initLanguageInfo() {
  const voiceInfo = languageStore.getLanguageInfo(deviceStore.voiceInputSource.isoCode)
  if (voiceInfo)
    deviceStore.setVoiceInputSource(voiceInfo.isoCode, voiceInfo.areaId, voiceInfo.chinese)
  const sourceInfo = languageStore.getLanguageInfo(deviceStore.translateSource.isoCode)
  if (sourceInfo)
    deviceStore.setTranslateSource(sourceInfo.isoCode, sourceInfo.areaId, sourceInfo.chinese)
  const targetInfo = languageStore.getLanguageInfo(deviceStore.translateTarget.isoCode)
  if (targetInfo)
    deviceStore.setTranslateTarget(targetInfo.isoCode, targetInfo.areaId, targetInfo.chinese)
}

function swapTranslateLanguages() {
  deviceStore.swapTranslateLanguages()
  isFlipped.value = !isFlipped.value
}

function handleVoiceInputChange(option) {
  deviceStore.setVoiceInputSource(option.isoCode, option.areaId || '', option.chinese || '')
}

function handleTranslateSourceChange(option) {
  deviceStore.setTranslateSource(option.isoCode, option.areaId || '', option.chinese || '')
}

function handleTranslateTargetChange(option) {
  deviceStore.setTranslateTarget(option.isoCode, option.areaId || '', option.chinese || '')
}

watch(
  () => languageStore.isLoaded,
  (isLoaded) => {
    if (isLoaded) initLanguageInfo()
  },
  { immediate: true }
)

onMounted(() => {
  if (!languageStore.isLoaded && !languageStore.isLoading) {
    languageStore.fetchLanguageList()
  } else if (languageStore.isLoaded) {
    initLanguageInfo()
  }
})
</script>

<template>
  <div
    v-show="isReady"
    class="w-full flex-1 flex flex-col items-center justify-start pb-32 bg-#101214 select-none"
  >
    <!-- AI Mouse 标题 -->
    <h1 class="main-title mt-32 text-32 font-500">AI Mouse</h1>

    <!-- 连接状态标签 -->
    <div class="flex items-center justify-center gap-8 w-160 h-30 rd-full bg-white/5 mt-16">
      <span
        class="status-dot w-8 h-8 rd-full"
        :class="isDeviceConnected ? 'bg-#34C759' : 'bg-#FF3B30'"
      ></span>
      <span class="text-14" :class="isDeviceConnected ? 'color-#34C759' : 'color-#FF3B30'">
        {{ isDeviceConnected ? 'AI鼠标已连接' : 'AI鼠标未连接' }}
      </span>
    </div>

    <!-- 卡片容器 -->
    <div class="mt-24 grid grid-cols-2 gap-24">
      <!-- 语音输入卡片 -->
      <div
        class="feature-card flex flex-col items-center justify-start w-466 h-250 rd-20 p-16 box-border z-100"
      >
        <h2 class="text-22 color-white text-center w-full">语音输入</h2>
        <div class="w-88 h-88 mt-16">
          <img
            src="@/assets/icons/voice-input-feature.svg"
            alt="语音输入"
            class="w-full h-full object-contain"
          />
        </div>
        <LanguageSelect
          :model-value="voiceInputIsoCode"
          :selected-area-id="voiceInputAreaId"
          :options="languageStore.languageList"
          placeholder="选择语言"
          search-placeholder="搜索语言"
          class="w-240 h-40 z-10"
          @change="handleVoiceInputChange"
        />
      </div>

      <!-- 语音翻译卡片 -->
      <div
        class="feature-card flex flex-col items-center justify-start w-466 h-250 rd-20 p-16 box-border z-100"
      >
        <h2 class="text-22 font-500 color-white text-center w-full">语音翻译</h2>
        <div class="w-88 h-88 mt-16">
          <img
            src="@/assets/icons/voice-translate-feature.svg"
            alt="语音翻译"
            class="w-full h-full object-contain"
          />
        </div>
        <div class="flex items-center">
          <LanguageSelect
            :model-value="translateSourceIsoCode"
            :selected-area-id="translateSourceAreaId"
            :options="languageStore.languageList"
            placeholder="源语言"
            search-placeholder="搜索语言"
            class="w-160 h-40"
            @change="handleTranslateSourceChange"
          />
          <button
            class="mx-16 swap-btn w-24 h-24 b-none bg-transparent cursor-pointer p-0 flex items-center justify-center shrink-0"
            :class="{ flipped: isFlipped }"
            @click="swapTranslateLanguages"
          >
            <img
              src="@/assets/icons/swap.svg"
              alt="交换语言"
              class="w-full h-full object-contain"
            />
          </button>
          <LanguageSelect
            :model-value="translateTargetIsoCode"
            :selected-area-id="translateTargetAreaId"
            :options="languageStore.languageList"
            placeholder="目标语言"
            search-placeholder="搜索语言"
            class="w-160 h-40"
            @change="handleTranslateTargetChange"
          />
        </div>
      </div>

      <!-- AI语音助手卡片 -->
      <div
        class="feature-card flex flex-col items-center justify-start w-466 h-250 rd-20 p-16 box-border"
      >
        <h2 class="m-0 text-22 font-500 color-white text-center w-full">AI语音助手</h2>
        <div class="w-88 h-88 mt-16">
          <img
            src="@/assets/icons/ai-assistant.svg"
            alt="AI语音助手"
            class="w-full h-full object-contain"
          />
        </div>
        <div
          class="flex flex-wrap gap-14 justify-center content-start w-full max-h-72 overflow-hidden"
        >
          <div
            v-for="(command, index) in aiCommands"
            :key="index"
            class="h-24 rd-12 bg-#606C80/20 px-14 flex items-center justify-center color-#98A7C0 text-12 whitespace-nowrap"
          >
            {{ command }}
          </div>
        </div>
      </div>

      <!-- AI工具集卡片 -->
      <div
        class="feature-card clickable flex flex-col items-center justify-start w-466 h-250 rd-20 p-16 box-border cursor-pointer"
        @click="router.push('/main/ai-tools')"
      >
        <h2 class="text-22 font-500 color-white text-center w-full">AI工具集</h2>
        <div class="mt-26 grid grid-cols-4 gap-16 max-w-80% mx-auto">
          <div
            v-for="(tool, index) in aiTools"
            :key="index"
            class="tool-item flex items-center justify-center bg-transparent rd-8 p-6"
          >
            <img :src="tool.icon" :alt="tool.name" class="w-40 h-40 object-contain" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-title {
  font-family: Inter, sans-serif;
  background: linear-gradient(180deg, #8be6b0 31.25%, #27acc2 71.88%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.status-dot {
  animation: breathing 2s ease-in-out infinite;
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
.feature-card {
  background: linear-gradient(
    141.56deg,
    rgba(36, 241, 221, 0.17) 13.73%,
    rgba(27, 32, 35, 0.87) 88.57%
  );
  backdrop-filter: blur(180px);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.feature-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(139, 230, 176, 0.15);
}
.feature-card.clickable:active {
  transform: translateY(0);
}
.swap-btn {
  transition: transform 0.3s;
}
.swap-btn:hover {
  transform: scale(1.1);
}
.swap-btn:active {
  transform: scale(0.95);
}
.swap-btn.flipped {
  transform: scaleX(-1);
}
.swap-btn.flipped:hover {
  transform: scaleX(-1) scale(1.1);
}
.swap-btn.flipped:active {
  transform: scaleX(-1) scale(0.95);
}
.tool-item {
  transition: transform 0.2s;
}
.tool-item:hover {
  transform: scale(1.05);
}
</style>
