import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAIAssistantConfig } from '@/api'

/**
 * AI 语音助手配置 Store
 * 管理从数字人后管获取的助手人设配置
 */
export const useAIAssistantStore = defineStore('aiAssistant', () => {
  // 助手人设提示词 (characterDesign)
  const systemPrompt = ref('')

  // 场景ID（助手人设ID）
  const sceneId = ref('')

  // 开场白 (prologue)
  const prologue = ref('')

  // 加载状态
  const isLoading = ref(false)

  // 是否已加载
  const isLoaded = ref(false)

  // 错误信息
  const error = ref('')

  // 是否配置有效
  const isConfigValid = computed(() => isLoaded.value && systemPrompt.value && sceneId.value)

  /**
   * 获取 AI 助手配置
   * 从数字人后管接口获取人设信息
   */
  async function fetchConfig() {
    // 避免重复加载
    if (isLoading.value) {
      console.log('[AIAssistantStore] 正在加载中，跳过')
      return
    }

    isLoading.value = true
    error.value = ''

    try {
      console.log('[AIAssistantStore] 开始获取 AI 助手配置')
      const config = await getAIAssistantConfig()

      systemPrompt.value = config.systemPrompt
      sceneId.value = config.sceneId
      prologue.value = config.prologue
      isLoaded.value = true

      console.log('[AIAssistantStore] AI 助手配置获取成功:', {
        sceneId: sceneId.value,
        prologue: prologue.value ? prologue.value.substring(0, 30) + '...' : '',
        systemPrompt: systemPrompt.value
      })
    } catch (err) {
      console.error('[AIAssistantStore] 获取 AI 助手配置失败:', err)
      error.value = err.message || '获取配置失败'
      // 加载失败时使用默认值
      useDefaultConfig()
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 使用默认配置
   * 当接口获取失败时使用
   */
  function useDefaultConfig() {
    systemPrompt.value =
      '请扮演由大拿(Dana)开发团队所创建的智能助手，名字叫做小拿。无论在何种情况下，你都需要记住自己的身份，但在对话过程中无需特别强调这一点。当前时间为：${date_time} ${weeks}。 \n注意事项：\n1、请使用中文简体进行回复。 \n2、回答时不得使用任何不礼貌不耐烦或冒犯性的语言。\n3、对待用户要始终保持友好和尊重的态度，将用户视为你的主人。 \n4、回复风格应符合人机交互的标准模式，避免过于口语化或非正式的表达方式。'
    sceneId.value = import.meta.env.VITE_AI_ASSISTANT_SCENE_ID || ''
    prologue.value = '我是小拿，你可以参考下面句子试着说'
    isLoaded.value = true
    console.log('[AIAssistantStore] 使用默认配置')
  }

  /**
   * 重置状态
   */
  function reset() {
    systemPrompt.value = ''
    sceneId.value = ''
    prologue.value = ''
    isLoading.value = false
    isLoaded.value = false
    error.value = ''
  }

  return {
    // 状态
    systemPrompt,
    sceneId,
    prologue,
    isLoading,
    isLoaded,
    error,

    // 计算属性
    isConfigValid,

    // 方法
    fetchConfig,
    reset
  }
})
