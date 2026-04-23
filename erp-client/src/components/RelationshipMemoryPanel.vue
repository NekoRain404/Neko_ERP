<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { ModuleKey } from '@/config/module-manifest'
import { buildRelationshipMemoryPreset } from '@/utils/relationship-memory'
import { useI18n } from '@/i18n'

const props = defineProps<{
  moduleKey: ModuleKey
}>()

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const preset = computed(() => buildRelationshipMemoryPreset(props.moduleKey, isEnglish.value))

async function copyTemplate(content: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(content)
  }
  ElMessage.success(isEnglish.value ? 'Template copied' : '模板已复制')
}
</script>

<template>
  <article v-if="preset" class="erp-card memory-panel">
    <div class="section-title">{{ preset.title }}</div>
    <p class="memory-copy">{{ preset.description }}</p>

    <div class="memory-block">
      <strong>{{ isEnglish ? 'Quick Facts To Capture' : '建议先记下的要点' }}</strong>
      <div class="fact-list">
        <div v-for="item in preset.quickFacts" :key="item.key" class="fact-item">
          <span>{{ item.label }}</span>
          <p>{{ item.description }}</p>
        </div>
      </div>
    </div>

    <div class="memory-block">
      <strong>{{ isEnglish ? 'Reusable Note Templates' : '可复用便签模板' }}</strong>
      <div class="template-list">
        <div v-for="item in preset.templates" :key="item.key" class="template-item">
          <div class="template-head">
            <span>{{ item.label }}</span>
            <el-button size="small" text @click="copyTemplate(item.content)">
              {{ isEnglish ? 'Copy' : '复制' }}
            </el-button>
          </div>
          <p>{{ item.description }}</p>
          <code>{{ item.content }}</code>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.memory-panel {
  padding: 22px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.memory-copy {
  margin: 10px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.memory-block {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fact-list,
.template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fact-item,
.template-item {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.fact-item span,
.template-head span {
  font-weight: 700;
}

.fact-item p,
.template-item p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.template-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.template-item code {
  display: block;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--app-soft);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-size: 12px;
}
</style>
