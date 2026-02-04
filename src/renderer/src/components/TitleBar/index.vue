<script setup>
import { ref, onMounted } from 'vue'

// 检测是否为 macOS（macOS 按钮放左侧）
const isMac = ref(false)

onMounted(() => {
  isMac.value = navigator.platform.toLowerCase().includes('mac')
})

// 窗口控制
function handleMinimize() {
  window.api?.window?.minimize()
}

function handleClose() {
  window.api?.window?.close()
}
</script>

<template>
  <div class="title-bar" :class="{ 'title-bar-mac': isMac }">
    <!-- macOS: 按钮在左侧 -->
    <template v-if="isMac">
      <div class="title-bar-controls mac-controls">
        <button class="mac-btn close-btn" title="关闭" @click="handleClose">
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path
              d="M1 1L7 7M7 1L1 7"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button class="mac-btn minimize-btn" title="最小化" @click="handleMinimize">
          <svg width="8" height="8" viewBox="0 0 8 8">
            <rect x="1" y="3.5" width="6" height="1" fill="currentColor" />
          </svg>
        </button>
      </div>
      <div class="title-bar-drag"></div>
    </template>
    <!-- Windows: 品牌名在左侧，按钮在右侧 -->
    <template v-else>
      <div class="title-bar-left">
        <span class="brand-name">DanaID</span>
      </div>
      <div class="title-bar-drag"></div>
      <div class="title-bar-controls win-controls">
        <button class="win-btn minimize-btn" title="最小化" @click="handleMinimize">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button class="win-btn close-btn" title="关闭" @click="handleClose">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.title-bar {
  width: 100%;
  height: 32px;
  display: flex;
  align-items: center;
  background-color: #1a1a1a;
  -webkit-app-region: drag; // 启用窗口拖拽（cursor 无法自定义是 Chromium 限制）
  user-select: none;
}

// macOS 标题栏稍矮一点
.title-bar-mac {
  height: 28px;
}

.title-bar-left {
  display: flex;
  align-items: center;
  padding-left: 16px;
  -webkit-app-region: no-drag;
  cursor: default;
}

.brand-name {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-weight: 600;
  font-size: 13px;
  color: #ffffff;
  letter-spacing: 0.5px;
}

// 拖拽区域，填充中间空间
.title-bar-drag {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
}

// 窗口控制按钮区域
.title-bar-controls {
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;
}

// ============ Windows 样式 ============
.win-controls {
  .win-btn {
    width: 46px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #ffffff;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    &:active {
      background-color: rgba(255, 255, 255, 0.15);
    }
  }

  .close-btn:hover {
    background-color: #e81123;
  }

  .close-btn:active {
    background-color: #c42b1c;
  }
}

// ============ macOS 样式 ============
.mac-controls {
  padding-left: 12px;
  gap: 8px;

  .mac-btn {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;

    svg {
      opacity: 0;
      transition: opacity 0.15s ease;
    }
  }

  // 关闭按钮 - 红色
  .close-btn {
    background-color: #ff5f57;
    color: #4d0000;

    &:hover {
      background-color: #ff4136;
    }
  }

  // 最小化按钮 - 黄色
  .minimize-btn {
    background-color: #febc2e;
    color: #5c4600;

    &:hover {
      background-color: #f5a623;
    }
  }

  // hover 时显示图标
  &:hover .mac-btn svg {
    opacity: 1;
  }
}
</style>
