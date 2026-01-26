<script setup>
/**
 * Dashboard/index.vue - 首页
 * 展示四个业务卡片（仅展示，业务由按键触发）
 */

// 业务卡片数据
const businessCards = [
  { id: 'voice-input', name: '语音输入', icon: '🎙️', desc: '语音键单击触发' },
  { id: 'voice-translate', name: '语音翻译', icon: '🌐', desc: '语音键长按触发' },
  { id: 'ai-assistant', name: 'AI助手', icon: '🤖', desc: 'AI键单击触发' },
  { id: 'ai-tools', name: 'AI工具集', icon: '🛠️', desc: '待实现' }
]
</script>

<template>
  <div class="dashboard-container">
    <div class="cards-wrapper">
      <div v-for="card in businessCards" :key="card.id" class="business-card">
        <span class="card-icon">{{ card.icon }}</span>
        <span class="card-name">{{ card.name }}</span>
        <span class="card-desc">{{ card.desc }}</span>
      </div>
    </div>
    <p class="tip-text">请使用鼠标按键触发对应功能</p>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--bg-color-page);
  transition: background 0.3s ease;
}

.cards-wrapper {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(1rem, 2vw, 1.5rem);
}

.business-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: clamp(8rem, 15vw, 10rem);
  height: clamp(8rem, 15vw, 10rem);
  background: var(--card-bg);
  border: 1px solid var(--border-color-light);
  border-radius: clamp(0.75rem, 1.5vw, 1rem);
  transition:
    background 0.3s ease,
    border-color 0.3s ease;
}

.card-icon {
  font-size: clamp(2rem, 4vw, 2.5rem);
  margin-bottom: clamp(0.5rem, 1vh, 0.75rem);
}

.card-name {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.875rem, 1.5vw, 1rem);
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.card-desc {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.7rem, 1.2vw, 0.8rem);
  color: var(--text-secondary);
  margin-top: clamp(0.25rem, 0.5vh, 0.375rem);
  transition: color 0.3s ease;
}

.tip-text {
  font-family:
    'PingFang SC',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  font-size: clamp(0.8rem, 1.3vw, 0.875rem);
  color: var(--text-placeholder);
  margin-top: clamp(1.5rem, 3vh, 2rem);
  transition: color 0.3s ease;
}
</style>
