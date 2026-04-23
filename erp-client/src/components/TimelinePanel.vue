<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ModuleKey } from '@/config/module-manifest'
import { createTimelineNote, fetchTimeline, type TimelineActivity } from '@/api/timeline'
import { formatDateTime } from '@/utils/format'
import { useI18n } from '@/i18n'
import { buildRelationshipMemoryPreset } from '@/utils/relationship-memory'

const props = defineProps<{
  moduleKey: ModuleKey
  recordId: number
}>()
const emit = defineEmits<{
  (event: 'updated'): void
}>()

const { locale } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')

const loading = ref(false)
const noteContent = ref('')
const items = ref<TimelineActivity[]>([])
const activeFilter = ref<'all' | 'system' | 'note' | 'attachment'>('all')

const panelTitle = computed(() => (isEnglish.value ? 'Timeline' : '时间轴'))
const emptyText = computed(() => (isEnglish.value ? 'No timeline items yet.' : '当前还没有时间轴记录。'))
const notePlaceholder = computed(() => (isEnglish.value ? 'Write a private note...' : '输入一条内部便签...'))
const saveLabel = computed(() => (isEnglish.value ? 'Add Note' : '添加便签'))
const memoryPreset = computed(() => buildRelationshipMemoryPreset(props.moduleKey, isEnglish.value))
const filteredItems = computed(() =>
  activeFilter.value === 'all' ? items.value : items.value.filter((item) => item.type === activeFilter.value),
)
const typeCounts = computed(() => ({
  all: items.value.length,
  system: items.value.filter((item) => item.type === 'system').length,
  note: items.value.filter((item) => item.type === 'note').length,
  attachment: items.value.filter((item) => item.type === 'attachment').length,
}))
const noteTemplates = computed(() =>
  memoryPreset.value?.templates || [
    {
      key: 'general',
      label: isEnglish.value ? 'General Note' : '通用便签',
      description: isEnglish.value ? 'Reusable note starter.' : '可复用的通用便签起手模板。',
      content: isEnglish.value ? 'Context note:\n- Situation:\n- Decision:\n- Next action:' : '上下文便签：\n- 情况：\n- 结论：\n- 下一动作：',
    },
  ],
)

async function loadTimeline() {
  if (!props.recordId) return
  loading.value = true
  try {
    items.value = await fetchTimeline(props.moduleKey, props.recordId)
  } finally {
    loading.value = false
  }
}

async function submitNote() {
  const content = noteContent.value.trim()
  if (!content) return
  loading.value = true
  try {
    await createTimelineNote(props.moduleKey, props.recordId, content, 'NEKO_ERP')
    noteContent.value = ''
    await loadTimeline()
    emit('updated')
    ElMessage.success(isEnglish.value ? 'Note saved' : '便签已保存')
  } finally {
    loading.value = false
  }
}

function useTemplate(content: string) {
  // Templates keep pilot notes structured so later users can reuse context
  // instead of writing inconsistent free-form comments.
  noteContent.value = content
}

function typeLabel(type: string) {
  if (isEnglish.value) return type
  if (type === 'system') return '系统'
  if (type === 'note') return '便签'
  if (type === 'attachment') return '附件'
  return type
}

watch(
  () => [props.moduleKey, props.recordId],
  () => {
    void loadTimeline()
  },
  { immediate: true },
)
</script>

<template>
  <section class="timeline-panel" v-loading="loading">
    <div class="timeline-header">
      <div>
        <h4>{{ panelTitle }}</h4>
        <p>{{ isEnglish ? 'System logs, notes, and attachments are merged here.' : '系统日志、内部便签和附件会在这里聚合展示。' }}</p>
      </div>
      <el-button size="small" @click="loadTimeline">
        {{ isEnglish ? 'Refresh' : '刷新' }}
      </el-button>
    </div>

    <div class="timeline-filters">
      <el-tag
        :effect="activeFilter === 'all' ? 'dark' : 'plain'"
        @click="activeFilter = 'all'"
      >
        {{ isEnglish ? 'All' : '全部' }} · {{ typeCounts.all }}
      </el-tag>
      <el-tag
        :effect="activeFilter === 'note' ? 'dark' : 'plain'"
        @click="activeFilter = 'note'"
      >
        {{ isEnglish ? 'Notes' : '便签' }} · {{ typeCounts.note }}
      </el-tag>
      <el-tag
        :effect="activeFilter === 'system' ? 'dark' : 'plain'"
        @click="activeFilter = 'system'"
      >
        {{ isEnglish ? 'Logs' : '日志' }} · {{ typeCounts.system }}
      </el-tag>
      <el-tag
        :effect="activeFilter === 'attachment' ? 'dark' : 'plain'"
        @click="activeFilter = 'attachment'"
      >
        {{ isEnglish ? 'Files' : '附件' }} · {{ typeCounts.attachment }}
      </el-tag>
    </div>

    <div class="timeline-editor">
      <p v-if="memoryPreset" class="memory-hint">{{ memoryPreset.description }}</p>
      <div class="template-list">
        <el-button
          v-for="template in noteTemplates"
          :key="template.key"
          size="small"
          text
          @click="useTemplate(template.content)"
        >
          {{ template.label }}
        </el-button>
      </div>
      <el-input
        v-model="noteContent"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 4 }"
        :placeholder="notePlaceholder"
      />
      <div class="editor-actions">
        <el-button type="primary" size="small" :disabled="!noteContent.trim()" @click="submitNote">{{ saveLabel }}</el-button>
      </div>
    </div>

    <div v-if="filteredItems.length" class="timeline-list">
      <article v-for="item in filteredItems" :key="`${item.type}-${item.timestamp}-${item.content}`" class="timeline-item">
        <div class="timeline-meta">
          <el-tag size="small" effect="plain">{{ typeLabel(item.type) }}</el-tag>
          <span>{{ formatDateTime(item.timestamp) }}</span>
        </div>
        <strong>{{ item.title }}</strong>
        <p>{{ item.content }}</p>
        <div class="timeline-foot">
          <span>{{ item.author || '-' }}</span>
          <span v-if="item.relatedRef">{{ item.relatedRef }}</span>
        </div>
      </article>
    </div>
    <div v-else class="timeline-empty">{{ emptyText }}</div>
  </section>
</template>

<style scoped>
.timeline-panel {
  margin-top: 44px;
  border: 1px solid var(--pro-border);
  border-radius: 16px;
  padding: 20px;
  background: color-mix(in srgb, var(--pro-border-soft) 60%, white);
}

.timeline-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
}

.timeline-header p {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--pro-text-secondary);
}

.timeline-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.timeline-filters {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-list {
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.memory-hint {
  margin: 0 0 10px;
  color: var(--pro-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.timeline-editor {
  margin-top: 18px;
}

.editor-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.timeline-list {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-item {
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--pro-border);
  background: var(--pro-surface, #fff);
}

.timeline-meta,
.timeline-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--pro-text-secondary);
}

.timeline-item strong {
  display: block;
  margin-top: 10px;
  font-size: 14px;
}

.timeline-item p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
}

.timeline-foot {
  margin-top: 10px;
}

.timeline-empty {
  margin-top: 18px;
  padding: 18px;
  border: 1px dashed var(--pro-border);
  border-radius: 12px;
  color: var(--pro-text-secondary);
  font-size: 13px;
}
</style>
