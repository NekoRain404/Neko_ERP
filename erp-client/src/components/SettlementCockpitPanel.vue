<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import {
  fetchFinancialTraceCockpit,
  type FinancialTraceCockpit,
  type FinancialTraceCockpitRecord,
} from '@/api/financial-trace'
import type { ModuleKey } from '@/config/module-manifest'
import { useI18n } from '@/i18n'
import { usePreferencesStore } from '@/stores/preferences'
import { buildModuleFinancialTraceSummary } from '@/utils/financial-trace'
import { buildModuleSettlementSummary } from '@/utils/first-wave-settlement'
import { formatDateTime } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    moduleKey: ModuleKey
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
const cockpit = ref<FinancialTraceCockpit | null>(null)

const supportsBackendCockpit = computed(() =>
  ['accountInvoice', 'accountPayment', 'accountMove'].includes(props.moduleKey),
)

const panelTitle = computed(() =>
  props.title || (isEnglish.value ? `${moduleTitle(props.moduleKey)} Settlement Cockpit` : `${moduleTitle(props.moduleKey)}结算驾驶舱`),
)
const panelDescription = computed(() =>
  props.description || (isEnglish.value
    ? 'Keep settlement continuity, reconciliation pressure, and finance evidence in one cockpit before close traffic widens.'
    : '在关账流量继续扩大前，把结算连续性、对账压力和财务证据固定在一块驾驶舱里。'),
)
const settlementSummary = computed(() =>
  buildModuleSettlementSummary({
    moduleKey: props.moduleKey,
    isEnglish: isEnglish.value,
    reminders: reminderItems.value.map((item) => ({
      type: item.type,
      severity: item.severity,
    })),
  }),
)
const traceSummary = computed(() =>
  buildModuleFinancialTraceSummary({
    moduleKey: props.moduleKey,
    isEnglish: isEnglish.value,
    reminders: reminderItems.value,
  }),
)
const panelTone = computed(() => {
  if (settlementSummary.value.missingCount || traceSummary.value.missingCount || cockpit.value?.missingCount) return 'danger'
  if (settlementSummary.value.warningCount || traceSummary.value.warningCount || cockpit.value?.warningCount) return 'warning'
  return 'success'
})
const panelStatus = computed(() => {
  if (panelTone.value === 'danger') {
    return isEnglish.value ? 'Blocked' : '阻塞'
  }
  if (panelTone.value === 'warning') {
    return isEnglish.value ? 'In Progress' : '推进中'
  }
  return isEnglish.value ? 'Ready' : '就绪'
})
const prioritizedRecords = computed(() => {
  if (!cockpit.value?.records?.length) return []
  return [
    ...cockpit.value.records.filter((item) => item.status !== 'ready'),
    ...cockpit.value.records.filter((item) => item.status === 'ready'),
  ].slice(0, props.compact ? 3 : 5)
})
const cockpitCards = computed(() => {
  const cards = [
    {
      key: 'settlement',
      label: isEnglish.value ? 'Settlement Status' : '结算状态',
      value: settlementSummary.value.statusLabel,
      description: settlementSummary.value.lines[0] || (isEnglish.value ? 'Settlement continuity summary.' : '结算连续性摘要。'),
    },
    {
      key: 'trace',
      label: isEnglish.value ? 'Trace Status' : '追溯状态',
      value: cockpit.value && supportsBackendCockpit.value ? `${cockpit.value.warningCount + cockpit.value.missingCount}` : traceSummary.value.statusLabel,
      description: cockpit.value && supportsBackendCockpit.value
        ? (isEnglish.value
            ? `${cockpit.value.warningCount + cockpit.value.missingCount} finance records still need repair.`
            : `还有 ${cockpit.value.warningCount + cockpit.value.missingCount} 条财务记录待修补。`)
        : traceSummary.value.lines[0],
    },
  ]

  if (props.moduleKey === 'accountMove') {
    const openLineCount = cockpit.value?.records?.reduce((sum, item) => sum + Number(item.openLineCount || 0), 0) || 0
    const matchedLineCount = cockpit.value?.records?.reduce((sum, item) => sum + Number(item.matchedLineCount || 0), 0) || 0
    cards.push(
      {
        key: 'open-items',
        label: isEnglish.value ? 'Open Items' : '未清项',
        value: String(openLineCount),
        description: isEnglish.value ? 'Open lines that still need reconcile or close explanation.' : '仍需要对账或关账解释的开放分录行数量。',
      },
      {
        key: 'matched-lines',
        label: isEnglish.value ? 'Matched Lines' : '已匹配分录',
        value: String(matchedLineCount),
        description: isEnglish.value ? 'Matched or reconciled journal lines already carrying settlement outcome.' : '已经带着结算结果的已匹配分录数量。',
      },
    )
  } else if (props.moduleKey === 'accountInvoice') {
    const linkedPayments = cockpit.value?.records?.filter((item) => item.paymentRef).length || 0
    const pendingPayments = cockpit.value?.records?.filter((item) => item.paymentState && item.paymentState !== 'paid').length || 0
    cards.push(
      {
        key: 'linked-payments',
        label: isEnglish.value ? 'Linked Payments' : '已链接付款',
        value: String(linkedPayments),
        description: isEnglish.value ? 'Invoices already connected to downstream payment artifacts.' : '已经连到下游付款结果对象的发票数量。',
      },
      {
        key: 'pending-payments',
        label: isEnglish.value ? 'Pending Payments' : '待闭环付款',
        value: String(pendingPayments),
        description: isEnglish.value ? 'Posted invoices still waiting for paid-state settlement.' : '已过账但仍待进入 paid 状态闭环的发票数量。',
      },
    )
  } else if (props.moduleKey === 'accountPayment') {
    const journalReady = cockpit.value?.records?.filter((item) => item.journalEntryRef).length || 0
    const invoiceLinked = cockpit.value?.records?.filter((item) => item.invoiceRef).length || 0
    cards.push(
      {
        key: 'journal-ready',
        label: isEnglish.value ? 'Journal Ready' : '凭证就绪',
        value: String(journalReady),
        description: isEnglish.value ? 'Payments already carrying journal entry trace after posting.' : '过账后已经带上凭证追溯的付款数量。',
      },
      {
        key: 'invoice-linked',
        label: isEnglish.value ? 'Invoice Linked' : '发票已关联',
        value: String(invoiceLinked),
        description: isEnglish.value ? 'Payments still anchored to invoice context instead of detached finance cleanup.' : '仍锚定在发票上下文、没有漂移成孤立财务清理的付款数量。',
      },
    )
  }

  return cards
})

function toneClass(status?: string | null) {
  if (status === 'missing') return 'danger'
  if (status === 'warning') return 'warning'
  return 'success'
}

function recordSummary(record: FinancialTraceCockpitRecord) {
  if (props.moduleKey === 'accountMove') {
    return isEnglish.value
      ? `Open ${record.openLineCount || 0} · Matched ${record.matchedLineCount || 0} · ${record.reconcileContext || 'No reconcile context'}`
      : `未清 ${record.openLineCount || 0} · 已匹配 ${record.matchedLineCount || 0} · ${record.reconcileContext || '暂无对账上下文'}`
  }
  if (props.moduleKey === 'accountInvoice') {
    return isEnglish.value
      ? `${record.paymentState || 'draft'} · ${record.paymentRef || 'No payment'} · ${record.originRef || 'No origin'}`
      : `${record.paymentState || 'draft'} · ${record.paymentRef || '暂无付款'} · ${record.originRef || '暂无来源'}`
  }
  return isEnglish.value
    ? `${record.invoiceRef || 'No invoice'} · ${record.journalEntryRef || 'No journal'} · ${record.originRef || 'No origin'}`
    : `${record.invoiceRef || '暂无发票'} · ${record.journalEntryRef || '暂无凭证'} · ${record.originRef || '暂无来源'}`
}

function openSettlementDesk() {
  void router.push({
    name: props.moduleKey,
    query: {
      section: 'ops-settlement',
    },
  })
}

function openCloseDesk() {
  void router.push({
    name: props.moduleKey,
    query: {
      section: 'ops-close',
    },
  })
}

function openRecord(record: FinancialTraceCockpitRecord) {
  void router.push({
    name: props.moduleKey,
    query: {
      detailId: String(record.id),
      section: 'traceability',
      relatedTo: props.moduleKey,
    },
  })
}

async function refresh() {
  loading.value = true
  try {
    const [reminders, cockpitData] = await Promise.all([
      fetchReminders({
        limit: props.compact ? 12 : 24,
        moduleKey: props.moduleKey,
      }),
      supportsBackendCockpit.value
        ? fetchFinancialTraceCockpit(props.moduleKey, props.compact ? 4 : 8).catch(() => null)
        : Promise.resolve(null),
    ])
    reminderItems.value = reminders
    cockpit.value = cockpitData
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.moduleKey, preferencesStore.language],
  () => {
    void refresh()
  },
)

onMounted(() => {
  void refresh()
})
</script>

<template>
  <article class="erp-card settlement-cockpit-panel" :class="[`tone-${panelTone}`, { compact }]">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
      <el-tag :type="panelTone" effect="plain">{{ panelStatus }}</el-tag>
    </div>

    <div v-if="loading" class="panel-empty">
      {{ isEnglish ? 'Loading settlement cockpit...' : '正在加载结算驾驶舱...' }}
    </div>

    <template v-else>
      <div class="card-grid">
        <article v-for="item in cockpitCards" :key="item.key" class="metric-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>

      <div class="status-notes">
        <p>{{ settlementSummary.lines.join(' · ') }}</p>
        <p>{{ traceSummary.lines.join(' · ') }}</p>
      </div>

      <div v-if="prioritizedRecords.length" class="record-list">
        <button
          v-for="record in prioritizedRecords"
          :key="`${record.id}-${record.ref}`"
          type="button"
          class="record-row"
          :class="`tone-${toneClass(record.status)}`"
          @click="openRecord(record)"
        >
          <div class="record-head">
            <strong>{{ record.ref || `#${record.id}` }}</strong>
            <span>{{ record.state || '-' }}</span>
          </div>
          <p>{{ recordSummary(record) }}</p>
          <small>{{ isEnglish ? 'Evidence' : '证据' }} · {{ record.attachmentCount || 0 }} / {{ record.noteCount || 0 }} / {{ record.logCount || 0 }}</small>
        </button>
      </div>

      <div class="panel-actions">
        <el-button size="small" type="primary" @click="openSettlementDesk">
          {{ isEnglish ? 'Open Settlement Desk' : '打开结算台' }}
        </el-button>
        <el-button size="small" @click="openCloseDesk">
          {{ isEnglish ? 'Open Close Desk' : '打开关账台' }}
        </el-button>
      </div>

      <p v-if="cockpit?.records?.length" class="footnote">
        {{ isEnglish
          ? `Last sampled records: ${cockpit.records.length} · refreshed at ${formatDateTime(new Date().toISOString())}`
          : `最近采样记录：${cockpit.records.length} 条 · 刷新时间 ${formatDateTime(new Date().toISOString())}` }}
      </p>
    </template>
  </article>
</template>

<style scoped>
.settlement-cockpit-panel {
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
.footnote {
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
  text-align: left;
  background: rgba(15, 23, 42, 0.04);
  cursor: pointer;
}

.record-row.tone-danger {
  background: rgba(220, 38, 38, 0.08);
}

.record-row.tone-warning {
  background: rgba(245, 158, 11, 0.1);
}

.record-row.tone-success {
  background: rgba(22, 163, 74, 0.08);
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

.panel-empty {
  padding: 12px 0;
  color: var(--el-text-color-secondary);
}

.settlement-cockpit-panel.compact .card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 768px) {
  .panel-header,
  .record-head {
    flex-direction: column;
  }

  .settlement-cockpit-panel.compact .card-grid,
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
