<script setup>
import { computed } from 'vue'

// 组件属性定义
const props = defineProps({
  // 图标名称（对应 icons 文件夹下的 svg 文件名）
  name: {
    type: String,
    required: true
  },
  // 图标大小，支持数字(px)或字符串(如 '1.5rem')
  size: {
    type: [Number, String],
    default: 16
  },
  // 图标颜色，默认继承父元素颜色，支持 CSS 变量
  color: {
    type: String,
    default: 'currentColor'
  },
  // 是否使用主题色（设为 true 时颜色跟随主题变化）
  themed: {
    type: Boolean,
    default: false
  },
  // 自定义类名
  className: {
    type: String,
    default: ''
  }
})

// 计算符号 ID
const symbolId = computed(() => `#icon-${props.name}`)

// 计算样式
const iconStyle = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    width: size,
    height: size,
    // 主题模式时使用 CSS 变量，否则使用传入的颜色
    color: props.themed ? 'var(--text-primary)' : props.color
  }
})

// 计算类名
const iconClass = computed(() => {
  const classes = ['svg-icon']
  if (props.themed) {
    classes.push('svg-icon--themed')
  }
  if (props.className) {
    classes.push(props.className)
  }
  return classes.join(' ')
})
</script>

<template>
  <svg :class="iconClass" :style="iconStyle" aria-hidden="true">
    <use :xlink:href="symbolId" />
  </svg>
</template>

<style lang="scss" scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
  fill: currentColor;
  overflow: hidden;
  transition:
    color 0.3s ease,
    fill 0.3s ease;

  // 主题模式：颜色跟随主题变化
  &--themed {
    color: var(--text-primary);
    fill: var(--text-primary);
  }
}
</style>
