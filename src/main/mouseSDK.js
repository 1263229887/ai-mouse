/**
 * AI鼠标SDK模块
 * 基于koffi调用bydm.dll，实现与AI鼠标硬件的通信
 * 包括：设备连接/断开监听、音频数据接收、设备控制等
 */

import { app } from 'electron'
import { join } from 'path'
import logger from './logger.js'

// 延迟加载 koffi，确保在应用准备好后加载
let koffi = null
let libm = null

// SDK函数定义（延迟初始化）
let SDK_sdkInit = null
let SDK_sdkClose = null
let SDK_getVoiceKey = null
let SDK_setVoiceKey = null
let SDK_setDpiFilter = null
let SDK_registerDeviceConnectedListener = null
let SDK_registerDeviceDisconnectedListener = null
let SDK_registerDeviceMessageListener = null
let SDK_registerDeviceAudioDataListener = null
let SDK_getDeviceName = null
let SDK_getConnectedDeviceCount = null
let SDK_getConnectionMode = null
let SDK_getDeviceActive = null
let SDK_getDongleSN = null
let SDK_getDongleVersion = null
let SDK_getDeviceSN = null
let SDK_getDeviceVersion = null
let SDK_getDeviceAllDpi = null
let SDK_setDeviceDpi = null
let SDK_getDeviceBattery = null
let SDK_getAudioEnable = null
let SDK_setDeviceMicrophoneEnable = null

// 回调函数原型（延迟初始化）
let OnDeviceConnectedCallbackPro = null
let OnDeviceDisconnectedCallbackPro = null
let OnDeviceMessageCallbackPro = null
let OnDeviceAudioDataCallbackPro = null

// 注册的回调函数引用
let DeviceConnectedCallback = null
let DeviceDisconnectedCallback = null
let DeviceMessageCallback = null
let DeviceAudioDataCallback = null

// SDK状态
let isInitialized = false
let connectedDeviceId = null

// 事件监听器
const eventListeners = {
  deviceConnected: [],
  deviceDisconnected: [],
  deviceMessage: [],
  audioData: [],
  aiKeyEvent: []  // AI键按下/松开事件
}

/**
 * 获取DLL文件路径
 * 开发环境从docs目录加载，生产环境从resources目录加载
 */
function getDllPath() {
  if (app.isPackaged) {
    // 生产环境：从 resources 目录加载
    return join(process.resourcesPath, 'bydm.dll')
  } else {
    // 开发环境：从 docs 目录加载
    return join(app.getAppPath(), 'docs', 'bydm.dll')
  }
}

/**
 * 初始化SDK
 * @param {boolean} debug - 是否开启调试模式
 * @returns {boolean} - 初始化是否成功
 */
function initSDK(debug = false) {
  if (isInitialized) {
    logger.warn('MouseSDK', 'SDK已经初始化，跳过')
    return true
  }

  try {
    // 动态加载koffi
    koffi = require('koffi')
    
    const dllPath = getDllPath()
    logger.info('MouseSDK', '加载DLL', { path: dllPath })
    
    libm = koffi.load(dllPath)

    // 初始化SDK函数
    SDK_sdkInit = libm.func('void sdkInit(bool debug)')
    SDK_sdkClose = libm.func('void sdkClose(void)')
    SDK_getVoiceKey = libm.func('int getVoiceKey(void)')
    SDK_setVoiceKey = libm.func('void setVoiceKey(int index)')
    SDK_setDpiFilter = libm.func('void setDpiFilter(int* filter, int length, int dpi)')
    
    // 设备连接回调
    OnDeviceConnectedCallbackPro = koffi.proto('void OnDeviceConnectedCallback(const char* deviceId, int connectionMode)')
    SDK_registerDeviceConnectedListener = libm.func('registerDeviceConnectedCallbackListener', 'void', [koffi.pointer(OnDeviceConnectedCallbackPro)])
    
    // 设备断开回调
    OnDeviceDisconnectedCallbackPro = koffi.proto('void OnDeviceDisconnectedCallback(const char* deviceId, int connectionMode)')
    SDK_registerDeviceDisconnectedListener = libm.func('registerDeviceDisconnectedCallbackListener', 'void', [koffi.pointer(OnDeviceDisconnectedCallbackPro)])
    
    // 设备消息回调
    OnDeviceMessageCallbackPro = koffi.proto('void OnDeviceMessageCallback(const char* deviceId, const char* data)')
    SDK_registerDeviceMessageListener = libm.func('registerDeviceMessageCallbackListener', 'void', [koffi.pointer(OnDeviceMessageCallbackPro)])
    
    // 音频数据回调
    OnDeviceAudioDataCallbackPro = koffi.proto('void OnDeviceAudioDataCallback(const char* deviceId, unsigned char* data, int length)')
    SDK_registerDeviceAudioDataListener = libm.func('registerDeviceAudioDataCallbackListener', 'void', [koffi.pointer(OnDeviceAudioDataCallbackPro)])
    
    // 设备信息函数
    SDK_getDeviceName = libm.func('const char* getDeviceName(const char* deviceId)')
    SDK_getConnectedDeviceCount = libm.func('int getConnectedDeviceCount(void)')
    SDK_getConnectionMode = libm.func('int getConnectionMode(const char* deviceId)')
    SDK_getDeviceActive = libm.func('bool getDeviceActive(const char* deviceId)')
    SDK_getDongleSN = libm.func('bool getDongleSN(const char* deviceId)')
    SDK_getDongleVersion = libm.func('bool getDongleVersion(const char* deviceId)')
    SDK_getDeviceSN = libm.func('bool getDeviceSN(const char* deviceId)')
    SDK_getDeviceVersion = libm.func('bool getDeviceVersion(const char* deviceId)')
    SDK_getDeviceAllDpi = libm.func('bool getDeviceAllDpi(const char* deviceId)')
    SDK_setDeviceDpi = libm.func('bool setDeviceDpi(const char* deviceId, int max, int currentLevel, int currentValue)')
    SDK_getDeviceBattery = libm.func('bool getDeviceBattery(const char* deviceId)')
    SDK_getAudioEnable = libm.func('bool getAudioEnable(const char* deviceId)')
    SDK_setDeviceMicrophoneEnable = libm.func('bool setDeviceMicrophoneEnable(const char* deviceId, int enable)')

    // 调用SDK初始化
    SDK_sdkInit(debug)
    logger.info('MouseSDK', 'SDK初始化成功', { debug })

    // 立即设置语音键为AI键长按(97)
    // 必须在设备连接前设置，否则SDK会触发默认的打开网页行为
    try {
      const currentVoiceKey = SDK_getVoiceKey()
      logger.info('MouseSDK', '初始化后当前语音键', { currentVoiceKey })
      SDK_setVoiceKey(97)
      const newVoiceKey = SDK_getVoiceKey()
      logger.info('MouseSDK', '已设置语音键为AI键长按(97)', { newVoiceKey })
    } catch (error) {
      logger.warn('MouseSDK', '初始化时设置语音键失败', { error: error.message })
    }

    // 注册回调函数
    registerCallbacks()

    isInitialized = true
    return true
  } catch (error) {
    logger.error('MouseSDK', 'SDK初始化失败', { error: error.message, stack: error.stack })
    return false
  }
}

/**
 * 注册所有回调函数
 */
function registerCallbacks() {
  // 设备连接回调
  const onDeviceConnected = function(deviceId, connectionMode) {
    logger.info('MouseSDK', '设备已连接', { deviceId, connectionMode })
    connectedDeviceId = deviceId
    
    // 获取设备信息
    const deviceName = SDK_getDeviceName(deviceId)
    logger.info('MouseSDK', '设备名称', { deviceName })
    
    // 在设备连接时设置语音键为AI键长按(97)
    // 这样SDK就知道我们要处理这个键，不会触发默认的打开网页行为
    try {
      const currentVoiceKey = SDK_getVoiceKey()
      logger.info('MouseSDK', '当前语音键配置', { currentVoiceKey })
      SDK_setVoiceKey(97)
      const newVoiceKey = SDK_getVoiceKey()
      logger.info('MouseSDK', '已设置语音键为AI键长按(97)', { newVoiceKey })
    } catch (error) {
      logger.warn('MouseSDK', '设置语音键失败', { error: error.message })
    }
    
    // 通知所有监听器
    eventListeners.deviceConnected.forEach(listener => {
      try {
        listener({ deviceId, connectionMode, deviceName })
      } catch (error) {
        logger.error('MouseSDK', '设备连接回调执行失败', { error: error.message })
      }
    })
  }

  // 设备断开回调
  const onDeviceDisconnected = function(deviceId, connectionMode) {
    logger.info('MouseSDK', '设备已断开', { deviceId, connectionMode })
    if (connectedDeviceId === deviceId) {
      connectedDeviceId = null
    }
    
    eventListeners.deviceDisconnected.forEach(listener => {
      try {
        listener({ deviceId, connectionMode })
      } catch (error) {
        logger.error('MouseSDK', '设备断开回调执行失败', { error: error.message })
      }
    })
  }

  // 设备消息回调
  const onDeviceMessage = function(deviceId, data) {
    logger.info('MouseSDK', '收到设备消息', { deviceId, data })
    
    // 解析JSON格式的设备消息
    let keyEvent = null
    try {
      if (data && typeof data === 'string') {
        const jsonData = JSON.parse(data)
        
        // 处理按键事件：deviceKeyEvent
        // 根据文档：index 96=AI键短按, 97=AI键长按; status 1=按下, 0=松开
        if (jsonData.type === 'deviceKeyEvent') {
          const { index, status } = jsonData
          logger.info('MouseSDK', '按键事件', { index, status })
          
          // AI键长按 (index=97)
          if (index === 97) {
            if (status === 1) {
              keyEvent = { type: 'AI_KEY_DOWN', deviceId, index, status }
              logger.info('MouseSDK', 'AI键长按-按下', keyEvent)
            } else if (status === 0) {
              keyEvent = { type: 'AI_KEY_UP', deviceId, index, status }
              logger.info('MouseSDK', 'AI键长按-松开', keyEvent)
            }
          }
          // AI键短按 (index=96) - 可以根据需要处理
          else if (index === 96) {
            if (status === 1) {
              keyEvent = { type: 'AI_KEY_SHORT_DOWN', deviceId, index, status }
              logger.info('MouseSDK', 'AI键短按-按下', keyEvent)
            } else if (status === 0) {
              keyEvent = { type: 'AI_KEY_SHORT_UP', deviceId, index, status }
              logger.info('MouseSDK', 'AI键短按-松开', keyEvent)
            }
          }
        }
      }
    } catch (e) {
      logger.warn('MouseSDK', '解析设备消息失败', { error: e.message, data })
    }
    
    // 触发按键事件监听器
    if (keyEvent) {
      eventListeners.aiKeyEvent?.forEach(listener => {
        try {
          listener(keyEvent)
        } catch (error) {
          logger.error('MouseSDK', 'AI键事件回调执行失败', { error: error.message })
        }
      })
    }
    
    eventListeners.deviceMessage.forEach(listener => {
      try {
        listener({ deviceId, data })
      } catch (error) {
        logger.error('MouseSDK', '设备消息回调执行失败', { error: error.message })
      }
    })
  }

  // 音频数据回调
  let audioPacketCount = 0  // 音频包计数器
  const onDeviceAudioData = function(deviceId, data, length) {
    audioPacketCount++
    // 每收到10个包打印一次日志
    if (audioPacketCount % 10 === 1) {
      logger.info('MouseSDK', '收到音频数据', { deviceId, length, packetCount: audioPacketCount })
    }
    
    // 解码音频数据
    const audioData = koffi.decode(data, 'unsigned char', length)
    
    // 将 unsigned char 数组转换为 Buffer
    const audioBuffer = Buffer.from(audioData)
    
    eventListeners.audioData.forEach(listener => {
      try {
        listener({ deviceId, audioBuffer, length })
      } catch (error) {
        logger.error('MouseSDK', '音频数据回调执行失败', { error: error.message })
      }
    })
  }

  // 注册回调到SDK
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
 * 启用/禁用麦克风
 * @param {boolean} enable - 是否启用
 * @returns {boolean} - 操作是否成功
 */
function setMicrophoneEnable(enable) {
  if (!isInitialized || !connectedDeviceId) {
    logger.warn('MouseSDK', '无法设置麦克风：SDK未初始化或设备未连接')
    return false
  }

  try {
    const result = SDK_setDeviceMicrophoneEnable(connectedDeviceId, enable ? 1 : 0)
    logger.info('MouseSDK', enable ? '启用麦克风' : '禁用麦克风', { result })
    return result
  } catch (error) {
    logger.error('MouseSDK', '设置麦克风失败', { error: error.message })
    return false
  }
}

/**
 * 获取麦克风状态
 * @returns {boolean} - 麦克风是否启用
 */
function getAudioEnable() {
  if (!isInitialized || !connectedDeviceId) {
    return false
  }

  try {
    return SDK_getAudioEnable(connectedDeviceId)
  } catch (error) {
    logger.error('MouseSDK', '获取麦克风状态失败', { error: error.message })
    return false
  }
}

/**
 * 添加事件监听器
 * @param {string} event - 事件类型: 'deviceConnected' | 'deviceDisconnected' | 'deviceMessage' | 'audioData'
 * @param {Function} listener - 回调函数
 */
function addEventListener(event, listener) {
  if (eventListeners[event]) {
    eventListeners[event].push(listener)
  }
}

/**
 * 移除事件监听器
 * @param {string} event - 事件类型
 * @param {Function} listener - 回调函数
 */
function removeEventListener(event, listener) {
  if (eventListeners[event]) {
    const index = eventListeners[event].indexOf(listener)
    if (index > -1) {
      eventListeners[event].splice(index, 1)
    }
  }
}

/**
 * 清除所有事件监听器
 * @param {string} event - 事件类型（可选，不传则清除所有）
 */
function clearEventListeners(event) {
  if (event && eventListeners[event]) {
    eventListeners[event] = []
  } else {
    Object.keys(eventListeners).forEach(key => {
      eventListeners[key] = []
    })
  }
}

/**
 * 获取当前连接的设备ID
 * @returns {string|null}
 */
function getConnectedDeviceId() {
  return connectedDeviceId
}

/**
 * 检查SDK是否已初始化
 * @returns {boolean}
 */
function isSDKInitialized() {
  return isInitialized
}

/**
 * 获取已连接设备数量
 * @returns {number}
 */
function getConnectedDeviceCount() {
  if (!isInitialized) {
    return 0
  }
  try {
    return SDK_getConnectedDeviceCount()
  } catch (error) {
    return 0
  }
}

/**
 * 获取设备信息
 * @param {string} deviceId - 设备ID
 * @returns {Object} - 设备信息对象
 */
function getDeviceInfo(deviceId = connectedDeviceId) {
  if (!isInitialized || !deviceId) {
    return null
  }

  try {
    return {
      deviceId,
      deviceName: SDK_getDeviceName(deviceId),
      connectionMode: SDK_getConnectionMode(deviceId),
      isActive: SDK_getDeviceActive(deviceId),
      audioEnabled: SDK_getAudioEnable(deviceId)
    }
  } catch (error) {
    logger.error('MouseSDK', '获取设备信息失败', { error: error.message })
    return null
  }
}

export default {
  initSDK,
  closeSDK,
  setMicrophoneEnable,
  getAudioEnable,
  addEventListener,
  removeEventListener,
  clearEventListeners,
  getConnectedDeviceId,
  isSDKInitialized,
  getConnectedDeviceCount,
  getDeviceInfo
}
