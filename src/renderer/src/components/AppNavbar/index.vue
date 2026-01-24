<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { name: '首页', path: '/' },
  { name: '设备授权', path: '/auth' },
  { name: '设备设置', path: '/settings' },
  { name: '版本检测', path: '/version' }
]

const currentPath = computed(() => route.path)

function navigate(path) {
  router.push(path)
}

function isActive(path) {
  return currentPath.value === path
}
</script>

<template>
  <nav class="app-navbar">
    <div class="menu-items">
      <span
        v-for="item in menuItems"
        :key="item.path"
        class="menu-item"
        :class="{ active: isActive(item.path) }"
        @click="navigate(item.path)"
      >
        {{ item.name }}
      </span>
    </div>
    <div class="right-section">
      <span class="language">简体中文</span>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.app-navbar {
  width: 100%;
  height: clamp(2.5rem, 4vh, 3rem); // 40px 左右高度
  background: var(--bg-color); // 使用主题变量
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(1.5rem, 3vw, 2rem); // 左右内边距
  box-sizing: border-box;
}

.menu-items {
  display: flex;
  align-items: center;
  gap: clamp(2rem, 6vw, 3rem); // 菜单项间隔
}

.menu-item {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 500;
  font-size: clamp(0.7rem, 1.5vw, 0.9rem); // 响应式字体大小
  color: var(--text-primary); // 使用主题颜色
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    opacity: 0.8;
  }

  &.active {
    background: linear-gradient(180deg, #8be6b0 31.25%, #27acc2 71.88%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    transition: all 0.5s ease-in-out;
  }
}

.right-section {
  display: flex;
  align-items: center;
}

.language {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 500;
  font-size: clamp(0.7rem, 1.5vw, 0.9rem); // 响应式字体大小
  color: var(--text-primary); // 使用主题颜色
}
</style>
