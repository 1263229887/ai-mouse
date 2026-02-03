import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  // 授权页（独立页面，无菜单栏）
  {
    path: '/',
    redirect: '/auth'
  },
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('@/views/Auth/index.vue')
  },
  // 带菜单栏的页面
  {
    path: '/main',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/main/settings',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Dashboard/index.vue')
      },
      {
        path: 'auth',
        name: 'MainAuth',
        component: () => import('@/views/Auth/index.vue'),
        meta: { inMenu: true }
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
      },
      {
        path: 'ai-tools',
        name: 'AITools',
        component: () => import('@/views/AITools/index.vue')
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
  },
  {
    path: '/mini/ai-assistant',
    name: 'MiniAIAssistant',
    component: () => import('@/views/AIAssistant/index.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
