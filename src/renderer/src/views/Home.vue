<template>
  <!-- 首页组件 - 功能卡片选择页面 -->
  <div class="container">
    <h1 class="title">AI智能鼠标</h1>
    
    <!-- 设备连接状态区域 - 等待SDK集成 -->
    <div class="device-status" :class="{ 'connected': deviceConnected }">
      <span class="device-icon">{{ deviceConnected ? '🟢' : '🔴' }}</span>
      <span class="device-text">{{ deviceStatusText }}</span>
      <!-- TODO: 集成SDK后添加连接按钮 -->
    </div>
    <!-- 操作提示 -->
    <div class="device-hint" v-if="!deviceConnected">
      请连接AI鼠标设备
    </div>
    
    <div class="cards">
      <!-- AI输入卡片 -->
      <div class="card" 
           :class="{ 'card-selected': currentMode === 'typing', 'card-disabled': !deviceConnected }" 
           @click="selectMode('typing')">
        <div class="card-icon">⌨️</div>
        <h2 class="card-title">语音输入</h2>
        <p class="card-desc">语音实时识别,追加AI修正并输入</p>
        <div class="shortcut" v-if="!deviceConnected">请先连接设备</div>
        <div class="shortcut" v-else-if="currentMode !== 'typing'">单击选择此模式</div>
        <div class="shortcut active" v-else>已选择，等待录音</div>
        <!-- 状态提示 -->
        <div class="status" v-if="currentMode === 'typing'">
          <span class="status-dot" :class="{ 'recording': isRecording }"></span>
          {{ isRecording ? '录音中...' : '已就绪，等待硬件触发录音' }}
        </div>
      </div>
      <!-- AI翻译卡片 -->
      <div class="card" 
           :class="{ 'card-selected': currentMode === 'translate', 'card-disabled': !deviceConnected }" 
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
        <div class="shortcut" v-if="!deviceConnected">请先连接设备</div>
        <div class="shortcut" v-else-if="currentMode !== 'translate'">单击选择此模式</div>
        <div class="shortcut active" v-else>已选择，等待录音</div>
        <!-- 状态提示 -->
        <div class="status" v-if="currentMode === 'translate'">
          <span class="status-dot" :class="{ 'recording': isRecording }"></span>
          {{ isRecording ? '录音中...' : '已就绪，等待硬件触发录音' }}
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
 * 
 * TODO: 集成AI鼠标SDK后实现：
 * - 设备连接/断开
 * - 硬件触发录音开始/停止
 * - 接收音频数据
 */

import { onMounted, onUnmounted, ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

// ==================== 响应式状态 ====================
// 当前选中的模式：null-未选择, 'typing'-语音输入, 'translate'-语音翻译
const currentMode = ref(null)
// 是否正在录音
const isRecording = ref(false)

// ==================== 设备状态 ====================
// 设备连接状态 - TODO: 由SDK管理
const deviceConnected = ref(false)
// 设备名称
const deviceName = ref('')

// 设备状态文本
const deviceStatusText = computed(() => {
  if (deviceConnected.value) {
    return `已连接: ${deviceName.value || 'AI鼠标'}`
  }
  return '设备未连接'
})

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

// ==================== 事件处理函数 ====================
/**
 * 选择模式
 */
const selectMode = async (mode) => {
  // 检查设备连接状态
  if (!deviceConnected.value) {
    console.log('[Home] 设备未连接，无法选择模式')
    return
  }
  
  if (currentMode.value === mode) {
    return
  }
  
  console.log('[Home] 选择模式:', mode)
  
  // TODO: 向SDK发送启动命令
  
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
const cancelMode = async () => {
  console.log('[Home] 取消模式')
  
  // TODO: 向SDK发送停止命令
  
  currentMode.value = null
  isRecording.value = false
  
  // 通知主进程
  window.electron.ipcRenderer.send('cancel-mode')
}

/**
 * 处理录音状态变化 - TODO: 由SDK触发
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

// ==================== TODO: SDK 集成接口 ====================
/**
 * 设备连接回调 - SDK调用
 */
const onDeviceConnected = (name) => {
  deviceConnected.value = true
  deviceName.value = name
  console.log('[Home] 设备已连接:', name)
}

/**
 * 设备断开回调 - SDK调用
 */
const onDeviceDisconnected = () => {
  deviceConnected.value = false
  deviceName.value = ''
  console.log('[Home] 设备已断开')
  // 如果正在录音，停止
  if (isRecording.value) {
    isRecording.value = false
  }
  // 取消当前模式
  if (currentMode.value) {
    cancelMode()
  }
}

/**
 * 录音开始回调 - SDK调用
 */
const onRecordingStart = () => {
  if (!currentMode.value) {
    console.log('[Home] 未选择模式，忽略录音请求')
    return
  }
  
  console.log('[Home] 录音开始，模式:', currentMode.value)
  isRecording.value = true
  
  // 通知主进程开始录音
  window.electron.ipcRenderer.send('recording-start', {
    mode: currentMode.value,
    sourceIsoCode: sourceIsoCode.value,
    targetIsoCode: targetIsoCode.value,
    sourceLangName: getLangName(sourceIsoCode.value),
    targetLangName: getLangName(targetIsoCode.value)
  })
}

/**
 * 录音停止回调 - SDK调用
 */
const onRecordingStop = () => {
  if (!isRecording.value) {
    return
  }
  
  console.log('[Home] 录音停止')
  isRecording.value = false
  
  // 通知主进程停止录音
  window.electron.ipcRenderer.send('recording-stop')
}

// 暴露给SDK调用的方法
window.aiMouseSDK = {
  onDeviceConnected,
  onDeviceDisconnected,
  onRecordingStart,
  onRecordingStop
}

// ==================== 生命周期 ====================
onMounted(async () => {
  console.log('[Home] 组件挂载')
  
  // 获取语言列表
  fetchLanguageList()

  // 获取当前SDK状态（设备可能在页面加载前就已连接）
  try {
    const status = await window.api.mouseSDK.getSDKStatus()
    console.log('[Home] SDK状态:', status)
    if (status.isInitialized) {
      if (status.isConnected && status.deviceId) {
        // 设备已连接
        deviceConnected.value = true
        deviceName.value = status.deviceId
        console.log('[Home] 设备已连接:', status.deviceId)
      }
    } else {
      console.log('[Home] SDK未初始化')
    }
  } catch (error) {
    console.error('[Home] 获取SDK状态失败:', error)
  }

  // 监听设备连接/断开事件
  window.api.mouseSDK.onDeviceConnected((data) => {
    console.log('[Home] 收到设备连接事件:', data)
    deviceConnected.value = true
    deviceName.value = data.deviceName || data.deviceId || 'AI鼠标'
  })
  
  window.api.mouseSDK.onDeviceDisconnected((data) => {
    console.log('[Home] 收到设备断开事件:', data)
    deviceConnected.value = false
    deviceName.value = ''
    // 如果正在录音，停止
    if (isRecording.value) {
      isRecording.value = false
    }
    // 取消当前模式
    if (currentMode.value) {
      cancelMode()
    }
  })

  // 监听录音状态变化
  window.electron.ipcRenderer.on('recording-state-changed', onRecordingStateChanged)
  window.electron.ipcRenderer.on('mode-selected', onModeSelected)

  // 监听键盘事件
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  console.log('[Home] 组件卸载，清理资源')
  
  // 清理事件监听
  window.electron.ipcRenderer.removeAllListeners('recording-state-changed')
  window.electron.ipcRenderer.removeAllListeners('mode-selected')
  window.api.mouseSDK.removeDeviceListeners()
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
  width: 100%vw
}

/* 标题样式 */
.title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #fff;
}

/* 设备状态区域 */
.device-status {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 82, 82, 0.15);
  border: 1px solid rgba(255, 82, 82, 0.3);
  padding: 10px 20px;
  border-radius: 12px;
  margin-bottom: 30px;
  transition: all 0.3s ease;
}

.device-status.connected {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.3);
}

.device-icon {
  font-size: 1.2rem;
}

.device-text {
  color: #fff;
  font-size: 0.9rem;
}

/* 操作提示 */
.device-hint {
  color: #888;
  font-size: 0.8rem;
  margin-bottom: 20px;
  text-align: center;
}

/* 卡片容器 */
.cards {
  display: flex;
  gap: 40px;
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

/* 卡片禁用状态（设备未连接） */
.card-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.card-disabled:hover {
  box-shadow: none;
  border-color: rgba(255, 255, 255, 0.1);
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
