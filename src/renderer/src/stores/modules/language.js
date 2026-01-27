import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAllLanguageList } from '@/api'

/**
 * 语言列表 Store
 * 管理全局语言列表数据
 */
export const useLanguageStore = defineStore('language', () => {
  // 原始语言列表（未平铺）
  const rawLanguageList = ref([])

  // 平铺后的语言列表
  const languageList = ref([])

  // 加载状态
  const isLoading = ref(false)

  // 是否已加载
  const isLoaded = ref(false)

  /**
   * 获取并处理语言列表
   */
  async function fetchLanguageList() {
    if (isLoading.value || isLoaded.value) {
      console.log('[Language] 语言列表已加载，跳过')
      return
    }

    isLoading.value = true
    try {
      const res = await getAllLanguageList()
      const data = res?.data || {}
      const allList = data.allList || []

      // 保存原始列表
      rawLanguageList.value = allList

      // 平铺处理：展开 countryList
      languageList.value = allList.flatMap((item) => {
        if (Array.isArray(item.countryList) && item.countryList.length) {
          // 有国家列表的语言，展开为多个选项
          return item.countryList.map((country) => ({
            ...item,
            countryName: country.country,
            areaId: country.id
          }))
        } else {
          // 没有国家列表的语言，直接返回
          return {
            ...item,
            countryName: '',
            areaId: ''
          }
        }
      })

      isLoaded.value = true
      console.log('[Language] 语言列表加载成功:', languageList.value.length, '条')
    } catch (error) {
      console.error('[Language] 获取语言列表失败:', error)
      languageList.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 根据 isoCode 从原始列表中获取第一个 countryList 的 areaId 和 chinese
   */
  function getLanguageInfo(isoCode) {
    const langItem = rawLanguageList.value.find((item) => item.isoCode === isoCode)
    if (langItem) {
      const areaId =
        Array.isArray(langItem.countryList) && langItem.countryList.length
          ? langItem.countryList[0].id || ''
          : ''
      return {
        isoCode: langItem.isoCode,
        areaId,
        chinese: langItem.chinese || ''
      }
    }
    return null
  }

  return {
    rawLanguageList,
    languageList,
    isLoading,
    isLoaded,
    fetchLanguageList,
    getLanguageInfo
  }
})
