import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { windowApi, MiniWindowType, appApi, themeApi } from './api'

/**
 * 渲染进程可用的自定义 API
 */
const api = {
  // 窗口操作
  window: windowApi,
  MiniWindowType,

  // 应用操作
  app: appApi,

  // 主题操作
  theme: themeApi
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
