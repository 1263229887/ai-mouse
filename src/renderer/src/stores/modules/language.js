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
      console.log('[Language] 原始语言列表 rawLanguageList:', allList)

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
      console.log('[Language] 平铺后的 languageList:', languageList.value)

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
   * 注意：isoCode 在原始列表中可能有多个（不同语种同一 isoCode），
   * 所以需要通过 isoCode + chinese 名称确认是否匹配正确
   */
  function getLanguageInfo(isoCode) {
    console.log('[Language] getLanguageInfo 调用, isoCode:', isoCode)
    console.log('[Language] rawLanguageList 长度:', rawLanguageList.value.length)

    // 检查是否有多个相同 isoCode 的项
    const matchedItems = rawLanguageList.value.filter((item) => item.isoCode === isoCode)
    console.log('[Language] isoCode 匹配到的所有项:', matchedItems)

    if (matchedItems.length === 0) {
      console.log('[Language] getLanguageInfo 未找到匹配项, 返回 null')
      return null
    }

    // 如果只有一个匹配项，直接使用
    let langItem = matchedItems[0]

    // 如果有多个匹配项，尝试根据常见的 isoCode-语种名对应关系找到正确的
    if (matchedItems.length > 1) {
      console.warn('[Language] 警告: isoCode', isoCode, '存在多个匹配项!')
      // 常见 isoCode 对应的中文名
      const isoCodeToChinese = {
        ZH: '中文',
        EN: '英语',
        JA: '日语',
        KO: '韩语',
        FR: '法语',
        DE: '德语',
        ES: '西班牙语',
        RU: '俄语',
        PT: '葡萄牙语',
        IT: '意大利语'
      }
      const expectedChinese = isoCodeToChinese[isoCode]
      if (expectedChinese) {
        const correctItem = matchedItems.find((item) => item.chinese === expectedChinese)
        if (correctItem) {
          langItem = correctItem
          console.log('[Language] 通过 chinese 名称匹配到正确项:', langItem)
        }
      }
    }

    console.log('[Language] 最终使用的 langItem:', langItem)

    const areaId =
      Array.isArray(langItem.countryList) && langItem.countryList.length
        ? langItem.countryList[0].id || ''
        : ''
    const result = {
      isoCode: langItem.isoCode,
      areaId,
      chinese: langItem.chinese || ''
    }
    console.log('[Language] getLanguageInfo 返回:', result)
    return result
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
