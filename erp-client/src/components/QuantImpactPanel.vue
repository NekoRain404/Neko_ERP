<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchEntityPage } from '@/api/modules'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
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
  locationId?: number
  locationDestId?: number
}

interface MoveRow extends BaseEntity {
  id: number
  pickingId?: number
  state?: string
  moveRole?: string
  productUomQty?: number
  quantity?: number
  locationId?: number
  locationDestId?: number
  originRef?: string
}

interface QuantRow extends BaseEntity {
  id: number
  productId?: number
  locationId?: number
  quantity?: number
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
const quantRows = ref<QuantRow[]>([])

const panelTitle = computed(() =>
  props.title || (isEnglish.value ? `${moduleTitle('stockPicking')} Quant Impact` : `${moduleTitle('stockPicking')}库存影响`),
)
const panelDescription = computed(() =>
  props.description || (isEnglish.value
    ? 'Keep quant-side impact, rollback-sensitive locations, and transfer completion in one place before inventory cutover widens.'
    : '在库存切换继续扩大前，把 quant 侧影响、回退敏感库位和调拨完成度固定在一起。'),
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

const moveGroups = computed(() => {
  const map = new Map<number, MoveRow[]>()
  moveRows.value.forEach((row) => {
    if (!row.pickingId) return
    const bucket = map.get(row.pickingId) || []
    bucket.push(row)
    map.set(row.pickingId, bucket)
  })
  return map
})

const quantByLocation = computed(() =>
  quantRows.value.reduce<Record<number, number>>((summary, row) => {
    if (!row.locationId) return summary
    summary[row.locationId] = (summary[row.locationId] || 0) + Number(row.quantity || 0)
    return summary
  }, {}),
)

const recentRows = computed(() =>
  pickingRows.value.slice(0, props.compact ? 4 : 7).map((picking) => {
    const moves = moveGroups.value.get(picking.id) || []
    const plannedQty = moves.reduce((sum, row) => sum + Number(row.productUomQty || 0), 0)
    const doneQty = moves.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    const sourceQuant = Number(quantByLocation.value[picking.locationId || 0] || 0)
    const destQuant = Number(quantByLocation.value[picking.locationDestId || 0] || 0)
    const rollbackRisk = picking.state === 'done' || doneQty > 0
    return {
      ...picking,
      moveCount: moves.length,
      plannedQty,
      doneQty,
      sourceQuant,
      destQuant,
      rollbackRisk,
      tone: rollbackRisk ? 'warning' : picking.state === 'assigned' ? 'info' : 'success',
    }
  }),
)

const doneImpactRows = computed(() =>
  recentRows.value.filter((row) => row.rollbackRisk).length,
)
const touchedLocationCount = computed(() => {
  const locationIds = new Set<number>()
  recentRows.value.forEach((row) => {
    if (row.locationId) locationIds.add(row.locationId)
    if (row.locationDestId) locationIds.add(row.locationDestId)
  })
  return locationIds.size
})

const cards = computed(() => [
  {
    key: 'pickings',
    label: isEnglish.value ? 'Transfers Reviewed' : '已审调拨',
    value: String(pickingRows.value.length),
    description: isEnglish.value ? 'Recent transfer headers sampled for quant-side review.' : '纳入 quant 侧审查的近期调拨头数量。',
  },
  {
    key: 'locations',
    label: isEnglish.value ? 'Touched Locations' : '涉及库位',
    value: String(touchedLocationCount.value),
    description: isEnglish.value ? 'Source and destination locations touched by sampled pickings.' : '本轮采样调拨涉及的来源与目标库位数。',
  },
  {
    key: 'quant-total',
    label: isEnglish.value ? 'Quant Pool' : '库存池',
    value: String(Object.values(quantByLocation.value).reduce((sum, value) => sum + value, 0)),
    description: isEnglish.value ? 'Visible quant quantity across sampled locations.' : '采样库位范围内当前可见的 quant 数量合计。',
  },
  {
    key: 'rollback-review',
    label: isEnglish.value ? 'Rollback Review' : '回退复核',
    value: String(doneImpactRows.value),
    description: isEnglish.value ? 'Transfers that already carry quant-side effects and deserve rollback review.' : '已经产生 quant 副作用、需要回退复核的调拨数量。',
  },
])

function openQuantImpactDesk() {
  void router.push({
    name: 'stockPicking',
    query: {
      section: 'ops-quant-impact',
    },
  })
}

function openExecutionDesk() {
  void router.push({
    name: 'stockPicking',
    query: {
      section: 'ops-execution-feedback',
    },
  })
}

function openQuantList() {
  void router.push({
    name: 'stockQuant',
    query: {
      relatedTo: 'stockPicking',
    },
  })
}

function openPicking(row: PickingRow) {
  void router.push({
    name: 'stockPicking',
    query: {
      detailId: String(row.id),
      relatedTo: 'stockPicking',
    },
  })
}

async function refresh() {
  loading.value = true
  try {
    const [reminders, pickings, moves, quants] = await Promise.all([
      fetchReminders({
        limit: props.compact ? 12 : 24,
        moduleKey: 'stockPicking',
      }),
      fetchEntityPage<PickingRow>('/stock/stock-picking', { current: 1, size: props.compact ? 6 : 10 }),
      fetchEntityPage<MoveRow>('/stock/stock-move', { current: 1, size: props.compact ? 24 : 48 }),
      fetchEntityPage<QuantRow>('/stock/stock-quant', { current: 1, size: props.compact ? 24 : 48 }),
    ])
    reminderItems.value = reminders
    pickingRows.value = pickings.records || []
    moveRows.value = moves.records || []
    quantRows.value = quants.records || []
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
  <article class="erp-card quant-impact-panel" :class="{ compact }">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
      <el-tag :type="doneImpactRows ? 'warning' : 'success'" effect="plain">
        {{ doneImpactRows ? (isEnglish ? 'Needs Review' : '待复核') : (isEnglish ? 'Stable' : '稳定') }}
      </el-tag>
    </div>

    <div v-if="loading" class="panel-empty">
      {{ isEnglish ? 'Loading quant impact...' : '正在加载库存影响...' }}
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
          :class="`tone-${row.tone}`"
          @click="openPicking(row)"
        >
          <div class="record-head">
            <strong>{{ row.name || `#${row.id}` }}</strong>
            <span>{{ row.state || '-' }}</span>
          </div>
          <p>
            {{ isEnglish
              ? `${row.origin || 'No origin'} · Moves ${row.moveCount} · Done ${row.doneQty}/${row.plannedQty}`
              : `${row.origin || '暂无来源'} · 移动行 ${row.moveCount} · 完成 ${row.doneQty}/${row.plannedQty}` }}
          </p>
          <small>
            {{ isEnglish ? 'Source quant' : '来源库存' }} {{ row.sourceQuant }}
            ·
            {{ isEnglish ? 'Dest quant' : '目标库存' }} {{ row.destQuant }}
            ·
            {{ row.dateDone ? formatDateTime(row.dateDone) : (row.scheduledDate ? formatDateTime(row.scheduledDate) : '-') }}
          </small>
        </button>
      </div>

      <div class="panel-actions">
        <el-button size="small" type="primary" @click="openQuantImpactDesk">
          {{ isEnglish ? 'Open Quant Desk' : '打开库存影响台' }}
        </el-button>
        <el-button size="small" @click="openExecutionDesk">
          {{ isEnglish ? 'Open Execution Desk' : '打开执行台' }}
        </el-button>
        <el-button size="small" @click="openQuantList">
          {{ isEnglish ? 'Open Quant List' : '打开库存量列表' }}
        </el-button>
      </div>
    </template>
  </article>
</template>

<style scoped>
.quant-impact-panel {
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
.record-row small,
.panel-empty {
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

.record-row.tone-warning {
  background: rgba(245, 158, 11, 0.1);
}

.record-row.tone-info {
  background: rgba(14, 165, 233, 0.08);
}

.record-row.tone-success {
  background: rgba(22, 163, 74, 0.08);
}

.record-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.record-head span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.panel-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.compact .card-grid {
  grid-template-columns: 1fr 1fr;
}
</style>
