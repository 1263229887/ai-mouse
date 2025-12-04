import { app, shell, BrowserWindow, ipcMain, globalShortcut, clipboard, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import { uIOhook, UiohookKey } from 'uiohook-napi'
import icon from '../renderer/src/assets/icon_av.png?asset'

// ==================== 窗口引用 ====================
// 主窗口引用
let mainWindow = null
// 弹窗窗口引用（用于打字机效果和翻译效果）
let popupWindow = null

// ==================== 鼠标中键监听 ====================
// 鼠标中键按下时间
let middleButtonDownTime = null
// 鼠标中键长按检测定时器
let middleButtonTimer = null
// 中键长按阈值（毫秒）
const MIDDLE_BUTTON_HOLD_DURATION = 2000

function createWindow() {
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
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
  const windowHeight = isTranslate ? 220 : 140  // 翻译窗口高度增加
  const margin = 20
  // 翻译窗口往上移动一点，避免被任务栏遮挡
  const bottomOffset = isTranslate ? 40 : 0

  // 创建弹窗窗口
  popupWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    // 定位到右下角（翻译窗口稍微上移）
    x: screenWidth - windowWidth - margin,
    y: screenHeight - windowHeight - margin - bottomOffset,
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
      sandbox: false
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
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
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

  // ==================== 点击卡片触发AI输入 ====================
  /**
   * 监听渲染进程点击卡片事件
   * 创建打字机窗口
   */
  ipcMain.on('start-ai-input', () => {
    createPopupWindow('/typing')
  })

  // ==================== 点击卡片触发AI翻译 ====================
  /**
   * 监听渲染进程点击翻译卡片事件
   * 创建翻译窗口
   */
  ipcMain.on('start-ai-translate', () => {
    createPopupWindow('/translate')
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

  // 注册全局快捷键
  const mainWindow = BrowserWindow.getAllWindows()[0]

  // Ctrl+Shift+Y: 启动语音识别（连接 WebSocket + 开始录音）
  globalShortcut.register('Ctrl+Shift+Y', () => {
    // 通知渲染进程（可选，用于界面反馈）
    mainWindow.webContents.send('trigger-ai-input')
    // 创建打字机窗口，传递 WebSocket 地址
    createPopupWindow('/typing')

    // 窗口加载完成后发送 WebSocket 地址
    if (popupWindow) {
      popupWindow.webContents.once('did-finish-load', () => {
        const wsUrl = 'ws://192.168.80.224:3002/v2/asr'
        popupWindow.webContents.send('start-speech-recognition', { wsUrl })
      })
    }
  })

  // Ctrl+Shift+U: 模拟AI翻译
  globalShortcut.register('Ctrl+Shift+U', () => {
    mainWindow.webContents.send('trigger-ai-translate')
    // 创建翻译窗口
    createPopupWindow('/translate')
  })

  // ==================== 鼠标中键事件监听 ====================
  // 监听鼠标中键按下
  uIOhook.on('mousedown', (e) => {
    // 鼠标中键 = button 2 (1=左键, 2=中键, 3=右键)
    if (e.button === 2) {
      middleButtonDownTime = Date.now()

      // 设置定时器检测长按
      middleButtonTimer = setTimeout(() => {
        console.log('鼠标中键长按 2 秒，触发停止录音')
        // 发送停止录音消息给弹窗
        if (popupWindow && !popupWindow.isDestroyed()) {
          popupWindow.webContents.send('stop-speech-recognition')
        }
      }, MIDDLE_BUTTON_HOLD_DURATION)
    }
  })

  // 监听鼠标中键释放
  uIOhook.on('mouseup', (e) => {
    if (e.button === 2) {
      // 清除定时器
      if (middleButtonTimer) {
        clearTimeout(middleButtonTimer)
        middleButtonTimer = null
      }
      middleButtonDownTime = null
    }
  })

  // 启动鼠标事件监听
  uIOhook.start()
  console.log('鼠标事件监听已启动')

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

// 应用退出时注销所有快捷键和清理资源
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  // 停止鼠标事件监听
  uIOhook.stop()
  console.log('应用退出，已清理资源')
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
