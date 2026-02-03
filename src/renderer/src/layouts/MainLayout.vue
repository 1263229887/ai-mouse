<script setup>
import AppNavbar from '@/components/AppNavbar/index.vue'
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
}
</style>
