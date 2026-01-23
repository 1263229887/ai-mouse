<script setup>
import { ref } from 'vue'
import { Document, DataLine, Monitor, Setting, Sunny, Moon } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores'

// 主题状态
const themeStore = useThemeStore()

// 卡片数据
const cards = ref([
  {
    id: 1,
    title: '文档管理',
    description: '高效管理您的文档资源，支持多种格式预览和编辑，让文档处理更加便捷。',
    icon: Document,
    color: '#409eff'
  },
  {
    id: 2,
    title: '数据分析',
    description: '强大的数据可视化能力，帮助您洞察业务趋势，做出更明智的决策。',
    icon: DataLine,
    color: '#67c23a'
  },
  {
    id: 3,
    title: '系统监控',
    description: '实时监控系统运行状态，及时发现并解决潜在问题，保障系统稳定运行。',
    icon: Monitor,
    color: '#e6a23c'
  },
  {
    id: 4,
    title: '系统设置',
    description: '灵活配置系统参数，根据您的需求个性化定制，提升使用体验。',
    icon: Setting,
    color: '#909399'
  }
])
</script>

<template>
  <div class="home-container">
    <!-- 主题切换按钮 -->
    <div class="theme-toggle">
      <el-button circle size="large" @click="themeStore.toggleTheme()">
        <el-icon :size="20">
          <Moon v-if="themeStore.theme === 'light'" />
          <Sunny v-else />
        </el-icon>
      </el-button>
    </div>

    <!-- 内容区域 -->
    <div class="content-wrapper">
      <!-- 头部区域 -->
      <header class="home-header">
        <h1 class="main-title">AI Mouse</h1>
        <p class="sub-title">智能桌面助手，让您的工作更高效</p>
      </header>

      <!-- 卡片区域 -->
      <main class="home-content">
        <div class="cards-grid">
          <el-card v-for="card in cards" :key="card.id" class="feature-card" shadow="hover">
            <div
              class="card-icon"
              :style="{ backgroundColor: card.color + '15', color: card.color }"
            >
              <el-icon :size="24">
                <component :is="card.icon" />
              </el-icon>
            </div>
            <h3 class="card-title">{{ card.title }}</h3>
            <p class="card-description">{{ card.description }}</p>
          </el-card>
        </div>
      </main>

      <!-- 底部信息 -->
      <footer class="home-footer">
        <!-- SVG 图标展示 -->
        <div class="svg-icons-demo">
          <SvgIcon name="success" :size="20" color="var(--color-success)" />
          <SvgIcon name="warning" :size="20" color="var(--color-warning)" />
          <SvgIcon name="star" :size="20" color="var(--color-primary)" />
          <SvgIcon name="menu" :size="20" themed />
        </div>
        <span class="version-info">Version 1.0.0</span>
      </footer>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

// 容器 - 占满视口，不允许滚动
.home-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--gradient-bg);
  overflow: hidden;
  position: relative;
  transition: background 0.3s ease;
}

// 主题切换按钮
.theme-toggle {
  position: absolute;
  top: clamp(1rem, 2vh, 1.5rem);
  right: clamp(1rem, 2vw, 1.5rem);
  z-index: 100;

  :deep(.el-button) {
    background: var(--card-bg);
    border-color: var(--border-color);
    color: var(--text-primary);
    transition: all 0.3s ease;

    &:hover {
      background: var(--bg-color-hover);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }
}

// 内容区域
.content-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 90%;
  height: 90%;
}

// 头部区域
.home-header {
  flex: 0 0 auto;
  text-align: center;
  margin-bottom: clamp(1rem, 3vh, 2rem);
}

.main-title {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: clamp(0.25rem, 1vh, 0.5rem);
  font-size: clamp(1.5rem, 4vw, 2rem);
  transition: color 0.3s ease;
}

.sub-title {
  color: var(--text-secondary);
  font-size: clamp(0.8rem, 1.8vw, 1rem);
  transition: color 0.3s ease;
}

// 主内容区域
.home-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
}

// 卡片网格 - 固定 2x2 布局
.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: clamp(0.75rem, 2vw, 1.25rem);
  width: 100%;
  height: 100%;
  max-height: 100%;
}

// 特性卡片
.feature-card {
  border-radius: $border-radius-lg;
  transition:
    transform $transition-base,
    box-shadow $transition-base,
    background 0.3s ease;
  height: 100%;

  :deep(.el-card__body) {
    padding: clamp(0.75rem, 2vw, 1.25rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
  }

  &:hover {
    transform: translateY(-2px);
  }
}

// 卡片图标
.card-icon {
  width: clamp(36px, 5vw, 48px);
  height: clamp(36px, 5vw, 48px);
  border-radius: $border-radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: clamp(0.5rem, 1vh, 0.75rem);
  transition: transform $transition-base;

  .feature-card:hover & {
    transform: scale(1.1);
  }
}

// 卡片标题
.card-title {
  font-size: clamp(0.875rem, 1.8vw, 1.1rem);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: clamp(0.25rem, 0.5vh, 0.5rem);
  transition: color 0.3s ease;
}

// 卡片描述
.card-description {
  font-size: clamp(0.7rem, 1.4vw, 0.8rem);
  color: var(--text-secondary);
  line-height: 1.5;
  transition: color 0.3s ease;
  @include text-ellipsis(2);
}

// 底部区域
.home-footer {
  flex: 0 0 auto;
  text-align: center;
  margin-top: clamp(1rem, 2vh, 1.5rem);
}

// SVG 图标展示
.svg-icons-demo {
  display: flex;
  justify-content: center;
  gap: clamp(0.75rem, 1.5vw, 1rem);
  margin-bottom: clamp(0.5rem, 1vh, 0.75rem);
}

.version-info {
  font-size: clamp(0.7rem, 1.2vw, 0.8rem);
  color: var(--text-placeholder);
  transition: color 0.3s ease;
}
</style>
