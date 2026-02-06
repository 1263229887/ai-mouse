/**
 * 应用打开服务模块
 * 使用原生 C# 程序调用 Windows Search API 查找并启动应用
 * 支持缓存机制，提升重复启动的速度
 */

import { shell, app } from 'electron'
import { exec, spawn, execFile } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

/**
 * 应用启动路径缓存
 * 结构: { [appName]: { path, shortcutPath, isUWP, timestamp } }
 */
const appPathCache = new Map()

/**
 * 获取 AppLauncher.exe 的路径
 */
function getAppLauncherPath() {
  // 开发环境和生产环境路径不同
  if (app.isPackaged) {
    // 打包后：resources/resources/AppLauncher.exe
    return join(process.resourcesPath, 'resources', 'AppLauncher.exe')
  }
  // 开发环境：项目根目录/resources/AppLauncher.exe
  return join(app.getAppPath(), 'resources', 'AppLauncher.exe')
}

/**
 * 打开本地应用
 * @param {object} options
 * @param {string} options.appName       - 应用显示名（如 QQ）
 * @param {string} options.winExeName    - Windows exe 名（如 QQ.exe）
 * @param {string} options.macAppName    - macOS 应用名（如 QQ.app）
 * @param {string} options.macBundleId   - macOS BundleId
 */
export function openLocalApp({ appName, winExeName, macAppName, macBundleId }) {
  const platform = process.platform
  console.log('[AppLauncher] openLocalApp:', {
    platform,
    appName,
    winExeName,
    macAppName,
    macBundleId
  })

  if (platform === 'win32') {
    return openWindowsApp({ appName, winExeName })
  }

  if (platform === 'darwin') {
    return openMacApp({ appName, macAppName, macBundleId })
  }

  return Promise.resolve({ success: false, error: '不支持的操作系统' })
}

/* ------------------------------------------------------------------ */
/*                              Windows                               */
/* ------------------------------------------------------------------ */

/**
 * 打开 Windows 应用
 * 优先使用缓存的路径，否则调用 C# 原生程序查找并启动
 */
function openWindowsApp({ appName, winExeName }) {
  return new Promise((resolve) => {
    console.log('[AppLauncher][Win] 开始打开应用:', appName)

    // 构建缓存 key（使用 appName）
    const cacheKey = appName.toLowerCase()

    // 检查缓存
    const cached = appPathCache.get(cacheKey)
    if (cached) {
      console.log('[AppLauncher][Win] 命中缓存:', cached)
      launchFromCache(cached, resolve)
      return
    }

    // 未命中缓存，使用 C# 程序查找并启动
    console.log('[AppLauncher][Win] 未命中缓存，调用原生程序查找')
    launchWithNativeSearch(appName, winExeName, cacheKey, resolve)
  })
}

/**
 * 从缓存启动应用
 */
function launchFromCache(cached, resolve) {
  const { path, shortcutPath, isUWP } = cached

  try {
    if (isUWP) {
      // UWP 应用使用 explorer.exe 启动
      const child = spawn('explorer.exe', [`shell:AppsFolder\\${shortcutPath}`], {
        detached: true,
        stdio: 'ignore',
        shell: false
      })
      child.unref()
      console.log('[AppLauncher][Win] 缓存启动 UWP 应用成功')
      resolve({ success: true, message: '好的，已为你启动该应用。' })
    } else {
      // 传统应用使用 shell.openPath 或直接启动快捷方式
      const launchPath = shortcutPath || path
      if (launchPath.endsWith('.lnk')) {
        // 快捷方式直接用 shell.openPath
        shell.openPath(launchPath).then((error) => {
          if (error) {
            console.log('[AppLauncher][Win] 缓存启动失败:', error)
            resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
          } else {
            console.log('[AppLauncher][Win] 缓存启动快捷方式成功')
            resolve({ success: true, message: '好的，已为你启动该应用。' })
          }
        })
      } else {
        // exe 路径
        shell.openPath(launchPath).then((error) => {
          if (error) {
            // 尝试 spawn
            try {
              const child = spawn(launchPath, [], {
                detached: true,
                stdio: 'ignore',
                shell: true
              })
              child.unref()
              console.log('[AppLauncher][Win] 缓存 spawn 启动成功')
              resolve({ success: true, message: '好的，已为你启动该应用。' })
            } catch (spawnErr) {
              console.log('[AppLauncher][Win] 缓存启动失败:', spawnErr.message)
              resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
            }
          } else {
            console.log('[AppLauncher][Win] 缓存启动 exe 成功')
            resolve({ success: true, message: '好的，已为你启动该应用。' })
          }
        })
      }
    }
  } catch (err) {
    console.log('[AppLauncher][Win] 缓存启动异常:', err.message)
    resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
  }
}

/**
 * 使用原生 C# 程序查找并启动应用
 */
function launchWithNativeSearch(appName, winExeName, cacheKey, resolve) {
  const launcherPath = getAppLauncherPath()
  console.log('[AppLauncher][Win] AppLauncher 路径:', launcherPath)

  if (!existsSync(launcherPath)) {
    console.log('[AppLauncher][Win] AppLauncher.exe 不存在')
    resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
    return
  }

  // 构建搜索关键词：优先使用中文名，其次使用 exe 名称的英文部分
  const searchTerms = [appName]
  if (winExeName) {
    const exeNames = winExeName
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    for (const exe of exeNames) {
      const englishName = exe
        .replace(/\.exe$/i, '')
        .replace(/(Launcher|Updater|Client|Desktop|Scheme)$/i, '')
      if (englishName && englishName.length >= 2 && !searchTerms.includes(englishName)) {
        searchTerms.push(englishName)
      }
    }
  }

  // 依次尝试搜索词
  trySearchTerms(launcherPath, searchTerms, 0, cacheKey, resolve)
}

/**
 * 依次尝试多个搜索词
 */
function trySearchTerms(launcherPath, searchTerms, index, cacheKey, resolve) {
  if (index >= searchTerms.length) {
    console.log('[AppLauncher][Win] 所有搜索词均未找到应用')
    resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
    return
  }

  const searchTerm = searchTerms[index]
  console.log(`[AppLauncher][Win] 尝试搜索词 [${index + 1}/${searchTerms.length}]:`, searchTerm)

  // 调用 C# 程序（不带 --find-only，直接查找并启动）
  execFile(launcherPath, [searchTerm], { timeout: 30000, encoding: 'utf8' }, (error, stdout) => {
    console.log('[AppLauncher][Win] C# 程序输出:', stdout)

    if (error) {
      console.log('[AppLauncher][Win] C# 程序执行错误:', error.message)
      // 尝试下一个搜索词
      trySearchTerms(launcherPath, searchTerms, index + 1, cacheKey, resolve)
      return
    }

    try {
      const result = JSON.parse(stdout.trim())
      if (result.success) {
        console.log('[AppLauncher][Win] C# 程序启动成功:', result)

        // 缓存成功的启动路径
        appPathCache.set(cacheKey, {
          path: result.path,
          shortcutPath: result.shortcutPath,
          isUWP: result.isUWP,
          timestamp: Date.now()
        })
        console.log('[AppLauncher][Win] 已缓存启动路径')

        resolve({
          success: true,
          message: '初次启动该应用可能会有些慢哦，成功后，后续就可以快速启动啦！'
        })
      } else {
        console.log('[AppLauncher][Win] C# 程序未找到:', result.error)
        // 尝试下一个搜索词
        trySearchTerms(launcherPath, searchTerms, index + 1, cacheKey, resolve)
      }
    } catch (parseErr) {
      console.log('[AppLauncher][Win] 解析 C# 输出失败:', parseErr.message, stdout)
      // 尝试下一个搜索词
      trySearchTerms(launcherPath, searchTerms, index + 1, cacheKey, resolve)
    }
  })
}

/* ------------------------------------------------------------------ */
/*                               macOS                                */
/* ------------------------------------------------------------------ */

function openMacApp({ appName, macAppName, macBundleId }) {
  return new Promise((resolve) => {
    let cmd = ''

    // ① BundleId（最稳）
    if (macBundleId) {
      cmd = `open -b "${macBundleId}"`
    }
    // ② 应用名
    else if (macAppName) {
      cmd = `open -a "${macAppName.replace('.app', '')}"`
    } else if (appName) {
      cmd = `open -a "${appName}"`
    }

    if (!cmd) {
      resolve({ success: false, error: '未配置应用信息' })
      return
    }

    console.log('[AppLauncher][Mac] exec:', cmd)

    exec(cmd, { timeout: 5000 }, (err) => {
      if (err) {
        console.log('[AppLauncher][Mac] 打开失败:', err.message)
        resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
      } else {
        resolve({ success: true })
      }
    })
  })
}

/* ------------------------------------------------------------------ */
/*                              Web                                  */
/* ------------------------------------------------------------------ */

export async function openUrl(url) {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (err) {
    console.error('[AppLauncher] openUrl failed:', err)
    return { success: false, error: err.message }
  }
}

/* ------------------------------------------------------------------ */
/*                  是否安装（仅用于弱判断，不用于拦截）              */
/* ------------------------------------------------------------------ */

export function checkAppInstalled() {
  // ⚠️ 不再做强判断，统一交给 openLocalApp
  return Promise.resolve(true)
}
