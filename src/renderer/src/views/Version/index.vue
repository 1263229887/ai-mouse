<script setup>
/**
 * Version/index.vue - 版本检测页面
 * 自动检查新版本并提供下载功能
 *
 * 重要：下载完成后不自动安装，而是让用户确认重启
 * 这样可以确保渲染进程完全退出后再启动 NSIS 安装程序
 */

import { ref, onMounted, onUnmounted } from 'vue'

// 状态
const isChecking = ref(false)
const hasUpdate = ref(false)
const currentVersion = ref('')
const newVersion = ref('')
const checkError = ref('')
const isDownloading = ref(false)
const isDownloaded = ref(false)
const downloadProgress = ref(0)

// IPC 监听器引用（用于清理）
let progressListener = null
let downloadedListener = null
let errorListener = null

// 检查更新
const checkForUpdate = async () => {
  isChecking.value = true
  checkError.value = ''
  hasUpdate.value = false
  isDownloaded.value = false

  try {
    const result = await window.api.updater.check()
    console.log('[VersionCheck] 检查更新结果:', result)

    currentVersion.value = result.currentVersion || ''

    if (result.error) {
      checkError.value = result.error
    } else if (result.hasUpdate) {
      hasUpdate.value = true
      newVersion.value = result.newVersion || ''
    }
  } catch (error) {
    console.error('[VersionCheck] 检查更新失败:', error)
    checkError.value = '检查更新失败，请稍后重试'
  } finally {
    isChecking.value = false
  }
}

// 下载更新
const handleDownload = () => {
  isDownloading.value = true
  isDownloaded.value = false
  downloadProgress.value = 0
  window.api.updater.download()
}

// 用户确认重启并安装
const handleRestartAndInstall = () => {
  console.log('[VersionCheck] 用户确认重启并安装')
  window.api.updater.quitAndInstall()
}

// 监听下载进度
onMounted(() => {
  // 进入页面时自动检查更新
  checkForUpdate()

  // 监听下载进度事件
  progressListener = (event, data) => {
    console.log('[VersionCheck] 下载进度:', data)
    downloadProgress.value = Math.round(data.percent || 0)
  }
  window.api.updater.onDownloadProgress(progressListener)

  // 下载完成：只更新状态，不自动触发安装
  downloadedListener = (event, data) => {
    console.log('[VersionCheck] 下载完成:', data)
    isDownloading.value = false
    isDownloaded.value = true
    downloadProgress.value = 100
  }
  window.api.updater.onDownloaded(downloadedListener)

  errorListener = (event, data) => {
    console.log('[VersionCheck] 更新错误:', data)
    isDownloading.value = false
    isDownloaded.value = false
    checkError.value = data.message || '下载更新失败'
  }
  window.api.updater.onError(errorListener)
})

// 组件卸载时移除监听器
onUnmounted(() => {
  if (progressListener) {
    window.api.updater.offDownloadProgress(progressListener)
  }
  if (downloadedListener) {
    window.api.updater.offDownloaded(downloadedListener)
  }
  if (errorListener) {
    window.api.updater.offError(errorListener)
  }
})
</script>

<template>
  <div class="version-container">
    <!-- 加载中状态 -->
    <div v-if="isChecking" class="status-view">
      <div class="loading-spinner"></div>
      <p class="status-text">正在检查更新...</p>
    </div>

    <!-- 检查失败 -->
    <div v-else-if="checkError" class="status-view">
      <h1 class="title">检查更新失败</h1>
      <p class="version-text">版本号V{{ currentVersion }}</p>
      <p class="error-text">{{ checkError }}</p>
      <button class="retry-btn" @click="checkForUpdate">重新检查</button>
    </div>

    <!-- 已是最新版本 -->
    <div v-else-if="!hasUpdate" class="status-view">
      <h1 class="title">已是最新版本</h1>
      <p class="version-text">版本号V{{ currentVersion }}</p>
    </div>

    <!-- 发现新版本 -->
    <div v-else class="status-view">
      <h1 class="title">发现新版本</h1>
      <p class="version-text">版本号V{{ newVersion }}</p>

      <!-- 下载进度 -->
      <div v-if="isDownloading" class="download-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
        </div>
        <p class="progress-text">下载中 {{ downloadProgress }}%</p>
      </div>

      <!-- 下载完成，显示重启更新按钮 -->
      <div v-else-if="isDownloaded" class="downloaded-view">
        <p class="success-text">下载完成，点击下方按钮重启并安装更新</p>
        <button class="restart-btn" @click="handleRestartAndInstall">立即重启并更新</button>
      </div>

      <!-- 立即下载按钮 -->
      <button v-else class="download-btn" :disabled="isDownloading" @click="handleDownload">
        立即下载
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.version-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--bg-color-page);
  transition: background 0.3s ease;
}

.status-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.title {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 clamp(0.5rem, 1vh, 0.75rem);
  transition: color 0.3s ease;
}

.version-text {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.8rem, 1.4vw, 0.875rem);
  color: var(--text-secondary);
  margin: 0;
  transition: color 0.3s ease;
}

.status-text {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.8rem, 1.4vw, 0.875rem);
  color: var(--text-secondary);
  margin: clamp(0.75rem, 1.5vh, 1rem) 0 0;
  transition: color 0.3s ease;
}

.error-text {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.8rem, 1.4vw, 0.875rem);
  color: var(--color-danger);
  margin: clamp(0.25rem, 0.5vh, 0.5rem) 0 clamp(1rem, 2vh, 1.5rem);
  transition: color 0.3s ease;
}

.success-text {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.8rem, 1.4vw, 0.875rem);
  color: var(--color-success);
  margin: 0 0 clamp(1rem, 2vh, 1.5rem);
  transition: color 0.3s ease;
}

// 加载动画
.loading-spinner {
  width: clamp(2rem, 4vw, 2.5rem);
  height: clamp(2rem, 4vw, 2.5rem);
  border: 3px solid var(--border-color-light);
  border-top-color: #8be6b0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  transition: border-color 0.3s ease;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 下载进度
.download-progress {
  width: clamp(12rem, 25vw, 16rem);
  margin-top: clamp(1.5rem, 3vh, 2rem);
}

.progress-bar {
  background: var(--border-color-light);
  border-radius: clamp(0.25rem, 0.5vw, 0.5rem);
  height: clamp(0.4rem, 0.8vh, 0.5rem);
  overflow: hidden;
  transition: background 0.3s ease;
}

.progress-fill {
  height: 100%;
  border-radius: clamp(0.25rem, 0.5vw, 0.5rem);
  background: linear-gradient(270deg, #8be6b0 0%, #27acc2 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.8rem, 1.4vw, 0.875rem);
  color: var(--text-secondary);
  margin: clamp(0.5rem, 1vh, 0.75rem) 0 0;
  text-align: center;
  transition: color 0.3s ease;
}

// 下载完成视图
.downloaded-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: clamp(1.5rem, 3vh, 2rem);
}

// 按钮样式
.download-btn {
  margin-top: clamp(1.5rem, 3vh, 2rem);
  padding: clamp(0.6rem, 1.2vh, 0.75rem) clamp(3rem, 6vw, 4rem);
  background: transparent;
  color: var(--text-primary);
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.8rem, 1.4vw, 0.875rem);
  font-weight: 500;
  border: 1px solid var(--border-color);
  border-radius: clamp(0.375rem, 0.8vw, 0.5rem);
  cursor: pointer;
  transition:
    all 0.2s ease,
    color 0.3s ease,
    background 0.3s ease,
    border-color 0.3s ease;
  user-select: none;

  &:hover {
    background: var(--bg-color-hover);
    border-color: var(--border-color-light);
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.retry-btn {
  padding: clamp(0.4rem, 0.8vh, 0.5rem) clamp(1.25rem, 2.5vw, 1.5rem);
  background: transparent;
  color: var(--text-secondary);
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.75rem, 1.3vw, 0.8125rem);
  border: 1px solid var(--border-color);
  border-radius: clamp(0.3rem, 0.6vw, 0.375rem);
  cursor: pointer;
  transition:
    all 0.2s ease,
    color 0.3s ease,
    background 0.3s ease,
    border-color 0.3s ease;

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-color-light);
  }
}

.restart-btn {
  padding: clamp(0.6rem, 1.2vh, 0.75rem) clamp(2.5rem, 5vw, 3rem);
  background: linear-gradient(270deg, #8be6b0 0%, #27acc2 100%);
  color: #0b0d0f;
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.8rem, 1.4vw, 0.875rem);
  font-weight: 600;
  border: none;
  border-radius: clamp(0.375rem, 0.8vw, 0.5rem);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    opacity: 0.9;
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }
}
</style>
