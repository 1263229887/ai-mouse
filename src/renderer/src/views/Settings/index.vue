<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import MouseDiagram from '@/components/MouseDiagram/index.vue'
import CustomSelect from '@/components/CustomSelect/index.vue'
import { useDeviceStore, KEY_INDEX, BUSINESS_MODE, RECORDING_SOURCE } from '@/stores'

// 设备状态（包含按键映射和录音来源）
const deviceStore = useDeviceStore()
const { keyMappings, recordingSource } = storeToRefs(deviceStore)

// 业务模式选项（临时去掉AI语音助手）
const modeOptions = [
  // { label: 'AI语音助手', value: BUSINESS_MODE.AI_ASSISTANT }, // 临时隐藏
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
  <div class="settings-container">
    <!-- 左侧设置区域 -->
    <div class="settings-left">
      <!-- 按键设置 -->
      <section class="settings-section">
        <h2 class="section-title">按键设置</h2>

        <div class="key-settings-card">
          <!-- 语音键设置 -->
          <div class="key-group">
            <div class="key-label">
              <span class="key-dot"></span>
              <span class="key-name">语音键</span>
            </div>
            <div class="key-options">
              <div class="option-row">
                <span class="option-label">单击</span>
                <CustomSelect
                  v-model="voiceClickMode"
                  :options="modeOptions"
                  class="option-select"
                />
              </div>
              <div class="option-row">
                <span class="option-label">长按</span>
                <CustomSelect
                  v-model="voiceLongPressMode"
                  :options="modeOptions"
                  class="option-select"
                />
              </div>
            </div>
          </div>

          <!-- AI键设置 -->
          <div class="key-group">
            <div class="key-label">
              <span class="key-dot"></span>
              <span class="key-name">AI键</span>
            </div>
            <div class="key-options">
              <div class="option-row">
                <span class="option-label">单击</span>
                <CustomSelect v-model="aiClickMode" :options="modeOptions" class="option-select" />
              </div>
              <div class="option-row">
                <span class="option-label">长按</span>
                <CustomSelect
                  v-model="aiLongPressMode"
                  :options="modeOptions"
                  class="option-select"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 录音设置 -->
      <section class="settings-section">
        <h2 class="section-title">录音设置</h2>
        <div class="recording-toggle">
          <button
            class="toggle-btn"
            :class="{ active: recordingSource === RECORDING_SOURCE.MOUSE }"
            @click="setRecordingSource(RECORDING_SOURCE.MOUSE)"
          >
            鼠标录音
          </button>
          <button
            class="toggle-btn"
            :class="{ active: recordingSource === RECORDING_SOURCE.COMPUTER }"
            @click="setRecordingSource(RECORDING_SOURCE.COMPUTER)"
          >
            电脑录音
          </button>
        </div>
      </section>
    </div>

    <!-- 右侧鼠标图区域 -->
    <div class="settings-right">
      <MouseDiagram class="mouse-diagram" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 2vh, 1.5rem) clamp(1.5rem, 3vw, 2rem);
  background: var(--bg-color-page);
  overflow: hidden;
  transition: background 0.3s ease;
  box-sizing: border-box;
}

// 左侧设置区域
.settings-left {
  flex: 0 0 auto;
  width: clamp(340px, 35vw, 450px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: clamp(2.5rem, 5vh, 3.5rem); // 进一步增加录音设置和按键设置之间的距离
  margin-right: clamp(3rem, 5vw, 4.5rem);
}

// 右侧鼠标图区域
.settings-right {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mouse-diagram {
  width: auto;
  height: clamp(500px, 80vh, 650px);
}

// 设置分区
.settings-section {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2vh, 1.3rem); // 进一步增加标题和内容之间的距离
}

.section-title {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.85rem, 1.6vw, 1rem);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

// 按键设置卡片
.key-settings-card {
  display: flex;
  flex-direction: column;
  gap: clamp(2.8rem, 5vh, 3.8rem);
  padding: clamp(3.2rem, 6vh, 4.5rem) clamp(1.2rem, 2.5vw, 1.5rem); // 再次增加卡片上下内边距
  border-radius: 8px;
  background: var(--settings-card-bg);
  transition: background 0.3s ease;
}

// 按键组
.key-group {
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 1.6vh, 1rem);
}

.key-label {
  display: flex;
  align-items: center;
  gap: clamp(0.35rem, 0.7vw, 0.45rem);
}

.key-dot {
  width: clamp(5px, 0.5vw, 6px);
  height: clamp(5px, 0.5vw, 6px);
  border-radius: 50%;
  background: #8be6b0;
}

.key-name {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.8rem, 1.5vw, 0.95rem);
  font-weight: 400;
  color: #8be6b0;
}

// 选项行
.key-options {
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 1.6vh, 1rem);
  padding-left: clamp(1rem, 2vw, 1.4rem);
}

.option-row {
  display: flex;
  align-items: center;
  gap: clamp(0.8rem, 1.5vw, 1rem);
}

.option-label {
  flex: 0 0 clamp(1.8rem, 3.5vw, 2.2rem);
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.75rem, 1.4vw, 0.85rem);
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.option-select {
  flex: 1;
  min-width: clamp(160px, 12vw, 220px);
}

// 录音设置切换按钮组
.recording-toggle {
  display: flex;
  gap: clamp(0.75rem, 1.5vw, 1rem);
}

.toggle-btn {
  flex: 1;
  padding: clamp(0.75rem, 1.5vh, 1rem) clamp(1rem, 2vw, 1.4rem); // 增加按钮的上下内边距，让按钮更高
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.8rem, 1.5vw, 0.95rem);
  font-weight: 400;
  color: var(--text-primary);
  background: var(--settings-card-bg);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--text-secondary);
  }

  &.active {
    color: #8be6b0;
    border-color: #8be6b0;
    background: var(--settings-card-bg);
  }
}
</style>
