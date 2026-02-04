<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import SvgIcon from '@/components/SvgIcon/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { useDeviceStore, KEY_INDEX, BUSINESS_MODE, RECORDING_SOURCE } from '@/stores'

// 等待样式应用后再显示内容
const isReady = ref(false)
onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      isReady.value = true
    })
  })
})

// 设备状态（包含按键映射和录音来源）
const deviceStore = useDeviceStore()
const { keyMappings, recordingSource } = storeToRefs(deviceStore)

// 业务模式选项
const modeOptions = [
  { label: 'AI语音助手', value: BUSINESS_MODE.AI_ASSISTANT },
  { label: '语音输入', value: BUSINESS_MODE.VOICE_INPUT },
  { label: '语音翻译', value: BUSINESS_MODE.VOICE_TRANSLATE }
]

// 按键设置 - 使用计算属性与 store 联动
const voiceClickMode = computed({
  get: () => keyMappings.value[KEY_INDEX.VOICE_CLICK],
  set: (val) => deviceStore.setKeyMapping(KEY_INDEX.VOICE_CLICK, val)
})

const voiceLongPressMode = computed({
  get: () => keyMappings.value[KEY_INDEX.VOICE_LONG_PRESS],
  set: (val) => deviceStore.setKeyMapping(KEY_INDEX.VOICE_LONG_PRESS, val)
})

const aiClickMode = computed({
  get: () => keyMappings.value[KEY_INDEX.AI_CLICK],
  set: (val) => deviceStore.setKeyMapping(KEY_INDEX.AI_CLICK, val)
})

const aiLongPressMode = computed({
  get: () => keyMappings.value[KEY_INDEX.AI_LONG_PRESS],
  set: (val) => deviceStore.setKeyMapping(KEY_INDEX.AI_LONG_PRESS, val)
})

// 切换录音来源
const setRecordingSource = (source) => {
  deviceStore.setRecordingSource(source)
}
</script>

<template>
  <div
    v-show="isReady"
    class="w-full flex-1 flex items-center justify-center p-24 bg-#101214 select-none"
  >
    <!-- 左侧设置区域 -->
    <div class="w-380 shrink-0 flex flex-col gap-48 mr-64">
      <!-- 按键设置 -->
      <section class="flex flex-col gap-20">
        <h2 class="text-16 font-500 color-#fff m-0">按键设置</h2>

        <div class="flex flex-col gap-48 py-56 px-20 rd-8 bg-#1B2023">
          <!-- 语音键设置 -->
          <div class="flex flex-col gap-14">
            <div class="flex items-center gap-6">
              <span class="w-6 h-6 rd-full bg-#8BE6B0"></span>
              <span class="text-14 color-#8BE6B0">语音键</span>
            </div>
            <div class="flex flex-col gap-14 pl-20">
              <div class="flex items-center gap-12">
                <span class="w-36 text-14 color-#606C80">单击</span>
                <CustomSelect
                  v-model="voiceClickMode"
                  :options="modeOptions"
                  class="flex-1 min-w-180"
                />
              </div>
              <div class="flex items-center gap-12">
                <span class="w-36 text-14 color-#606C80">长按</span>
                <CustomSelect
                  v-model="voiceLongPressMode"
                  :options="modeOptions"
                  class="flex-1 min-w-180"
                />
              </div>
            </div>
          </div>

          <!-- AI键设置 -->
          <div class="flex flex-col gap-14">
            <div class="flex items-center gap-6">
              <span class="w-6 h-6 rd-full bg-#8BE6B0"></span>
              <span class="text-14 color-#8BE6B0">AI键</span>
            </div>
            <div class="flex flex-col gap-14 pl-20">
              <div class="flex items-center gap-12">
                <span class="w-36 text-14 color-#606C80">单击</span>
                <CustomSelect
                  v-model="aiClickMode"
                  :options="modeOptions"
                  class="flex-1 min-w-180"
                />
              </div>
              <div class="flex items-center gap-12">
                <span class="w-36 text-14 color-#606C80">长按</span>
                <CustomSelect
                  v-model="aiLongPressMode"
                  :options="modeOptions"
                  class="flex-1 min-w-180"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 录音设置 -->
      <section class="flex flex-col gap-20">
        <h2 class="text-16 font-500 color-#fff m-0">录音设置</h2>
        <div class="flex gap-12">
          <button
            class="flex-1 py-14 px-20 text-14 rd-8 cursor-pointer b-1 b-solid transition-colors duration-200"
            :class="
              recordingSource === RECORDING_SOURCE.MOUSE
                ? 'color-#8BE6B0 b-#8BE6B0 bg-#1B2023'
                : 'color-#fff b-transparent bg-#1B2023 hover:b-#606C80'
            "
            @click="setRecordingSource(RECORDING_SOURCE.MOUSE)"
          >
            鼠标录音
          </button>
          <button
            class="flex-1 py-14 px-20 text-14 rd-8 cursor-pointer b-1 b-solid transition-colors duration-200"
            :class="
              recordingSource === RECORDING_SOURCE.COMPUTER
                ? 'color-#8BE6B0 b-#8BE6B0 bg-#1B2023'
                : 'color-#fff b-transparent bg-#1B2023 hover:b-#606C80'
            "
            @click="setRecordingSource(RECORDING_SOURCE.COMPUTER)"
          >
            电脑录音
          </button>
        </div>
      </section>
    </div>

    <!-- 右侧鼠标图区域 -->
    <div class="shrink-0 f-c-c">
      <SvgIcon name="mouse-diagram" size="580" />
    </div>
  </div>
</template>

<style scoped>
/* 无需额外样式 */
</style>
