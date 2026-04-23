<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { moduleManifestMap, type ModuleKey } from '@/config/module-manifest'
import { useActivityStore } from '@/stores/activity'
import { useI18n } from '@/i18n'

const router = useRouter()
const activityStore = useActivityStore()
const { locale, t } = useI18n()

const isEnglish = computed(() => locale.value === 'en-US')
const summary = computed(() => activityStore.dailySummary)

function closeSummary() {
  activityStore.setSummaryOpen(false)
}

function openModule(modelName: string) {
  const moduleKey = resolveModuleKey(modelName)
  if (!moduleKey) {
    closeSummary()
    return
  }
  closeSummary()
  void router.push({ name: moduleKey })
}

function resolveModuleKey(modelName: string) {
  if (!modelName) return undefined
  const key = `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}` as ModuleKey
  return moduleManifestMap[key] ? key : undefined
}

function moduleLabel(modelName: string) {
  const key = resolveModuleKey(modelName)
  if (!key) return modelName
  return moduleManifestMap[key].title
}
</script>

<template>
  <transition name="summary-fade">
    <section v-if="activityStore.summaryOpen" class="summary-panel">
      <div class="summary-backdrop" @click="closeSummary"></div>
      <div class="summary-card">
        <header class="summary-header">
          <div>
            <div class="summary-kicker">{{ t('app.dailySummary') }}</div>
            <h3>{{ t('app.dailySummarySubtitle') }}</h3>
          </div>
          <button class="summary-close" type="button" :title="t('app.closeSummary')" @click="closeSummary">
            <el-icon><CloseBold /></el-icon>
          </button>
        </header>

        <div class="summary-metrics">
          <article class="summary-metric">
            <span>{{ t('app.summaryCreates') }}</span>
            <strong>{{ summary.createCount }}</strong>
          </article>
          <article class="summary-metric">
            <span>{{ t('app.summaryUpdates') }}</span>
            <strong>{{ summary.updateCount }}</strong>
          </article>
          <article class="summary-metric">
            <span>{{ t('app.summaryActions') }}</span>
            <strong>{{ summary.actionCount }}</strong>
          </article>
        </div>

        <section class="summary-section">
          <div class="section-title">{{ t('app.summaryTopModules') }}</div>
          <div v-if="summary.topModels.length" class="summary-module-list">
            <button
              v-for="item in summary.topModels"
              :key="item.model"
              class="summary-module-item"
              type="button"
              @click="openModule(item.model)"
            >
              <span>{{ moduleLabel(item.model) }}</span>
              <strong>{{ item.count }}</strong>
            </button>
          </div>
          <p v-else class="summary-empty">
            {{ isEnglish ? 'No active modules have been recorded yet.' : '当前还没有记录到活跃模块。' }}
          </p>
        </section>
      </div>
    </section>
  </transition>
</template>

<style scoped>
.summary-panel {
  position: fixed;
  inset: 0;
  z-index: 80;
}

.summary-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(10, 15, 20, 0.28);
  backdrop-filter: blur(8px);
}

.summary-card {
  position: absolute;
  top: 88px;
  right: 28px;
  width: min(420px, calc(100vw - 32px));
  padding: 20px;
  border: 1px solid var(--app-border);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--app-primary) 18%, transparent), transparent 34%),
    var(--app-panel-elevated);
  box-shadow: var(--app-card-shadow);
}

.summary-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.summary-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.summary-header h3 {
  margin: 8px 0 0;
  font-size: 20px;
  line-height: 1.2;
}

.summary-close {
  width: 34px;
  height: 34px;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background: var(--app-panel);
  color: var(--app-text);
  cursor: pointer;
}

.summary-metrics {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-metric {
  padding: 14px;
  border-radius: 18px;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
}

.summary-metric span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.summary-metric strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  line-height: 1;
}

.summary-section {
  margin-top: 18px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text-secondary);
}

.summary-module-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-module-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  color: var(--app-text);
  cursor: pointer;
}

.summary-module-item strong {
  color: var(--app-primary);
}

.summary-empty {
  margin: 12px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
}

.summary-fade-enter-active,
.summary-fade-leave-active {
  transition: opacity 0.2s ease;
}

.summary-fade-enter-from,
.summary-fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .summary-card {
    top: 72px;
    right: 16px;
    left: 16px;
    width: auto;
  }
}
</style>
