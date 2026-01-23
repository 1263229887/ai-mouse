import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
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
