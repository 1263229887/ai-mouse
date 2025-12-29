/**
 * AI鼠标SDK封装
 * 通过 koffi 调用 bydm.dll 实现设备连接和消息监听
 */

import { app } from 'electron'
import { join } from 'path'
import logger from './logger.js'

let koffi = null
let libm = null
let isInitialized = false
let connectedDeviceId = null

// SDK 函数引用
let SDK_sdkInit = null
let SDK_sdkClose = null
let SDK_getVoiceKey = null
let SDK_setVoiceKey = null
let SDK_registerDeviceConnectedListener = null
let SDK_registerDeviceDisconnectedListener = null
let SDK_registerDeviceMessageListener = null

// 回调函数引用（防止被GC回收）
let DeviceConnectedCallback = null
let DeviceDisconnectedCallback = null
let DeviceMessageCallback = null

// 事件回调
let onDeviceConnectedCallback = null
let onDeviceDisconnectedCallback = null
let onDeviceMessageCallback = null

/**
 * 获取 DLL 路径
 */
function getDllPath() {
  // 开发环境和生产环境路径不同
  if (app.isPackaged) {
    // 生产环境：从 resources 目录加载
    return join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'bydm.dll')
  } else {
    // 开发环境：从项目根目录的 resources 加载
    return join(app.getAppPath(), 'resources', 'bydm.dll')
  }
}

/**
 * 初始化SDK
 * @param {boolean} debug - 是否开启调试模式
 * @returns {boolean} - 初始化是否成功
 */
function initSDK(debug = true) {
  if (isInitialized) {
    logger.info('MouseSDK', 'SDK已经初始化过了')
    return true
  }

  try {
    // 动态加载 koffi
    koffi = require('koffi')
    
    const dllPath = getDllPath()
    logger.info('MouseSDK', '加载DLL', { dllPath })
    
    libm = koffi.load(dllPath)
    
    // 初始化SDK函数
    SDK_sdkInit = libm.func('void sdkInit(bool debug)')
    SDK_sdkClose = libm.func('void sdkClose(void)')
    SDK_getVoiceKey = libm.func('int getVoiceKey(void)')
    SDK_setVoiceKey = libm.func('void setVoiceKey(int index)')
    
    // 注册设备连接回调
    const OnDeviceConnectedCallbackPro = koffi.proto('void OnDeviceConnectedCallback(const char* deviceId, int connectionMode)')
    SDK_registerDeviceConnectedListener = libm.func('registerDeviceConnectedCallbackListener', 'void', [koffi.pointer(OnDeviceConnectedCallbackPro)])
    
    // 注册设备断开回调
    const OnDeviceDisconnectedCallbackPro = koffi.proto('void OnDeviceDisconnectedCallback(const char* deviceId, int connectionMode)')
    SDK_registerDeviceDisconnectedListener = libm.func('registerDeviceDisconnectedCallbackListener', 'void', [koffi.pointer(OnDeviceDisconnectedCallbackPro)])
    
    // 注册设备消息回调
    const OnDeviceMessageCallbackPro = koffi.proto('void OnDeviceMessageCallback(const char* deviceId, const char* data)')
    SDK_registerDeviceMessageListener = libm.func('registerDeviceMessageCallbackListener', 'void', [koffi.pointer(OnDeviceMessageCallbackPro)])
    
    // 调用SDK初始化
    SDK_sdkInit(debug)
    
    // 注册回调
    registerCallbacks()
    
    isInitialized = true
    logger.info('MouseSDK', 'SDK初始化成功')
    return true
  } catch (error) {
    logger.error('MouseSDK', 'SDK初始化失败', { error: error.message, stack: error.stack })
    return false
  }
}

/**
 * 注册SDK回调函数
 */
function registerCallbacks() {
  // 设备连接回调
  const onDeviceConnected = (deviceId, connectionMode) => {
    logger.info('MouseSDK', '设备已连接', { deviceId, connectionMode })
    connectedDeviceId = deviceId
    
    // 设置语音键绑定到鼠标中键长按 (需要找到正确的 index)
    // 先获取当前语音键看看
    const currentVoiceKey = SDK_getVoiceKey()
    logger.info('MouseSDK', '当前语音键', { currentVoiceKey })
    
    // 设置语音键为无效值，禁用SDK默认行为
    // 根据SDK文档，设置一个不存在的index可以禁用默认行为
    SDK_setVoiceKey(0)
    logger.info('MouseSDK', '已禁用SDK默认语音键行为 (setVoiceKey=0)', { originalVoiceKey: currentVoiceKey })
    
    // 延迟1秒后触发回调，确保SDK配置生效
    // 解决连接太快导致setVoiceKey偶现失效的问题
    setTimeout(() => {
      logger.info('MouseSDK', '延迟1秒后触发设备连接回调')
      onDeviceConnectedCallback?.(deviceId, connectionMode)
    }, 1000)
  }
  
  // 设备断开回调
  const onDeviceDisconnected = (deviceId, connectionMode) => {
    logger.info('MouseSDK', '设备已断开', { deviceId, connectionMode })
    if (connectedDeviceId === deviceId) {
      connectedDeviceId = null
    }
    onDeviceDisconnectedCallback?.(deviceId, connectionMode)
  }
  
  // 设备消息回调
  const onDeviceMessage = (deviceId, data) => {
    // 解析消息
    try {
      const message = JSON.parse(data)
      logger.debug('MouseSDK', '收到设备消息', { deviceId, message })
      onDeviceMessageCallback?.(deviceId, message)
    } catch (e) {
      logger.debug('MouseSDK', '收到设备消息(非JSON)', { deviceId, data })
      onDeviceMessageCallback?.(deviceId, { raw: data })
    }
  }
  
  // 注册回调（使用 koffi.register 防止被GC回收）
  DeviceConnectedCallback = koffi.register(onDeviceConnected, 'OnDeviceConnectedCallback *')
  SDK_registerDeviceConnectedListener(DeviceConnectedCallback)
  
  DeviceDisconnectedCallback = koffi.register(onDeviceDisconnected, 'OnDeviceDisconnectedCallback *')
  SDK_registerDeviceDisconnectedListener(DeviceDisconnectedCallback)
  
  DeviceMessageCallback = koffi.register(onDeviceMessage, 'OnDeviceMessageCallback *')
  SDK_registerDeviceMessageListener(DeviceMessageCallback)
  
  logger.info('MouseSDK', '回调函数已注册')
}

/**
 * 关闭SDK
 */
function closeSDK() {
  if (!isInitialized) {
    return
  }

  try {
    SDK_sdkClose()
    isInitialized = false
    connectedDeviceId = null
    logger.info('MouseSDK', 'SDK已关闭')
  } catch (error) {
    logger.error('MouseSDK', '关闭SDK失败', { error: error.message })
  }
}

/**
 * 设置设备连接回调
 * @param {Function} callback - (deviceId, connectionMode) => void
 */
function setOnDeviceConnected(callback) {
  onDeviceConnectedCallback = callback
}

/**
 * 设置设备断开回调
 * @param {Function} callback - (deviceId, connectionMode) => void
 */
function setOnDeviceDisconnected(callback) {
  onDeviceDisconnectedCallback = callback
}

/**
 * 设置设备消息回调
 * @param {Function} callback - (deviceId, message) => void
 */
function setOnDeviceMessage(callback) {
  onDeviceMessageCallback = callback
}

/**
 * 获取SDK状态
 */
function getStatus() {
  return {
    isInitialized,
    isConnected: connectedDeviceId !== null,
    deviceId: connectedDeviceId
  }
}

export default {
  initSDK,
  closeSDK,
  setOnDeviceConnected,
  setOnDeviceDisconnected,
  setOnDeviceMessage,
  getStatus
}
