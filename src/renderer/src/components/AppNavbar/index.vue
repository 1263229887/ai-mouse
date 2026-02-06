<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { name: '首页', path: '/main/home' },
  { name: '设备授权', path: '/main/auth' },
  { name: '设备设置', path: '/main/settings' },
  { name: '版本检测', path: '/main/version' },
  { name: 'AI工具集', path: '/main/ai-tools' }
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
  <nav class="app-navbar bg-#22282C">
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
  </nav>
</template>

<style lang="scss" scoped>
.app-navbar {
  width: 100%;
  user-select: none;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 70px;
  box-sizing: border-box;
}

.menu-items {
  display: flex;
  align-items: center;
  gap: 48px;
}

.menu-item {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    opacity: 0.8;
  }

  &.active {
    background: linear-gradient(180deg, #8be6b0 31.25%, #27acc2 71.88%);
    -webkit-background-clip: text;
    background-clip: text;
    font-size: 14px;
    font-weight: 700;
    -webkit-text-fill-color: transparent;
    // transition: all 0.5s ease-in-out;
  }
}
</style>
