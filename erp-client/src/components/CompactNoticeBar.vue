<script setup lang="ts">
withDefaults(defineProps<{
  message: string
  inline?: boolean
}>(), {
  inline: false,
})
</script>

<template>
  <div class="compact-notice" :class="{ inline }">
    <span class="compact-notice__message">{{ message }}</span>
    <div v-if="$slots.actions" class="compact-notice__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.compact-notice {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--app-primary) 22%, var(--app-border));
  background: color-mix(in srgb, var(--app-primary) 5%, var(--app-surface));
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.compact-notice.inline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.compact-notice__message {
  display: block;
}

.compact-notice__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 720px) {
  .compact-notice.inline {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
