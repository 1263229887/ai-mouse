<script setup>
// 版本检测页面
</script>

<template>
  <div class="version-container">
    <div class="content-wrapper">
      <h2 class="title">版本检测</h2>
      <p class="description">当前版本信息</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.version-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-color-page);
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.title {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(1.2rem, 2.5vw, 1.5rem);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 clamp(0.5rem, 1vh, 1rem);
}

.description {
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(0.8rem, 1.5vw, 1rem);
  color: var(--text-secondary);
  margin: 0;
}
</style>
