import { app, shell, BrowserWindow, ipcMain, globalShortcut, clipboard, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'

import icon from '../renderer/src/assets/icon_av.png?asset'
import logger from './logger.js'

// ==================== 窗口引用 ====================
// 主窗口引用
let mainWindow = null
// 弹窗窗口引用（用于打字机效果和翻译效果）
let popupWindow = null

// ==================== 蓝牙设备状态 ====================
// 蓝牙设备名称（Musttrue Pencil）
const BLUETOOTH_DEVICE_NAME = 'Musttrue Pencil'
// 蓝牙连接状态
let bluetoothConnected = false
// 蓝牙设备引用
let bluetoothDevice = null

// ==================== 模式状态管理 ====================
// 当前选中的模式：null-未选择, 'typing'-语音输入, 'translate'-语音翻译
let currentMode = null
// 当前是否正在录音
let isRecording = false
// 源语言 isoCode，默认中文
let sourceIsoCode = 'ZH'
// 目标语言 isoCode，默认英文
let targetIsoCode = 'EN'
// 源语言中文名称
let sourceLangName = '中文'
// 目标语言中文名称
let targetLangName = '英文'

function createWindow() {
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 680,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 主窗口关闭时，同时关闭弹窗
  mainWindow.on('closed', () => {
    // 强制销毁弹窗
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.destroy()
    }
    mainWindow = null
    // 重置状态
    currentMode = null
    isRecording = false
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ==================== 弹窗窗口创建 ====================
/**
 * 创建弹窗窗口（用于AI输入和AI翻译）
 * @param {string} route - Vue Router 路由路径 ('/typing' 或 '/translate')
 * @param {Object} options - 窗口配置选项
 */
function createPopupWindow(route = '/typing', options = {}) {
  // 如果窗口已存在，先关闭
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close()
  }

  // 获取屏幕尺寸，用于计算右下角位置
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  // 根据路由设置不同的窗口尺寸
  const isTranslate = route === '/translate'
  const windowWidth = isTranslate ? 460 : 420
  const initialHeight = isTranslate ? 280 : 240 // 初始高度增大，会动态调整
  const margin = 20
  // 计算最大窗口高度（屏幕可视高度的一半）
  const maxWindowHeight = Math.floor(screenHeight / 2)
  // 翻译窗口往上移动一点，避免被任务栏遮挡
  const bottomOffset = isTranslate ? 40 : 0

  // 创建弹窗窗口
  popupWindow = new BrowserWindow({
    width: windowWidth,
    height: initialHeight,
    // 定位到右下角（翻译窗口稍微上移）
    x: screenWidth - windowWidth - margin,
    y: screenHeight - initialHeight - margin - bottomOffset,
    // 无边框窗口
    frame: false,
    // 透明背景
    transparent: true,
    // 始终置顶
    alwaysOnTop: true,
    // 不在任务栏显示
    skipTaskbar: true,
    // 不可调整大小
    resizable: false,
    // 显示窗口
    show: true,
    // 不获取焦点，保持原来输入框的焦点
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // 允许跨域 WebSocket 连接
      webSecurity: false,
      // 允许运行不安全内容
      allowRunningInsecureContent: true
    },
    ...options
  })

  // 加载弹窗页面，通过 hash 传递路由参数
  // 统一使用 index.html，通过 Vue Router 切换组件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // 开发环境：加载 index.html 并通过 hash 传递路由
    popupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${route}`)
  } else {
    // 生产环境：加载打包后的文件
    popupWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: route
    })
  }

  // 窗口关闭时清理引用
  popupWindow.on('closed', () => {
    popupWindow = null
  })

  // 保存窗口配置信息用于动态调整
  popupWindow.windowConfig = {
    margin,
    bottomOffset,
    maxHeight: maxWindowHeight,
    screenHeight
  }
}

// 允许不安全的WebSocket连接（开发环境）
app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch('allow-insecure-localhost')

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // 初始化日志系统
  const logPath = logger.init()
  logger.info('Main', '应用启动')
  logger.info('Main', '日志文件路径', logPath)

  // 忽略证书错误（允许ws://连接）
  const { session } = require('electron')
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    callback(0) // 0 表示成功
  })

  // 处理权限请求（麦克风等）
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // 允许麦克风和音频权限
    if (permission === 'media' || permission === 'microphone' || permission === 'audio') {
      callback(true)
    } else {
      callback(true) // 允许其他权限
    }
  })

  // 处理权限检查
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    // 允许所有权限检查
    return true
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // ==================== 渲染进程日志处理 ====================
  /**
   * 接收渲染进程发送的日志，写入文件
   */
  ipcMain.on('log-to-file', (event, { level, source, message, data }) => {
    logger.fromRenderer(level, source, message, data)
  })

  /**
   * 获取日志文件路径
   */
  ipcMain.handle('get-log-path', () => {
    return logger.getLogPath()
  })

  // ==================== 蓝牙状态 IPC ====================
  /**
   * 获取蓝牙连接状态
   */
  ipcMain.handle('get-bluetooth-status', () => {
    return {
      connected: bluetoothConnected,
      deviceName: bluetoothDevice ? BLUETOOTH_DEVICE_NAME : null
    }
  })

  /**
   * 更新蓝牙连接状态（由渲染进程调用）
   */
  ipcMain.on('bluetooth-status-changed', (event, { connected, deviceName }) => {
    logger.info('Bluetooth', '蓝牙状态变化', { connected, deviceName })
    bluetoothConnected = connected
    if (!connected) {
      bluetoothDevice = null
    }
    // 通知所有窗口蓝牙状态变化
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bluetooth-connection-changed', { connected, deviceName })
    }
  })

  // ==================== 点击卡片触发AI输入 ====================
  /**
   * 监听渲染进程点击卡片事件
   * 创建打字机窗口
   */
  ipcMain.on('start-ai-input', () => {
    createPopupWindow('/typing')
  })

  // ==================== 弹窗控制 ====================
  /**
   * 关闭弹窗
   */
  ipcMain.on('close-popup', () => {
    logger.info('Main', '收到关闭弹窗请求')
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.destroy()
    }
    // 重置录音状态
    isRecording = false
    // 通知主窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('recording-state-changed', { isRecording: false })
    }
  })

  /**
   * 拖动弹窗
   */
  ipcMain.on('drag-popup', (event, { deltaX, deltaY }) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      const bounds = popupWindow.getBounds()
      popupWindow.setBounds({
        x: bounds.x + deltaX,
        y: bounds.y + deltaY,
        width: bounds.width,
        height: bounds.height
      })
    }
  })

  // ==================== 动态调整窗口高度 ====================
  /**
   * 根据内容高度动态调整弹窗高度
   * 窗口底部位置保持不变，向上扩展
   */
  ipcMain.on('adjust-window-height', (event, { contentHeight }) => {
    if (!popupWindow || popupWindow.isDestroyed()) return

    const config = popupWindow.windowConfig
    if (!config) return

    // 计算新高度，不超过最大高度
    const newHeight = Math.min(contentHeight, config.maxHeight)
    const currentBounds = popupWindow.getBounds()

    // 保持底部位置不变，调整顶部位置
    const bottomY = currentBounds.y + currentBounds.height
    const newY = bottomY - newHeight

    popupWindow.setBounds({
      x: currentBounds.x,
      y: newY,
      width: currentBounds.width,
      height: newHeight
    })

    logger.debug('Main', '调整窗口高度', { contentHeight, newHeight, newY })
  })

  // ==================== 模式选择处理 ====================
  /**
   * 监听渲染进程选择模式事件
   */
  ipcMain.on('select-mode', (event, data) => {
    // 支持新格式 { mode, sourceIsoCode, targetIsoCode, sourceLangName, targetLangName }
    const mode = typeof data === 'object' ? data.mode : data
    const srcCode = typeof data === 'object' ? data.sourceIsoCode : 'ZH'
    const tgtCode = typeof data === 'object' ? data.targetIsoCode : 'EN'
    const srcName = typeof data === 'object' ? data.sourceLangName : '中文'
    const tgtName = typeof data === 'object' ? data.targetLangName : '英文'
    
    logger.info('Main', '选择模式', { mode, sourceIsoCode: srcCode, targetIsoCode: tgtCode, sourceLangName: srcName, targetLangName: tgtName })
    currentMode = mode
    sourceIsoCode = srcCode
    targetIsoCode = tgtCode
    sourceLangName = srcName
    targetLangName = tgtName
    isRecording = false

    // 通知主窗口模式已选中
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mode-selected', { mode })
    }
  })

  /**
   * 监听更新语言事件
   */
  ipcMain.on('update-translate-language', (event, { sourceIsoCode: srcCode, targetIsoCode: tgtCode, sourceLangName: srcName, targetLangName: tgtName }) => {
    logger.info('Main', '更新语言', { sourceIsoCode: srcCode, targetIsoCode: tgtCode, sourceLangName: srcName, targetLangName: tgtName })
    sourceIsoCode = srcCode
    targetIsoCode = tgtCode
    if (srcName) sourceLangName = srcName
    if (tgtName) targetLangName = tgtName
  })

  /**
   * 监听取消模式选择事件
   */
  ipcMain.on('cancel-mode', () => {
    logger.info('Main', '取消模式')
    currentMode = null
    isRecording = false

    // 关闭弹窗
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close()
    }
  })

  // ==================== BLE 录音控制 ====================
  /**
   * 蓝牙笔长按开始录音
   */
  ipcMain.on('ble-recording-start', (event, data) => {
    logger.info('Main', 'BLE 录音开始', data)
    
    if (!currentMode) {
      logger.warn('Main', '未选择模式，忽略录音请求')
      return
    }
    
    isRecording = true
    
    // 更新语言信息
    if (data.sourceIsoCode) sourceIsoCode = data.sourceIsoCode
    if (data.targetIsoCode) targetIsoCode = data.targetIsoCode
    if (data.sourceLangName) sourceLangName = data.sourceLangName
    if (data.targetLangName) targetLangName = data.targetLangName
    
    // 根据模式创建对应窗口
    const route = currentMode === 'typing' ? '/typing' : '/translate'
    createPopupWindow(route)
    
    // 通知主窗口状态变化
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('recording-state-changed', { isRecording: true })
    }
    
    // 统一使用翻译接口的 WebSocket 地址
    const wsUrl = 'ws://chat.danaai.net/asr/speechTranslate'
    
    let extraParams
    if (currentMode === 'translate') {
      // 翻译模式：根据选择的语言设置参数
      extraParams = {
        originalCode: sourceIsoCode,
        sourceLanguage: sourceIsoCode,
        targetLanguage: targetIsoCode,
        openTranslate: true,
        displayDirection: `${sourceLangName} → ${targetLangName}`
      }
    } else {
      // 语音输入模式：使用中文识别，不开启翻译
      extraParams = {
        originalCode: 'ZH',
        sourceLanguage: 'ZH',
        targetLanguage: 'EN',
        openTranslate: false
      }
    }
    
    logger.info('Main', 'WebSocket 地址', { wsUrl, extraParams })
    
    if (popupWindow) {
      const sendMessage = () => {
        if (popupWindow && !popupWindow.isDestroyed()) {
          logger.info('Main', '发送 start-speech-recognition 消息', { wsUrl, extraParams })
          popupWindow.webContents.send('start-speech-recognition', { wsUrl, extraParams })
        }
      }
      
      popupWindow.webContents.once('did-finish-load', () => {
        logger.info('Main', 'popupWindow 加载完成')
        sendMessage()
      })
      
      setTimeout(() => {
        if (popupWindow && !popupWindow.isDestroyed() && !popupWindow.webContents.isLoading()) {
          logger.info('Main', 'popupWindow 延时发送消息')
          sendMessage()
        }
      }, 500)
    }
  })
  
  /**
   * 蓝牙笔松开停止录音
   */
  ipcMain.on('ble-recording-stop', () => {
    logger.info('Main', 'BLE 录音停止')
    isRecording = false
    
    // 通知主窗口状态变化
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('recording-state-changed', { isRecording: false })
    }
    
    // 发送停止录音消息给弹窗
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('stop-speech-recognition')
    }
  })

  // ==================== 打字完成事件处理 ====================
  /**
   * 监听打字机窗口完成事件
   * 完成后：
   * 1. 关闭打字机窗口
   * 2. 将文本写入剪贴板
   * 3. 模拟 Ctrl+V 粘贴操作
   */
  ipcMain.on('typing-complete', (event, text) => {
    console.log('要粘贴的文字:', text)
    // 关闭弹窗窗口
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close()
    }

    // 将文本写入剪贴板
    clipboard.writeText(text)
    console.log('已写入剪贴板')

    // 等待窗口关闭后模拟粘贴（增加延迟确保焦点恢复）
    setTimeout(() => {
      console.log('开始执行粘贴操作...')
      simulatePaste()
    }, 300)
  })

  createWindow()

  // ==================== 蓝牙设备选择处理 ====================
  /**
   * 处理蓝牙设备扫描
   * 自动连接 Musttrue 设备，超时后提示用户
   */
  let scanEventCount = 0
  let scanTimeoutTimer = null
  
  // 清理扫描状态
  const clearScanState = () => {
    if (scanTimeoutTimer) {
      clearTimeout(scanTimeoutTimer)
      scanTimeoutTimer = null
    }
  }
  
  mainWindow.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault()
    scanEventCount++
    
    logger.info('Bluetooth', `=== 扫描事件 #${scanEventCount} ===`)
    logger.info('Bluetooth', `扫描到设备数量: ${devices.length}`)
    
    const namedDevices = devices.filter(d => d.deviceName && !d.deviceName.includes('未知或不支持'))
    logger.info('Bluetooth', `有名称设备: ${namedDevices.map(d => d.deviceName).join(', ') || '无'}`)
    
    // 查找 Musttrue 设备
    const musttrueDevice = devices.find(d => d.deviceName && d.deviceName.includes('Musttrue'))
    if (musttrueDevice) {
      logger.info('Bluetooth', `✅ 找到 Musttrue 设备: ${musttrueDevice.deviceName}`)
      clearScanState()
      callback(musttrueDevice.deviceId)
      return
    }
    
    // 设置超时，10秒后提示用户可能被电脑占用
    if (!scanTimeoutTimer) {
      scanTimeoutTimer = setTimeout(() => {
        const { dialog } = require('electron')
        clearScanState()
        logger.info('Bluetooth', '扫描超时，未找到设备')
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: '连接失败',
          message: '未找到蓝牙笔\n\n可能原因：\n• 蓝牙笔已被电脑自动连接\n• 蓝牙笔未开机\n\n请在电脑蓝牙设置中删除或断开该设备后重试',
          buttons: ['确定']
        })
        callback('')
      }, 10000)
    }
  })

  // Ctrl+Shift+T: 打开日志文件夹
  globalShortcut.register('Ctrl+Shift+T', () => {
    const logDir = logger.getLogDir()
    logger.info('Main', '快捷键 Ctrl+Shift+T 被按下，打开日志文件夹', logDir)
    if (logDir) {
      shell.openPath(logDir)
    }
  })
  logger.info('Main', '快捷键 Ctrl+Shift+T 已注册')

  // Ctrl+Shift+D: 打印调试日志
  globalShortcut.register('Ctrl+Shift+D', () => {
    const debugInfo = {
      mainWindowExists: mainWindow !== null && !mainWindow?.isDestroyed(),
      popupWindowExists: popupWindow !== null && !popupWindow?.isDestroyed(),
      allWindowsCount: BrowserWindow.getAllWindows().length,
      popupIsLoading:
        popupWindow && !popupWindow.isDestroyed() ? popupWindow.webContents.isLoading() : 'N/A',
      popupURL:
        popupWindow && !popupWindow.isDestroyed() ? popupWindow.webContents.getURL() : 'N/A',
      logPath: logger.getLogPath()
    }

    logger.info('Main', '========== 调试信息 ==========')
    logger.info('Main', '主窗口存在', debugInfo.mainWindowExists)
    logger.info('Main', '弹窗存在', debugInfo.popupWindowExists)
    logger.info('Main', '所有窗口数量', debugInfo.allWindowsCount)
    logger.info('Main', '弹窗加载中', debugInfo.popupIsLoading)
    logger.info('Main', '弹窗URL', debugInfo.popupURL)
    logger.info('Main', '日志文件路径', debugInfo.logPath)
    logger.info('Main', '当前模式', currentMode)
    logger.info('Main', '是否录音中', isRecording)
    logger.info('Main', '================================')

    // 也发送到渲染进程显示，包含日志路径
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.webContents.send('debug-log', {
        message: '调试日志已写入文件',
        logPath: debugInfo.logPath
      })
    }
  })
  logger.info('Main', '快捷键 Ctrl+Shift+D 已注册')

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出时注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  logger.info('Main', '应用退出，已清理资源')
})

// ==================== 模拟粘贴操作 ====================
/**
 * 跨平台模拟 Ctrl+V 粘贴操作
 * Windows: 使用 PowerShell SendKeys
 * macOS: 使用 AppleScript
 * Linux: 使用 xdotool
 */
function simulatePaste() {
  const platform = process.platform

  if (platform === 'win32') {
    // Windows: 使用 PowerShell 的 SendKeys
    const psScript = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')`
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`, handleExecResult)
  } else if (platform === 'darwin') {
    // macOS: 使用 AppleScript 模拟 Command+V
    const appleScript = `tell application "System Events" to keystroke "v" using command down`
    exec(`osascript -e '${appleScript}'`, handleExecResult)
  } else {
    // Linux: 使用 xdotool
    exec('xdotool key ctrl+v', handleExecResult)
  }
}

/**
 * 处理 exec 命令执行结果
 */
function handleExecResult(error, stdout, stderr) {
  if (error) {
    console.error('模拟粘贴失败:', error.message)
    if (stderr) console.error('stderr:', stderr)
  } else {
    console.log('模拟粘贴成功')
  }
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
