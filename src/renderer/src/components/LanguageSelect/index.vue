<template>
  <div ref="selectRef" class="relative" :class="{ 'is-open': isOpen }">
    <!-- 触发器 -->
    <div
      class="select-trigger f-c-c h-full px-14 bg-transparent b-1 b-solid b-#606C80 rd-6 cursor-pointer"
      @click="toggleDropdown"
    >
      <span class="text-14 color-white truncate">{{ displayValue }}</span>
      <span class="select-arrow flex items-center justify-center color-#606C80 ml-8 shrink-0">
        <svg width="14" height="14" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2 3.5L5 6.5L8 3.5H2Z" />
        </svg>
      </span>
    </div>

    <!-- 下拉面板 -->
    <Transition name="dropdown">
      <div
        v-show="isOpen"
        class="select-dropdown absolute top-[calc(100%+4px)] left-0 right-0 w-full bg-#1E1E1E/98 b-1 b-solid b-#606C80 rd-8 shadow-[0_4px_12px_rgba(0,0,0,0.3)] z-1000 overflow-hidden"
      >
        <!-- 搜索框 -->
        <div class="relative p-12 b-b-1 b-b-solid b-b-white/10">
          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            class="w-full h-32 pl-36 pr-12 text-14 color-white bg-white/5 b-1 b-solid b-white/10 rd-6 outline-none box-border placeholder:color-#606C80"
            type="text"
            :placeholder="searchPlaceholder"
            @input="handleSearch"
          />
          <span
            class="absolute left-20 top-50% translate-y--50% color-#606C80 flex items-center justify-center"
          >
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
        <div class="options-list max-h-200 overflow-y-auto">
          <template v-if="filteredOptions.length">
            <div
              v-for="option in filteredOptions"
              :key="option.isoCode + (option.areaId || '')"
              class="select-option flex items-center justify-between px-12 h-40 text-14 color-white cursor-pointer"
              :class="{ 'is-selected': isSelected(option) }"
              @click="selectOption(option)"
            >
              <div class="h-full flex items-center">
                <span class="text-13 shrink-0" :class="isSelected(option) ? 'color-#8BE6B0' : ''">{{
                  option.chinese
                }}</span>
                <span
                  v-if="option.countryName"
                  class="ml-8 text-11 truncate"
                  :class="isSelected(option) ? 'color-#8BE6B0' : 'color-#606C80'"
                  >{{ option.countryName }}</span
                >
              </div>
              <!-- 选中对勾 -->
              <span v-if="isSelected(option)" class="flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12l5 5L20 7"
                    stroke="#8BE6B0"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </div>
          </template>
          <div v-else class="py-32 text-center color-#606C80 text-14">暂无匹配语言</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  selectedAreaId: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '请选择语言' },
  searchPlaceholder: { type: String, default: '搜索语言' }
})

const emit = defineEmits(['update:modelValue', 'update:selectedAreaId', 'change'])

const isOpen = ref(false)
const searchKeyword = ref('')
const selectRef = ref(null)
const searchInputRef = ref(null)

const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder
  if (props.selectedAreaId) {
    const selected = props.options.find(
      (opt) =>
        opt.areaId === props.selectedAreaId || String(opt.areaId) === String(props.selectedAreaId)
    )
    if (selected) return selected.chinese
  }
  const selected = props.options.find((opt) => opt.isoCode === props.modelValue)
  return selected ? selected.chinese : props.placeholder
})

const filteredOptions = computed(() => {
  if (!searchKeyword.value.trim()) return props.options
  const keyword = searchKeyword.value.toLowerCase().trim()
  return props.options.filter((item) => {
    const chinese = item.chinese ? String(item.chinese).toLowerCase() : ''
    const countryName = item.countryName ? String(item.countryName).toLowerCase() : ''
    const isoCode = item.isoCode ? String(item.isoCode).toLowerCase() : ''
    return chinese.includes(keyword) || countryName.includes(keyword) || isoCode.includes(keyword)
  })
})

const isSelected = (option) => {
  if (props.selectedAreaId && option.areaId) {
    return String(option.areaId) === String(props.selectedAreaId)
  }
  return option.isoCode === props.modelValue
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => searchInputRef.value?.focus())
  } else {
    searchKeyword.value = ''
  }
}

const selectOption = (option) => {
  emit('update:modelValue', option.isoCode)
  emit('update:selectedAreaId', option.areaId || '')
  emit('change', option)
  isOpen.value = false
  searchKeyword.value = ''
}

const handleSearch = () => {}

const handleClickOutside = (event) => {
  if (selectRef.value && !selectRef.value.contains(event.target)) {
    isOpen.value = false
    searchKeyword.value = ''
  }
}

watch(isOpen, (val) => {
  if (!val) searchKeyword.value = ''
})

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.select-trigger {
  transition: border-color 0.2s;
}
.select-trigger:hover {
  border-color: #909399;
}
.is-open .select-trigger {
  border-color: #8be6b0;
}
.select-arrow {
  transition:
    transform 0.2s,
    color 0.2s;
}
.is-open .select-arrow {
  transform: rotate(180deg);
  color: #8be6b0;
}
input:focus {
  border-color: #8be6b0;
  background: rgba(255, 255, 255, 0.08);
}
.options-list::-webkit-scrollbar {
  width: 4px;
}
.options-list::-webkit-scrollbar-track {
  background: transparent;
}
.options-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}
.select-option {
  transition: background 0.2s;
}
.select-option:hover {
  background: rgba(255, 255, 255, 0.1);
}
.select-option.is-selected {
  background: rgba(52, 199, 89, 0.1);
}
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
