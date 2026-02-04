<script setup>
import { onMounted } from 'vue'
import AppNavbar from '@/components/AppNavbar/index.vue'

// 预加载 AITools 组件和首页组件，避免首次进入时闪烁
onMounted(() => {
  import('@/views/AITools/index.vue')
  import('@/views/Dashboard/index.vue')
})
</script>

<template>
  <div class="main-layout">
    <AppNavbar />
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.main-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #0e1012;
}
</style>
