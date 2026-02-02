<script setup>
import AppNavbar from '@/components/AppNavbar/index.vue'
</script>

<template>
  <div class="main-layout">
    <AppNavbar />
    <el-scrollbar always class="main-scrollbar">
      <div class="main-content">
        <router-view />
      </div>
    </el-scrollbar>
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

.main-scrollbar {
  flex: 1;
  background: var(--bg-color-page);
  transition: background 0.3s ease;

  // 让 el-scrollbar 的内部视图容器擑满高度，使子页面能正确居中
  :deep(.el-scrollbar__view) {
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
