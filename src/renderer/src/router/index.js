/**
 * Vue Router 配置
 * 统一管理应用的所有路由
 */

import { createRouter, createMemoryHistory } from 'vue-router'

// 导入页面组件
import Home from '../views/Home.vue'
import TypingWindow from '../components/TypingWindow.vue'
import TranslateWindow from '../components/TranslateWindow.vue'

// 定义路由规则
const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { title: '首页' }
  },
  {
    path: '/typing',
    name: 'typing',
    component: TypingWindow,
    meta: { title: '模拟AI输入' }
  },
  {
    path: '/translate',
    name: 'translate',
    component: TranslateWindow,
    meta: { title: '模拟AI翻译' }
  }
]

// 创建路由实例
// 使用 createMemoryHistory 因为 Electron 中不需要浏览器 URL
const router = createRouter({
  history: createMemoryHistory(),
  routes
})

export default router
