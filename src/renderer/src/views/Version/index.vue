<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isChecking = ref(false)
const hasUpdate = ref(false)
const currentVersion = ref('')
const newVersion = ref('')
const checkError = ref('')
const isDownloading = ref(false)
const isDownloaded = ref(false)
const downloadProgress = ref(0)

let progressListener = null
let downloadedListener = null
let errorListener = null

const checkForUpdate = async () => {
  isChecking.value = true
  checkError.value = ''
  hasUpdate.value = false
  isDownloaded.value = false
  try {
    const result = await window.api.updater.check()
    currentVersion.value = result.currentVersion || ''
    if (result.error) {
      checkError.value = result.error
    } else if (result.hasUpdate) {
      hasUpdate.value = true
      newVersion.value = result.newVersion || ''
    }
  } catch {
    checkError.value = '检查更新失败，请稍后重试'
  } finally {
    isChecking.value = false
  }
}

const handleDownload = () => {
  isDownloading.value = true
  isDownloaded.value = false
  downloadProgress.value = 0
  window.api.updater.download()
}

const handleRestartAndInstall = () => {
  window.api.updater.quitAndInstall()
}

onMounted(() => {
  checkForUpdate()
  progressListener = (event, data) => {
    downloadProgress.value = Math.round(data.percent || 0)
  }
  window.api.updater.onDownloadProgress(progressListener)

  downloadedListener = () => {
    isDownloading.value = false
    isDownloaded.value = true
    downloadProgress.value = 100
  }
  window.api.updater.onDownloaded(downloadedListener)

  errorListener = (event, data) => {
    isDownloading.value = false
    isDownloaded.value = false
    checkError.value = data.message || '下载更新失败'
  }
  window.api.updater.onError(errorListener)
})

onUnmounted(() => {
  if (progressListener) window.api.updater.offDownloadProgress(progressListener)
  if (downloadedListener) window.api.updater.offDownloaded(downloadedListener)
  if (errorListener) window.api.updater.offError(errorListener)
})
</script>

<template>
  <div class="wh-full f-c-c flex-col">
    <!-- 加载中 -->
    <template v-if="isChecking">
      <div class="loading-spinner"></div>
      <p class="text-14 color-#606C80 mt-16">正在检查更新...</p>
    </template>

    <!-- 检查失败 -->
    <template v-else-if="checkError">
      <h1 class="text-24 color-#fff fw-500 m-0 mb-8">检查更新失败</h1>
      <p class="text-14 color-#606C80 m-0">当前版本V{{ currentVersion }}</p>
      <p class="text-14 color-#ff6b6b m-0 mt-4 mb-16">{{ checkError }}</p>
      <div
        class="w-200 h-40 bg-#fff f-c-c color-#111 mt-48 rd-8 cursor-pointer text-14 hover:bg-opacity-90 hover:color-#1F2937 transition-colors duration-200"
        @click="checkForUpdate"
      >
        重新检查
      </div>
    </template>

    <!-- 已是最新版本 -->
    <template v-else-if="!hasUpdate">
      <h1 class="text-24 color-#fff fw-500 m-0 mb-8">已是最新版本</h1>
      <p class="text-14 color-#606C80 m-0">当前版本V{{ currentVersion }}</p>
    </template>

    <!-- 发现新版本 -->
    <template v-else>
      <h1 class="text-24 color-#fff fw-500 m-0 mb-8">发现新版本V{{ newVersion }}</h1>
      <p class="text-14 color-#606C80 m-0">当前版本V{{ currentVersion }}</p>

      <!-- 下载进度 -->
      <div v-if="isDownloading" class="w-200 mt-24">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
        </div>
        <p class="text-14 color-#606C80 mt-8 text-center m-0">下载中 {{ downloadProgress }}%</p>
      </div>

      <!-- 下载完成 -->
      <div v-else-if="isDownloaded" class="f-c-c flex-col mt-24">
        <p class="text-14 color-#8be6b0 m-0 mb-16">下载完成，点击下方按钮重启并安装更新</p>
        <button class="restart-btn" @click="handleRestartAndInstall">立即重启并更新</button>
      </div>

      <!-- 立即下载按钮 -->
      <div
        v-else
        class="w-200 h-40 bg-#fff f-c-c color-#111 mt-48 rd-8 cursor-pointer text-14 hover:bg-opacity-90 hover:color-#1F2937 transition-colors duration-200"
        :disabled="isDownloading"
        @click="handleDownload"
      >
        立即下载
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #333;
  border-top-color: #8be6b0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.progress-bar {
  background: #333;
  border-radius: 4px;
  height: 6px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(270deg, #8be6b0 0%, #27acc2 100%);
  transition: width 0.3s;
}

.restart-btn {
  padding: 10px 40px;
  background: linear-gradient(270deg, #8be6b0 0%, #27acc2 100%);
  color: #0b0d0f;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    opacity: 0.9;
    transform: scale(1.02);
  }
  &:active {
    transform: scale(0.98);
  }
}
</style>
