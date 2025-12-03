<template>
  <!-- 应用根组件 - 纯路由出口 -->
  <router-view />
</template>

<script setup>
/**
 * App.vue - 应用根组件
 * 作为纯路由出口，所有页面通过 Vue Router 加载
 * 
 * 路由配置：
 * - /: 首页 (Home.vue)
 * - /typing: 模拟AI输入窗口
 * - /translate: 模拟AI翻译窗口
 */
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  background: transparent;
}
</style>
