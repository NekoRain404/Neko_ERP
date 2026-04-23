<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import { fetchEntityPage } from '@/api/modules'
import { useI18n } from '@/i18n'
import { usePreferencesStore } from '@/stores/preferences'
import type { BaseEntity } from '@/types/api'
import { buildModuleFinancialTraceSummary } from '@/utils/financial-trace'
import { buildModuleSettlementSummary } from '@/utils/first-wave-settlement'
import { formatDateTime } from '@/utils/format'

interface PickingRow extends BaseEntity {
  id: number
  name?: string
  state?: string
  origin?: string
  scheduledDate?: string
  dateDone?: string
}

interface MoveRow extends BaseEntity {
  id: number
  pickingId?: number
  state?: string
  moveRole?: string
  productUomQty?: number
  quantity?: number
  originRef?: string
  sourceLineRef?: string
}

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    compact?: boolean
  }>(),
  {
    title: undefined,
    description: undefined,
    compact: false,
  },
)

const router = useRouter()
const preferencesStore = usePreferencesStore()
const { moduleTitle } = useI18n()
const isEnglish = computed(() => preferencesStore.language === 'en-US')
const loading = ref(false)
const reminderItems = ref<ReminderRecord[]>([])
const pickingRows = ref<PickingRow[]>([])
const moveRows = ref<MoveRow[]>([])

const panelTitle = computed(() =>
  props.title || (isEnglish.value ? `${moduleTitle('stockPicking')} Execution Feedback` : `${moduleTitle('stockPicking')}执行反馈`),
)
const panelDescription = computed(() =>
  props.description || (isEnglish.value
    ? 'Keep transfer execution, move completion, and rollback-sensitive inventory signals visible before warehouse scope widens.'
    : '在仓储范围继续扩大前，把调拨执行、移动完成度和库存回退敏感信号固定在同一面板里。'),
)
const settlementSummary = computed(() =>
  buildModuleSettlementSummary({
    moduleKey: 'stockPicking',
    isEnglish: isEnglish.value,
    reminders: reminderItems.value.map((item) => ({
      type: item.type,
      severity: item.severity,
    })),
  }),
)
const traceSummary = computed(() =>
  buildModuleFinancialTraceSummary({
    moduleKey: 'stockPicking',
    isEnglish: isEnglish.value,
    reminders: reminderItems.value,
  }),
)
const pickingById = computed(() => {
  const map = new Map<number, MoveRow[]>()
  moveRows.value.forEach((row) => {
    if (!row.pickingId) return
    const bucket = map.get(row.pickingId) || []
    bucket.push(row)
    map.set(row.pickingId, bucket)
  })
  return map
})
const recentRows = computed(() =>
  pickingRows.value.slice(0, props.compact ? 3 : 5).map((picking) => {
    const moves = pickingById.value.get(picking.id) || []
    const plannedQty = moves.reduce((sum, row) => sum + Number(row.productUomQty || 0), 0)
    const doneQty = moves.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    const readyMoves = moves.filter((row) => row.state === 'assigned').length
    const doneMoves = moves.filter((row) => row.state === 'done').length
    return {
      ...picking,
      moveCount: moves.length,
      readyMoves,
      doneMoves,
      plannedQty,
      doneQty,
      progressLabel: plannedQty > 0
        ? `${doneQty}/${plannedQty}`
        : (isEnglish.value ? 'No moves' : '暂无移动行'),
    }
  }),
)
const cards = computed(() => {
  const readyTransfers = pickingRows.value.filter((item) => item.state === 'assigned').length
  const doneTransfers = pickingRows.value.filter((item) => item.state === 'done').length
  const waitingTransfers = pickingRows.value.filter((item) => item.state === 'confirmed').length
  const plannedQty = moveRows.value.reduce((sum, row) => sum + Number(row.productUomQty || 0), 0)
  const doneQty = moveRows.value.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
  return [
    {
      key: 'transfers',
      label: isEnglish.value ? 'Transfers Reviewed' : '已审调拨',
      value: String(pickingRows.value.length),
      description: isEnglish.value ? 'Recent picking headers sampled for execution review.' : '用于执行复核的近期调拨头记录数量。',
    },
    {
      key: 'ready',
      label: isEnglish.value ? 'Ready / Waiting' : '就绪 / 等待',
      value: `${readyTransfers}/${waitingTransfers}`,
      description: isEnglish.value ? 'Ready transfers compared with still-waiting ones.' : '已经 ready 的调拨，与仍在等待的调拨对比。',
    },
    {
      key: 'done',
      label: isEnglish.value ? 'Done Transfers' : '已完成调拨',
      value: String(doneTransfers),
      description: isEnglish.value ? 'Transfers already validated into quant side effects.' : '已经 Validate 并写入 quant 副作用的调拨数量。',
    },
    {
      key: 'moves',
      label: isEnglish.value ? 'Move Completion' : '移动完成度',
      value: plannedQty > 0 ? `${doneQty}/${plannedQty}` : '0/0',
      description: isEnglish.value ? 'Done quantity against planned quantity across sampled moves.' : '采样移动行中已完成数量与计划数量的对比。',
    },
  ]
})

function openExecutionDesk() {
  void router.push({
    name: 'stockPicking',
    query: {
      section: 'ops-execution-feedback',
    },
  })
}

function openCloseDesk() {
  void router.push({
    name: 'stockPicking',
    query: {
      section: 'ops-close',
    },
  })
}

function openPicking(picking: PickingRow) {
  void router.push({
    name: 'stockPicking',
    query: {
      detailId: String(picking.id),
      relatedTo: 'stockPicking',
    },
  })
}

async function refresh() {
  loading.value = true
  try {
    const [reminders, pickings, moves] = await Promise.all([
      fetchReminders({
        limit: props.compact ? 12 : 24,
        moduleKey: 'stockPicking',
      }),
      fetchEntityPage<PickingRow>('/stock/stock-picking', {
        current: 1,
        size: props.compact ? 6 : 10,
      }),
      fetchEntityPage<MoveRow>('/stock/stock-move', {
        current: 1,
        size: props.compact ? 24 : 48,
      }),
    ])
    reminderItems.value = reminders
    pickingRows.value = pickings.records || []
    moveRows.value = moves.records || []
  } finally {
    loading.value = false
  }
}

watch(
  () => preferencesStore.language,
  () => {
    void refresh()
  },
)

onMounted(() => {
  void refresh()
})
</script>

<template>
  <article class="erp-card stock-execution-panel" :class="{ compact }">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
      <el-tag :type="traceSummary.missingCount || settlementSummary.missingCount ? 'danger' : traceSummary.warningCount || settlementSummary.warningCount ? 'warning' : 'success'" effect="plain">
        {{ traceSummary.statusLabel }}
      </el-tag>
    </div>

    <div v-if="loading" class="panel-empty">
      {{ isEnglish ? 'Loading execution feedback...' : '正在加载执行反馈...' }}
    </div>

    <template v-else>
      <div class="card-grid">
        <article v-for="item in cards" :key="item.key" class="metric-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>

      <div class="status-notes">
        <p>{{ settlementSummary.lines.join(' · ') }}</p>
        <p>{{ traceSummary.lines.join(' · ') }}</p>
      </div>

      <div class="record-list">
        <button
          v-for="row in recentRows"
          :key="row.id"
          type="button"
          class="record-row"
          :class="`tone-${row.state === 'done' ? 'success' : row.state === 'assigned' ? 'warning' : 'info'}`"
          @click="openPicking(row)"
        >
          <div class="record-head">
            <strong>{{ row.name || `#${row.id}` }}</strong>
            <span>{{ row.state || '-' }}</span>
          </div>
          <p>
            {{ isEnglish
              ? `${row.origin || 'No origin'} · Moves ${row.moveCount} · Ready ${row.readyMoves} · Done ${row.doneMoves}`
              : `${row.origin || '暂无来源'} · 移动行 ${row.moveCount} · 就绪 ${row.readyMoves} · 完成 ${row.doneMoves}` }}
          </p>
          <small>
            {{ isEnglish ? 'Progress' : '进度' }} · {{ row.progressLabel }}
            ·
            {{ row.dateDone ? formatDateTime(row.dateDone) : (row.scheduledDate ? formatDateTime(row.scheduledDate) : '-') }}
          </small>
        </button>
      </div>

      <div class="panel-actions">
        <el-button size="small" type="primary" @click="openExecutionDesk">
          {{ isEnglish ? 'Open Execution Desk' : '打开执行台' }}
        </el-button>
        <el-button size="small" @click="openCloseDesk">
          {{ isEnglish ? 'Open Close Desk' : '打开关账台' }}
        </el-button>
      </div>
    </template>
  </article>
</template>

<style scoped>
.stock-execution-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.panel-desc {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 14px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-card span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric-card strong {
  font-size: 20px;
}

.metric-card p,
.status-notes p,
.record-row p,
.panel-empty,
.record-row small {
  margin: 0;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.status-notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.record-list {
  display: grid;
  gap: 10px;
}

.record-row {
  border: 0;
  border-radius: 16px;
  padding: 14px;
  background: rgba(15, 23, 42, 0.04);
  text-align: left;
  cursor: pointer;
}

.record-row.tone-success {
  background: rgba(22, 163, 74, 0.08);
}

.record-row.tone-warning {
  background: rgba(245, 158, 11, 0.1);
}

.record-row.tone-info {
  background: rgba(59, 130, 246, 0.08);
}

.record-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.stock-execution-panel.compact .card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 768px) {
  .panel-header,
  .record-head {
    flex-direction: column;
  }

  .stock-execution-panel.compact .card-grid,
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
