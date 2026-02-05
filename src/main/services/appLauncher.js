/**
 * 应用打开服务模块（生产级）
 * 核心原则：能拉起即成功，不做脆弱的"是否安装"预判
 */

import { shell } from 'electron'
import { exec, spawn } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname, basename } from 'path'

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

    // 方式1：通过注册表查找应用安装路径
    findAppInRegistry(appName, winExeName)
      .then((exePath) => {
        if (exePath) {
          console.log('[AppLauncher][Win] 找到应用路径:', exePath)
          // 使用 shell.openPath 启动应用（更可靠，支持各种类型的 exe）
          shell.openPath(exePath).then((error) => {
            if (error) {
              console.log('[AppLauncher][Win] shell.openPath 失败:', error)
              // 尝试用 spawn 作为后备
              try {
                const child = spawn(exePath, [], {
                  detached: true,
                  stdio: 'ignore',
                  shell: true // 使用 shell 模式
                })
                child.unref()
                console.log('[AppLauncher][Win] spawn 启动成功')
                resolve({ success: true })
              } catch (spawnError) {
                console.log('[AppLauncher][Win] spawn 也失败:', spawnError.message)
                tryStartMenuLaunch(appName, winExeName, resolve)
              }
            } else {
              console.log('[AppLauncher][Win] shell.openPath 启动成功')
              resolve({ success: true })
            }
          })
        } else {
          console.log('[AppLauncher][Win] 注册表未找到，尝试开始菜单方式')
          // 方式2：通过开始菜单应用列表查找
          tryStartMenuLaunch(appName, winExeName, resolve)
        }
      })
      .catch((err) => {
        console.log('[AppLauncher][Win] 查找失败:', err.message)
        // 注册表查找失败，尝试开始菜单方式
        tryStartMenuLaunch(appName, winExeName, resolve)
      })
  })
}

/**
 * 通过开始菜单应用列表查找并启动应用
 * 使用 PowerShell Get-StartApps 命令查询
 */
function tryStartMenuLaunch(appName, winExeName, resolve) {
  console.log('[AppLauncher][Win] 尝试从开始菜单查找:', appName)

  // 构建搜索关键词列表
  const searchNames = [appName]
  if (winExeName) {
    const exeNames = winExeName
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    for (const exe of exeNames) {
      const englishName = exe
        .replace(/\.exe$/i, '')
        .replace(/(Launcher|Updater|Client|Desktop|Scheme)$/i, '')
      if (englishName && englishName.length >= 2 && !searchNames.includes(englishName)) {
        searchNames.push(englishName)
      }
    }
  }

  // 使用 PowerShell 获取开始菜单应用列表
  const psCommand = `Get-StartApps | ConvertTo-Json -Compress`
  exec(
    `powershell -Command "${psCommand}"`,
    { timeout: 10000, encoding: 'utf8' },
    (error, stdout) => {
      if (error || !stdout) {
        console.log('[AppLauncher][Win] Get-StartApps 失败:', error?.message)
        resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
        return
      }

      try {
        const apps = JSON.parse(stdout)
        if (!Array.isArray(apps)) {
          resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
          return
        }

        console.log('[AppLauncher][Win] 开始菜单应用数量:', apps.length)

        // 按搜索关键词顺序查找匹配的应用
        for (const searchName of searchNames) {
          const lowerSearch = searchName.toLowerCase()
          const matchedApp = apps.find((app) => {
            const name = (app.Name || '').toLowerCase()
            return name === lowerSearch || name.includes(lowerSearch)
          })

          if (matchedApp && matchedApp.AppID) {
            console.log('[AppLauncher][Win] 找到开始菜单应用:', matchedApp.Name, matchedApp.AppID)
            // 使用 explorer.exe shell:AppsFolder\{AppID} 启动
            try {
              const child = spawn('explorer.exe', [`shell:AppsFolder\\${matchedApp.AppID}`], {
                detached: true,
                stdio: 'ignore',
                shell: false
              })
              child.unref()
              console.log('[AppLauncher][Win] 通过开始菜单启动成功')
              resolve({ success: true })
              return
            } catch (launchError) {
              console.log('[AppLauncher][Win] 启动失败:', launchError.message)
            }
          }
        }

        console.log('[AppLauncher][Win] 开始菜单中未找到，尝试常见目录搜索')
        // 方式3：在常见安装目录中搜索
        tryCommonPathsSearch(winExeName, resolve)
      } catch (parseError) {
        console.log('[AppLauncher][Win] 解析开始菜单列表失败:', parseError.message)
        tryCommonPathsSearch(winExeName, resolve)
      }
    }
  )
}

/**
 * 在常见安装目录中搜索应用
 * 作为最后的后备方案，搜索 Program Files、AppData 等目录
 */
function tryCommonPathsSearch(winExeName, resolve) {
  if (!winExeName) {
    resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
    return
  }

  const exeNames = winExeName
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
  if (exeNames.length === 0) {
    resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
    return
  }

  console.log('[AppLauncher][Win] 尝试在常见目录中搜索:', exeNames)

  // 常见安装目录
  const userProfile = process.env.USERPROFILE || ''
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const localAppData = process.env.LOCALAPPDATA || `${userProfile}\\AppData\\Local`
  const roamingAppData = process.env.APPDATA || `${userProfile}\\AppData\\Roaming`

  // 构建搜索路径：基于 exe 名称推断可能的安装目录
  const searchPaths = []
  for (const exe of exeNames) {
    const appDirName = exe
      .replace(/\.exe$/i, '')
      .replace(/(Launcher|Updater|Client|Desktop|Scheme)$/i, '')
    if (appDirName && appDirName.length >= 2) {
      // 在各个常见目录下搜索
      searchPaths.push(
        join(programFiles, appDirName, exe),
        join(programFilesX86, appDirName, exe),
        join(localAppData, appDirName, exe),
        join(roamingAppData, appDirName, exe),
        join(localAppData, 'Programs', appDirName, exe),
        // 一些特殊的目录结构
        join(programFiles, appDirName, 'Bin', exe),
        join(programFilesX86, appDirName, 'Bin', exe),
        join(localAppData, appDirName, 'Bin', exe)
      )
    }
  }

  // 遍历搜索路径
  for (const searchPath of searchPaths) {
    console.log('[AppLauncher][Win] 检查路径:', searchPath)
    if (existsSync(searchPath)) {
      console.log('[AppLauncher][Win] 在常见目录找到:', searchPath)
      try {
        const child = spawn(searchPath, [], {
          detached: true,
          stdio: 'ignore',
          shell: false
        })
        child.unref()
        console.log('[AppLauncher][Win] 启动成功')
        resolve({ success: true })
        return
      } catch (err) {
        console.log('[AppLauncher][Win] 启动失败:', err.message)
      }
    }
  }

  console.log('[AppLauncher][Win] 常见目录中未找到应用')
  resolve({ success: false, error: '未找到该应用，请先安装后再使用' })
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

    // 支持逗号分隔的多个 exe 名称
    const exeNames = exeName
      ? exeName
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
      : []
    console.log('[AppLauncher][Win] exe 名称列表:', exeNames)

    // 构建搜索名称列表：中文名 + 所有 exe 的英文名
    // 例如：appName="钉钉", exeNames=["DingtalkLauncher.exe","DingTalkUpdater.exe"]
    // -> 搜索 ["钉钉", "DingtalkLauncher", "DingTalkUpdater", "DingTalk"]
    const searchNames = [appName]
    const addedNames = new Set([appName.toLowerCase()])

    for (const exe of exeNames) {
      const englishName = exe.replace(/\.exe$/i, '')
      if (englishName && !addedNames.has(englishName.toLowerCase())) {
        searchNames.push(englishName)
        addedNames.add(englishName.toLowerCase())
      }
    }

    // 额外添加常见的简化名称（去掉 Launcher/Updater 等后缀）
    for (const exe of exeNames) {
      const baseName = exe.replace(/\.exe$/i, '').replace(/(Launcher|Updater|Client|Desktop)$/i, '')
      if (baseName && baseName.length >= 2 && !addedNames.has(baseName.toLowerCase())) {
        searchNames.push(baseName)
        addedNames.add(baseName.toLowerCase())
      }
    }

    console.log('[AppLauncher][Win] 搜索名称:', searchNames)

    // 串行搜索每个名称
    searchWithNames(registryPaths, searchNames, exeNames, resolve)
  })
}

/**
 * 使用多个名称搜索注册表
 * @param {string[]} registryPaths - 注册表路径列表
 * @param {string[]} searchNames - 搜索名称列表
 * @param {string[]} exeNames - exe 名称列表（支持多个）
 * @param {Function} resolve - Promise resolve
 * @param {number} index - 当前搜索索引
 */
function searchWithNames(registryPaths, searchNames, exeNames, resolve, index = 0) {
  if (index >= searchNames.length) {
    resolve(null)
    return
  }

  const searchName = searchNames[index]

  // 使用 PowerShell 查询注册表，避免中文编码问题
  // 搜索所有 Uninstall 子项，找到包含搜索名称的条目
  const psScript = `
    $ErrorActionPreference = 'SilentlyContinue'
    $paths = @(
      'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )
    $searchName = '${searchName.replace(/'/g, "''")}'
    foreach ($path in $paths) {
      Get-ItemProperty $path | Where-Object { 
        $_.DisplayName -like "*$searchName*" -or $_.PSChildName -like "*$searchName*"
      } | Select-Object DisplayName, DisplayIcon, InstallLocation, UninstallString | ConvertTo-Json -Compress
    }
  `.replace(/\n/g, ' ')

  console.log('[AppLauncher][Win] 执行 PowerShell 注册表搜索:', searchName)

  exec(
    `powershell -Command "${psScript}"`,
    { timeout: 15000, encoding: 'utf8' },
    (error, stdout) => {
      console.log('[AppLauncher][Win] PowerShell 搜索结果长度:', stdout?.length || 0)

      if (stdout && stdout.length > 10) {
        // 可能返回多个 JSON 对象，尝试解析
        const results = []
        const jsonMatches = stdout.match(/\{[^{}]+\}/g) || []
        for (const jsonStr of jsonMatches) {
          try {
            results.push(JSON.parse(jsonStr))
          } catch {
            // 忽略解析失败的
          }
        }

        console.log('[AppLauncher][Win] 找到注册表条目数:', results.length)

        // 从结果中提取 exe 路径
        for (const item of results) {
          const exePath = extractExePathFromRegistryItem(item, exeNames)
          if (exePath) {
            resolve(exePath)
            return
          }
        }
      }

      // 继续搜索下一个名称
      searchWithNames(registryPaths, searchNames, exeNames, resolve, index + 1)
    }
  )
}

/**
 * 从单个注册表条目中提取 exe 路径
 */
function extractExePathFromRegistryItem(item, exeNames) {
  // 尝试从 DisplayIcon 提取
  if (item.DisplayIcon) {
    let iconPath = item.DisplayIcon.replace(/,\d+$/, '').replace(/^"|"$/g, '')
    console.log('[AppLauncher][Win] 检查 DisplayIcon:', iconPath)

    if (iconPath.toLowerCase().endsWith('.exe') && existsSync(iconPath)) {
      const iconExeName = basename(iconPath)
      // 如果是目标 exe 之一，直接返回
      if (exeNames.some((name) => name.toLowerCase() === iconExeName.toLowerCase())) {
        return iconPath
      }
      // 否则在同目录下查找目标 exe
      const iconDir = dirname(iconPath)
      for (const exeName of exeNames) {
        const possiblePath = join(iconDir, exeName)
        if (existsSync(possiblePath)) {
          return possiblePath
        }
      }
    }
  }

  // 尝试从 InstallLocation 提取
  if (item.InstallLocation && exeNames.length > 0) {
    const installPath = item.InstallLocation.replace(/^"|"$/g, '')
    console.log('[AppLauncher][Win] 检查 InstallLocation:', installPath)

    for (const exeName of exeNames) {
      const possiblePaths = [
        join(installPath, exeName),
        join(installPath, 'Bin', exeName),
        join(installPath, 'bin', exeName)
      ]
      for (const p of possiblePaths) {
        if (existsSync(p)) {
          return p
        }
      }
    }
  }

  // 尝试从 UninstallString 提取目录
  if (item.UninstallString && exeNames.length > 0) {
    let uninstallPath = item.UninstallString.replace(/^"|"$/g, '')
    const dir = dirname(uninstallPath)
    console.log('[AppLauncher][Win] 检查 UninstallString 目录:', dir)

    for (const exeName of exeNames) {
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
