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
let SDK_registerDeviceAudioDataListener = null
let SDK_getAudioEnable = null
let SDK_setDeviceMicrophoneEnable = null
let SDK_getConnectionMode = null
let SDK_getConnectedDeviceCount = null
let SDK_getDeviceId = null

// 回调函数引用（防止被GC回收）
let DeviceConnectedCallback = null
let DeviceDisconnectedCallback = null
let DeviceMessageCallback = null
let DeviceAudioDataCallback = null

// 事件回调
let onDeviceConnectedCallback = null
let onDeviceDisconnectedCallback = null
let onDeviceMessageCallback = null
let onDeviceAudioDataCallback = null

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
    
    // 注册设备音频数据回调
    const OnDeviceAudioDataCallbackPro = koffi.proto('void OnDeviceAudioDataCallback(const char* deviceId, unsigned char* data, int length)')
    SDK_registerDeviceAudioDataListener = libm.func('registerDeviceAudioDataCallbackListener', 'void', [koffi.pointer(OnDeviceAudioDataCallbackPro)])
    
    // 音频控制函数
    SDK_getAudioEnable = libm.func('bool getAudioEnable(const char* deviceId)')
    SDK_setDeviceMicrophoneEnable = libm.func('bool setDeviceMicrophoneEnable(const char* deviceId, int enable)')
    
    // 获取设备连接方式 (0=USB接收器, 1=蓝牙)
    SDK_getConnectionMode = libm.func('int getConnectionMode(const char* deviceId)')
    
    // 获取已连接设备数量和设备ID（用于主动查询）
    SDK_getConnectedDeviceCount = libm.func('int getConnectedDeviceCount(void)')
    SDK_getDeviceId = libm.func('const char* getDeviceId(int index)')
    
    // 先注册回调，确保能捕获到SDK初始化时的设备连接事件
    // 解决设备在sdkInit时已连接导致回调错过的问题
    registerCallbacks()
    
    // 调用SDK初始化
    SDK_sdkInit(debug)
    
    isInitialized = true
    logger.info('MouseSDK', 'SDK初始化成功')
    
    // SDK初始化后，主动查询已连接的设备
    // 解决回调可能没有触发的问题
    checkConnectedDevices()
    
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
    // connectionMode: 0=USB接收器, 1=蓝牙
    const connectionModeText = connectionMode === 0 ? 'USB接收器' : connectionMode === 1 ? '蓝牙' : `未知(${connectionMode})`
    logger.info('MouseSDK', '设备已连接', { deviceId, connectionMode, connectionModeText })
    connectedDeviceId = deviceId
    
    // 验证实际连接模式
    try {
      const actualMode = SDK_getConnectionMode ? SDK_getConnectionMode(deviceId) : -1
      const actualModeText = actualMode === 0 ? 'USB接收器' : actualMode === 1 ? '蓝牙' : `未知(${actualMode})`
      logger.info('MouseSDK', '实际连接模式', { actualMode, actualModeText })
    } catch (e) {
      logger.warn('MouseSDK', '获取连接模式失败', { error: e.message })
    }
    
    // 设置语音键绑定到鼠标中键长按 (需要找到正确的 index)
    // 获取当前语音键配置（仅记录，不修改）
    // 4键长按录音是硬件默认设置，不需要调用setVoiceKey
    const currentVoiceKey = SDK_getVoiceKey()
    logger.info('MouseSDK', '当前语音键配置（保持硬件默认）', { currentVoiceKey })
    
    // 延迟1秒后触发回调，确保SDK配置生效
    // 解决连接太快导致setVoiceKey偶现失效的问题
    setTimeout(() => {
      logger.info('MouseSDK', '延迟1秒后触发设备连接回调')
      onDeviceConnectedCallback?.(deviceId, connectionMode)
    }, 1000)
  }
  
  // 设备断开回调
  const onDeviceDisconnected = (deviceId, connectionMode) => {
    const connectionModeText = connectionMode === 0 ? 'USB接收器' : connectionMode === 1 ? '蓝牙' : `未知(${connectionMode})`
    logger.info('MouseSDK', '设备已断开', { deviceId, connectionMode, connectionModeText })
    if (connectedDeviceId === deviceId) {
      connectedDeviceId = null
    }
    onDeviceDisconnectedCallback?.(deviceId, connectionMode)
  }
  
  // 设备消息回调
  const onDeviceMessage = (deviceId, data) => {
    // 解析消息 - 使用 info 级别日志便于调试
    try {
      const message = JSON.parse(data)
      logger.info('MouseSDK', '收到设备消息', { deviceId, message })
      onDeviceMessageCallback?.(deviceId, message)
    } catch (e) {
      logger.info('MouseSDK', '收到设备消息(非JSON)', { deviceId, data })
      onDeviceMessageCallback?.(deviceId, { raw: data })
    }
  }
  
  // 设备音频数据回调
  // 音频数据统计计数器
  let audioDataCount = 0
  const onDeviceAudioData = (deviceId, data, length) => {
    audioDataCount++
    // 采样日志：每50次记录一次
    if (audioDataCount % 50 === 1) {
      logger.info('MouseSDK', '收到音频数据', { deviceId, length, audioDataCount })
    }
    // 使用 koffi.decode 解码音频数据
    const audioData = koffi.decode(data, 'unsigned char', length)
    // 调用回调函数
    onDeviceAudioDataCallback?.(deviceId, audioData, length)
  }
  
  // 注册回调（使用 koffi.register 防止被GC回收）
  DeviceConnectedCallback = koffi.register(onDeviceConnected, 'OnDeviceConnectedCallback *')
  SDK_registerDeviceConnectedListener(DeviceConnectedCallback)
  
  DeviceDisconnectedCallback = koffi.register(onDeviceDisconnected, 'OnDeviceDisconnectedCallback *')
  SDK_registerDeviceDisconnectedListener(DeviceDisconnectedCallback)
  
  DeviceMessageCallback = koffi.register(onDeviceMessage, 'OnDeviceMessageCallback *')
  SDK_registerDeviceMessageListener(DeviceMessageCallback)
  
  DeviceAudioDataCallback = koffi.register(onDeviceAudioData, 'OnDeviceAudioDataCallback *')
  SDK_registerDeviceAudioDataListener(DeviceAudioDataCallback)
  
  logger.info('MouseSDK', '回调函数已注册')
}

/**
 * 主动查询已连接的设备
 * 解决回调可能没有触发的问题
 */
function checkConnectedDevices() {
  if (!SDK_getConnectedDeviceCount || !SDK_getDeviceId) {
    logger.warn('MouseSDK', '设备查询函数不可用')
    return
  }
  
  try {
    const deviceCount = SDK_getConnectedDeviceCount()
    logger.info('MouseSDK', '已连接设备数量', { deviceCount })
    
    if (deviceCount > 0) {
      // 获取第一个设备的ID
      const deviceId = SDK_getDeviceId(0)
      logger.info('MouseSDK', '主动查询到已连接设备', { deviceId })
      
      if (deviceId && !connectedDeviceId) {
        // 如果回调没有设置，主动设置
        connectedDeviceId = deviceId
        logger.info('MouseSDK', '主动设置已连接设备ID', { deviceId })
        
        // 获取连接模式
        let connectionMode = 0
        try {
          connectionMode = SDK_getConnectionMode ? SDK_getConnectionMode(deviceId) : 0
        } catch (e) {
          logger.warn('MouseSDK', '获取连接模式失败', { error: e.message })
        }
        
        // 延迟1秒后触发回调（保持与原回调逻辑一致）
        setTimeout(() => {
          logger.info('MouseSDK', '主动查询后触发设备连接回调')
          onDeviceConnectedCallback?.(deviceId, connectionMode)
        }, 1000)
      }
    }
  } catch (error) {
    logger.error('MouseSDK', '查询已连接设备失败', { error: error.message })
  }
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
 * 设置设备音频数据回调
 * @param {Function} callback - (deviceId, audioData: Uint8Array, length: number) => void
 */
function setOnDeviceAudioData(callback) {
  onDeviceAudioDataCallback = callback
}

/**
 * 启用/禁用设备麦克风
 * @param {string} deviceId - 设备ID
 * @param {boolean} enable - 是否启用
 * @returns {boolean} - 操作是否成功
 */
function setMicrophoneEnable(deviceId, enable) {
  if (!isInitialized || !SDK_setDeviceMicrophoneEnable) {
    logger.warn('MouseSDK', '设置麦克风状态失败：SDK未初始化')
    return false
  }
  
  try {
    const result = SDK_setDeviceMicrophoneEnable(deviceId, enable ? 1 : 0)
    logger.info('MouseSDK', '设置麦克风状态', { deviceId, enable, result })
    return result
  } catch (error) {
    logger.error('MouseSDK', '设置麦克风状态失败', { error: error.message })
    return false
  }
}

/**
 * 获取设备音频启用状态
 * @param {string} deviceId - 设备ID
 * @returns {boolean} - 是否启用
 */
function getAudioEnable(deviceId) {
  if (!isInitialized || !SDK_getAudioEnable) {
    return false
  }
  
  try {
    return SDK_getAudioEnable(deviceId)
  } catch (error) {
    logger.error('MouseSDK', '获取音频状态失败', { error: error.message })
    return false
  }
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

/**
 * 获取当前连接的设备ID
 */
function getConnectedDeviceId() {
  return connectedDeviceId
}

/**
 * 获取设备连接模式
 * @param {string} deviceId - 设备ID
 * @returns {number} - 连接模式 (0=USB接收器, 1=蓝牙, -1=获取失败)
 */
function getConnectionMode(deviceId) {
  if (!isInitialized || !SDK_getConnectionMode) {
    logger.warn('MouseSDK', '获取连接模式失败：SDK未初始化或函数不可用')
    return -1
  }
  
  try {
    const mode = SDK_getConnectionMode(deviceId)
    const modeText = mode === 0 ? 'USB接收器' : mode === 1 ? '蓝牙' : `未知(${mode})`
    logger.info('MouseSDK', '获取连接模式', { deviceId, mode, modeText })
    return mode
  } catch (error) {
    logger.error('MouseSDK', '获取连接模式失败', { error: error.message })
    return -1
  }
}

export default {
  initSDK,
  closeSDK,
  setOnDeviceConnected,
  setOnDeviceDisconnected,
  setOnDeviceMessage,
  setOnDeviceAudioData,
  setMicrophoneEnable,
  getAudioEnable,
  getStatus,
  getConnectedDeviceId,
  getConnectionMode
}
