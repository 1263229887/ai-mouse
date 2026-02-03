import { defineConfig, presetUno, presetAttributify } from 'unocss'

export default defineConfig({
  // 预设
  presets: [
    presetUno(), // 默认预设，类似 Tailwind
    presetAttributify() // 属性化模式支持
    // presetIcons({
    //   scale: 1.2,
    //   warn: true
    // })
  ],

  // 自定义快捷方式
  shortcuts: [
    // 布局
    ['wh-full', 'w-full h-full'],
    ['f-c-c', 'flex justify-center items-center'],
    ['flex-col', 'flex flex-col'],
    ['text-ellipsis', 'truncate']
  ],

  // 主题扩展
  theme: {
    // colors: {
    //   // 使用 CSS 变量
    //   primary: 'var(--color-primary)',
    //   success: 'var(--color-success)',
    //   warning: 'var(--color-warning)',
    //   danger: 'var(--color-danger)'
    // }
  },

  // 安全列表（确保这些类始终生成）
  safelist: [],

  // 排除文件
  content: {
    pipeline: {
      exclude: ['node_modules', '.git', '.github', '.vscode', 'build', 'dist', 'public']
    }
  },

  // 后处理：将 rem 转换为 px（默认 1 单位 = 0.25rem = 4px）  代码里写pl-20 也就是20px
  postprocess: (util) => {
    util.entries.forEach((entry) => {
      const value = entry[1]
      if (typeof value === 'string' && value.endsWith('rem')) {
        entry[1] = `${parseFloat(value) * 4}px`
      }
    })
  }
})
