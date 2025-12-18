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

// Custom APIs for renderer
const api = {
  logger: loggerAPI,
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
  
  // ==================== 蓝牙相关 API ====================
  /**
   * 获取蓝牙连接状态
   */
  getBluetoothStatus: () => {
    return ipcRenderer.invoke('get-bluetooth-status')
  },
  /**
   * 通知主进程蓝牙状态变化
   */
  notifyBluetoothStatusChanged: (connected, deviceName) => {
    ipcRenderer.send('bluetooth-status-changed', { connected, deviceName })
  },
  /**
   * 监听蓝牙连接状态变化
   */
  onBluetoothConnectionChanged: (callback) => {
    ipcRenderer.on('bluetooth-connection-changed', (event, data) => callback(data))
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
