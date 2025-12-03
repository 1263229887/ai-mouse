/**
 * 应用主入口
 * 创建 Vue 应用并配置路由
 */

import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 创建 Vue 应用
const app = createApp(App)

// 使用路由
app.use(router)

// 从 URL hash 获取路由参数
// 当主进程通过 index.html#/typing 加载时，导航到对应路由
const hash = window.location.hash
if (hash && hash !== '#/') {
  const route = hash.replace('#', '')
  router.push(route)
}

// 挂载应用
app.mount('#app')
