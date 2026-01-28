<script setup>
import AppNavbar from '@/components/AppNavbar/index.vue'
</script>

<template>
  <div class="main-layout">
    <AppNavbar />
    <el-scrollbar class="main-scrollbar">
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

  // 让 el-scrollbar 的内部视图容器撑满高度，使子页面能正确居中
  :deep(.el-scrollbar__view) {
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  // Element Plus 滚动条样式覆盖
  :deep(.el-scrollbar__bar) {
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    :deep(.el-scrollbar__bar) {
      opacity: 1;
    }
  }

  :deep(.el-scrollbar__thumb) {
    background-color: var(--text-placeholder);
    border-radius: 4px;

    &:hover {
      background-color: var(--text-secondary);
    }
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
