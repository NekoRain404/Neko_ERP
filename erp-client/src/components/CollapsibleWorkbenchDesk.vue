<script setup lang="ts">
import CompactNoticeBar from '@/components/CompactNoticeBar.vue'

withDefaults(defineProps<{
  expanded: boolean
  title: string
  description: string
  collapsedMessage: string
  articleClass?: string | string[]
  expandLabel?: string
  collapseLabel?: string
}>(), {
  articleClass: '',
  expandLabel: 'Expand',
  collapseLabel: 'Collapse',
})

const emit = defineEmits<{
  (e: 'toggle'): void
}>()
</script>

<template>
  <article :class="['erp-card', 'ops-panel', articleClass]">
    <div class="ops-header">
      <div>
        <div class="ops-title">{{ title }}</div>
        <p class="ops-desc">{{ description }}</p>
      </div>
      <div class="ops-actions">
        <slot name="actions" />
        <el-button size="small" :type="expanded ? 'default' : 'primary'" @click="emit('toggle')">
          {{ expanded ? collapseLabel : expandLabel }}
        </el-button>
      </div>
    </div>
    <slot v-if="expanded" />
    <CompactNoticeBar v-else class="collapsible-workbench-desk__notice" :message="collapsedMessage" />
  </article>
</template>

<style scoped>
.collapsible-workbench-desk__notice {
  margin-top: 16px;
}
</style>
