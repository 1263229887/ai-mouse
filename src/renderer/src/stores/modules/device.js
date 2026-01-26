import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

/**
 * 按键索引常量
 * 对应 SDK deviceKeyEvent 的 index 值
 */
export const KEY_INDEX = {
  // 语音键
  VOICE_CLICK: 100, // 语音键短按
  VOICE_LONG_PRESS: 102, // 语音键长按
  // AI键
  AI_CLICK: 96, // AI键短按
  AI_LONG_PRESS: 97 // AI键长按
}

/**
 * 按键状态常量
 */
export const KEY_STATUS = {
  PRESSED: 1, // 按下
  RELEASED: 0 // 松开
}

/**
 * 业务模式常量
 */
export const BUSINESS_MODE = {
  AI_ASSISTANT: 'ai-assistant', // AI语音助手
  VOICE_INPUT: 'voice-input', // 语音输入
  VOICE_TRANSLATE: 'voice-translate' // 语音翻译
}

/**
 * 录音来源常量
 */
export const RECORDING_SOURCE = {
  MOUSE: 'mouse', // 鼠标录音
  COMPUTER: 'computer' // 电脑录音
}

// 本地存储 key
const DEVICE_SETTINGS_KEY = 'device-settings'

/**
 * 设备信息 Store
 * 管理硬件设备状态、按键映射配置、录音来源，支持全局访问和实时更新
 */
export const useDeviceStore = defineStore('device', () => {
  // ============ 设备基本信息 ============
  // 当前设备ID
  const deviceId = ref('')

  // 设备序列号
  const serialNumber = ref('')

  // 设备版本号
  const version = ref('')

  // 厂商ID
  const vendorId = ref('')

  // 设备在线状态
  const isOnline = ref(false)

  // 设备名称
  const deviceName = ref('')

  // 连接方式（0: 无线, 1: 有线, 2: 蓝牙）
  const connectionMode = ref(-1)

  // 是否已连接设备
  const isConnected = computed(() => !!deviceId.value)

  // 连接方式文本
  const connectionModeText = computed(() => {
    switch (connectionMode.value) {
      case 0:
        return '无线'
      case 1:
        return '有线'
      case 2:
        return '蓝牙'
      default:
        return '未知'
    }
  })

  // ============ 按键映射配置 ============
  /**
   * 按键业务映射
   * key: 按键index (100, 102, 96, 97)
   * value: 业务模式 (ai-assistant, voice-input, voice-translate)
   */
  const keyMappings = ref({})

  // 初始化默认按键映射
  function initDefaultKeyMappings() {
    keyMappings.value[KEY_INDEX.VOICE_CLICK] = BUSINESS_MODE.VOICE_INPUT
    keyMappings.value[KEY_INDEX.VOICE_LONG_PRESS] = BUSINESS_MODE.VOICE_TRANSLATE
    keyMappings.value[KEY_INDEX.AI_CLICK] = BUSINESS_MODE.AI_ASSISTANT
    keyMappings.value[KEY_INDEX.AI_LONG_PRESS] = BUSINESS_MODE.AI_ASSISTANT
  }

  // ============ 录音来源配置 ============
  const recordingSource = ref(RECORDING_SOURCE.COMPUTER) // 默认电脑录音

  // ============ 本地存储持久化 ============
  /**
   * 从本地存储恢复设置
   */
  function restoreSettings() {
    // 先设置默认值
    initDefaultKeyMappings()

    try {
      const stored = localStorage.getItem(DEVICE_SETTINGS_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        // 恢复按键映射（注意：JSON.parse 会把数字 key 变成字符串，需要转换）
        if (data.keyMappings) {
          Object.keys(data.keyMappings).forEach((key) => {
            // 将字符串 key 转为数字
            const numKey = Number(key)
            if (!isNaN(numKey) && data.keyMappings[key]) {
              keyMappings.value[numKey] = data.keyMappings[key]
            }
          })
        }
        // 恢复录音来源
        if (data.recordingSource) {
          recordingSource.value = data.recordingSource
        }
        console.log('[Device] 恢复设置成功:', {
          keyMappings: { ...keyMappings.value },
          recordingSource: recordingSource.value
        })
      } else {
        console.log('[Device] 使用默认设置:', {
          keyMappings: { ...keyMappings.value },
          recordingSource: recordingSource.value
        })
      }
    } catch (error) {
      console.error('[Device] 恢复设置失败:', error)
    }
  }

  /**
   * 保存设置到本地存储
   */
  function saveSettings() {
    try {
      const data = {
        keyMappings: { ...keyMappings.value },
        recordingSource: recordingSource.value
      }
      localStorage.setItem(DEVICE_SETTINGS_KEY, JSON.stringify(data))
      console.log('[Device] 保存设置成功:', data)

      // 同步配置到主进程
      syncConfigToMain()
    } catch (error) {
      console.error('[Device] 保存设置失败:', error)
    }
  }

  /**
   * 同步配置到主进程
   */
  function syncConfigToMain() {
    try {
      const config = {
        recordingSource: recordingSource.value,
        keyMappings: { ...keyMappings.value }
      }
      window.api?.device?.syncConfig?.(config)
      console.log('[Device] 同步配置到主进程:', config)
    } catch (error) {
      console.error('[Device] 同步配置到主进程失败:', error)
    }
  }

  // 监听设置变化，自动保存
  watch(
    () => ({ ...keyMappings.value, recordingSource: recordingSource.value }),
    () => {
      saveSettings()
    },
    { deep: true }
  )

  // 初始化时恢复设置
  restoreSettings()

  // 初始化完成后同步配置到主进程
  syncConfigToMain()

  /**
   * 设置设备ID
   */
  function setDeviceId(id) {
    deviceId.value = id
  }

  /**
   * 设置设备序列号
   */
  function setSerialNumber(sn) {
    serialNumber.value = sn
  }

  /**
   * 设置设备版本号
   */
  function setVersion(ver) {
    version.value = ver
  }

  /**
   * 设置厂商ID
   */
  function setVendorId(id) {
    vendorId.value = id
  }

  /**
   * 设置在线状态
   */
  function setOnlineStatus(status) {
    isOnline.value = status
  }

  /**
   * 设置设备名称
   */
  function setDeviceName(name) {
    deviceName.value = name
  }

  /**
   * 设置连接方式
   */
  function setConnectionMode(mode) {
    connectionMode.value = mode
  }

  /**
   * 批量更新设备信息
   */
  function updateDeviceInfo(info) {
    if (info.deviceId !== undefined) deviceId.value = info.deviceId
    if (info.serialNumber !== undefined) serialNumber.value = info.serialNumber
    if (info.version !== undefined) version.value = info.version
    if (info.vendorId !== undefined) vendorId.value = info.vendorId
    if (info.isOnline !== undefined) isOnline.value = info.isOnline
    if (info.deviceName !== undefined) deviceName.value = info.deviceName
    if (info.connectionMode !== undefined) connectionMode.value = info.connectionMode
  }

  /**
   * 设备断开时重置状态
   */
  function resetDevice() {
    deviceId.value = ''
    serialNumber.value = ''
    version.value = ''
    vendorId.value = ''
    isOnline.value = false
    deviceName.value = ''
    connectionMode.value = -1
  }

  // ============ 按键映射方法 ============
  /**
   * 设置按键映射
   * @param {number} keyIndex - 按键索引 (100, 102, 96, 97)
   * @param {string} mode - 业务模式
   */
  function setKeyMapping(keyIndex, mode) {
    keyMappings.value[keyIndex] = mode
  }

  /**
   * 获取按键对应的业务模式
   * @param {number} keyIndex - 按键索引
   * @returns {string} 业务模式
   */
  function getKeyMapping(keyIndex) {
    return keyMappings.value[keyIndex] || null
  }

  /**
   * 批量设置按键映射
   * @param {object} mappings - 映射对象 { keyIndex: mode }
   */
  function setKeyMappings(mappings) {
    Object.assign(keyMappings.value, mappings)
  }

  // ============ 录音来源方法 ============
  /**
   * 设置录音来源
   * @param {string} source - 'mouse' | 'computer'
   */
  function setRecordingSource(source) {
    console.log('[Device] setRecordingSource:', source)
    recordingSource.value = source
    // 立即保存，确保设置生效
    saveSettings()
  }

  /**
   * 获取录音来源
   * @returns {string}
   */
  function getRecordingSource() {
    return recordingSource.value
  }

  /**
   * 是否使用鼠标录音
   */
  const isMouseRecording = computed(() => recordingSource.value === RECORDING_SOURCE.MOUSE)

  return {
    // ============ 设备基本信息 ============
    // 状态
    deviceId,
    serialNumber,
    version,
    vendorId,
    isOnline,
    deviceName,
    connectionMode,

    // 计算属性
    isConnected,
    connectionModeText,

    // 方法
    setDeviceId,
    setSerialNumber,
    setVersion,
    setVendorId,
    setOnlineStatus,
    setDeviceName,
    setConnectionMode,
    updateDeviceInfo,
    resetDevice,

    // ============ 按键映射配置 ============
    keyMappings,
    setKeyMapping,
    getKeyMapping,
    setKeyMappings,

    // ============ 录音来源配置 ============
    recordingSource,
    setRecordingSource,
    getRecordingSource,
    isMouseRecording
  }
})
