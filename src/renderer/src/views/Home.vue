<template>
  <!-- 首页组件 - 功能卡片选择页面 -->
  <div class="container" :class="{ 'device-connected': isDeviceConnected }">
    <h1 class="title">AI Mouse</h1>
    
    <!-- 设备连接状态显示 -->
    <div class="connection-status" :class="{ 'connected': isDeviceConnected }">
      <span class="loading-spinner" v-if="isConnecting || !isDeviceConnected"></span>
      <span class="status-indicator" v-else></span>
      <span class="status-text">{{ isDeviceConnected ? 'AI鼠标已连接' : '正在连接AI鼠标...' }}</span>
    </div>

    <!-- 录音源切换 Tab -->
    <div class="recording-source-tabs" v-if="isDeviceConnected">
      <div 
        class="tab-item" 
        :class="{ 'active': recordingSource === 'mouse' }"
        @click="switchRecordingSource('mouse')">
        <span class="tab-icon">🖱️</span>
        <span class="tab-text">鼠标录音</span>
      </div>
      <div 
        class="tab-item" 
        :class="{ 'active': recordingSource === 'computer' }"
        @click="switchRecordingSource('computer')">
        <span class="tab-icon">🎤</span>
        <span class="tab-text">电脑录音</span>
      </div>
    </div>
    
    <div class="cards">
      <!-- AI输入卡片 -->
      <div class="card" 
           :class="{ 
             'card-selected': currentMode === 'typing',
             'card-disabled': !isDeviceConnected 
           }" 
           @click="selectMode('typing')">
        <div class="card-icon">⌨️</div>
        <h2 class="card-title">语音输入</h2>
        <p class="card-desc">语音实时识别,追加AI修正并输入</p>
        <div class="shortcut" v-if="!isDeviceConnected">请先连接AI鼠标</div>
        <div class="shortcut" v-else-if="currentMode !== 'typing'">单击选择此模式</div>
        <div class="shortcut active" v-else>
          {{ isRecording ? '按AI键停止' : '按AI键启动' }}
        </div>
        <!-- 状态提示 -->
        <div class="status" v-if="currentMode === 'typing'">
          <span class="status-dot" :class="{ 'recording': isRecording }"></span>
          {{ isRecording ? '录音中...' : '已就绪，按AI键开始录音' }}
        </div>
      </div>
      <!-- AI翻译卡片 -->
      <div class="card" 
           :class="{ 
             'card-selected': currentMode === 'translate',
             'card-disabled': !isDeviceConnected 
           }" 
           @click="selectMode('translate')">
        <!-- 语言选择区域 -->
        <div class="lang-selector" @click.stop>
          <!-- 源语言 -->
          <el-select v-model="sourceIsoCode" class="lang-select" placeholder="源语言" @change="handleSourceChange"
            popper-class="lang-dropdown"
            @visible-change="(visible) => !visible && clearFilter('source')">
            <template #header>
              <div class="search-box">
                <el-input v-model="sourceFilterText" placeholder="搜索语种/国家" size="small" :prefix-icon="Search" clearable
                  @click.stop />
              </div>
            </template>
            <el-option v-for="item in filteredSourceList" :key="item.id + '-' + item.areaId" :label="item.chinese"
              :value="item.isoCode">
              <div class="lang-option">
                <span class="lang-name">{{ item.chinese }}</span>
                <span class="lang-code">{{ item.sourceLanguage }}</span>
                <span class="lang-country">{{ item.countryName }}</span>
              </div>
            </el-option>
          </el-select>

          <!-- 切换按钮 -->
          <span class="switch-btn" @click="swapLanguages">⇄</span>

          <!-- 目标语言 -->
          <el-select v-model="targetIsoCode" class="lang-select"  placeholder="目标语言" @change="handleTargetChange"
             placement="bottom-end"
             popper-class="lang-dropdown"
            @visible-change="(visible) => !visible && clearFilter('target')">
            <template #header>
              <div class="search-box">
                <el-input v-model="targetFilterText" placeholder="搜索语种/国家" size="small" :prefix-icon="Search" clearable
                  @click.stop />
              </div>
            </template>
            <el-option v-for="item in filteredTargetList" :key="item.id + '-' + item.areaId" :label="item.chinese"
              :value="item.isoCode">
              <div class="lang-option">
                <span class="lang-name">{{ item.chinese }}</span>
                <span class="lang-code">{{ item.sourceLanguage }}</span>
                <span class="lang-country">{{ item.countryName }}</span>
              </div>
            </el-option>
          </el-select>
        </div>

        <div class="card-icon">🌐</div>
        <h2 class="card-title">语音翻译</h2>
        <p class="card-desc">语音实时识别,自动翻译并输入</p>
        <div class="shortcut" v-if="currentMode !== 'translate'">单击选择此模式</div>
        <div class="shortcut active" v-else>
          {{ isRecording ? '按AI键停止' : '按AI键启动' }}
        </div>
        <!-- 状态提示 -->
        <div class="status" v-if="currentMode === 'translate'">
          <span class="status-dot" :class="{ 'recording': isRecording }"></span>
          {{ isRecording ? '录音中...' : '已就绪，按AI键开始录音' }}
        </div>
      </div>
    </div>
    <!-- 取消按钮 -->
    <div class="cancel-btn" v-if="currentMode" @click="cancelMode">
      取消选择 (ESC)
    </div>
  </div>
</template>

<script setup>
/**
 * Home.vue - 首页组件
 * 显示功能卡片，用于选择不同的AI模拟功能
 * - 单击卡片选择模式
 * - 选择后按AI键启动录音
 * - 再次按AI键停止并粘贴
 */

import { onMounted, onUnmounted, ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

// ==================== 响应式状态 ====================
// 当前选中的模式：null-未选择, 'typing'-语音输入, 'translate'-语音翻译
const currentMode = ref(null)
// 是否正在录音
const isRecording = ref(false)
// 设备是否已连接（实际状态）
const isDeviceConnected = ref(false)
// 是否正在连接中（用于显示loading效果）
const isConnecting = ref(true)
// 录音源模式: 'mouse' = 鼠标硬件录音, 'computer' = 电脑麦克风录音
const recordingSource = ref('mouse')

// ==================== 语言选择 ====================
// 语言列表
const languageList = ref([])
// 源语言 isoCode，默认中文
const sourceIsoCode = ref('ZH')
// 目标语言 isoCode，默认英文
const targetIsoCode = ref('EN')
// 搜索过滤关键字
const sourceFilterText = ref('')
const targetFilterText = ref('')

// 过滤后的源语言列表
const filteredSourceList = computed(() => {
  if (!sourceFilterText.value) return languageList.value
  const keyword = sourceFilterText.value.toLowerCase()
  return languageList.value.filter(item =>
    item.chinese?.toLowerCase().includes(keyword) ||
    item.countryName?.toLowerCase().includes(keyword) ||
    item.sourceLanguage?.toLowerCase().includes(keyword)
  )
})

// 过滤后的目标语言列表
const filteredTargetList = computed(() => {
  if (!targetFilterText.value) return languageList.value
  const keyword = targetFilterText.value.toLowerCase()
  return languageList.value.filter(item =>
    item.chinese?.toLowerCase().includes(keyword) ||
    item.countryName?.toLowerCase().includes(keyword) ||
    item.sourceLanguage?.toLowerCase().includes(keyword)
  )
})

// 清除过滤
const clearFilter = (type) => {
  if (type === 'source') {
    sourceFilterText.value = ''
  } else {
    targetFilterText.value = ''
  }
}

// ==================== 获取语言列表 ====================
const fetchLanguageList = async () => {
  try {
    // 开发环境使用代理，生产环境直接请求
    const isDev = window.location.protocol === 'http:'
    const baseUrl = isDev ? '/api-proxy' : 'https://mail.danaai.net'
    const url = `${baseUrl}/studio/ai-api/sysMultiLanguage/list?version=lang_pro`
    console.log('[Home] 请求语言列表:', url)
    const response = await fetch(url)
    const data = await response.json()
    console.log('[Home] 语言接口返回数据:', data)
    if (data && data.data && data.data.allList) {
      languageList.value = data.data.allList
      console.log('[Home] 语言列表数量:', languageList.value.length)
      console.log('[Home] 前5个语言:', languageList.value.slice(0, 5))
    } else {
      console.error('[Home] 语言列表数据结构异常:', data)
    }
  } catch (error) {
    console.error('[Home] 获取语言列表失败:', error)
  }
}

// ==================== 语言选择处理 ====================
/**
 * 源语言变化
 */
const handleSourceChange = (newValue) => {
  // 如果选择的语言和目标语言相同，自动对调
  if (newValue === targetIsoCode.value) {
    // 找到旧的源语言作为新的目标语言
    const oldSource = languageList.value.find(item => item.isoCode !== newValue)
    if (oldSource) {
      targetIsoCode.value = oldSource.isoCode
    }
  }
  notifyLanguageChange()
}

/**
 * 目标语言变化
 */
const handleTargetChange = (newValue) => {
  // 如果选择的语言和源语言相同，自动对调
  if (newValue === sourceIsoCode.value) {
    const oldTarget = languageList.value.find(item => item.isoCode !== newValue)
    if (oldTarget) {
      sourceIsoCode.value = oldTarget.isoCode
    }
  }
  notifyLanguageChange()
}

/**
 * 交换源语言和目标语言
 */
const swapLanguages = () => {
  const temp = sourceIsoCode.value
  sourceIsoCode.value = targetIsoCode.value
  targetIsoCode.value = temp
  notifyLanguageChange()
}

/**
 * 获取语言中文名称
 */
const getLangName = (isoCode) => {
  const lang = languageList.value.find(item => item.isoCode === isoCode)
  return lang?.chinese || isoCode
}

/**
 * 通知主进程语言变化
 */
const notifyLanguageChange = () => {
  if (currentMode.value === 'translate') {
    window.electron.ipcRenderer.send('update-translate-language', {
      sourceIsoCode: sourceIsoCode.value,
      targetIsoCode: targetIsoCode.value,
      sourceLangName: getLangName(sourceIsoCode.value),
      targetLangName: getLangName(targetIsoCode.value)
    })
  }
}

/**
 * 切换录音源
 * @param {string} source - 'mouse' 或 'computer'
 */
const switchRecordingSource = (source) => {
  if (recordingSource.value === source) return
  
  recordingSource.value = source
  console.log('[Home] 切换录音源:', source)
  
  // 通知主进程切换录音源
  window.electron.ipcRenderer.send('switch-recording-source', source)
}

// ==================== 事件处理函数 ====================
/**
 * 选择模式
 */
const selectMode = (mode) => {
  // 未连接设备时不允许选择
  if (!isDeviceConnected.value) {
    return
  }
  if (currentMode.value === mode) {
    // 已选中该模式，不做处理（通过快捷键启动）
    return
  }
  currentMode.value = mode
  isRecording.value = false
  // 通知主进程，包含语言信息
  window.electron.ipcRenderer.send('select-mode', {
    mode,
    sourceIsoCode: sourceIsoCode.value,
    targetIsoCode: targetIsoCode.value,
    sourceLangName: getLangName(sourceIsoCode.value),
    targetLangName: getLangName(targetIsoCode.value)
  })
}

/**
 * 取消模式选择
 */
const cancelMode = () => {
  currentMode.value = null
  isRecording.value = false
  // 通知主进程
  window.electron.ipcRenderer.send('cancel-mode')
}

/**
 * 处理录音状态变化
 */
const onRecordingStateChanged = (event, data) => {
  isRecording.value = data.isRecording
  // 如果录音停止且识别完成，重置模式
  if (!data.isRecording && data.completed) {
    currentMode.value = null
  }
}

/**
 * 处理模式已选中的确认
 */
const onModeSelected = (event, data) => {
  currentMode.value = data.mode
}

/**
 * 键盘事件处理 - ESC 取消选择
 */
const handleKeydown = (e) => {
  if (e.key === 'Escape' && currentMode.value) {
    cancelMode()
  }
}

// ==================== 设备状态轮询 ====================
let pollTimer = null

/**
 * 设置设备连接状态（延迟1秒显示，提供loading效果）
 */
const setDeviceConnected = (connected) => {
  if (connected) {
    // 设备连接后，延迟1秒再显示连接成功
    console.log('[Home] 设备已连接，延迟1秒显示...')
    setTimeout(() => {
      isDeviceConnected.value = true
      isConnecting.value = false
      console.log('[Home] 连接状态已更新为已连接')
    }, 1000)
  } else {
    // 断开时立即更新
    isDeviceConnected.value = false
    isConnecting.value = false
  }
}

const pollMouseStatus = async () => {
  // 如果已连接，停止轮询
  if (isDeviceConnected.value) {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    return
  }
  
  try {
    const status = await window.electron.ipcRenderer.invoke('get-mouse-status')
    console.log('[Home] 轮询设备状态:', status)
    if (status && status.isConnected) {
      console.log('[Home] 设备已连接，同步状态')
      setDeviceConnected(true)
      // 停止轮询
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    }
  } catch (error) {
    console.error('[Home] 查询设备状态失败:', error)
  }
}

// ==================== 生命周期 ====================
onMounted(async () => {
  // 获取语言列表
  fetchLanguageList()

  // 立即查询一次设备状态
  await pollMouseStatus()
  
  // 如果未连接，启动轮询（每2秒查询一次，最多轮询30秒）
  if (!isDeviceConnected.value) {
    console.log('[Home] 设备未连接，启动轮询...')
    let pollCount = 0
    const maxPolls = 15 // 最多轮询15次（30秒）
    pollTimer = setInterval(async () => {
      pollCount++
      await pollMouseStatus()
      // 超过最大次数停止轮询
      if (pollCount >= maxPolls && pollTimer) {
        console.log('[Home] 轮询超时，停止轮询')
        clearInterval(pollTimer)
        pollTimer = null
      }
    }, 2000)
  }

  // 监听录音状态变化
  window.electron.ipcRenderer.on('recording-state-changed', onRecordingStateChanged)
  window.electron.ipcRenderer.on('mode-selected', onModeSelected)
  
  // 监听设备连接状态
  window.electron.ipcRenderer.on('mouse-connected', (event, data) => {
    console.log('[Home] AI鼠标已连接', data)
    setDeviceConnected(true)
  })
  window.electron.ipcRenderer.on('mouse-disconnected', (event, data) => {
    console.log('[Home] AI鼠标已断开', data)
    setDeviceConnected(false)
    // 断开时重置模式
    currentMode.value = null
    isRecording.value = false
  })

  // 监听键盘事件
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  // 清理轮询定时器
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  
  // 清理事件监听
  window.electron.ipcRenderer.removeAllListeners('recording-state-changed')
  window.electron.ipcRenderer.removeAllListeners('mode-selected')
  window.electron.ipcRenderer.removeAllListeners('mouse-connected')
  window.electron.ipcRenderer.removeAllListeners('mouse-disconnected')
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* 容器样式 */
.container {
  background-image: url('./wavy-lines.svg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  background-color: #1e1e1e;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 40px;
  width: 100vw;
  position: relative;
  transition: box-shadow 0.5s ease;
  overflow: hidden;
  box-sizing: border-box;
}

/* 连接成功后的霍虹渐变光圈特效 */
.container.device-connected {
  box-shadow: inset 0 0 80px rgba(0, 255, 136, 0.1),
              inset 0 0 150px rgba(0, 200, 255, 0.08),
              inset 0 0 200px rgba(138, 43, 226, 0.05);
}

.container.device-connected::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 3px solid transparent;
  background: linear-gradient(#1e1e1e, #1e1e1e) padding-box,
              linear-gradient(135deg, 
                #00ff88 0%, 
                #00d4ff 25%, 
                #8a2be2 50%, 
                #ff0080 75%, 
                #00ff88 100%) border-box;
  pointer-events: none;
  animation: neon-border-rotate 4s linear infinite;
  opacity: 0.7;
}

.container.device-connected::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(0, 255, 136, 0.3) 0%, 
    rgba(0, 212, 255, 0.2) 25%, 
    rgba(138, 43, 226, 0.2) 50%, 
    rgba(255, 0, 128, 0.2) 75%, 
    rgba(0, 255, 136, 0.3) 100%);
  filter: blur(20px);
  pointer-events: none;
  animation: neon-glow 3s ease-in-out infinite;
  z-index: -1;
}

@keyframes neon-border-rotate {
  0% {
    filter: hue-rotate(0deg);
  }
  100% {
    filter: hue-rotate(360deg);
  }
}

@keyframes neon-glow {
  0%, 100% {
    opacity: 0.5;
    filter: blur(20px) hue-rotate(0deg);
  }
  50% {
    opacity: 0.8;
    filter: blur(25px) hue-rotate(30deg);
  }
}

/* 设备连接状态显示 - 中间上方 */
.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 25px;
  font-size: 14px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  /* 确保在伪元素之上 */
  position: relative;
  z-index: 5;
}

/* Loading 旋转动画 */
.connection-status .loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(100, 200, 255, 0.3);
  border-top-color: #64c8ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.connection-status .status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.8);
  animation: pulse-green 2s ease-in-out infinite;
}

.connection-status .status-text {
  color: rgba(255, 255, 255, 0.7);
}

.connection-status.connected .status-text {
  color: #4ade80;
}

@keyframes pulse-green {
  0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(74, 222, 128, 0.8); }
  50% { opacity: 0.8; box-shadow: 0 0 20px rgba(74, 222, 128, 1); }
}

/* 录音源切换 Tab 样式 */
.recording-source-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 5;
}

.recording-source-tabs .tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.recording-source-tabs .tab-item:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.1);
}

.recording-source-tabs .tab-item.active {
  background: linear-gradient(135deg, rgba(100, 200, 255, 0.3), rgba(74, 222, 128, 0.3));
  color: #fff;
  box-shadow: 0 2px 8px rgba(100, 200, 255, 0.3);
}

.recording-source-tabs .tab-icon {
  font-size: 14px;
}

.recording-source-tabs .tab-text {
  font-weight: 500;
}

/* 标题样式 */
.title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 30px;
  color: #fff;
  /* 确保在伪元素之上 */
  position: relative;
  z-index: 5;
}

/* 卡片容器 */
.cards {
  display: flex;
  gap: 40px;
  /* 确保卡片在伪元素之上 */
  position: relative;
  z-index: 5;
}

/* 卡片样式 */
.card {
  width: 380px;
  height: 360px;
  background: linear-gradient(145deg, #2a2a3e, #1e1e2e);
  border-radius: 20px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

/* 卡片禁用状态 */
.card-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-disabled:hover {
  transform: none;
  box-shadow: none;
  border-color: rgba(255, 255, 255, 0.1);
}

/* 语言选择器 */
.lang-selector {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: transparent;
  border-radius: 16px;
  font-size: 12px;
  z-index: 100;
  margin-bottom: 15px;
}



/* 卡片图标与语言选择器的间距 */
.card .card-icon {
  margin-top: 20px;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #64c8ff;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 8px;
  transition: all 0.2s;
}

.lang-btn:hover {
  background: rgba(100, 200, 255, 0.2);
}

/* 语言选择器样式 */
.lang-select {
  width: 130px;
}

.lang-select :deep(.el-input__wrapper) {
  background: rgba(42, 42, 62, 0.9) !important;
  box-shadow: none !important;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid rgba(100, 200, 255, 0.3);
}

.lang-select :deep(.el-input__wrapper:hover) {
  border-color: rgba(100, 200, 255, 0.5);
}

.lang-select :deep(.el-input__inner) {
  color: #64c8ff !important;
  font-weight: 500;
  font-size: 12px;
}

.lang-select :deep(.el-input__suffix) {
  color: #64c8ff;
}

.lang-select :deep(.el-select__caret) {
  color: #64c8ff;
}

.switch-btn {
  color: #fbbf24;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  transition: transform 0.2s;
}

.switch-btn:hover {
  transform: scale(1.2);
}

/* 卡片悬停效果 */
.card:hover {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  border-color: rgba(100, 200, 255, 0.3);
}

/* 卡片选中状态 */
.card-selected {
  border-color: rgba(74, 222, 128, 0.6);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.2);
}

.card-selected:hover {
  border-color: rgba(74, 222, 128, 0.8);
}

/* 卡片图标 */
.card-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

/* 卡片标题 */
.card-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}

/* 卡片描述 */
.card-desc {
  font-size: 0.9rem;
  color: #888;
  text-align: center;
  margin-bottom: 20px;
}

/* 快捷键提示 */
.shortcut {
  background: rgba(100, 200, 255, 0.15);
  color: #64c8ff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

.shortcut.active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

/* 状态提示样式 */
.status {
  margin-top: 12px;
  color: #4ade80;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 状态指示点 */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  animation: pulse 2s ease-in-out infinite;
}

.status-dot.recording {
  background: #f87171;
  animation: pulse 0.8s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

/* 取消按钮 */
.cancel-btn {
  margin-top: 30px;
  padding: 10px 24px;
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  /* 确保取消按钮在最上层，不被伪元素遮挡 */
  position: relative;
  z-index: 10;
}

.cancel-btn:hover {
  background: rgba(248, 113, 113, 0.25);
}
</style>

<!-- 全局样式，用于修改 Element Plus 下拉框样式 -->
<style>
/* 语言下拉菜单样式 */
.el-select-dropdown.lang-dropdown {
  background: #2a2a3e !important;
  border: 1px solid rgba(100, 200, 255, 0.2) !important;
  min-width: 260px !important;
}

.el-select-dropdown__item {
  color: #fff !important;
  padding: 10px 14px !important;
  height: auto !important;
  line-height: 1.5 !important;
}

.el-select-dropdown__item:hover {
  background: rgba(100, 200, 255, 0.15) !important;
}

.el-select-dropdown__item.selected,
.el-select-dropdown__item.is-selected {
  background: rgba(74, 222, 128, 0.15) !important;
  color: #4ade80 !important;
}

.el-select-dropdown__item.hover,
.el-select-dropdown__item.is-hovering {
  background: rgba(100, 200, 255, 0.15) !important;
}

/* 语言选项内容布局 */
.lang-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.lang-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.lang-code {
  color: #64c8ff;
  font-size: 11px;
  white-space: nowrap;
}

.lang-country {
  color: #888;
  font-size: 11px;
  white-space: nowrap;
  margin-left: auto;
}

/* 深色主题下拉框 */
.el-popper.is-light {
  background: #2a2a3e !important;
  border: 1px solid rgba(100, 200, 255, 0.2) !important;
}

.el-popper.is-light .el-popper__arrow::before {
  background: #2a2a3e !important;
  border-color: rgba(100, 200, 255, 0.2) !important;
}

/* 顶部搜索框容器 */
.search-box {
  padding: 6px;
  padding-top: 12px;
  background: #2a2a3e;

}

.search-box .el-input__wrapper {
  background: rgba(30, 30, 46, 0.9) !important;
  box-shadow: none !important;
  /* border: 1px solid rgba(100, 200, 255, 0.2); */
  border-radius: 4px;
  padding: 0 8px !important;
}

.search-box .el-input__wrapper:hover,
.search-box .el-input__wrapper:focus-within {
  border-color: rgba(100, 200, 255, 0.4);
}

.search-box .el-input__inner {
  color: #fff !important;
  font-size: 12px;
  height: 26px !important;
}

.search-box .el-input__inner::placeholder {
  color: #666 !important;
}

.search-box .el-input__prefix,
.search-box .el-input__suffix {
  color: #64c8ff;
}

/* 移除 header 插槽的边框 */
.el-select-dropdown__header {
  padding: 0 !important;
  border-bottom: none !important;
}

/* 下拉框选择器输入框样式 */
.el-select .el-input .el-input__wrapper {
  background: rgba(42, 42, 62, 0.9) !important;
}

.el-select-dropdown .el-select-dropdown__wrap {
  max-height: 300px;
}

/* 滚动区域样式 */
.el-select-dropdown .el-scrollbar {
  background: #2a2a3e;
}

/* 无匹配数据提示 */
.el-select-dropdown__empty {
  color: #888 !important;
}
</style>
