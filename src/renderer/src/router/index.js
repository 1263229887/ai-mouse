import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  // 带菜单栏的页面
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/auth', // 默认重定向到设备授权页
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Dashboard/index.vue')
      },
      {
        path: 'auth',
        name: 'Auth',
        component: () => import('@/views/Auth/index.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings/index.vue')
      },
      {
        path: 'version',
        name: 'Version',
        component: () => import('@/views/Version/index.vue')
      }
    ]
  },
  // 小窗口路由（无菜单栏）
  {
    path: '/mini/voice-translate',
    name: 'MiniVoiceTranslate',
    component: () => import('@/views/VoiceTranslate/index.vue')
  },
  {
    path: '/mini/voice-input',
    name: 'MiniVoiceInput',
    component: () => import('@/views/VoiceInput/index.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
