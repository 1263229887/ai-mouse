import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue()],
    // 单页面应用，无需配置多入口
    // 通过 Vue Router + URL hash 实现页面切换
    server: {
      // WebSocket 代理配置
      proxy: {
        // 语音识别服务
        '/ws-asr': {
          target: 'ws://chat.danaai.net',
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ws-asr/, '/asr/speechTranslate')
        },
        // 翻译服务
        '/ws-translate': {
          target: 'ws://chat.danaai.net',
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ws-translate/, '/asr/speechTranslate')
        },
        // 语言列表接口代理
        '/api-proxy': {
          target: 'https://mail.danaai.net',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-proxy/, '')
        }
      }
    }
  }
})
