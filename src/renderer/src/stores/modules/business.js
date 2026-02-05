/**
 * 业务状态 Store
 * 管理全局业务互斥状态，用于：
 * 1. 业务互斥控制（同时只能运行一个业务）
 * 2. 主窗口交互锁定（录音时禁止操作）
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 业务状态 Store
 */
export const useBusinessStore = defineStore('business', () => {
  // ============ 状态 ============

  /**
   * 当前运行的业务模式
   * null 表示无业务运行
   */
  const currentBusiness = ref(null)

  /**
   * 是否正在录音
   */
  const isRecording = ref(false)

  /**
   * 业务开始时间戳
   */
  const businessStartTime = ref(null)

  // ============ 计算属性 ============

  /**
   * 是否有业务正在运行
   */
  const isBusinessRunning = computed(() => currentBusiness.value !== null)

  /**
   * 主窗口是否应该被锁定（禁止交互）
   * 当有业务在运行时，主窗口应该被锁定
   */
  const isMainWindowLocked = computed(() => isBusinessRunning.value)

  /**
   * 获取当前业务的中文名称
   */
  const currentBusinessName = computed(() => {
    switch (currentBusiness.value) {
      case 'ai-assistant':
        return 'AI语音助手'
      case 'voice-input':
        return '语音输入'
      case 'voice-translate':
        return '语音翻译'
      default:
        return ''
    }
  })

  // ============ 方法 ============

  /**
   * 开始业务
   * @param {string} businessMode - 业务模式
   */
  function startBusiness(businessMode) {
    currentBusiness.value = businessMode
    isRecording.value = true
    businessStartTime.value = Date.now()
    console.log('[BusinessStore] 业务开始:', businessMode)
  }

  /**
   * 停止业务
   */
  function stopBusiness() {
    console.log('[BusinessStore] 业务停止:', currentBusiness.value)
    currentBusiness.value = null
    isRecording.value = false
    businessStartTime.value = null
  }

  /**
   * 检查是否可以启动新业务
   * @returns {{ canStart: boolean, reason: string }}
   */
  function canStartBusiness() {
    if (isBusinessRunning.value) {
      return {
        canStart: false,
        reason: `${currentBusinessName.value}正在进行中`
      }
    }
    return {
      canStart: true,
      reason: ''
    }
  }

  /**
   * 重置状态
   */
  function reset() {
    currentBusiness.value = null
    isRecording.value = false
    businessStartTime.value = null
  }

  return {
    // 状态
    currentBusiness,
    isRecording,
    businessStartTime,

    // 计算属性
    isBusinessRunning,
    isMainWindowLocked,
    currentBusinessName,

    // 方法
    startBusiness,
    stopBusiness,
    canStartBusiness,
    reset
  }
})
