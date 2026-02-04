<template>
  <div ref="selectRef" class="relative w-full" :class="{ 'is-open': isOpen }">
    <div
      class="flex items-center justify-between min-h-36 py-8 px-16 bg-transparent b-1 b-solid b-#303030 rd-8 cursor-pointer hover:b-#606C80 transition-colors duration-200"
      :class="isOpen ? 'b-#8BE6B0!' : ''"
      @click="toggleDropdown"
    >
      <span class="text-14 color-#fff">{{ displayValue }}</span>
      <span
        class="f-c-c transition-transform duration-200"
        :class="isOpen ? 'rotate-180 color-#8BE6B0' : 'color-#606C80'"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2 3.5L5 6.5L8 3.5H2Z" />
        </svg>
      </span>
    </div>
    <Transition name="dropdown">
      <div
        v-show="isOpen"
        class="absolute top-[calc(100%+4px)] left-0 right-0 bg-#1B2023 b-1 b-solid b-#303030 rd-8 z-100 overflow-hidden"
      >
        <div
          v-for="option in options"
          :key="option.value"
          class="py-10 px-16 text-14 cursor-pointer transition-colors duration-200"
          :class="
            modelValue === option.value ? 'color-#8BE6B0 bg-#252A2D' : 'color-#fff hover:bg-#252A2D'
          "
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

<style scoped>
/* 下拉动画 */
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
