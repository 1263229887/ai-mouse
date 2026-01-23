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

// 回调函数引用（防止被GC回收）
let deviceConnectedCallback = null
let deviceDisconnectedCallback = null
let deviceMessageCallback = null

// 事件监听器
const listeners = {
  deviceConnected: [],
  deviceDisconnected: [],
  deviceMessage: []
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
  if (isInitialized) {
    console.log('[SDK] Already initialized')
    return true
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

    // 初始化 SDK
    SDK_sdkInit(debug)
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
  // 设备连接回调
  const onDeviceConnected = (deviceId, connectionMode) => {
    console.log('[SDK] Device connected:', deviceId, 'mode:', connectionMode)

    // 缓存设备状态
    connectedDevices.set(deviceId, {
      deviceId,
      connectionMode,
      isOnline: false,
      serialNumber: '',
      version: '',
      vendorId: null
    })

    // 请求设备信息
    SDK_getDeviceActive(deviceId)
    SDK_getDeviceSN(deviceId)
    SDK_getDeviceVersion(deviceId)

    // 通知监听器
    emitEvent('deviceConnected', { deviceId, connectionMode })
  }

  // 设备断开回调
  const onDeviceDisconnected = (deviceId, connectionMode) => {
    console.log('[SDK] Device disconnected:', deviceId, 'mode:', connectionMode)
    // 移除设备缓存
    connectedDevices.delete(deviceId)
    emitEvent('deviceDisconnected', { deviceId, connectionMode })
  }

  // 设备消息回调（包含设备信息）
  const onDeviceMessage = (deviceId, data) => {
    console.log('[SDK] Device message:', deviceId, 'data:', data)

    // 解析消息数据
    let messageData = null
    try {
      messageData = JSON.parse(data)
    } catch {
      messageData = { raw: data }
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
      }
    }

    emitEvent('deviceMessage', { deviceId, data: messageData })
  }

  // 注册回调到 SDK
  deviceConnectedCallback = koffi.register(onDeviceConnected, 'OnDeviceConnectedCallback *')
  SDK_registerDeviceConnectedListener(deviceConnectedCallback)

  deviceDisconnectedCallback = koffi.register(
    onDeviceDisconnected,
    'OnDeviceDisconnectedCallback *'
  )
  SDK_registerDeviceDisconnectedListener(deviceDisconnectedCallback)

  deviceMessageCallback = koffi.register(onDeviceMessage, 'OnDeviceMessageCallback *')
  SDK_registerDeviceMessageListener(deviceMessageCallback)

  console.log('[SDK] Callbacks registered')
}

/**
 * 关闭 SDK
 */
export function closeSDK() {
  if (!isInitialized) return

  try {
    SDK_sdkClose()
    console.log('[SDK] SDK closed')
    isInitialized = false
  } catch (error) {
    console.error('[SDK] Failed to close:', error)
  }
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
