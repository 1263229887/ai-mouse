import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 文件日志 API - 将日志发送到主进程写入文件
const loggerAPI = {
  /**
   * 写入 INFO 级别日志
   */
  info: (source, message, data) => {
    ipcRenderer.send('log-to-file', { level: 'INFO', source, message, data })
  },
  
  /**
   * 写入 DEBUG 级别日志
   */
  debug: (source, message, data) => {
    ipcRenderer.send('log-to-file', { level: 'DEBUG', source, message, data })
  },
  
  /**
   * 写入 WARN 级别日志
   */
  warn: (source, message, data) => {
    ipcRenderer.send('log-to-file', { level: 'WARN', source, message, data })
  },
  
  /**
   * 写入 ERROR 级别日志
   */
  error: (source, message, data) => {
    ipcRenderer.send('log-to-file', { level: 'ERROR', source, message, data })
  },
  
  /**
   * 获取日志文件路径
   */
  getLogPath: () => {
    return ipcRenderer.invoke('get-log-path')
  }
}

// ==================== AI鼠标SDK API ====================
const mouseSDKAPI = {
  /**
   * 获取SDK状态
   */
  getSDKStatus: () => {
    return ipcRenderer.invoke('mouse-sdk-get-status')
  },

  /**
   * 启用/禁用鼠标麦克风
   * @param {boolean} enable - 是否启用
   */
  setMicrophoneEnable: (enable) => {
    return ipcRenderer.invoke('mouse-sdk-set-microphone', enable)
  },

  /**
   * 获取设备信息
   */
  getDeviceInfo: () => {
    return ipcRenderer.invoke('mouse-sdk-get-device-info')
  },

  /**
   * 监听设备连接事件
   * @param {Function} callback - 回调函数
   */
  onDeviceConnected: (callback) => {
    return ipcRenderer.on('mouse-device-connected', (event, data) => callback(data))
  },

  /**
   * 监听设备断开事件
   * @param {Function} callback - 回调函数
   */
  onDeviceDisconnected: (callback) => {
    return ipcRenderer.on('mouse-device-disconnected', (event, data) => callback(data))
  },

  /**
   * 监听音频数据事件
   * @param {Function} callback - 回调函数 ({ audioBuffer, length }) => void
   */
  onAudioData: (callback) => {
    return ipcRenderer.on('mouse-audio-data', (event, data) => callback(data))
  },

  /**
   * 移除音频数据监听
   */
  removeAudioDataListener: () => {
    ipcRenderer.removeAllListeners('mouse-audio-data')
  },

  /**
   * 移除设备事件监听
   */
  removeDeviceListeners: () => {
    ipcRenderer.removeAllListeners('mouse-device-connected')
    ipcRenderer.removeAllListeners('mouse-device-disconnected')
  }
}

// Custom APIs for renderer
const api = {
  logger: loggerAPI,
  mouseSDK: mouseSDKAPI,
  /**
   * 调整窗口高度
   */
  adjustWindowHeight: (contentHeight) => {
    ipcRenderer.send('adjust-window-height', { contentHeight })
  },
  /**
   * 关闭弹窗
   */
  closePopup: () => {
    ipcRenderer.send('close-popup')
  },
  /**
   * 拖动弹窗
   */
  dragPopup: (deltaX, deltaY) => {
    ipcRenderer.send('drag-popup', { deltaX, deltaY })
  },
  
  // ==================== AI键录音事件 ====================
  /**
   * 监听开始录音事件（AI键按下时触发）
   * @param {Function} callback - ({ mode, sourceIsoCode, targetIsoCode, sourceLangName, targetLangName }) => void
   */
  onStartRecording: (callback) => {
    return ipcRenderer.on('start-recording', (event, data) => callback(data))
  },
  
  /**
   * 监听停止录音事件（AI键松开时触发）
   * @param {Function} callback - () => void
   */
  onStopRecording: (callback) => {
    return ipcRenderer.on('stop-recording', (event) => callback())
  },
  
  /**
   * 移除录音事件监听
   */
  removeRecordingListeners: () => {
    ipcRenderer.removeAllListeners('start-recording')
    ipcRenderer.removeAllListeners('stop-recording')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
