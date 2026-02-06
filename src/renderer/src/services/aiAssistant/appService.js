/**
 * 应用打开服务
 * 处理 AI 语音助手的 function_call 打开应用指令
 */

import { useAIAssistantStore } from '@/stores'
import { getAppConfig, hasClientApp, getAppWebUrl } from './appConfig'

/**
 * 处理打开应用的 function_call
 * @param {object} data - function_call 数据
 * @param {string} data.id - 应用 code，如 'open_app_qq'
 * @param {object} data.params - 参数
 * @param {string} data.params.app_name - 应用名称
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function handleOpenApp(data) {
  const { id, params } = data
  const appName = params?.app_name

  console.log('[AppService] 处理打开应用:', { id, appName })

  // 1. 从 store 中查找匹配的应用
  const aiAssistantStore = useAIAssistantStore()
  const appMapping = aiAssistantStore.findAppByCode(id)

  if (!appMapping) {
    console.log('[AppService] 应用不在支持列表中:', id)
    return {
      success: false,
      message: `不支持打开该应用`
    }
  }

  console.log('[AppService] 找到应用映射:', appMapping.name)

  // 2. 获取本地应用配置
  const appConfig = getAppConfig(appName)

  // 3. 判断是否有客户端版本
  const hasClient = appConfig ? appConfig.hasClient : hasClientApp(appName)

  if (hasClient && appConfig) {
    // 有客户端，尝试打开本地应用
    console.log('[AppService] 尝试打开本地应用:', appName, appConfig)
    const result = await window.api?.appLauncher?.openApp({
      appName,
      winExeName: appConfig.winExeName,
      macAppName: appConfig.macAppName,
      macBundleId: appConfig.macBundleId
    })
    console.log('[AppService] IPC 返回结果:', result)

    if (result?.success) {
      // 优先使用 IPC 返回的 message（支持缓存命中/首次启动等不同提示）
      return {
        success: true,
        message: result.message || appMapping.successPrompt || '好的'
      }
    } else {
      // 打开失败，使用接口返回的异常提示
      return {
        success: false,
        message: appMapping.exceptionPrompt || result?.error || '未找到该应用，请先安装后再使用'
      }
    }
  } else {
    // 无客户端，打开网页
    const webUrl = appConfig?.webUrl || getAppWebUrl(appName) || appMapping.url

    if (webUrl) {
      console.log('[AppService] 打开网页:', webUrl)
      const result = await window.api?.appLauncher?.openUrl(webUrl)

      if (result?.success) {
        return {
          success: true,
          message: appMapping.successPrompt || '好的，已为您打开网页'
        }
      } else {
        return {
          success: false,
          message: '打开网页失败'
        }
      }
    } else {
      return {
        success: false,
        message: '未找到该应用的网页地址'
      }
    }
  }
}

/**
 * 处理 function_call 消息
 * 根据 action 分发到不同的处理函数
 * @param {object} data - function_call 数据
 * @returns {Promise<{success: boolean, message: string}|null>}
 */
export async function handleFunctionCall(data) {
  const { type, target, action } = data

  // 确认是 function_call 类型
  if (type !== 'function_call') {
    return null
  }

  console.log('[AppService] 处理 function_call:', { target, action })

  // 根据 target 和 action 分发处理
  if (target === 'app' && action === 'open_app') {
    return await handleOpenApp(data)
  }

  // 未知的 function_call
  console.log('[AppService] 未知的 function_call:', { target, action })
  return null
}
