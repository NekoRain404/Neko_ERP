<script setup lang="ts">
import type { SummaryCardItem } from '@/types/summary-cards'

defineProps<{
  items: SummaryCardItem[]
}>()
</script>

<template>
  <div class="summary-card-grid">
    <article
      v-for="item in items"
      :key="item.key"
      class="summary-card"
      :class="item.tone ? `tone-${item.tone}` : ''"
    >
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
      <p>{{ item.description }}</p>
      <div v-if="$slots.actions" class="summary-card__actions">
        <slot name="actions" :item="item" />
      </div>
    </article>
  </div>
</template>

<style scoped>
.summary-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  box-shadow: var(--app-card-shadow);
}

.summary-card span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 22px;
}

.summary-card p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.summary-card__actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-card.tone-warning strong {
  color: #d97706;
}

.summary-card.tone-danger strong {
  color: #dc2626;
}

.summary-card.tone-success strong {
  color: var(--app-primary);
}

@media (max-width: 720px) {
  .summary-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
