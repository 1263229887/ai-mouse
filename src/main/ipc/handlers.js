/**
 * IPC 处理器注册
 * 统一注册所有 IPC 事件处理
 */

import { ipcMain, app, nativeTheme, clipboard } from 'electron'
import { IPC_CHANNELS } from './channels'
import {
  windowManager,
  createBusinessAWindow,
  createBusinessBWindow,
  createBusinessCWindow,
  createVoiceTranslateWindow,
  createVoiceInputWindow,
  MiniWindowType
} from '../windows'
import {
  initSDK,
  closeSDK,
  getDeviceVendorId,
  addEventListener,
  generateOpenId,
  getCurrentDeviceState,
  updateDeviceVendorId,
  checkForUpdate,
  downloadUpdate,
  quitAndInstall,
  setDeviceMicrophoneEnable,
  getAudioEnable
} from '../services'
import { exec } from 'child_process'

/**
 * 注册窗口相关 IPC
 */
function registerWindowHandlers() {
  // 创建小窗口
  ipcMain.handle(IPC_CHANNELS.WINDOW.CREATE_MINI, (event, type) => {
    switch (type) {
      case MiniWindowType.BUSINESS_A:
        createBusinessAWindow()
        break
      case MiniWindowType.BUSINESS_B:
        createBusinessBWindow()
        break
      case MiniWindowType.BUSINESS_C:
        createBusinessCWindow()
        break
      case MiniWindowType.VOICE_TRANSLATE:
        createVoiceTranslateWindow()
        break
      case MiniWindowType.VOICE_INPUT:
        createVoiceInputWindow()
        break
      default:
        console.warn(`Unknown mini window type: ${type}`)
    }
    return true
  })

  // 关闭窗口
  ipcMain.on(IPC_CHANNELS.WINDOW.CLOSE, (event, windowName) => {
    if (windowName) {
      windowManager.close(windowName)
    } else {
      // 关闭当前发送消息的窗口
      const webContents = event.sender
      const win = require('electron').BrowserWindow.fromWebContents(webContents)
      if (win) win.close()
    }
  })

  // 最小化窗口
  ipcMain.on(IPC_CHANNELS.WINDOW.MINIMIZE, (event) => {
    const webContents = event.sender
    const win = require('electron').BrowserWindow.fromWebContents(webContents)
    if (win) win.minimize()
  })

  // 最大化/还原窗口
  ipcMain.on(IPC_CHANNELS.WINDOW.MAXIMIZE, (event) => {
    const webContents = event.sender
    const win = require('electron').BrowserWindow.fromWebContents(webContents)
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  // 移动窗口（相对位移）
  ipcMain.on(IPC_CHANNELS.WINDOW.MOVE_BY, (event, { deltaX, deltaY }) => {
    const webContents = event.sender
    const win = require('electron').BrowserWindow.fromWebContents(webContents)
    if (win) {
      const [x, y] = win.getPosition()
      win.setPosition(x + deltaX, y + deltaY)
    }
  })
}

/**
 * 注册应用相关 IPC
 */
function registerAppHandlers() {
  // 获取应用版本
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => {
    return app.getVersion()
  })

  // 退出应用
  ipcMain.on(IPC_CHANNELS.APP.QUIT, () => {
    app.quit()
  })
}

/**
 * 注册主题相关 IPC
 */
function registerThemeHandlers() {
  // 获取系统主题
  ipcMain.handle(IPC_CHANNELS.THEME.GET_SYSTEM, () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  })

  // 监听系统主题变化，通知所有窗口
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    windowManager.broadcast(IPC_CHANNELS.THEME.CHANGED, theme)
  })
}

/**
 * 按键索引常量
 */
const KEY_INDEX = {
  VOICE_CLICK: 100, // 语音键短按
  VOICE_LONG_PRESS: 102, // 语音键长按
  AI_CLICK: 96, // AI键短按
  AI_LONG_PRESS: 97 // AI键长按
}

/**
 * 按键状态常量
 */
const KEY_STATUS = {
  PRESSED: 1, // 按下
  RELEASED: 0 // 松开
}

/**
 * 业务模式常量
 */
const BUSINESS_MODE = {
  AI_ASSISTANT: 'ai-assistant',
  VOICE_INPUT: 'voice-input',
  VOICE_TRANSLATE: 'voice-translate'
}

/**
 * 录音来源常量
 */
const RECORDING_SOURCE = {
  MOUSE: 'mouse',
  COMPUTER: 'computer'
}

/**
 * 主进程设备配置缓存
 * 由渲染进程同步过来
 */
let deviceConfig = {
  recordingSource: RECORDING_SOURCE.COMPUTER, // 默认电脑录音
  keyMappings: {
    [KEY_INDEX.VOICE_CLICK]: BUSINESS_MODE.VOICE_INPUT,
    [KEY_INDEX.VOICE_LONG_PRESS]: BUSINESS_MODE.VOICE_TRANSLATE,
    [KEY_INDEX.AI_CLICK]: BUSINESS_MODE.AI_ASSISTANT,
    [KEY_INDEX.AI_LONG_PRESS]: BUSINESS_MODE.AI_ASSISTANT
  }
}

/**
 * 当前录音状态
 */
let currentRecordingState = {
  isRecording: false,
  businessMode: null,
  keyIndex: null,
  deviceId: null
}

/**
 * 更新设备配置
 * @param {object} config - { recordingSource, keyMappings }
 */
function updateDeviceConfig(config) {
  console.log('[Main] updateDeviceConfig received:', config)

  // recordingSource 可能是 'mouse' 或 'computer'，需要用 !== undefined 判断
  if (config.recordingSource !== undefined) {
    deviceConfig.recordingSource = config.recordingSource
    console.log('[Main] recordingSource updated to:', config.recordingSource)
  }
  if (config.keyMappings) {
    deviceConfig.keyMappings = { ...deviceConfig.keyMappings, ...config.keyMappings }
  }
  console.log('[Main] Device config updated:', deviceConfig)
}

/**
 * 主进程处理按键事件
 * 根据按键类型和配置触发对应业务
 * 只处理语音键和 AI 键，其他按键直接忽略
 * @param {string} deviceId - 设备ID
 * @param {number} index - 按键索引
 * @param {number} status - 按键状态 (1: 按下, 0: 松开)
 */
function handleKeyEventInMain(deviceId, index, status) {
  // 只处理语音键和 AI 键，其他按键直接忽略
  const validKeyIndexes = [
    KEY_INDEX.VOICE_CLICK, // 100
    KEY_INDEX.VOICE_LONG_PRESS, // 102
    KEY_INDEX.AI_CLICK, // 96
    KEY_INDEX.AI_LONG_PRESS // 97
  ]

  if (!validKeyIndexes.includes(index)) {
    // 不是语音键或 AI 键，直接返回，不做任何处理
    return
  }

  console.log('[Main] handleKeyEventInMain:', { deviceId, index, status, config: deviceConfig })

  // 获取按键对应的业务模式
  const businessMode = deviceConfig.keyMappings[index]
  if (!businessMode) {
    console.log('[Main] No business mode configured for key:', index)
    return
  }

  const isClickKey = index === KEY_INDEX.VOICE_CLICK || index === KEY_INDEX.AI_CLICK
  const isLongPressKey = index === KEY_INDEX.VOICE_LONG_PRESS || index === KEY_INDEX.AI_LONG_PRESS

  // 单击按键：按下时 toggle
  if (isClickKey && status === KEY_STATUS.PRESSED) {
    if (currentRecordingState.isRecording) {
      // 正在录音，停止（不管是哪个按键触发的）
      console.log('[Main] 单击停止录音')
      stopRecording()
    } else {
      // 未录音，开始
      startRecording(deviceId, index, businessMode)
    }
    return
  }

  // 长按按键：按下开始，松开停止
  if (isLongPressKey) {
    if (status === KEY_STATUS.PRESSED) {
      if (!currentRecordingState.isRecording) {
        startRecording(deviceId, index, businessMode)
      }
    } else if (status === KEY_STATUS.RELEASED) {
      // 长按松开，如果是长按触发的录音则停止
      if (currentRecordingState.isRecording && currentRecordingState.keyIndex === index) {
        stopRecording()
      }
    }
  }
}

/**
 * 开始录音
 */
function startRecording(deviceId, keyIndex, businessMode) {
  console.log('[Main] startRecording:', {
    deviceId,
    keyIndex,
    businessMode,
    recordingSource: deviceConfig.recordingSource
  })

  // 检查业务是否已实现
  const implementedBusiness = [BUSINESS_MODE.VOICE_TRANSLATE, BUSINESS_MODE.VOICE_INPUT]
  if (!implementedBusiness.includes(businessMode)) {
    console.log('[Main] 业务未实现，跳过:', businessMode)
    return
  }

  // 如果是鼠标录音，启用鼠标麦克风（用 try-catch 保护）
  if (deviceConfig.recordingSource === RECORDING_SOURCE.MOUSE && deviceId) {
    try {
      console.log('[Main] 启用鼠标麦克风')
      const micResult = setDeviceMicrophoneEnable(deviceId, 1)
      if (!micResult) {
        console.error('[Main] 启用鼠标麦克风失败')
        return
      }
    } catch (error) {
      console.error('[Main] 鼠标录音启动异常:', error)
      // 发生异常时尝试禁用麦克风，防止鼠标卡死
      try {
        setDeviceMicrophoneEnable(deviceId, 0)
      } catch {
        /* ignore */
      }
      return
    }
  }

  // 更新状态
  currentRecordingState = {
    isRecording: true,
    businessMode,
    keyIndex,
    deviceId
  }

  // 根据业务模式创建对应窗口
  switch (businessMode) {
    case BUSINESS_MODE.VOICE_TRANSLATE:
      console.log('[Main] 创建语音翻译小窗口')
      createVoiceTranslateWindow()
      break
    case BUSINESS_MODE.VOICE_INPUT:
      console.log('[Main] 创建语音输入小窗口')
      createVoiceInputWindow()
      break
    case BUSINESS_MODE.AI_ASSISTANT:
      console.log('[Main] AI助手 - 待实现')
      // TODO: 创建 AI 助手窗口
      break
  }

  // 通知渲染进程录音开始
  windowManager.broadcast(IPC_CHANNELS.DEVICE.KEY_EVENT, {
    type: 'recording-start',
    businessMode,
    keyIndex,
    recordingSource: deviceConfig.recordingSource
  })
}

/**
 * 停止录音
 */
function stopRecording() {
  console.log('[Main] stopRecording:', currentRecordingState)

  // 如果是鼠标录音，禁用鼠标麦克风（用 try-catch 保护）
  if (deviceConfig.recordingSource === RECORDING_SOURCE.MOUSE && currentRecordingState.deviceId) {
    try {
      console.log('[Main] 禁用鼠标麦克风')
      setDeviceMicrophoneEnable(currentRecordingState.deviceId, 0)
    } catch (error) {
      console.error('[Main] 禁用鼠标麦克风异常:', error)
    }
  }

  // 通知渲染进程录音停止
  windowManager.broadcast(IPC_CHANNELS.DEVICE.KEY_EVENT, {
    type: 'recording-stop',
    businessMode: currentRecordingState.businessMode,
    keyIndex: currentRecordingState.keyIndex
  })

  // 如果是语音翻译，通知小窗口执行粘贴并关闭
  if (currentRecordingState.businessMode === BUSINESS_MODE.VOICE_TRANSLATE) {
    console.log('[Main] 通知语音翻译小窗口执行粘贴并关闭')
    // 发送关闭并粘贴的消息给小窗口
    windowManager.sendTo(MiniWindowType.VOICE_TRANSLATE, 'voice-translate:close-and-paste', {})
  }

  // 如果是语音输入，通知小窗口关闭
  if (currentRecordingState.businessMode === BUSINESS_MODE.VOICE_INPUT) {
    console.log('[Main] 通知语音输入小窗口关闭')
    windowManager.sendTo(MiniWindowType.VOICE_INPUT, 'voice-input:close', {})
  }

  // 重置状态
  currentRecordingState = {
    isRecording: false,
    businessMode: null,
    keyIndex: null,
    deviceId: null
  }
}

/**
 * 注册设备/SDK 相关 IPC
 */
function registerDeviceHandlers() {
  // 初始化 SDK
  initSDK(true)

  // 监听设备连接事件，转发给渲染进程
  addEventListener('deviceConnected', (data) => {
    windowManager.broadcast(IPC_CHANNELS.DEVICE.CONNECTED, data)
  })

  // 监听设备断开事件
  addEventListener('deviceDisconnected', (data) => {
    windowManager.broadcast(IPC_CHANNELS.DEVICE.DISCONNECTED, data)
  })

  // 监听设备消息（包含设备信息更新和按键事件）
  addEventListener('deviceMessage', (data) => {
    const { data: messageData, deviceId } = data

    // 如果是按键事件，在主进程直接处理业务逻辑
    if (messageData && messageData.type === 'deviceKeyEvent') {
      const { index, status } = messageData

      // 主进程处理按键业务（传递 deviceId）
      handleKeyEventInMain(deviceId, index, status)

      // 同时转发给渲染进程（用于 UI 更新等）
      windowManager.broadcast(IPC_CHANNELS.DEVICE.KEY_EVENT, {
        deviceId: deviceId,
        index: messageData.index,
        status: messageData.status
      })
    }

    // 所有消息都转发
    windowManager.broadcast(IPC_CHANNELS.DEVICE.MESSAGE, data)
  })

  // 监听设备音频数据，转发给渲染进程
  addEventListener('deviceAudioData', (data) => {
    windowManager.broadcast(IPC_CHANNELS.DEVICE.AUDIO_DATA, data)
  })

  // 获取厂商ID（同步方法）
  ipcMain.handle(IPC_CHANNELS.DEVICE.GET_VENDOR_ID, (event, deviceId) => {
    const vendorId = getDeviceVendorId(deviceId)
    // 更新设备缓存
    if (vendorId) {
      updateDeviceVendorId(deviceId, vendorId)
    }
    return vendorId
  })

  // 获取当前设备状态（用于刷新后恢复）
  ipcMain.handle(IPC_CHANNELS.DEVICE.GET_CURRENT_STATE, () => {
    return getCurrentDeviceState()
  })

  // 设置设备麦克风启用状态
  ipcMain.handle(IPC_CHANNELS.DEVICE.SET_MIC_ENABLE, (event, { deviceId, enable }) => {
    return setDeviceMicrophoneEnable(deviceId, enable)
  })

  // 获取设备音频启用状态
  ipcMain.handle(IPC_CHANNELS.DEVICE.GET_AUDIO_ENABLE, (event, deviceId) => {
    return getAudioEnable(deviceId)
  })

  // 同步设备配置（录音源、按键映射）
  ipcMain.on(IPC_CHANNELS.DEVICE.SYNC_CONFIG, (event, config) => {
    updateDeviceConfig(config)
  })

  // 获取设备配置
  ipcMain.handle(IPC_CHANNELS.DEVICE.GET_CONFIG, () => {
    return deviceConfig
  })
}

/**
 * 注册加密相关 IPC
 */
function registerCryptoHandlers() {
  // 生成加密的 open_id
  ipcMain.handle(IPC_CHANNELS.CRYPTO.GENERATE_OPEN_ID, (event, data) => {
    return generateOpenId(data)
  })
}

/**
 * 注册更新相关 IPC
 */
function registerUpdaterHandlers() {
  // 检查更新
  ipcMain.handle(IPC_CHANNELS.UPDATER.CHECK, async () => {
    return await checkForUpdate()
  })

  // 下载更新
  ipcMain.on(IPC_CHANNELS.UPDATER.DOWNLOAD, () => {
    downloadUpdate()
  })

  // 退出并安装
  ipcMain.on(IPC_CHANNELS.UPDATER.QUIT_AND_INSTALL, () => {
    quitAndInstall()
  })
}

/**
 * 注册剪贴板相关 IPC
 */
function registerClipboardHandlers() {
  // 写入文本到剪贴板
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD.WRITE_TEXT, (event, text) => {
    try {
      clipboard.writeText(text)
      console.log('[Main] 写入剪贴板成功:', text.substring(0, 50) + '...')
      return true
    } catch (error) {
      console.error('[Main] 写入剪贴板失败:', error)
      return false
    }
  })

  // 执行粘贴操作（模拟 Ctrl+V / Cmd+V）
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD.PASTE, async () => {
    return simulatePaste()
  })

  // 删除指定数量字符（模拟退格键）
  ipcMain.handle(IPC_CHANNELS.CLIPBOARD.DELETE_CHARS, async (event, count) => {
    console.log('[Main] ====== 收到删除请求 ======')
    console.log('[Main] 请求删除字符数:', count)
    return simulateBackspace(count)
  })
}

// ==================== 模拟粘贴操作 ====================

/**
 * 跨平台模拟 Ctrl+V 粘贴操作
 * Windows: 使用 PowerShell SendKeys
 * macOS: 使用 AppleScript
 * Linux: 使用 xdotool
 * @returns {Promise<boolean>}
 */
function simulatePaste() {
  return new Promise((resolve) => {
    const platform = process.platform

    if (platform === 'win32') {
      // Windows: 使用 PowerShell 的 SendKeys
      const psScript = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`
      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`,
        (error, stdout, stderr) => {
          if (error) {
            console.error('[Main] 粘贴执行失败:', error)
            console.error('[Main] stderr:', stderr)
          } else {
            console.log('[Main] 粘贴执行成功')
          }
          resolve(true)
        }
      )
    } else if (platform === 'darwin') {
      // macOS: 使用 AppleScript 模拟 Command+V
      const appleScript = `tell application "System Events" to keystroke "v" using command down`
      exec(`osascript -e '${appleScript}'`, (error, stdout, stderr) => {
        if (error) {
          console.error('[Main] 粘贴执行失败:', error)
          console.error('[Main] stderr:', stderr)
        } else {
          console.log('[Main] 粘贴执行成功')
        }
        resolve(true)
      })
    } else {
      // Linux: 使用 xdotool
      exec('xdotool key ctrl+v', (error, stdout, stderr) => {
        if (error) {
          console.error('[Main] 粘贴执行失败:', error)
          console.error('[Main] stderr:', stderr)
        } else {
          console.log('[Main] 粘贴执行成功')
        }
        resolve(true)
      })
    }
  })
}

/**
 * 跨平台模拟退格键删除字符
 * @param {number} count - 要删除的字符数量
 * @returns {Promise<boolean>}
 */
function simulateBackspace(count) {
  return new Promise((resolve) => {
    if (!count || count <= 0) {
      console.log('[Main] 删除字符数无效:', count)
      resolve(true)
      return
    }

    console.log('[Main] 开始执行退格，删除字符数:', count)
    const platform = process.platform

    if (platform === 'win32') {
      // Windows: 使用 PowerShell 的 SendKeys
      // 生成多个 {BS} 来确保正确执行
      const bsKeys = '{BS}'.repeat(count)
      const psScript = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${bsKeys}')`
      console.log('[Main] PowerShell 命令:', psScript)

      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`,
        (error, stdout, stderr) => {
          if (error) {
            console.error('[Main] 退格执行失败:', error)
            console.error('[Main] stderr:', stderr)
          } else {
            console.log('[Main] 退格执行成功, 删除字符数:', count)
          }
          resolve(true)
        }
      )
    } else if (platform === 'darwin') {
      // macOS: 使用 AppleScript 模拟退格键
      const appleScript = `tell application "System Events" to key code 51 repeat ${count} times`
      exec(`osascript -e '${appleScript}'`, (error, stdout, stderr) => {
        if (error) {
          console.error('[Main] 退格执行失败:', error)
          console.error('[Main] stderr:', stderr)
        } else {
          console.log('[Main] 退格执行成功, 删除字符数:', count)
        }
        resolve(true)
      })
    } else {
      // Linux: 使用 xdotool
      const keys = Array(count).fill('BackSpace').join(' ')
      exec(`xdotool key ${keys}`, (error, stdout, stderr) => {
        if (error) {
          console.error('[Main] 退格执行失败:', error)
          console.error('[Main] stderr:', stderr)
        } else {
          console.log('[Main] 退格执行成功, 删除字符数:', count)
        }
        resolve(true)
      })
    }
  })
}

/**
 * 关闭 SDK
 */
export function shutdownSDK() {
  closeSDK()
}

/**
 * 注册所有 IPC 处理器
 */
export function registerAllHandlers() {
  registerWindowHandlers()
  registerAppHandlers()
  registerThemeHandlers()
  registerDeviceHandlers()
  registerCryptoHandlers()
  registerUpdaterHandlers()
  registerClipboardHandlers()

  // 保留原有的 ping 测试
  ipcMain.on('ping', () => console.log('pong'))
}
