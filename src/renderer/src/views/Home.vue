<template>
  <!-- 首页组件 - 功能卡片选择页面 -->
  <div class="container">
    <h1 class="title">AI Mouse</h1>
    
    <!-- 蓝牙连接状态区域 -->
    <div class="bluetooth-status" :class="{ 'connected': bluetoothConnected }">
      <span class="bt-icon">{{ bluetoothConnected ? '🟢' : '🔴' }}</span>
      <span class="bt-text">{{ bluetoothStatusText }}</span>
      <!-- 连接按钮 -->
      <button v-if="!bluetoothConnected" class="bt-btn" @click="scanAndConnect" :disabled="isConnecting">
        {{ isConnecting ? '连接中...' : (hasSavedDevice ? '一键重连' : '授权并连接') }}
      </button>
      <button v-else class="bt-btn disconnect" @click="disconnectBluetooth">断开连接</button>
    </div>
    <!-- 操作提示 -->
    <div class="bt-hint" v-if="!bluetoothConnected && !isConnecting">
      {{ hasSavedDevice ? '检测到已授权设备，点击一键重连即可' : '长按笔帽开机 → 点击授权并连接（无需先在电脑蓝牙配对）' }}
    </div>
    
    <div class="cards">
      <!-- AI输入卡片 -->
      <div class="card" 
           :class="{ 'card-selected': currentMode === 'typing', 'card-disabled': !bluetoothConnected }" 
           @click="selectMode('typing')">
        <div class="card-icon">⌨️</div>
        <h2 class="card-title">语音输入</h2>
        <p class="card-desc">语音实时识别,追加AI修正并输入</p>
        <div class="shortcut" v-if="!bluetoothConnected">请先授权并连接蓝牙</div>
        <div class="shortcut" v-else-if="currentMode !== 'typing'">单击选择此模式</div>
        <div class="shortcut active" v-else>长按蓝牙笔帽开始录音</div>
        <!-- 状态提示 -->
        <div class="status" v-if="currentMode === 'typing'">
          <span class="status-dot" :class="{ 'recording': isRecording }"></span>
          {{ isRecording ? '录音中...' : '已就绪，长按蓝牙笔帽开始录音' }}
        </div>
      </div>
      <!-- AI翻译卡片 -->
      <div class="card" 
           :class="{ 'card-selected': currentMode === 'translate', 'card-disabled': !bluetoothConnected }" 
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
        <div class="shortcut" v-if="!bluetoothConnected">请先授权并连接蓝牙</div>
        <div class="shortcut" v-else-if="currentMode !== 'translate'">单击选择此模式</div>
        <div class="shortcut active" v-else>长按蓝牙笔帽开始录音</div>
        <!-- 状态提示 -->
        <div class="status" v-if="currentMode === 'translate'">
          <span class="status-dot" :class="{ 'recording': isRecording }"></span>
          {{ isRecording ? '录音中...' : '已就绪，长按蓝牙笔帽开始录音' }}
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
 * - 授权蓝牙后，长按蓝牙笔帽开始录音，松开停止
 */

import { onMounted, onUnmounted, ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

// ==================== 响应式状态 ====================
// 当前选中的模式：null-未选择, 'typing'-语音输入, 'translate'-语音翻译
const currentMode = ref(null)
// 是否正在录音
const isRecording = ref(false)

// ==================== 蓝牙状态 ====================
// 蓝牙连接状态
const bluetoothConnected = ref(false)
// 蓝牙设备名称
const bluetoothDeviceName = ref('')
// 是否正在连接中
const isConnecting = ref(false)
// 是否有已保存的设备（用于显示"一键重连"）
const hasSavedDevice = ref(false)
// 蓝牙设备引用
let bluetoothDevice = null
let bluetoothServer = null
// BLE 特征值引用
let serialWriteCharacteristic = null
let serialNotifyCharacteristic = null
let bleService = null
// 心跳检测
let lastHeartbeatTime = 0
let heartbeatCheckInterval = null
const HEARTBEAT_TIMEOUT = 30000 // 30秒无心跳视为断开（设备可能不会主动发送数据）

// BLE UUID（使用小写 number 形式，最稳定）
const BLE_UUID = {
  SERVICE: 0xff00,  // 串口主服务
  NOTIFY: 0xff01,   // 下行数据/心跳
  WRITE: 0xff02,    // 上行写入
  READ: 0xff03,     // 可选读取
}

// 兼容旧代码
const BLE_SERVICE_UUID = BLE_UUID.SERVICE
const BLE_NOTIFY_UUID = BLE_UUID.NOTIFY
const BLE_WRITE_UUID = BLE_UUID.WRITE

// 蓝牙协议命令
const BLE_CMD = {
  READ_MAC: '055C020500',           // 读 MAC 地址
  VOICE_START: '055C020701',        // 启动语音模式
  VOICE_STOP: '055C020700',         // 停止语音模式
}

// 蓝牙协议响应
const BLE_RESP = {
  MAC_PREFIX: '055d0507',           // MAC 地址响应前缀
  VOICE_START_OK: '055d07014f4b',   // 启动语音模式成功
  VOICE_STOP_OK: '055d07004f4b',    // 停止语音模式成功
  RECORDING_START: '055d070101',    // 设备通知开始录音（长按）
  RECORDING_STOP: '055d070100',     // 设备通知停止录音（松开）
}

// 蓝牙状态文本
const bluetoothStatusText = computed(() => {
  if (isConnecting.value) {
    return '正在连接蓝牙设备...'
  }
  if (bluetoothConnected.value) {
    return `已连接: ${bluetoothDeviceName.value || 'Musttrue Pencil'}`
  }
  return '蓝牙笔未连接'
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

// ==================== 事件处理函数 ====================
/**
 * 选择模式
 * 选择后向设备发送启动语音模式命令
 */
const selectMode = async (mode) => {
  // 检查蓝牙连接状态
  if (!bluetoothConnected.value) {
    console.log('[Home] 蓝牙未连接，无法选择模式')
    return
  }
  
  if (currentMode.value === mode) {
    // 已选中该模式，不做处理
    return
  }
  
  console.log('[Home] 选择模式:', mode)
  
  // 向设备发送启动语音模式命令
  const success = await sendBleCommand(BLE_CMD.VOICE_START)
  if (!success) {
    console.error('[Home] 发送启动语音模式命令失败')
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
 * 取消时向设备发送停止语音模式命令
 */
const cancelMode = async () => {
  console.log('[Home] 取消模式')
  
  // 向设备发送停止语音模式命令
  if (bluetoothConnected.value) {
    await sendBleCommand(BLE_CMD.VOICE_STOP)
  }
  
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

// ==================== 蓝牙连接方法 ====================
/**
 * 将十六进制字符串转换为 Uint8Array
 */
const hexToBytes = (hex) => {
  const bytes = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16))
  }
  return new Uint8Array(bytes)
}

/**
 * 将 Uint8Array 转换为十六进制字符串
 */
const bytesToHex = (bytes) => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 发送 BLE 命令
 */
const sendBleCommand = async (cmdHex) => {
  if (!serialWriteCharacteristic) {
    console.error('[BLE] 无法发送命令：未连接')
    return false
  }
  try {
    console.log('[BLE] 发送命令:', cmdHex)
    await serialWriteCharacteristic.writeValue(hexToBytes(cmdHex))
    return true
  } catch (error) {
    console.error('[BLE] 发送命令失败:', error.message)
    return false
  }
}

/**
 * 扫描并连接蓝牙设备
 * 优先尝试连接已授权的设备，如果失败再扫描新设备
 */
const scanAndConnect = async () => {
  if (isConnecting.value) return
  
  isConnecting.value = true
  console.log('[BLE] 开始连接流程...')
  
  try {
    // Step 1: 先尝试连接已授权的设备（如果 API 可用）
    const savedId = localStorage.getItem('ble-device-id')
    if (savedId && typeof navigator.bluetooth.getDevices === 'function') {
      console.log('[BLE] 发现已授权设备 ID，尝试直接连接...')
      
      try {
        const devices = await navigator.bluetooth.getDevices()
        const savedDevice = devices.find(d => d.id === savedId)
        
        if (savedDevice) {
          console.log('[BLE] 找到已授权设备:', savedDevice.name)
          
          try {
            // 尝试直接连接
            const success = await connectToDevice(savedDevice)
            if (success) {
              console.log('[BLE] ✅ 已授权设备连接成功!')
              return
            }
          } catch (error) {
            console.log('[BLE] 已授权设备连接失败:', error.message)
            // 如果是系统占用错误，提示用户
            if (error.message.includes('GATT') || error.message.includes('connect')) {
              const shouldRetry = confirm(
                '检测到设备可能已被 Windows 系统占用。\n\n' +
                '请在 Windows 蓝牙设置中断开 "Musttrue Pencil" 的连接，\n' +
                '然后点击“确定”重试。\n\n' +
                '点击“取消”将扫描新设备。'
              )
              if (shouldRetry) {
                isConnecting.value = false
                setTimeout(() => scanAndConnect(), 1000)
                return
              }
            }
          }
        }
      } catch (error) {
        console.log('[BLE] getDevices 调用失败:', error.message)
      }
    }
    
    // Step 2: 扫描新设备
    console.log('[BLE] 开始扫描蓝牙设备...')
    
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [BLE_UUID.SERVICE]
    })
    
    console.log('[BLE] 设备已选择:', device.name, device.id)
    
    // 保存设备 ID 用于自动重连
    localStorage.setItem('ble-device-id', device.id)
    
    // 连接设备
    await connectToDevice(device)
    
  } catch (error) {
    console.error('[BLE] 扫描/连接失败:', error.name, error.message)
    if (error.name !== 'NotFoundError') {
      alert('蓝牙连接失败: ' + error.message)
    }
  } finally {
    isConnecting.value = false
  }
}

/**
 * 自动重连
 * 页面加载时检查是否有保存的设备，如果有则请求主进程触发自动连接
 */
const autoReconnect = async () => {
  const log = (msg, data) => {
    console.log('[BLE]', msg, data || '')
    window.api?.logger?.info('BLE-AutoReconnect', msg, data)
  }
  
  log('检查是否有保存的设备...')
  
  const savedId = localStorage.getItem('ble-device-id')
  
  if (savedId) {
    hasSavedDevice.value = true
    log('检测到已保存设备，请求主进程触发自动重连...', { savedId })
    
    // 请求主进程模拟用户点击，以满足 Chromium 的用户手势要求
    window.api?.triggerAutoReconnect()
  } else {
    log('没有保存的设备')
    hasSavedDevice.value = false
  }
}

/**
 * 监听主进程的自动重连执行事件
 */
const setupAutoReconnectListener = () => {
  window.api?.onExecuteAutoReconnect(async () => {
    console.log('[BLE] 收到主进程的自动重连指令，执行连接...')
    window.api?.logger?.info('BLE-AutoReconnect', '收到主进程指令，执行连接')
    
    try {
      await scanAndConnect()
      console.log('[BLE] 自动重连成功!')
      window.api?.logger?.info('BLE-AutoReconnect', '自动重连成功')
    } catch (error) {
      console.error('[BLE] 自动重连失败:', error.message)
      window.api?.logger?.error('BLE-AutoReconnect', '自动重连失败', { error: error.message })
    }
  })
}

/**
 * 连接到指定的蓝牙设备
 */
const connectToDevice = async (device) => {
  console.log('[BLE] 开始连接设备:', device.name)
  
  try {
    bluetoothDevice = device
    bluetoothDeviceName.value = device.name || 'Musttrue Pencil'
    
    // 监听设备断开连接
    device.addEventListener('gattserverdisconnected', onBluetoothDisconnected)
    
    // Step 1: 连接 GATT 服务器
    console.log('[BLE] Step 1: 连接 GATT 服务器...')
    bluetoothServer = await device.gatt.connect()
    console.log('[BLE] Step 1: GATT 连接成功')
    
    // Step 2: 获取 BLE 串口服务 (0xff00)
    console.log('[BLE] Step 2: 获取服务 0xff00...')
    bleService = await bluetoothServer.getPrimaryService(BLE_UUID.SERVICE)
    console.log('[BLE] Step 2: 服务获取成功')
    
    // Step 3: 获取写特征值 (0xff02)
    console.log('[BLE] Step 3: 获取写特征值 0xff02...')
    serialWriteCharacteristic = await bleService.getCharacteristic(BLE_UUID.WRITE)
    console.log('[BLE] Step 3: 写特征值获取成功')
    
    // Step 4: 获取通知特征值 (0xff01)
    console.log('[BLE] Step 4: 获取通知特征值 0xff01...')
    serialNotifyCharacteristic = await bleService.getCharacteristic(BLE_UUID.NOTIFY)
    console.log('[BLE] Step 4: 通知特征值获取成功')
    
    // Step 5: 启用通知
    console.log('[BLE] Step 5: 启用通知...')
    await serialNotifyCharacteristic.startNotifications()
    serialNotifyCharacteristic.addEventListener('characteristicvaluechanged', onBleDataReceived)
    console.log('[BLE] Step 5: 通知已启用')
    
    // Step 6: 发送读 MAC 地址命令验证连接
    console.log('[BLE] Step 6: 发送读 MAC 地址命令...')
    await sendBleCommand(BLE_CMD.READ_MAC)
    console.log('[BLE] Step 6: MAC 命令已发送')
    
    // 连接成功
    bluetoothConnected.value = true
    lastHeartbeatTime = Date.now()
    console.log('[BLE] ✅ 设备连接成功!')
    
    // 启动心跳检测
    startHeartbeatCheck()
    
    // 通知主进程蓝牙状态变化
    window.api.notifyBluetoothStatusChanged(true, bluetoothDeviceName.value)
    
    return true
  } catch (error) {
    console.error('[BLE] 连接失败:', error.message)
    cleanupConnection()
    return false
  }
}

/**
 * 断开蓝牙连接
 */
const disconnectBluetooth = () => {
  console.log('[BLE] 用户请求断开连接')
  
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect()
  }
  
  cleanupConnection()
  window.api.notifyBluetoothStatusChanged(false, null)
}

/**
 * 启动心跳检测
 */
const startHeartbeatCheck = () => {
  if (heartbeatCheckInterval) {
    clearInterval(heartbeatCheckInterval)
  }
  
  console.log('[BLE] 启动心跳检测...')
  
  heartbeatCheckInterval = setInterval(() => {
    if (!bluetoothConnected.value) {
      return
    }
    
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeatTime
    
    if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.warn('[BLE] 心跳超时，视为断开连接')
      handleConnectionLost()
    }
  }, 1000)
}

/**
 * 处理连接丢失
 */
const handleConnectionLost = () => {
  console.log('[BLE] 连接丢失，清理状态...')
  cleanupConnection()
  
  // 通知主进程
  window.api.notifyBluetoothStatusChanged(false, null)
  
  // 如果正在录音，停止
  if (isRecording.value) {
    stopRecording()
  }
  
  // 2秒后尝试自动重连
  console.log('[BLE] 2秒后尝试自动重连...')
  setTimeout(() => autoReconnect(), 2000)
}

/**
 * 清理连接状态
 */
const cleanupConnection = () => {
  bluetoothConnected.value = false
  bluetoothServer = null
  bleService = null
  serialWriteCharacteristic = null
  serialNotifyCharacteristic = null
  isRecording.value = false
  
  if (heartbeatCheckInterval) {
    clearInterval(heartbeatCheckInterval)
    heartbeatCheckInterval = null
  }
}

/**
 * BLE 数据接收回调
 * 处理设备发送的所有通知
 */
const onBleDataReceived = (event) => {
  const value = event.target.value
  const data = new Uint8Array(value.buffer)
  const hexData = bytesToHex(data)
  
  // 更新心跳时间
  lastHeartbeatTime = Date.now()
  
  console.log('[BLE] 收到数据:', hexData, '长度:', data.length)
  
  // 解析响应（统一转小写比较）
  const hexLower = hexData.toLowerCase()
  
  if (hexLower.startsWith(BLE_RESP.MAC_PREFIX)) {
    // MAC 地址响应: 055d0507 + 6字节MAC
    if (data.length >= 10) {
      const macBytes = data.slice(4, 10)
      const macAddress = Array.from(macBytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':')
      console.log('[BLE] ✅ 设备 MAC 地址:', macAddress)
    }
  } else if (hexLower === BLE_RESP.VOICE_START_OK) {
    // 语音模式启动成功: 055d07014f4b
    console.log('[BLE] ✅ 语音模式启动成功')
  } else if (hexLower === BLE_RESP.VOICE_STOP_OK) {
    // 语音模式停止成功: 055d07004f4b
    console.log('[BLE] ✅ 语音模式停止成功')
  } else if (hexLower === BLE_RESP.RECORDING_START) {
    // 设备通知开始录音（单击/长按）: 055d070101
    console.log('[BLE] 🎤 设备通知: 开始录音')
    startRecording()
  } else if (hexLower === BLE_RESP.RECORDING_STOP) {
    // 设备通知停止录音（松开）: 055d070100
    console.log('[BLE] 🛑 设备通知: 停止录音')
    stopRecording()
  } else {
    console.log('[BLE] 未识别的数据:', hexLower)
  }
}

/**
 * 蓝牙设备断开连接回调 (GATT 事件)
 */
const onBluetoothDisconnected = (event) => {
  console.log('[BLE] ⚠️ GATT 断开连接事件（可能是设备主动断开或超出范围）')
  handleConnectionLost()
}

// ==================== 录音控制 ====================
/**
 * 开始录音（由设备长按触发）
 */
const startRecording = () => {
  if (!currentMode.value) {
    console.log('[BLE] 未选择模式，忽略录音请求')
    return
  }
  
  if (isRecording.value) {
    console.log('[BLE] 已在录音中，忽略')
    return
  }
  
  console.log('[BLE] 启动录音，模式:', currentMode.value)
  isRecording.value = true
  
  // 通知主进程开始录音
  window.electron.ipcRenderer.send('ble-recording-start', {
    mode: currentMode.value,
    sourceIsoCode: sourceIsoCode.value,
    targetIsoCode: targetIsoCode.value,
    sourceLangName: getLangName(sourceIsoCode.value),
    targetLangName: getLangName(targetIsoCode.value)
  })
}

/**
 * 停止录音（由设备松开触发）
 */
const stopRecording = () => {
  if (!isRecording.value) {
    console.log('[BLE] 未在录音，忽略')
    return
  }
  
  console.log('[BLE] 停止录音')
  isRecording.value = false
  
  // 通知主进程停止录音
  window.electron.ipcRenderer.send('ble-recording-stop')
}

// ==================== 生命周期 ====================
onMounted(async () => {
  console.log('[Home] 组件挂载')
  
  // ========== 蓝牙诊断信息 ==========
  console.log('[BLE-Diag] ========== 蓝牙诊断开始 ==========')
  
  // 检查蓝牙 API 是否可用
  if ('bluetooth' in navigator) {
    console.log('[BLE-Diag] Web Bluetooth API 可用')
    console.log('[BLE-Diag] getDevices API:', typeof navigator.bluetooth.getDevices === 'function' ? '可用' : '不可用')
    
    // 尝试获取已授权的设备（如果 API 可用）
    if (typeof navigator.bluetooth.getDevices === 'function') {
      try {
        const devices = await navigator.bluetooth.getDevices()
        console.log('[BLE-Diag] 已授权设备数量:', devices.length)
        
        for (const device of devices) {
          console.log('[BLE-Diag] 设备信息:', {
            name: device.name,
            id: device.id,
            gattConnected: device.gatt?.connected
          })
          
          // 如果设备已连接，尝试获取服务信息
          if (device.gatt?.connected) {
            console.log('[BLE-Diag] 设备 GATT 已连接，尝试获取服务...')
            try {
              const services = await device.gatt.getPrimaryServices()
              console.log('[BLE-Diag] 设备服务数量:', services.length)
              for (const service of services) {
                console.log('[BLE-Diag] 服务 UUID:', service.uuid)
              }
            } catch (e) {
              console.log('[BLE-Diag] 获取服务失败:', e.message)
            }
          }
        }
      } catch (error) {
        console.log('[BLE-Diag] 获取已授权设备失败:', error.message)
      }
    }
  } else {
    console.log('[BLE-Diag] Web Bluetooth API 不可用')
  }
  
  console.log('[BLE-Diag] ========== 蓝牙诊断结束 ==========')
  
  // 设置自动重连监听器
  setupAutoReconnectListener()
  
  // 尝试自动重连之前授权的设备
  autoReconnect()
  
  // 获取语言列表
  fetchLanguageList()

  // 获取初始蓝牙状态
  try {
    const btStatus = await window.api.getBluetoothStatus()
    bluetoothConnected.value = btStatus.connected
    if (btStatus.deviceName) {
      bluetoothDeviceName.value = btStatus.deviceName
    }
  } catch (error) {
    console.error('[Home] 获取蓝牙状态失败:', error)
  }
  
  // 监听蓝牙连接状态变化
  window.api.onBluetoothConnectionChanged((data) => {
    bluetoothConnected.value = data.connected
    if (data.deviceName) {
      bluetoothDeviceName.value = data.deviceName
    }
    // 如果断开连接，取消当前模式
    if (!data.connected && currentMode.value) {
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
  
  // 清理定时器
  if (heartbeatCheckInterval) {
    clearInterval(heartbeatCheckInterval)
  }
  
  // 清理事件监听
  window.electron.ipcRenderer.removeAllListeners('recording-state-changed')
  window.electron.ipcRenderer.removeAllListeners('mode-selected')
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

/* 蓝牙状态区域 */
.bluetooth-status {
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

.bluetooth-status.connected {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.3);
}

.bt-icon {
  font-size: 1.2rem;
}

.bt-text {
  color: #fff;
  font-size: 0.9rem;
}

.bt-btn {
  background: rgba(100, 200, 255, 0.2);
  color: #64c8ff;
  border: 1px solid rgba(100, 200, 255, 0.3);
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bt-btn:hover:not(:disabled) {
  background: rgba(100, 200, 255, 0.3);
  border-color: rgba(100, 200, 255, 0.5);
}

.bt-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.bt-btn.disconnect {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}

.bt-btn.disconnect:hover {
  background: rgba(248, 113, 113, 0.3);
  border-color: rgba(248, 113, 113, 0.5);
}

/* 操作提示 */
.bt-hint {
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

/* 卡片禁用状态（蓝牙未连接） */
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
