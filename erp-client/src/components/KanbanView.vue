<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { fetchEntityPage, updateEntity } from '@/api/modules'
import { ElMessage } from 'element-plus/es/components/message/index'
import type { ModuleConfig } from '@/types/api'
import { useI18n } from '@/i18n'

const props = defineProps<{
  config: ModuleConfig
  groupField: string
}>()

const emit = defineEmits<{
  select: [item: any]
}>()

const config = computed(() => props.config)
const loading = ref(false)
const { t } = useI18n()

const groupOptions = [
  { label: 'DRAFT', value: 'draft', color: '#86868b' },
  { label: 'CONFIRMED', value: 'sale', color: '#0071e3' },
  { label: 'DONE', value: 'done', color: '#00a09d' }
]

const kanbanData = ref<Record<string, any[]>>({})

async function loadKanban() {
  if (!config.value.apiBase) return
  loading.value = true
  try {
    const res = await fetchEntityPage<any>(config.value.apiBase, { current: 1, size: 200 })
    const grouped: Record<string, any[]> = {}
    groupOptions.forEach(opt => grouped[opt.value] = [])
    res.records.forEach(item => {
      const val = String(item[props.groupField] || 'draft')
      if (grouped[val]) grouped[val].push(item)
    })
    kanbanData.value = grouped
  } finally {
    loading.value = false
  }
}

// 🚀 零依赖原生拖拽逻辑
let draggedItem: any = null
function onDragStart(item: any) { draggedItem = item }

async function onDrop(targetState: string) {
  if (!draggedItem || draggedItem[props.groupField] === targetState) return
  
  const originalState = draggedItem[props.groupField]
  // 乐观更新 UI
  kanbanData.value[originalState] = kanbanData.value[originalState].filter(i => i.id !== draggedItem.id)
  kanbanData.value[targetState].push({ ...draggedItem, [props.groupField]: targetState })

  try {
    await updateEntity(config.value.apiBase, draggedItem.id, { ...draggedItem, [props.groupField]: targetState })
    ElMessage.success(t('app.actionSuccess'))
  } catch {
    void loadKanban()
  }
}

onMounted(loadKanban)
watch(() => [props.config.apiBase, props.groupField], () => {
  void loadKanban()
})
</script>

<template>
  <div class="ultimate-kanban" v-loading="loading">
    <div 
      class="kanban-lane" 
      v-for="lane in groupOptions" 
      :key="lane.value"
      @dragover.prevent
      @drop="onDrop(lane.value)"
    >
      <header class="lane-header">
        <div class="lane-title-box">
           <div class="lane-dot" :style="{ background: lane.color }"></div>
           <span class="lane-name">{{ lane.label }}</span>
        </div>
        <span class="lane-badge">{{ kanbanData[lane.value]?.length || 0 }}</span>
      </header>
      
      <div class="lane-cards">
        <div 
          v-for="item in kanbanData[lane.value]" 
          :key="item.id"
          class="kanban-card modern-card"
          draggable="true"
          @dragstart="onDragStart(item)"
          @click="emit('select', item)"
        >
          <div class="card-tag">#{{ item.id }}</div>
          <div class="card-title">{{ item.name || item.username || item.code || `ID:${item.id}` }}</div>
          <div class="card-meta">
            <span class="card-price" v-if="item.amountTotal">¥{{ item.amountTotal }}</span>
            <el-avatar :size="18" src="https://api.dicebear.com/7.x/initials/svg?seed=U" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ultimate-kanban { display: flex; gap: 32px; padding: 32px; overflow-x: auto; height: 100%; background: var(--app-surface); }
.kanban-lane { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; }

.lane-header { display: flex; justify-content: space-between; align-items: center; padding: 0 8px 16px; }
.lane-title-box { display: flex; align-items: center; gap: 8px; }
.lane-dot { width: 8px; height: 8px; border-radius: 50%; }
.lane-name { font-size: 12px; font-weight: 700; color: var(--app-text-secondary); letter-spacing: 1px; }
.lane-badge { font-size: 11px; color: var(--app-text-secondary); font-weight: 600; }

.lane-cards { flex: 1; overflow-y: auto; padding: 4px; }
.kanban-card { 
  background: var(--app-panel); padding: 20px; margin-bottom: 16px; cursor: grab;
  border: 1px solid var(--app-border);
}
.kanban-card:active { cursor: grabbing; transform: scale(0.98); }

.card-tag { font-family: monospace; font-size: 10px; color: var(--app-primary); margin-bottom: 8px; font-weight: 700; opacity: 0.6; }
.card-title { font-size: 15px; font-weight: 600; color: var(--app-text); margin-bottom: 16px; line-height: 1.4; }
.card-meta { display: flex; justify-content: space-between; align-items: center; }
.card-price { font-weight: 700; font-size: 14px; color: var(--app-text); }
</style>
