/**
 * 应用打开服务模块（生产级）
 * 核心原则：能拉起即成功，不做脆弱的"是否安装"预判
 */

import { shell } from 'electron'
import { exec, spawn } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'

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

function openWindowsApp({ appName, winExeName }) {
  return new Promise((resolve) => {
    console.log('[AppLauncher][Win] 开始查找应用:', appName)

    // 通过注册表查找应用安装路径
    findAppInRegistry(appName, winExeName)
      .then((exePath) => {
        if (exePath) {
          console.log('[AppLauncher][Win] 找到应用路径:', exePath)
          // 使用 spawn 启动应用，设置 detached 让应用独立运行
          try {
            const child = spawn(exePath, [], {
              detached: true,
              stdio: 'ignore',
              shell: false
            })
            // 解除父进程对子进程的引用，让子进程独立运行
            child.unref()
            console.log('[AppLauncher][Win] 启动成功')
            resolve({ success: true })
          } catch (error) {
            console.log('[AppLauncher][Win] 启动失败:', error.message)
            resolve({ success: false, error: '启动应用失败' })
          }
        } else {
          console.log('[AppLauncher][Win] 未找到应用')
          resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
        }
      })
      .catch((err) => {
        console.log('[AppLauncher][Win] 查找失败:', err.message)
        resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
      })
  })
}

/**
 * 在注册表中查找应用安装路径
 * 搜索 Uninstall 注册表项，获取 DisplayIcon 或 InstallLocation
 */
function findAppInRegistry(appName, exeName) {
  return new Promise((resolve) => {
    // 要搜索的注册表路径
    const registryPaths = [
      'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
      'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
    ]

    // 同时搜索中文名和英文名（从 exeName 提取）
    // 例如：appName="钉钉", exeName="DingTalk.exe" -> 搜索 "钉钉" 和 "DingTalk"
    const englishName = exeName ? exeName.replace(/\.exe$/i, '') : ''
    const searchNames = [appName]
    if (englishName && englishName.toLowerCase() !== appName.toLowerCase()) {
      searchNames.push(englishName)
    }

    console.log('[AppLauncher][Win] 搜索名称:', searchNames)

    // 串行搜索每个名称
    searchWithNames(registryPaths, searchNames, exeName, resolve)
  })
}

/**
 * 使用多个名称搜索注册表
 */
function searchWithNames(registryPaths, searchNames, exeName, resolve, index = 0) {
  if (index >= searchNames.length) {
    resolve(null)
    return
  }

  const searchName = searchNames[index]
  const searchCmd = `reg query "${registryPaths[0]}" /s /f "${searchName}" 2>nul & reg query "${registryPaths[1]}" /s /f "${searchName}" 2>nul & reg query "${registryPaths[2]}" /s /f "${searchName}" 2>nul`

  console.log('[AppLauncher][Win] 执行注册表搜索:', searchName)

  exec(searchCmd, { timeout: 15000, encoding: 'buffer' }, (error, stdout) => {
    // 将 buffer 转换为字符串，处理中文编码
    let output = ''
    try {
      // 尝试 GBK 编码
      const iconv = require('iconv-lite')
      output = iconv.decode(stdout, 'cp936')
    } catch {
      // 如果没有 iconv-lite，使用默认编码
      output = stdout ? stdout.toString() : ''
    }
    console.log('[AppLauncher][Win] 搜索结果长度:', output.length)

    if (output && output.length >= 10) {
      // 从输出中提取 exe 路径
      const exePath = extractExePathFromRegistry(output, exeName)
      if (exePath) {
        resolve(exePath)
        return
      }
    }

    // 继续搜索下一个名称
    searchWithNames(registryPaths, searchNames, exeName, resolve, index + 1)
  })
}

/**
 * 从注册表查询结果中提取 exe 路径
 */
function extractExePathFromRegistry(output, exeName) {
  // 尝试从 DisplayIcon 提取路径（通常是 exe 路径）
  const displayIconMatch = output.match(/DisplayIcon\s+REG_SZ\s+([^\r\n]+)/i)
  if (displayIconMatch) {
    let iconPath = displayIconMatch[1].trim()
    // 移除可能的图标索引 ",0"
    iconPath = iconPath.replace(/,\d+$/, '')
    // 移除引号
    iconPath = iconPath.replace(/^"|"$/g, '')
    console.log('[AppLauncher][Win] 找到 DisplayIcon:', iconPath)
    if (iconPath.toLowerCase().endsWith('.exe') && existsSync(iconPath)) {
      return iconPath
    }
  }

  // 尝试从 InstallLocation 提取路径
  const installLocMatch = output.match(/InstallLocation\s+REG_SZ\s+([^\r\n]+)/i)
  if (installLocMatch && exeName) {
    let installPath = installLocMatch[1].trim()
    installPath = installPath.replace(/^"|"$/g, '')
    console.log('[AppLauncher][Win] 找到 InstallLocation:', installPath)

    // 在安装目录下查找 exe
    const possiblePaths = [
      join(installPath, exeName),
      join(installPath, 'Bin', exeName),
      join(installPath, 'bin', exeName)
    ]

    for (const p of possiblePaths) {
      console.log('[AppLauncher][Win] 检查路径:', p)
      if (existsSync(p)) {
        return p
      }
    }
  }

  // 尝试从 UninstallString 提取路径
  const uninstallMatch = output.match(/UninstallString\s+REG_SZ\s+([^\r\n]+)/i)
  if (uninstallMatch && exeName) {
    let uninstallPath = uninstallMatch[1].trim()
    uninstallPath = uninstallPath.replace(/^"|"$/g, '')
    // 获取目录
    const dir = dirname(uninstallPath)
    console.log('[AppLauncher][Win] 从 UninstallString 获取目录:', dir)

    const possiblePaths = [
      join(dir, exeName),
      join(dir, '..', exeName),
      join(dir, '..', 'Bin', exeName)
    ]

    for (const p of possiblePaths) {
      if (existsSync(p)) {
        return p
      }
    }
  }

  return null
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
