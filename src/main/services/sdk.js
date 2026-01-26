/**
 * AI Mouse SDK 服务
 * 封装硬件设备通信接口
 */

import { join } from 'path'
import { app } from 'electron'

let koffi = null
let libm = null
let isInitialized = false

// SDK 函数声明
let SDK_sdkInit = null
let SDK_sdkClose = null
let SDK_getDeviceName = null
let SDK_getConnectedDeviceCount = null
let SDK_getConnectionMode = null
let SDK_getDeviceActive = null
let SDK_getDeviceSN = null
let SDK_getDeviceVersion = null
let SDK_getDeviceVendorId = null
let SDK_registerDeviceConnectedListener = null
let SDK_registerDeviceDisconnectedListener = null
let SDK_registerDeviceMessageListener = null
let SDK_registerDeviceAudioDataListener = null
let SDK_setVoiceKey = null
let SDK_getVoiceKey = null
let SDK_setDeviceMicrophoneEnable = null
let SDK_getDeviceMicrophoneEnable = null
let SDK_getAudioEnable = null

// 回调函数引用（防止被GC回收）
let deviceConnectedCallback = null
let deviceDisconnectedCallback = null
let deviceMessageCallback = null
let deviceAudioDataCallback = null

// 原始JS回调函数引用（防止被GC回收）
let jsCallbacks = {
  onDeviceConnected: null,
  onDeviceDisconnected: null,
  onDeviceMessage: null,
  onDeviceAudioData: null
}

// 事件监听器
const listeners = {
  deviceConnected: [],
  deviceDisconnected: [],
  deviceMessage: [],
  deviceAudioData: []
}

// 当前已连接设备状态缓存（用于页面刷新后恢复）
const connectedDevices = new Map()

/**
 * 获取库文件路径
 */
function getLibraryPath() {
  const isDev = !app.isPackaged
  const platform = process.platform

  let libName = ''
  if (platform === 'win32') {
    libName = 'bydm.dll'
  } else if (platform === 'darwin') {
    libName = 'bydm.dylib'
  } else {
    throw new Error(`Unsupported platform: ${platform}`)
  }

  if (isDev) {
    // 开发环境: 项目根目录/resources/sdk/
    return join(app.getAppPath(), 'resources', 'sdk', libName)
  } else {
    // 打包后: extraResources 复制到 resources/resources/sdk/
    return join(process.resourcesPath, 'resources', 'sdk', libName)
  }
}

/**
 * 初始化 SDK
 * @param {boolean} debug - 是否开启调试模式
 */
export function initSDK(debug = false) {
  // 如果已经初始化，先清理状态
  if (isInitialized) {
    console.log('[SDK] Already initialized, cleaning up first...')
    try {
      SDK_sdkClose()
      console.log('[SDK] Previous SDK instance closed')
    } catch (error) {
      console.warn('[SDK] Failed to close previous SDK instance:', error)
    }
    // 重置状态
    isInitialized = false
    connectedDevices.clear()
    deviceConnectedCallback = null
    deviceDisconnectedCallback = null
    deviceMessageCallback = null
    deviceAudioDataCallback = null
    jsCallbacks = {
      onDeviceConnected: null,
      onDeviceDisconnected: null,
      onDeviceMessage: null,
      onDeviceAudioData: null
    }
  }

  try {
    // 动态导入 koffi
    koffi = require('koffi')
    const libPath = getLibraryPath()
    console.log('[SDK] Loading library from:', libPath)

    libm = koffi.load(libPath)

    // 初始化函数
    SDK_sdkInit = libm.func('void sdkInit(bool debug)')
    SDK_sdkClose = libm.func('void sdkClose(void)')

    // 设备信息函数
    SDK_getDeviceName = libm.func('const char* getDeviceName(const char* deviceId)')
    SDK_getConnectedDeviceCount = libm.func('int getConnectedDeviceCount(void)')
    SDK_getConnectionMode = libm.func('int getConnectionMode(const char* deviceId)')
    SDK_getDeviceActive = libm.func('bool getDeviceActive(const char* deviceId)')
    SDK_getDeviceSN = libm.func('bool getDeviceSN(const char* deviceId)')
    SDK_getDeviceVersion = libm.func('bool getDeviceVersion(const char* deviceId)')

    // 厂商ID - 同步方法，返回 int
    SDK_getDeviceVendorId = libm.func('int getDeviceVendorId(const char* deviceId)')

    // 注册回调函数原型
    const OnDeviceConnectedCallbackPro = koffi.proto(
      'void OnDeviceConnectedCallback(const char* deviceId, int connectionMode)'
    )
    const OnDeviceDisconnectedCallbackPro = koffi.proto(
      'void OnDeviceDisconnectedCallback(const char* deviceId, int connectionMode)'
    )
    const OnDeviceMessageCallbackPro = koffi.proto(
      'void OnDeviceMessageCallback(const char* deviceId, const char* data)'
    )

    SDK_registerDeviceConnectedListener = libm.func(
      'registerDeviceConnectedCallbackListener',
      'void',
      [koffi.pointer(OnDeviceConnectedCallbackPro)]
    )
    SDK_registerDeviceDisconnectedListener = libm.func(
      'registerDeviceDisconnectedCallbackListener',
      'void',
      [koffi.pointer(OnDeviceDisconnectedCallbackPro)]
    )
    SDK_registerDeviceMessageListener = libm.func('registerDeviceMessageCallbackListener', 'void', [
      koffi.pointer(OnDeviceMessageCallbackPro)
    ])

    // 音频数据回调原型
    const OnDeviceAudioDataCallbackPro = koffi.proto(
      'void OnDeviceAudioDataCallback(const char* deviceId, unsigned char* data, int length)'
    )
    SDK_registerDeviceAudioDataListener = libm.func(
      'registerDeviceAudioDataCallbackListener',
      'void',
      [koffi.pointer(OnDeviceAudioDataCallbackPro)]
    )

    // 语音键控制函数
    SDK_setVoiceKey = libm.func('void setVoiceKey(int index)')
    SDK_getVoiceKey = libm.func('int getVoiceKey(void)')

    // 设备麦克风控制函数
    SDK_setDeviceMicrophoneEnable = libm.func(
      'bool setDeviceMicrophoneEnable(const char* deviceId, int enable)'
    )
    SDK_getDeviceMicrophoneEnable = libm.func(
      'bool getDeviceMicrophoneEnable(const char* deviceId)'
    )
    SDK_getAudioEnable = libm.func('bool getAudioEnable(const char* deviceId)')

    // 初始化 SDK
    SDK_sdkInit(debug)
    // SDK_sdkInit(true)
    console.log('[SDK] SDK initialized')

    // 注册回调
    registerCallbacks()

    isInitialized = true
    return true
  } catch (error) {
    console.error('[SDK] Failed to initialize:', error)
    return false
  }
}

/**
 * 注册设备回调
 */
function registerCallbacks() {
  console.log('[SDK] Starting callback registration...')

  // 设备连接回调（保存引用防止GC）
  jsCallbacks.onDeviceConnected = (deviceId, connectionMode) => {
    console.log('[SDK] Device connected:', deviceId, 'mode:', connectionMode)

    // 缓存设备状态
    connectedDevices.set(deviceId, {
      deviceId,
      connectionMode,
      isOnline: false,
      serialNumber: '',
      version: '',
      vendorId: null,
      // 音频使能状态
      audioEnabled: null, // null: 未知, true: 可用, false: 不可用
      audioAccess: null // null: 未知, 1: 有权限, 0: 无权限
    })

    // 请求设备信息
    SDK_getDeviceActive(deviceId)
    SDK_getDeviceSN(deviceId)
    SDK_getDeviceVersion(deviceId)
    // 查询音频使能状态
    SDK_getAudioEnable(deviceId)

    // 通知监听器
    emitEvent('deviceConnected', { deviceId, connectionMode })
  }

  // 设备断开回调（保存引用防止GC）
  jsCallbacks.onDeviceDisconnected = (deviceId, connectionMode) => {
    console.log('[SDK] Device disconnected:', deviceId, 'mode:', connectionMode)
    // 移除设备缓存
    connectedDevices.delete(deviceId)
    emitEvent('deviceDisconnected', { deviceId, connectionMode })
  }

  // 设备消息回调（保存引用防止GC）- 包含按键事件
  jsCallbacks.onDeviceMessage = (deviceId, data) => {
    // 添加详细日志，帮助诊断按键事件
    // console.log('[SDK] Device message received:', deviceId)
    // console.log('[SDK] Raw data:', data)

    // 解析消息数据
    let messageData = null
    try {
      messageData = JSON.parse(data)
      console.log('[SDK] Parsed message:', JSON.stringify(messageData))
    } catch {
      messageData = { raw: data }
      console.log('[SDK] Failed to parse, using raw:', messageData)
    }

    // 更新设备缓存
    const device = connectedDevices.get(deviceId)
    if (device && messageData) {
      switch (messageData.type) {
        case 'deviceActive':
          device.isOnline = messageData.active === 1
          break
        case 'deviceSN':
          device.serialNumber = messageData.sn || ''
          break
        case 'deviceVersion':
          device.version = messageData.version || ''
          break
        case 'audioEnable':
          // 更新音频使能状态
          device.audioEnabled = messageData.enabled === 1
          device.audioAccess = messageData.access === 1
          console.log('[SDK] Audio enable status updated:', {
            deviceId,
            enabled: device.audioEnabled,
            access: device.audioAccess
          })
          break
      }
    }

    emitEvent('deviceMessage', { deviceId, data: messageData })
  }

  // 音频数据回调（保存引用防止GC）
  jsCallbacks.onDeviceAudioData = (deviceId, data, length) => {
    // 将原始音频数据转换为 Buffer
    let audioData = null
    try {
      audioData = koffi.decode(data, 'unsigned char', length)
      // 转换为 Buffer
      audioData = Buffer.from(audioData)
    } catch (error) {
      console.error('[SDK] Failed to decode audio data:', error)
      return
    }

    try {
      emitEvent('deviceAudioData', { deviceId, audioData, length })
    } catch (error) {
      console.error('[SDK] Failed to emit deviceAudioData event:', error)
    }
  }

  // 注册回调到 SDK
  console.log('[SDK] Registering device connected callback...')
  deviceConnectedCallback = koffi.register(
    jsCallbacks.onDeviceConnected,
    'OnDeviceConnectedCallback *'
  )
  SDK_registerDeviceConnectedListener(deviceConnectedCallback)
  console.log('[SDK] Device connected callback registered')

  console.log('[SDK] Registering device disconnected callback...')
  deviceDisconnectedCallback = koffi.register(
    jsCallbacks.onDeviceDisconnected,
    'OnDeviceDisconnectedCallback *'
  )
  SDK_registerDeviceDisconnectedListener(deviceDisconnectedCallback)
  console.log('[SDK] Device disconnected callback registered')

  console.log('[SDK] Registering device message callback...')
  deviceMessageCallback = koffi.register(jsCallbacks.onDeviceMessage, 'OnDeviceMessageCallback *')
  SDK_registerDeviceMessageListener(deviceMessageCallback)
  console.log('[SDK] Device message callback registered')

  console.log('[SDK] Registering device audio data callback...')
  deviceAudioDataCallback = koffi.register(
    jsCallbacks.onDeviceAudioData,
    'OnDeviceAudioDataCallback *'
  )
  SDK_registerDeviceAudioDataListener(deviceAudioDataCallback)
  console.log('[SDK] Device audio data callback registered')

  console.log('[SDK] All callbacks registered successfully')
}

/**
 * 关闭 SDK
 */
export function closeSDK() {
  if (!isInitialized) return

  try {
    SDK_sdkClose()
    console.log('[SDK] SDK closed')
  } catch (error) {
    console.error('[SDK] Failed to close:', error)
  }

  // 清理状态
  isInitialized = false
  connectedDevices.clear()

  // 清理回调引用
  if (deviceConnectedCallback) {
    try {
      koffi.unregister(deviceConnectedCallback)
    } catch {
      /* ignore */
    }
    deviceConnectedCallback = null
  }
  if (deviceDisconnectedCallback) {
    try {
      koffi.unregister(deviceDisconnectedCallback)
    } catch {
      /* ignore */
    }
    deviceDisconnectedCallback = null
  }
  if (deviceMessageCallback) {
    try {
      koffi.unregister(deviceMessageCallback)
    } catch {
      /* ignore */
    }
    deviceMessageCallback = null
  }
  if (deviceAudioDataCallback) {
    try {
      koffi.unregister(deviceAudioDataCallback)
    } catch {
      /* ignore */
    }
    deviceAudioDataCallback = null
  }

  // 清理 JS 回调引用
  jsCallbacks = {
    onDeviceConnected: null,
    onDeviceDisconnected: null,
    onDeviceMessage: null,
    onDeviceAudioData: null
  }

  console.log('[SDK] SDK resources cleaned up')
}

/**
 * 获取设备名称
 */
export function getDeviceName(deviceId) {
  if (!isInitialized) return null
  try {
    return SDK_getDeviceName(deviceId)
  } catch {
    return null
  }
}

/**
 * 获取已连接设备数量
 */
export function getConnectedDeviceCount() {
  if (!isInitialized) return 0
  try {
    return SDK_getConnectedDeviceCount()
  } catch {
    return 0
  }
}

/**
 * 获取设备连接方式
 */
export function getConnectionMode(deviceId) {
  if (!isInitialized) return -1
  try {
    return SDK_getConnectionMode(deviceId)
  } catch {
    return -1
  }
}

/**
 * 获取设备名称
 */
export function getDeviceNameSync(deviceId) {
  if (!isInitialized) return null
  try {
    return SDK_getDeviceName(deviceId)
  } catch {
    return null
  }
}

/**
 * 获取厂商ID（同步方法，返回 int）
 * @param {string} deviceId - 设备ID
 * @returns {number|null} 厂商ID，失败返回 null
 */
export function getDeviceVendorId(deviceId) {
  if (!isInitialized || !SDK_getDeviceVendorId) {
    console.log('[SDK] getDeviceVendorId not available')
    return null
  }
  try {
    const result = SDK_getDeviceVendorId(deviceId)
    console.log('[SDK] getDeviceVendorId result:', result)
    // 返回 0 或负数可能表示无效
    if (result === 0 || result < 0) {
      return null
    }
    return result
  } catch (error) {
    console.error('[SDK] getDeviceVendorId error:', error)
    return null
  }
}

/**
 * 添加事件监听器
 */
export function addEventListener(event, callback) {
  if (listeners[event]) {
    listeners[event].push(callback)
  }
}

/**
 * 移除事件监听器
 */
export function removeEventListener(event, callback) {
  if (listeners[event]) {
    const index = listeners[event].indexOf(callback)
    if (index > -1) {
      listeners[event].splice(index, 1)
    }
  }
}

/**
 * 触发事件
 */
function emitEvent(event, data) {
  if (listeners[event]) {
    listeners[event].forEach((callback) => callback(data))
  }
}

/**
 * 检查 SDK 是否已初始化
 */
export function isSDKInitialized() {
  return isInitialized
}

/**
 * 获取当前已连接的设备状态
 * 用于页面刷新后恢复设备状态
 * @returns {Object|null} 当前连接的设备信息
 */
export function getCurrentDeviceState() {
  if (!isInitialized) return null

  // 获取第一个连接的设备（通常只有一个）
  const devices = Array.from(connectedDevices.values())
  if (devices.length === 0) return null

  const device = devices[0]
  return {
    deviceId: device.deviceId,
    connectionMode: device.connectionMode,
    isOnline: device.isOnline,
    serialNumber: device.serialNumber,
    version: device.version,
    vendorId: device.vendorId
  }
}

/**
 * 更新设备缓存中的厂商ID
 * @param {string} deviceId
 * @param {number} vendorId
 */
export function updateDeviceVendorId(deviceId, vendorId) {
  const device = connectedDevices.get(deviceId)
  if (device) {
    device.vendorId = vendorId
  }
}

/**
 * 设置语音键配置（禁用/启用 AI 键默认行为）
 * @param {number} index - 0: 禁用默认行为
 */
export function setVoiceKey(index) {
  if (!isInitialized || !SDK_setVoiceKey) {
    console.log('[SDK] setVoiceKey not available')
    return false
  }
  try {
    SDK_setVoiceKey(index)
    console.log('[SDK] setVoiceKey:', index)
    return true
  } catch (error) {
    console.error('[SDK] setVoiceKey error:', error)
    return false
  }
}

/**
 * 获取语音键配置
 * @returns {number|null}
 */
export function getVoiceKey() {
  if (!isInitialized || !SDK_getVoiceKey) {
    return null
  }
  try {
    return SDK_getVoiceKey()
  } catch (error) {
    console.error('[SDK] getVoiceKey error:', error)
    return null
  }
}

/**
 * 设置设备麦克风启用状态
 * @param {string} deviceId - 设备ID
 * @param {number} enable - 1: 启用, 0: 禁用
 * @returns {boolean}
 */
export function setDeviceMicrophoneEnable(deviceId, enable) {
  if (!isInitialized || !SDK_setDeviceMicrophoneEnable) {
    console.log('[SDK] setDeviceMicrophoneEnable not available')
    return false
  }
  try {
    const result = SDK_setDeviceMicrophoneEnable(deviceId, enable)
    console.log('[SDK] setDeviceMicrophoneEnable:', deviceId, enable, 'result:', result)
    return result
  } catch (error) {
    console.error('[SDK] setDeviceMicrophoneEnable error:', error)
    return false
  }
}

/**
 * 获取设备麦克风状态
 * @param {string} deviceId - 设备ID
 * @returns {boolean|null} true: 开启, false: 关闭, null: 查询失败
 */
export function getDeviceMicrophoneEnable(deviceId) {
  if (!isInitialized || !SDK_getDeviceMicrophoneEnable) {
    console.log('[SDK] getDeviceMicrophoneEnable not available')
    return null
  }
  try {
    const result = SDK_getDeviceMicrophoneEnable(deviceId)
    console.log('[SDK] getDeviceMicrophoneEnable:', deviceId, 'result:', result)
    return result
  } catch (error) {
    console.error('[SDK] getDeviceMicrophoneEnable error:', error)
    return null
  }
}

/**
 * 获取设备音频启用状态
 * @param {string} deviceId - 设备ID
 * @returns {boolean|null}
 */
export function getAudioEnable(deviceId) {
  if (!isInitialized || !SDK_getAudioEnable) {
    return null
  }
  try {
    return SDK_getAudioEnable(deviceId)
  } catch (error) {
    console.error('[SDK] getAudioEnable error:', error)
    return null
  }
}

/**
 * 检查设备音频是否可用（实时查询）
 * 调用 SDK 查询并返回缓存的状态
 * @param {string} deviceId - 设备ID
 * @returns {{ enabled: boolean|null, access: boolean|null, available: boolean }}
 */
export function checkDeviceAudioStatus(deviceId) {
  // 先触发查询更新状态
  if (isInitialized && SDK_getAudioEnable) {
    try {
      SDK_getAudioEnable(deviceId)
    } catch (error) {
      console.error('[SDK] checkDeviceAudioStatus query error:', error)
    }
  }

  // 返回缓存的状态
  const device = connectedDevices.get(deviceId)
  if (!device) {
    return { enabled: null, access: null, available: false }
  }

  const result = {
    enabled: device.audioEnabled,
    access: device.audioAccess,
    // 只有 enabled=true 且 access=true 才可用
    available: device.audioEnabled === true && device.audioAccess === true
  }

  console.log('[SDK] checkDeviceAudioStatus:', deviceId, result)
  return result
}
