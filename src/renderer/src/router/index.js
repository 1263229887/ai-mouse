import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  // 初始授权页（不带菜单栏）
  {
    path: '/',
    name: 'InitAuth',
    component: () => import('@/views/Home/index.vue')
  },
  // 带菜单栏的页面
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
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
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：如果用户已进入过应用，访问根路由时自动跳转到首页
router.beforeEach((to, from, next) => {
  const hasEnteredApp = localStorage.getItem('hasEnteredApp') === 'true'

  // 如果已进入过应用，且访问的是初始授权页，跳转到首页
  if (hasEnteredApp && to.name === 'InitAuth') {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
