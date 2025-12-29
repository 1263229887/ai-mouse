import { app, shell, BrowserWindow, ipcMain, globalShortcut, clipboard, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'

import icon from '../renderer/src/assets/icon_av.png?asset'
import logger from './logger.js'
import mouseSDK from './mouseSDK.js'

// ==================== 窗口引用 ====================
// 主窗口引用
let mainWindow = null
// 弹窗窗口引用（用于打字机效果和翻译效果）
let popupWindow = null

// ==================== 模式状态管理 ====================
// 当前选中的模式：null-未选择, 'typing'-语音输入, 'translate'-语音翻译
let currentMode = null
// 当前是否正在录音（硬件语音键控制）
let isRecording = false
// 鼠标设备是否已连接
let isMouseConnected = false
// 源语言 isoCode，默认中文
let sourceIsoCode = 'ZH'
// 目标语言 isoCode，默认英文
let targetIsoCode = 'EN'
// 源语言中文名称
let sourceLangName = '中文'
// 目标语言中文名称
let targetLangName = '英文'
// 音频数据统计（用于采样日志）
let audioDataCount = 0
// 录音源模式: 'mouse' = 鼠标硬件录音, 'computer' = 电脑麦克风录音
let recordingSource = 'mouse'

function createWindow() {
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
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
    
    // 主窗口显示后，主动同步设备连接状态
    // 解决设备在窗口加载前已连接导致状态不同步的问题
    const status = mouseSDK.getStatus()
    if (status.isConnected) {
      logger.info('Main', '主窗口就绪，同步已连接的设备状态', { deviceId: status.deviceId })
      mainWindow.webContents.send('mouse-connected', { deviceId: status.deviceId, connectionMode: 0 })
    }
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

  // ==================== 初始化AI鼠标SDK ====================
  initMouseSDK()

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

  /**
   * 获取鼠标设备连接状态
   * 解决窗口加载完成前设备已连接导致状态不同步的问题
   * 添加等待和重试逻辑，确保SDK初始化完成后再返回状态
   */
  ipcMain.handle('get-mouse-status', async () => {
    // 等待SDK初始化完成（包括设备枚举）
    if (sdkReadyPromise) {
      await sdkReadyPromise
    }
    
    // 获取当前状态
    let status = mouseSDK.getStatus()
    logger.info('Main', '渲染进程查询鼠标状态', status)
    
    // 如果未连接，尝试多次重试（处理DLL延迟情况）
    if (!status.isConnected || !status.deviceId) {
      // 重试最多3次，每次间隔1秒
      for (let retry = 1; retry <= 3; retry++) {
        logger.info('Main', `设备未连接，等待1秒后重试查询 (${retry}/3)...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        status = mouseSDK.getStatus()
        logger.info('Main', `重试查询鼠标状态 #${retry}`, status)
        
        if (status.isConnected && status.deviceId) {
          break // 连接成功，退出重试
        }
      }
    }
    
    return {
      isConnected: status.isConnected,
      deviceId: status.deviceId
    }
  })

  /**
   * 手动重新连接鼠标设备
   * 用于在连接失败后手动重试
   */
  ipcMain.handle('reconnect-mouse', async () => {
    logger.info('Main', '渲染进程请求重新连接鼠标')
    mouseSDK.reconnectDevice()
    
    // 等待5秒后返回状态
    await new Promise(resolve => setTimeout(resolve, 5000))
    const status = mouseSDK.getStatus()
    logger.info('Main', '重新连接后状态', status)
    
    // 如果连接成功，通知主窗口
    if (status.isConnected && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mouse-connected', { deviceId: status.deviceId, connectionMode: 0 })
    }
    
    return {
      isConnected: status.isConnected,
      deviceId: status.deviceId
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
   * 监听录音源切换事件
   * 在电脑录音和AI鼠标录音之间切换
   */
  ipcMain.on('switch-recording-source', (event, source) => {
    logger.info('Main', '切换录音源', { oldSource: recordingSource, newSource: source })
    recordingSource = source
    
    if (source === 'computer') {
      // 电脑录音模式：禁用SDK默认录音行为
      // 设置语音键为0，让按键事件只触发消息而不录音
      mouseSDK.setVoiceKey(0)
      logger.info('Main', '已禁用SDK默认录音，切换到电脑录音模式')
    } else {
      // 鼠标录音模式：启用SDK录音（4键长按）
      mouseSDK.setVoiceKey(102)
      logger.info('Main', '已启用SDK默认录音，切换到鼠标录音模式')
    }
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

  // Ctrl+Shift+L: 打开日志文件夹
  globalShortcut.register('Ctrl+Shift+T', () => {
    const logDir = logger.getLogDir()
    logger.info('Main', '快捷键 Ctrl+Shift+T 被按下，打开日志文件夹', logDir)
    if (logDir) {
      shell.openPath(logDir)
    }
  })

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

  // ==================== 快捷键已移除，改用硬件4键长按控制录音 ====================
  // 长按式交互：长按住4键启动录音，松开停止录音
  // 监听逻辑在 handleMouseMessage 函数中实现
  // AI键(index=96)改为打开邮箱网址
  logger.info('Main', '录音控制已改用硬件4键长按，AI键(index=96)改为打开邮箱网址')

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

// 标记是否已经在关闭过程中
let isQuitting = false

// 应用退出前，先等待SDK断开回调
app.on('before-quit', async (event) => {
  // 如果已经在关闭过程中，不重复处理
  if (isQuitting) {
    return
  }
  
  // 检查是否有连接的设备
  const status = mouseSDK.getStatus()
  if (!status.isConnected) {
    // 没有连接的设备，直接关闭SDK并退出
    globalShortcut.unregisterAll()
    mouseSDK.closeSDK()
    logger.info('Main', '应用退出，已清理资源（无连接设备）')
    return
  }
  
  // 有连接的设备，阻止默认退出，等待断开回调
  event.preventDefault()
  isQuitting = true
  
  logger.info('Main', '应用退出，等待设备断开回调...', { deviceId: status.deviceId })
  
  // 注销快捷键
  globalShortcut.unregisterAll()
  
  // 异步关闭SDK，等待断开回调
  const success = await mouseSDK.closeSDKAsync(3000)
  
  if (success) {
    logger.info('Main', '应用退出，已收到设备断开回调')
  } else {
    logger.warn('Main', '应用退出，等待断开回调超时')
  }
  
  // 继续退出应用
  app.exit(0)
})

// ==================== 录音控制函数 ====================
/**
 * 启动录音
 * 由硬件4键长按触发
 */
function startRecording() {
  // 确保只有一个窗口，如果窗口已存在且正在录音，跳过
  if (popupWindow && !popupWindow.isDestroyed() && isRecording) {
    logger.info('Main', '录音窗口已存在且正在录音，跳过')
    return
  }
  
  // 如果窗口存在但不在录音状态，先关闭旧窗口
  if (popupWindow && !popupWindow.isDestroyed()) {
    logger.info('Main', '关闭旧的录音窗口')
    popupWindow.destroy()
    popupWindow = null
  }
  
  const useHardware = recordingSource === 'mouse'
  logger.info('Main', '硬件4键长按启动录音', { currentMode, recordingSource, useHardwareRecording: useHardware })
  isRecording = true
  audioDataCount = 0 // 重置音频数据计数

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

  logger.info('Main', 'WebSocket 地址', { wsUrl, extraParams, useHardwareRecording: useHardware })

  if (popupWindow) {
    const sendMessage = () => {
      // 发送前再次检查状态
      if (!isRecording) {
        logger.info('Main', '已停止录音，取消发送启动消息')
        return
      }
      if (popupWindow && !popupWindow.isDestroyed()) {
        const modeText = useHardware ? '鼠标硬件录音' : '电脑麦克风录音'
        logger.info('Main', `发送 start-speech-recognition 消息（${modeText}模式）`, { wsUrl, extraParams })
        popupWindow.webContents.send('start-speech-recognition', { 
          wsUrl, 
          extraParams,
          useHardwareRecording: useHardware // 根据录音源模式设置
        })
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
}

/**
 * 停止录音
 * 由硬件4键松开触发
 */
function stopRecording() {
  // 如果没有在录音，跳过
  if (!isRecording) {
    logger.info('Main', '未在录音，跳过停止')
    return
  }
  
  logger.info('Main', '硬件4键松开停止录音', { audioDataCount })  
  isRecording = false

  // 通知主窗口状态变化
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('recording-state-changed', { isRecording: false })
  }

  // 发送停止录音消息给弹窗
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send('stop-speech-recognition')
  }
}

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

// ==================== AI鼠标SDK初始化 ====================
// SDK初始化完成的Promise，用于等待SDK稳定
let sdkReadyPromise = null
let sdkReadyResolve = null

/**
 * 初始化AI鼠标SDK并设置回调
 */
function initMouseSDK() {
  logger.info('Main', '开始初始化AI鼠标SDK')
  
  // 创建SDK就绪的Promise
  sdkReadyPromise = new Promise((resolve) => {
    sdkReadyResolve = resolve
  })
  
  const success = mouseSDK.initSDK(true)
  if (!success) {
    logger.error('Main', 'AI鼠标SDK初始化失败')
    sdkReadyResolve() // 即使失败也要resolve，避免死锁
    return
  }
  
  // 设备连接回调
  mouseSDK.setOnDeviceConnected((deviceId, connectionMode) => {
    logger.info('Main', 'AI鼠标已连接', { deviceId, connectionMode })
    isMouseConnected = true
    
    // 通知主窗口鼠标已连接
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mouse-connected', { deviceId, connectionMode })
    }
  })
  
  // 设备断开回调
  mouseSDK.setOnDeviceDisconnected((deviceId, connectionMode) => {
    logger.info('Main', 'AI鼠标已断开', { deviceId, connectionMode })
    isMouseConnected = false
    
    // 如果正在录音，停止录音
    if (isRecording) {
      stopRecording()
    }
    
    // 通知主窗口鼠标已断开
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mouse-disconnected', { deviceId, connectionMode })
    }
  })
  
  // 设备消息回调（处理AI键和录音事件）
  mouseSDK.setOnDeviceMessage((deviceId, message) => {
    handleMouseMessage(deviceId, message)
  })
  
  // 设备音频数据回调（处理硬件录音数据）
  mouseSDK.setOnDeviceAudioData((deviceId, audioData, length) => {
    handleDeviceAudioData(deviceId, audioData, length)
  })
  
  logger.info('Main', 'AI鼠标SDK初始化完成，等待DLL设备枚举...')
  
  // DLL内部设备枚举可能需要时间，延迟一段时间让SDK稳定
  // 启动轮询检测，每500ms检查一次，最多检测20次（10秒）
  let checkCount = 0
  const maxChecks = 60 // 增加到 60 次（30秒），解决快速重启问题
  const checkInterval = setInterval(() => {
    checkCount++
    const status = mouseSDK.getStatus()
    
    // 减少日志频率，每5次记录一次
    if (checkCount % 5 === 1 || status.isConnected) {
      logger.info('Main', `SDK设备检测 #${checkCount}`, status)
    }
    
    if (status.isConnected && status.deviceId) {
      // 检测到设备已连接
      logger.info('Main', 'SDK检测到设备已连接', { deviceId: status.deviceId, checkCount })
      isMouseConnected = true
      clearInterval(checkInterval)
      sdkReadyResolve()
      
      // 主动通知渲染进程
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('mouse-connected', { deviceId: status.deviceId, connectionMode: 0 })
      }
    } else if (checkCount >= maxChecks) {
      // 达到最大检测次数，停止检测
      logger.info('Main', 'SDK设备检测完成，未检测到设备')
      clearInterval(checkInterval)
      sdkReadyResolve()
    }
  }, 500)
}

/**
 * 处理设备音频数据
 * 将硬件录音数据转发到渲染进程
 */
function handleDeviceAudioData(deviceId, audioData, length) {
  // 只有在录音中才处理音频数据
  if (!isRecording) {
    return
  }
  
  audioDataCount++
  
  // 采样日志：每50次记录一次，避免高频日志
  if (audioDataCount % 50 === 1) {
    logger.debug('Main', '收到硬件音频数据', { 
      deviceId, 
      length, 
      audioDataCount,
      // 记录前几个字节用于调试
      firstBytes: Array.from(audioData.slice(0, 8))
    })
  }
  
  // 将音频数据转发到渲染进程
  if (popupWindow && !popupWindow.isDestroyed()) {
    // 转换为 ArrayBuffer 发送
    const buffer = Buffer.from(audioData)
    popupWindow.webContents.send('device-audio-data', { 
      data: buffer,
      length: length
    })
  }
}

/**
 * 处理鼠标设备消息
 * 识别AI键的按下事件（打开邮箱网址）
 * 识别录音键事件（index=102）控制录音
 */
function handleMouseMessage(deviceId, message) {
  // 记录所有消息用于调试
  logger.info('Main', '收到鼠标消息', { deviceId, message, messageType: typeof message })
  
  if (typeof message === 'object') {
    const { type, index, status, enabled, access } = message
    
    // 检测AI键单击按下事件 (index=96, status=1)
    // AI键改为打开邮箱网址
    if (type === 'deviceKeyEvent' && index === 96 && status === 1) {
      logger.info('Main', '检测到AI键按下，打开邮箱网址: https://mail.danaai.net/')
      shell.openExternal('https://mail.danaai.net/')
      return
    }
    
    // 检测录音键事件 (index=102)
    // status=1 表示按下开始录音, status=0 表示松开停止录音
    if (type === 'deviceKeyEvent' && index === 102) {
      logger.info('Main', '录音键事件', { index, status })
      if (status === 1) {
        // 检查是否选中了模式
        if (!currentMode) {
          logger.info('Main', '未选择模式，忽略录音启动')
          return
        }
        // 开始录音
        startRecording()
      } else if (status === 0) {
        // 停止录音
        stopRecording()
      }
      return
    }
    
    // 检测 deviceMicrophoneEnable 事件（备用）
    // enabled=true 表示开始录音, enabled=false 表示停止录音
    if (type === 'deviceMicrophoneEnable') {
      logger.info('Main', '麦克风状态变化', { enabled, access })
      if (enabled) {
        // 检查是否选中了模式
        if (!currentMode) {
          logger.info('Main', '未选择模式，忽略录音启动')
          return
        }
        // 开始录音
        startRecording()
      } else {
        // 停止录音
        stopRecording()
      }
      return
    }
    
    // audioEnable 事件 - 记录
    if (type === 'audioEnable') {
      logger.info('Main', '音频启用状态事件', { type, enabled, access })
      return
    }
    
    // 其他按键事件记录
    if (type === 'deviceKeyEvent') {
      logger.info('Main', '按键事件', { index, status })
      return
    }
  }
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
