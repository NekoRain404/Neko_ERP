<script setup lang="ts">
import { computed } from 'vue'
import type { ModuleKey } from '@/config/module-manifest'
import {
  buildModuleEvidenceExpectation,
  buildModuleEvidencePresets,
  sortEvidencePresetsByPriority,
} from '@/utils/first-wave-evidence'
import { useI18n } from '@/i18n'

const props = defineProps<{
  moduleKey: ModuleKey
}>()

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const expectation = computed(() => buildModuleEvidenceExpectation(props.moduleKey, isEnglish.value))
const presets = computed(() =>
  sortEvidencePresetsByPriority(
    buildModuleEvidencePresets(props.moduleKey, isEnglish.value),
    expectation.value.recommendedKey,
  ),
)
const requiredPresets = computed(() => presets.value.filter((item) => item.required))
const optionalPresets = computed(() => presets.value.filter((item) => !item.required))
</script>

<template>
  <article class="erp-card evidence-panel">
    <div class="evidence-header">
      <div class="section-title">{{ isEnglish ? 'Evidence Playbook' : '证据清单' }}</div>
      <p>
        {{ isEnglish
          ? 'Keep Monica-style notes and ERPNext-style traceability grounded by attaching the right business files early.'
          : '尽早挂上正确的业务文件，让 Monica 式上下文和 ERPNext 式追溯真正落地。' }}
      </p>
    </div>

    <div class="evidence-summary-grid">
      <article class="evidence-summary-card">
        <span>{{ isEnglish ? 'Required' : '必备' }}</span>
        <strong>{{ requiredPresets.length }}</strong>
        <p>{{ isEnglish ? 'These files should be attached before the pilot widens.' : '这些文件应在扩大试点前补齐。' }}</p>
      </article>
      <article class="evidence-summary-card">
        <span>{{ isEnglish ? 'Recommended First' : '推荐优先上传' }}</span>
        <strong>{{ expectation.recommendedLabel }}</strong>
        <p>{{ isEnglish ? 'Use this category first when a new record still has no supporting files.' : '当新记录还没有支撑文件时，优先从这一类开始。' }}</p>
      </article>
    </div>

    <div class="timeline-hint-card">
      <strong>{{ isEnglish ? 'Timeline Hint' : '时间轴提示' }}</strong>
      <p>{{ expectation.timelineHint }}</p>
    </div>

    <div class="evidence-list">
      <article
        v-for="item in presets"
        :key="item.key"
        :class="['evidence-item', item.required ? 'required' : 'optional', expectation.recommendedKey === item.key ? 'recommended' : '']"
      >
        <div class="evidence-top">
          <div class="evidence-title-stack">
            <strong>{{ item.label }}</strong>
            <div class="evidence-badges">
              <span>{{ item.required ? (isEnglish ? 'Required' : '必备') : (isEnglish ? 'Recommended' : '建议') }}</span>
              <span v-if="expectation.recommendedKey === item.key" class="recommended-badge">
                {{ isEnglish ? 'Upload First' : '优先上传' }}
              </span>
            </div>
          </div>
        </div>
        <p>{{ item.description }}</p>
      </article>
    </div>

    <div v-if="optionalPresets.length" class="evidence-footer">
      {{ isEnglish
        ? `Required categories should land first, then add ${optionalPresets.length} recommended files as the pilot context deepens.`
        : `先补齐必备类别，再随着试点上下文深化补充其余 ${optionalPresets.length} 类建议文件。` }}
    </div>
  </article>
</template>

<style scoped>
.evidence-panel {
  padding: 22px;
}

.evidence-header p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.evidence-summary-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.evidence-summary-card,
.timeline-hint-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-primary) 5%, var(--app-panel));
}

.evidence-summary-card span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.evidence-summary-card strong,
.timeline-hint-card strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 16px;
}

.evidence-summary-card p,
.timeline-hint-card p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.timeline-hint-card {
  margin-top: 12px;
}

.evidence-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.evidence-item {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.evidence-item.required {
  border-color: color-mix(in srgb, var(--app-primary) 30%, var(--app-border));
  background: color-mix(in srgb, var(--app-primary) 5%, var(--app-panel));
}

.evidence-item.recommended {
  border-color: color-mix(in srgb, #f97316 35%, var(--app-border));
}

.evidence-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.evidence-title-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evidence-top strong {
  color: var(--app-text);
  font-size: 14px;
}

.evidence-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.evidence-top span {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--app-muted-bg);
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.evidence-item.required .evidence-top span {
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
}

.recommended-badge {
  background: color-mix(in srgb, #f97316 12%, transparent) !important;
  color: #ea580c !important;
}

.evidence-item p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.evidence-footer {
  margin-top: 14px;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 720px) {
  .evidence-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
