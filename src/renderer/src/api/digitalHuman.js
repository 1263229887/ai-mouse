/**
 * 数字人后管 API
 * 用于获取 AI 语音助手的人设配置和应用映射
 */

import { useAuthStore } from '@/stores'

// 数字人后管基础URL
const BASE_URL = import.meta.env.VITE_DIGITAL_HUMAN_BASE_URL

/**
 * 创建带 x-access-token 的请求头
 * @returns {Headers}
 */
function createHeaders() {
  const authStore = useAuthStore()
  const headers = new Headers({
    'Content-Type': 'application/json'
  })
  if (authStore.token) {
    headers.set('x-access-token', authStore.token)
  }
  return headers
}

/**
 * 获取场景列表
 * @returns {Promise<Array>} 场景列表
 */
export async function getSceneList() {
  const url = `${BASE_URL}/scene/page?column=createTime&order=desc&pageNo=1&pageSize=999`

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders()
  })

  if (!response.ok) {
    throw new Error(`获取场景列表失败: ${response.status}`)
  }

  const result = await response.json()

  if (result.success && result.data?.records) {
    return result.data.records
  }

  throw new Error(result.message || '获取场景列表失败')
}

/**
 * 根据ID获取助手人设详情
 * @param {string} id - 助手人设ID
 * @returns {Promise<Object>} 助手人设详情
 */
export async function getCharacterSettingById(id) {
  const url = `${BASE_URL}/instructCharacterSetting/queryByIdV1?_t=${Date.now()}&id=${id}`

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders()
  })

  if (!response.ok) {
    throw new Error(`获取助手人设详情失败: ${response.status}`)
  }

  const result = await response.json()

  if (result.success && result.data) {
    return result.data
  }

  throw new Error(result.message || '获取助手人设详情失败')
}

/**
 * 获取应用映射列表
 * @returns {Promise<Array>} 应用映射列表
 */
export async function getInstructMappingList() {
  const url = `${BASE_URL}/instructMapping/list?pageNo=1&pageSize=999`

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders()
  })

  if (!response.ok) {
    throw new Error(`获取应用映射列表失败: ${response.status}`)
  }

  const result = await response.json()

  if (result.success && result.data) {
    return result.data
  }

  throw new Error(result.message || '获取应用映射列表失败')
}

/**
 * 获取 AI 语音助手配置
 * 根据场景ID获取关联的助手人设信息
 * @returns {Promise<{systemPrompt: string, sceneId: string, prologue: string, associationInstruct: string, enableWebSearch: number}>}
 */
export async function getAIAssistantConfig() {
  // 从环境变量获取场景ID
  const targetSceneId = import.meta.env.VITE_AI_ASSISTANT_SCENE_ID

  if (!targetSceneId) {
    throw new Error('未配置 AI 语音助手场景ID (VITE_AI_ASSISTANT_SCENE_ID)')
  }

  console.log('[DigitalHuman] 开始获取 AI 助手配置，场景ID:', targetSceneId)

  // 获取场景列表
  const sceneList = await getSceneList()

  // 根据场景ID找到对应的场景
  const targetScene = sceneList.find((scene) => scene.id === targetSceneId)

  if (!targetScene) {
    throw new Error(`未找到场景ID为 ${targetSceneId} 的场景`)
  }

  console.log('[DigitalHuman] 找到目标场景:', targetScene.name)

  // 获取场景关联的助手人设ID列表
  const relationList = targetScene.relationCharacterSettingList || []

  if (relationList.length === 0) {
    throw new Error(`场景 ${targetScene.name} 未关联任何助手人设`)
  }

  // 取第一个关联的助手人设ID
  const targetCharacterId = relationList[0].id
  console.log('[DigitalHuman] 目标助手人设ID:', targetCharacterId, '名称:', relationList[0].name)

  // 通过ID直接获取助手人设详情
  const targetCharacter = await getCharacterSettingById(targetCharacterId)

  console.log('[DigitalHuman] 获取助手人设配置:', targetCharacter.name)

  return {
    systemPrompt: targetCharacter.characterDesign || '',
    sceneId: targetCharacter.id,
    prologue: targetCharacter.prologue || '',
    associationInstruct: targetCharacter.associationInstruct || '',
    enableWebSearch: targetCharacter.enableWebSearch ?? 1
  }
}
