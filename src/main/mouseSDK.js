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

// 回调函数原型（延迟初始化，必须是模块级变量）
let OnDeviceConnectedCallbackPro = null
let OnDeviceDisconnectedCallbackPro = null
let OnDeviceMessageCallbackPro = null
let OnDeviceAudioDataCallbackPro = null

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
    
    // 注册设备连接回调（原型赋值给模块级变量）
    OnDeviceConnectedCallbackPro = koffi.proto('void OnDeviceConnectedCallback(const char* deviceId, int connectionMode)')
    SDK_registerDeviceConnectedListener = libm.func('registerDeviceConnectedCallbackListener', 'void', [koffi.pointer(OnDeviceConnectedCallbackPro)])
    
    // 注册设备断开回调
    OnDeviceDisconnectedCallbackPro = koffi.proto('void OnDeviceDisconnectedCallback(const char* deviceId, int connectionMode)')
    SDK_registerDeviceDisconnectedListener = libm.func('registerDeviceDisconnectedCallbackListener', 'void', [koffi.pointer(OnDeviceDisconnectedCallbackPro)])
    
    // 注册设备消息回调
    OnDeviceMessageCallbackPro = koffi.proto('void OnDeviceMessageCallback(const char* deviceId, const char* data)')
    SDK_registerDeviceMessageListener = libm.func('registerDeviceMessageCallbackListener', 'void', [koffi.pointer(OnDeviceMessageCallbackPro)])
    
    // 注册设备音频数据回调
    OnDeviceAudioDataCallbackPro = koffi.proto('void OnDeviceAudioDataCallback(const char* deviceId, unsigned char* data, int length)')
    SDK_registerDeviceAudioDataListener = libm.func('registerDeviceAudioDataCallbackListener', 'void', [koffi.pointer(OnDeviceAudioDataCallbackPro)])
    
    // 音频控制函数
    SDK_getAudioEnable = libm.func('bool getAudioEnable(const char* deviceId)')
    SDK_setDeviceMicrophoneEnable = libm.func('bool setDeviceMicrophoneEnable(const char* deviceId, int enable)')
    
    // 获取设备连接方式 (0=USB接收器, 1=蓝牙)
    SDK_getConnectionMode = libm.func('int getConnectionMode(const char* deviceId)')
    
    // 获取已连接设备数量和设备ID（用于主动查询）
    SDK_getConnectedDeviceCount = libm.func('int getConnectedDeviceCount(void)')
    SDK_getDeviceId = libm.func('const char* getDeviceId(int index)')
    
    // 先初始化SDK，再注册回调
    // 顺序重要：与 feature/ai-mouse-test 分支保持一致
    // 先初始化 SDK 才能正常让 DLL 内部状态就绪
    SDK_sdkInit(debug)
    
    logger.info('MouseSDK', 'SDK初始化成功')
    
    // 立即设置语音键为4键长按(102) - 用户实际使用的录音键
    // 这可能触发DLL内部状态刷新，使设备连接回调能够被触发
    try {
      const currentVoiceKey = SDK_getVoiceKey()
      logger.info('MouseSDK', '初始化后当前语音键', { currentVoiceKey })
      SDK_setVoiceKey(102)
      const newVoiceKey = SDK_getVoiceKey()
      logger.info('MouseSDK', '已设置语音键为4键长按(102)', { newVoiceKey })
    } catch (error) {
      logger.warn('MouseSDK', '初始化时设置语音键失败', { error: error.message })
    }
    
    // 注册回调函数
    registerCallbacks()
    
    isInitialized = true
    
    // SDK初始化后，延迟一段时间再主动查询已连接的设备
    // 解决DLL内部设备枚举需要时间的问题
    // 使用多次重试，确保能检测到已连接的设备
    startDevicePolling()
    
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
    
    // 如果是关闭SDK时的断开回调，触发resolve
    if (closeDisconnectResolve) {
      closeDisconnectResolve()
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

// 设备轮询定时器
let devicePollingTimer = null
let devicePollingCount = 0
const MAX_POLLING_COUNT = 20 // 最多轮询20次（10秒）
const POLLING_INTERVAL = 500 // 每500ms轮询一次

/**
 * 启动设备轮询检测
 * 解决DLL内部设备枚举需要时间的问题
 */
function startDevicePolling() {
  // 如果已经有设备连接，不需要轮询
  if (connectedDeviceId) {
    logger.info('MouseSDK', '设备已连接，跳过轮询')
    return
  }
  
  devicePollingCount = 0
  
  // 先立即检查一次
  checkConnectedDevices()
  
  // 如果还没检测到，启动轮询
  if (!connectedDeviceId) {
    logger.info('MouseSDK', '启动设备轮询检测')
    devicePollingTimer = setInterval(() => {
      devicePollingCount++
      
      // 如果已经检测到设备或达到最大次数，停止轮询
      if (connectedDeviceId || devicePollingCount >= MAX_POLLING_COUNT) {
        if (devicePollingTimer) {
          clearInterval(devicePollingTimer)
          devicePollingTimer = null
        }
        if (connectedDeviceId) {
          logger.info('MouseSDK', '轮询检测到设备已连接', { pollCount: devicePollingCount })
        } else {
          logger.info('MouseSDK', '轮询超时，未检测到设备', { pollCount: devicePollingCount })
        }
        return
      }
      
      checkConnectedDevices()
    }, POLLING_INTERVAL)
  }
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
    
    // 只在检测到设备或首次调用时记录日志
    if (deviceCount > 0 || devicePollingCount === 0) {
      logger.info('MouseSDK', '查询已连接设备数量', { deviceCount, pollCount: devicePollingCount })
    }
    
    if (deviceCount > 0) {
      // 获取第一个设备的ID
      const deviceId = SDK_getDeviceId(0)
      
      if (deviceId) {
        logger.info('MouseSDK', '主动查询到已连接设备', { deviceId })
        
        if (!connectedDeviceId) {
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
          
          // 延迟500ms后触发回调，确保回调已设置
          setTimeout(() => {
            logger.info('MouseSDK', '主动查询后触发设备连接回调', { deviceId, connectionMode })
            onDeviceConnectedCallback?.(deviceId, connectionMode)
          }, 500)
        }
      } else {
        logger.warn('MouseSDK', '获取设备ID返回空', { deviceCount })
      }
    }
  } catch (error) {
    logger.error('MouseSDK', '查询已连接设备失败', { error: error.message })
  }
}

/**
 * 关闭SDK
 */
// 关闭SDK时的断开回调Promise resolve
let closeDisconnectResolve = null

/**
 * 关闭SDK（同步版本，不等待回调）
 */
function closeSDK() {
  if (!isInitialized) {
    return
  }

  try {
    // 清理轮询定时器
    if (devicePollingTimer) {
      clearInterval(devicePollingTimer)
      devicePollingTimer = null
    }
    
    SDK_sdkClose()
    isInitialized = false
    connectedDeviceId = null
    logger.info('MouseSDK', 'SDK已关闭')
  } catch (error) {
    logger.error('MouseSDK', '关闭SDK失败', { error: error.message })
  }
}

/**
 * 关闭SDK（异步版本，等待设备断开回调后完成）
 * @param {number} timeout - 超时时间（毫秒），默认3秒
 * @returns {Promise<boolean>} - 是否成功收到断开回调
 */
function closeSDKAsync(timeout = 3000) {
  return new Promise((resolve) => {
    if (!isInitialized) {
      logger.info('MouseSDK', 'SDK未初始化，直接返回')
      resolve(true)
      return
    }
    
    // 如果没有连接的设备，直接关闭SDK
    if (!connectedDeviceId) {
      logger.info('MouseSDK', '没有已连接设备，直接关闭SDK')
      closeSDK()
      resolve(true)
      return
    }
    
    logger.info('MouseSDK', '等待设备断开回调后关闭...', { deviceId: connectedDeviceId })
    
    // 设置断开回调的resolve
    closeDisconnectResolve = () => {
      logger.info('MouseSDK', '收到设备断开回调，完成关闭')
      closeDisconnectResolve = null
      resolve(true)
    }
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      if (closeDisconnectResolve) {
        logger.warn('MouseSDK', '等待断开回调超时，强制关闭')
        closeDisconnectResolve = null
        closeSDK()
        resolve(false)
      }
    }, timeout)
    
    try {
      // 清理轮询定时器
      if (devicePollingTimer) {
        clearInterval(devicePollingTimer)
        devicePollingTimer = null
      }
      
      // 调用sdkClose，这会触发设备断开回调
      SDK_sdkClose()
      isInitialized = false
      logger.info('MouseSDK', '已调用sdkClose，等待断开回调...')
      
    } catch (error) {
      logger.error('MouseSDK', '关闭SDK失败', { error: error.message })
      clearTimeout(timeoutId)
      closeDisconnectResolve = null
      resolve(false)
    }
  })
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

/**
 * 设置语音键
 * @param {number} index - 语音键索引 (0=禁用, 102=4键长按)
 * @returns {boolean} - 操作是否成功
 */
function setVoiceKey(index) {
  if (!isInitialized || !SDK_setVoiceKey) {
    logger.warn('MouseSDK', '设置语音键失败：SDK未初始化')
    return false
  }
  
  try {
    SDK_setVoiceKey(index)
    const newVoiceKey = SDK_getVoiceKey()
    logger.info('MouseSDK', '设置语音键', { index, newVoiceKey })
    return true
  } catch (error) {
    logger.error('MouseSDK', '设置语音键失败', { error: error.message })
    return false
  }
}

/**
 * 获取当前语音键设置
 * @returns {number} - 语音键索引
 */
function getVoiceKey() {
  if (!isInitialized || !SDK_getVoiceKey) {
    return -1
  }
  
  try {
    return SDK_getVoiceKey()
  } catch (error) {
    logger.error('MouseSDK', '获取语音键失败', { error: error.message })
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
  getConnectionMode,
  setVoiceKey,
  getVoiceKey,
  closeSDKAsync
}
