import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    root: 'src/renderer',
    publicDir: 'public',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    server: {
      // 代理配置
      proxy: {
        // 授权接口代理到测试环境
        '/auth-api': {
          target: 'http://192.168.80.8',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth-api/, '')
        },
        // 通用业务接口代理
        '/api': {
          target: 'http://192.168.80.8/studio',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        // 数字人后管接口代理
        '/digital-human-api': {
          target: 'http://192.168.80.8:85/studio/meta-human-api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/digital-human-api/, '')
        }
      }
    },
    plugins: [
      vue(),
      createSvgIconsPlugin({
        // SVG 图标存放路径
        iconDirs: [resolve('src/renderer/src/assets/icons')],
        // 图标符号 ID 格式
        symbolId: 'icon-[dir]-[name]',
        // 注入位置
        inject: 'body-last',
        // 自定义 DOM ID
        customDomId: '__svg__icons__dom__'
      })
    ]
  }
})
