<template>
  <div ref="selectRef" class="language-select" :class="{ 'is-open': isOpen }">
    <!-- 触发器：只显示语种名 -->
    <div class="select-trigger" @click="toggleDropdown">
      <span class="select-value">{{ displayValue }}</span>
      <span class="select-arrow">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2 3.5L5 6.5L8 3.5H2Z" />
        </svg>
      </span>
    </div>

    <!-- 下拉面板 -->
    <Transition name="dropdown">
      <div v-show="isOpen" class="select-dropdown">
        <!-- 搜索框 -->
        <div class="search-wrapper">
          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            class="search-input"
            type="text"
            :placeholder="searchPlaceholder"
            @input="handleSearch"
          />
          <span class="search-icon">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
        </div>

        <!-- 语言列表 -->
        <div class="options-list">
          <template v-if="filteredOptions.length">
            <div
              v-for="option in filteredOptions"
              :key="option.isoCode + (option.areaId || '')"
              class="select-option"
              :class="{ 'is-selected': isSelected(option) }"
              @click="selectOption(option)"
            >
              <div class="option-content">
                <span class="option-chinese" :class="{ 'is-selected': isSelected(option) }">{{
                  option.chinese
                }}</span>
                <span
                  v-if="option.countryName"
                  class="option-country"
                  :class="{ 'is-selected': isSelected(option) }"
                  >{{ option.countryName }}</span
                >
              </div>
              <!-- 选中对勾 -->
              <span v-if="isSelected(option)" class="check-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12l5 5L20 7"
                    stroke="#34C759"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </div>
          </template>
          <div v-else class="no-data">暂无匹配语言</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  // 当前选中的 isoCode
  modelValue: {
    type: String,
    required: true
  },
  // 当前选中的 areaId（用于精确匹配）
  selectedAreaId: {
    type: [String, Number],
    default: ''
  },
  // 语言列表 [{ isoCode, chinese, countryName?, areaId? }]
  options: {
    type: Array,
    required: true
  },
  placeholder: {
    type: String,
    default: '请选择语言'
  },
  searchPlaceholder: {
    type: String,
    default: '搜索语言'
  }
})

const emit = defineEmits(['update:modelValue', 'update:selectedAreaId', 'change'])

const isOpen = ref(false)
const searchKeyword = ref('')
const selectRef = ref(null)
const searchInputRef = ref(null)

// 计算显示值：只显示语种名（chinese）
const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder
  // 优先用 areaId 匹配
  if (props.selectedAreaId) {
    const selected = props.options.find(
      (opt) =>
        opt.areaId === props.selectedAreaId || String(opt.areaId) === String(props.selectedAreaId)
    )
    if (selected) return selected.chinese
  }
  // 否则用 isoCode 匹配
  const selected = props.options.find((opt) => opt.isoCode === props.modelValue)
  if (selected) return selected.chinese
  return props.placeholder
})

// 过滤后的选项列表
const filteredOptions = computed(() => {
  if (!searchKeyword.value.trim()) {
    return props.options
  }
  const keyword = searchKeyword.value.toLowerCase().trim()
  return props.options.filter((item) => {
    const chinese = item.chinese ? String(item.chinese).toLowerCase() : ''
    const countryName = item.countryName ? String(item.countryName).toLowerCase() : ''
    const isoCode = item.isoCode ? String(item.isoCode).toLowerCase() : ''
    return chinese.includes(keyword) || countryName.includes(keyword) || isoCode.includes(keyword)
  })
})

// 判断是否选中（优先用 areaId 匹配，否则用 isoCode）
const isSelected = (option) => {
  if (props.selectedAreaId && option.areaId) {
    return String(option.areaId) === String(props.selectedAreaId)
  }
  return option.isoCode === props.modelValue
}

// 切换下拉框
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    // 打开时聚焦搜索框
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    // 关闭时清空搜索
    searchKeyword.value = ''
  }
}

// 选择选项
const selectOption = (option) => {
  emit('update:modelValue', option.isoCode)
  emit('update:selectedAreaId', option.areaId || '')
  emit('change', option)
  isOpen.value = false
  searchKeyword.value = ''
}

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑由 computed 自动处理
}

// 点击外部关闭下拉框
const handleClickOutside = (event) => {
  if (selectRef.value && !selectRef.value.contains(event.target)) {
    isOpen.value = false
    searchKeyword.value = ''
  }
}

// 监听下拉框关闭，清空搜索
watch(isOpen, (val) => {
  if (!val) {
    searchKeyword.value = ''
  }
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.language-select {
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
  min-height: clamp(1.875rem, 3vw, 2.25rem);
  padding: clamp(0.35rem, 0.7vw, 0.5rem) clamp(0.9rem, 1.8vw, 1.1rem);
  background: transparent;
  border: 1px solid #606c80;
  border-radius: clamp(0.3rem, 0.6vw, 0.375rem);
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
  font-size: clamp(0.75rem, 1.3vw, 0.875rem);
  color: #ffffff;
  transition: color 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.select-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition:
    transform 0.3s ease,
    color 0.3s ease;
  flex-shrink: 0;
  margin-left: clamp(0.375rem, 0.8vw, 0.5rem);
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
  width: 100%; // 下拉列表宽度与触发框保持一致
  background: rgba(30, 30, 30, 0.98);
  border: 1px solid #606c80;
  border-radius: clamp(0.3rem, 0.6vw, 0.5rem);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
  transition:
    background 0.3s ease,
    border-color 0.3s ease;
}

.search-wrapper {
  position: relative;
  padding: clamp(0.5rem, 1vw, 0.75rem);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-input {
  width: 100%;
  height: clamp(1.75rem, 3vw, 2rem);
  padding: 0 clamp(0.5rem, 1vw, 0.75rem);
  padding-left: clamp(1.75rem, 3.5vw, 2.25rem);
  font-size: clamp(0.75rem, 1.3vw, 0.875rem);
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: clamp(0.25rem, 0.5vw, 0.375rem);
  outline: none;
  transition:
    border-color 0.3s ease,
    background 0.3s ease;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-placeholder);
  }

  &:focus {
    border-color: var(--color-primary);
    background: rgba(255, 255, 255, 0.08);
  }
}

.search-icon {
  position: absolute;
  left: clamp(1rem, 2vw, 1.25rem);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.options-list {
  max-height: clamp(10rem, 25vh, 15rem);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }
}

.select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(0.55rem, 1vw, 0.75rem);
  height: clamp(2rem, 3.5vh, 2.5rem);
  font-size: clamp(0.75rem, 1.3vw, 0.875rem);
  color: #ffffff;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.is-selected {
    background: rgba(52, 199, 89, 0.1);
  }
}

.option-content {
  height: 100%;
  display: flex;
  align-items: center;
}

.option-chinese {
  flex-shrink: 0;
  transition: color 0.2s ease;
  font-size: clamp(0.7rem, 1.2vw, 0.8rem);
  &.is-selected {
    color: #34c759;
  }
}

.option-country {
  margin-left: clamp(0.5rem, 1vw, 0.75rem);
  color: var(--text-secondary);
  font-size: clamp(0.6rem, 1.1vw, 0.7rem);
  transition: color 0.2s ease;
  //   一行展示不下就省略号显示
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.is-selected {
    color: #34c759;
  }
}

.check-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.no-data {
  padding: clamp(1.5rem, 3vw, 2rem);
  text-align: center;
  color: var(--text-secondary);
  font-size: clamp(0.75rem, 1.3vw, 0.875rem);
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
