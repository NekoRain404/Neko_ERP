<script setup lang="ts">
import type { FirstWavePlaybook } from '@/utils/first-wave-playbook'

defineProps<{
  playbook: FirstWavePlaybook
}>()
</script>

<template>
  <article class="erp-card playbook-panel">
    <div class="playbook-header">
      <div>
        <div class="section-title">{{ playbook.title }}</div>
        <p>{{ playbook.description }}</p>
      </div>
    </div>

    <div class="playbook-stage-list">
      <div
        v-for="item in playbook.stages"
        :key="item.key"
        :class="['playbook-stage-card', `tone-${item.tone}`]"
      >
        <div class="playbook-stage-top">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
        <p>{{ item.description }}</p>
      </div>
    </div>

    <div class="playbook-gate-list">
      <div v-for="item in playbook.gates" :key="item.key" class="playbook-gate-item">
        <strong>{{ item.title }}</strong>
        <p>{{ item.description }}</p>
      </div>
    </div>
  </article>
</template>

<style scoped>
.playbook-panel {
  padding: 22px;
}

.playbook-header p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--app-text-secondary);
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.playbook-stage-list,
.playbook-gate-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.playbook-stage-card,
.playbook-gate-item {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.playbook-stage-card.tone-success {
  border-color: color-mix(in srgb, var(--app-success) 30%, var(--app-border));
}

.playbook-stage-card.tone-warning {
  border-color: color-mix(in srgb, var(--app-warning) 35%, var(--app-border));
  background: color-mix(in srgb, var(--app-warning) 6%, var(--app-panel));
}

.playbook-stage-card.tone-danger {
  border-color: color-mix(in srgb, var(--app-danger) 40%, var(--app-border));
  background: color-mix(in srgb, var(--app-danger) 4%, var(--app-panel));
}

.playbook-stage-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.playbook-stage-top span {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--app-text-secondary);
}

.playbook-stage-top strong {
  font-size: 13px;
}

.playbook-stage-card p,
.playbook-gate-item p {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--app-text-secondary);
}

.playbook-gate-item strong {
  font-size: 13px;
}
</style>
