<template>
  <div ref="selectRef" class="custom-select" :class="{ 'is-open': isOpen }">
    <div class="select-trigger" @click="toggleDropdown">
      <span class="select-value">{{ displayValue }}</span>
      <span class="select-arrow">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2 3.5L5 6.5L8 3.5H2Z" />
        </svg>
      </span>
    </div>
    <Transition name="dropdown">
      <div v-show="isOpen" class="select-dropdown">
        <div
          v-for="option in options"
          :key="option.value"
          class="select-option"
          :class="{ 'is-selected': modelValue === option.value }"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  options: {
    type: Array,
    required: true
    // [{ label: '显示文本', value: '值' }]
  },
  placeholder: {
    type: String,
    default: '请选择'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const selectRef = ref(null)

const displayValue = computed(() => {
  const selected = props.options.find((opt) => opt.value === props.modelValue)
  return selected ? selected.label : props.placeholder
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectOption = (option) => {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
}

// 点击外部关闭下拉框
const handleClickOutside = (event) => {
  if (selectRef.value && !selectRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.custom-select {
  position: relative;
  width: 100%;
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: clamp(30px, 2vw, 36px);
  padding: clamp(0.35rem, 0.7vw, 0.5rem) clamp(0.9rem, 1.8vw, 1.1rem);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition:
    border-color 0.3s ease,
    background 0.3s ease;

  &:hover {
    border-color: var(--text-secondary);
  }
}

.is-open .select-trigger {
  border-color: var(--color-primary);
}

.select-value {
  font-size: clamp(0.8rem, 1.5vw, 0.9rem);
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.select-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition:
    transform 0.3s ease,
    color 0.3s ease;
}

.is-open .select-arrow {
  transform: rotate(180deg);
  color: var(--color-primary);
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  z-index: 100;
  overflow: hidden;
  transition:
    background 0.3s ease,
    border-color 0.3s ease;
}

.select-option {
  padding: clamp(0.5rem, 1vw, 0.7rem) clamp(0.9rem, 1.8vw, 1.1rem);
  font-size: clamp(0.8rem, 1.5vw, 0.9rem);
  color: var(--text-primary);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: var(--bg-color-hover);
  }

  &.is-selected {
    color: var(--color-primary);
    background: var(--bg-color-active);
  }
}

// 下拉动画
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
