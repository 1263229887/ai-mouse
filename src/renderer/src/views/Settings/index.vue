<script setup>
// 按键设置页面
</script>

<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2 class="page-title">按键设置</h2>
    </div>
    <div class="settings-content">
      <p class="placeholder-text">功能开发中...</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color-page);
  overflow: hidden;
  transition: background 0.3s ease;
}

.settings-header {
  padding: clamp(1rem, 2vh, 1.5rem) clamp(1.5rem, 3vw, 2rem) clamp(0.5rem, 1vh, 1rem);
}

.page-title {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(1.2rem, 2.5vw, 1.5rem);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.settings-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: clamp(1rem, 2vh, 1.5rem) clamp(1.5rem, 3vw, 2rem);
}

.placeholder-text {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.8rem, 1.5vw, 1rem);
  color: var(--text-secondary);
  margin: 0;
}
</style>
