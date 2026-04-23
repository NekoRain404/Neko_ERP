<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchEntityPage } from '@/api/modules'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import { useI18n } from '@/i18n'
import { usePreferencesStore } from '@/stores/preferences'
import type { BaseEntity } from '@/types/api'
import { buildModuleFinancialTraceSummary } from '@/utils/financial-trace'
import { buildModuleSettlementSummary } from '@/utils/first-wave-settlement'
import { formatDateTime } from '@/utils/format'

interface InvoiceRow extends BaseEntity {
  id: number
  name?: string
  state?: string
  originRef?: string
  paymentRef?: string
  paymentState?: string
  dueDate?: string
  amountTotal?: number
}

interface PaymentRow extends BaseEntity {
  id: number
  name?: string
  state?: string
  paymentType?: string
  amount?: number
  date?: string
  invoiceRef?: string
  originRef?: string
  journalEntryRef?: string
}

interface MoveRow extends BaseEntity {
  id: number
  name?: string
  ref?: string
  state?: string
  moveType?: string
  date?: string
  reversedEntryRef?: string
  reversedFromRef?: string
  amountTotal?: number
}

interface LinkageRow {
  key: string
  kind: 'invoice' | 'payment' | 'move'
  moduleKey: ModuleKey
  id: number
  ref: string
  status: 'danger' | 'warning' | 'success'
  primaryText: string
  secondaryText: string
  dateLabel?: string
}

const statusWeight: Record<LinkageRow['status'], number> = {
  danger: 0,
  warning: 1,
  success: 2,
}

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
const invoiceRows = ref<InvoiceRow[]>([])
const paymentRows = ref<PaymentRow[]>([])
const moveRows = ref<MoveRow[]>([])

const panelTitle = computed(() =>
  props.title || (isEnglish.value ? `${moduleTitle(props.moduleKey)} Payment Linkage` : `${moduleTitle(props.moduleKey)}付款联动`),
)
const panelDescription = computed(() =>
  props.description || (isEnglish.value
    ? 'Keep invoice, payment, and journal anchors visible together so settlement closure does not fragment into separate finance searches.'
    : '把发票、付款和凭证锚点固定在一起，避免结算闭环再次碎裂成分散的财务搜索。'),
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

const invoiceMap = computed(() =>
  invoiceRows.value.reduce<Record<string, InvoiceRow>>((summary, row) => {
    if (row.name) summary[row.name] = row
    return summary
  }, {}),
)
const moveMap = computed(() =>
  moveRows.value.reduce<Record<string, MoveRow>>((summary, row) => {
    if (row.name) summary[row.name] = row
    return summary
  }, {}),
)

const linkageRows = computed<LinkageRow[]>(() => {
  const paymentBasedRows = paymentRows.value.map<LinkageRow>((payment) => {
    const invoice = payment.invoiceRef ? invoiceMap.value[payment.invoiceRef] : undefined
    const move = payment.journalEntryRef ? moveMap.value[payment.journalEntryRef] : undefined
    const missingInvoice = !payment.invoiceRef || !invoice
    const missingMove = !payment.journalEntryRef || !move
    const status: LinkageRow['status'] = missingInvoice || missingMove ? 'danger' : payment.state === 'posted' ? 'success' : 'warning'
    return {
      key: `payment-${payment.id}`,
      kind: 'payment' as const,
      moduleKey: 'accountPayment' as const,
      id: payment.id,
      ref: payment.name || `#${payment.id}`,
      status,
      primaryText: isEnglish.value
        ? `${payment.invoiceRef || 'No invoice'} · ${payment.journalEntryRef || 'No journal'}`
        : `${payment.invoiceRef || '暂无发票'} · ${payment.journalEntryRef || '暂无凭证'}`,
      secondaryText: isEnglish.value
        ? `${payment.paymentType || 'payment'} · ${payment.amount || 0} · ${payment.originRef || 'No origin'}`
        : `${payment.paymentType || 'payment'} · ${payment.amount || 0} · ${payment.originRef || '暂无来源'}`,
      dateLabel: payment.date,
    }
  })

  const invoiceGapRows = invoiceRows.value
    .filter((invoice) => !invoice.paymentRef || invoice.paymentState !== 'paid')
    .map<LinkageRow>((invoice) => {
      const status: LinkageRow['status'] = invoice.paymentRef ? 'warning' : 'danger'
      return {
        key: `invoice-${invoice.id}`,
        kind: 'invoice' as const,
        moduleKey: 'accountInvoice' as const,
        id: invoice.id,
        ref: invoice.name || `#${invoice.id}`,
        status,
        primaryText: isEnglish.value
          ? `${invoice.paymentState || 'draft'} · ${invoice.paymentRef || 'No payment'}`
          : `${invoice.paymentState || 'draft'} · ${invoice.paymentRef || '暂无付款'}`,
        secondaryText: isEnglish.value
          ? `${invoice.originRef || 'No origin'} · ${invoice.amountTotal || 0}`
          : `${invoice.originRef || '暂无来源'} · ${invoice.amountTotal || 0}`,
        dateLabel: invoice.dueDate,
      }
    })

  const moveGapRows = moveRows.value
    .filter((move) => move.state !== 'posted' || !paymentRows.value.some((payment) => payment.journalEntryRef === move.name))
    .map<LinkageRow>((move) => {
      const status: LinkageRow['status'] = move.state === 'posted' ? 'warning' : 'danger'
      return {
        key: `move-${move.id}`,
        kind: 'move' as const,
        moduleKey: 'accountMove' as const,
        id: move.id,
        ref: move.name || `#${move.id}`,
        status,
        primaryText: isEnglish.value
          ? `${move.ref || 'No ref'} · ${move.state || 'draft'}`
          : `${move.ref || '暂无引用'} · ${move.state || 'draft'}`,
        secondaryText: isEnglish.value
          ? `${move.reversedFromRef || 'No reverse source'} · ${move.amountTotal || 0}`
          : `${move.reversedFromRef || '暂无冲销来源'} · ${move.amountTotal || 0}`,
        dateLabel: move.date,
      }
    })

  return [...paymentBasedRows, ...invoiceGapRows, ...moveGapRows]
    .sort((left, right) => {
      return statusWeight[left.status] - statusWeight[right.status]
    })
    .slice(0, props.compact ? 4 : 7)
})

const linkedInvoiceCount = computed(() =>
  paymentRows.value.filter((item) => item.invoiceRef && invoiceMap.value[item.invoiceRef]).length,
)
const linkedMoveCount = computed(() =>
  paymentRows.value.filter((item) => item.journalEntryRef && moveMap.value[item.journalEntryRef]).length,
)
const unresolvedCount = computed(() =>
  linkageRows.value.filter((item) => item.status !== 'success').length,
)
const panelTone = computed<'danger' | 'warning' | 'success'>(() => {
  if (unresolvedCount.value > 0) return 'danger'
  if (paymentRows.value.some((item) => item.state !== 'posted')) return 'warning'
  return 'success'
})

const cards = computed(() => [
  {
    key: 'invoice-anchor',
    label: isEnglish.value ? 'Invoice Anchors' : '发票锚点',
    value: `${linkedInvoiceCount.value}/${invoiceRows.value.length || 0}`,
    description: isEnglish.value
      ? 'Payments already tied back to sampled invoices.'
      : '当前付款里已经回锚到采样发票的数量。',
  },
  {
    key: 'journal-anchor',
    label: isEnglish.value ? 'Journal Anchors' : '凭证锚点',
    value: `${linkedMoveCount.value}/${paymentRows.value.length || 0}`,
    description: isEnglish.value
      ? 'Payments already carrying downstream journal entry refs.'
      : '当前付款里已经带下游凭证引用的数量。',
  },
  {
    key: 'unresolved',
    label: isEnglish.value ? 'Unresolved Links' : '待补联动',
    value: String(unresolvedCount.value),
    description: isEnglish.value
      ? 'Invoice, payment, or move anchors still needing repair.'
      : '仍需要补齐的发票、付款或凭证锚点数量。',
  },
  {
    key: 'focus',
    label: isEnglish.value ? 'Current Focus' : '当前重点',
    value: settlementSummary.value.statusLabel,
    description: traceSummary.value.lines[0] || (isEnglish.value ? 'Keep payment linkage and finance evidence continuous.' : '持续保持付款联动和财务证据连续。'),
  },
])

function openLinkageDesk() {
  void router.push({
    name: props.moduleKey,
    query: {
      section: 'ops-payment-linkage',
    },
  })
}

function openSettlementDesk() {
  void router.push({
    name: props.moduleKey,
    query: {
      section: 'ops-settlement',
    },
  })
}

function openRow(row: LinkageRow) {
  void router.push({
    name: row.moduleKey,
    query: {
      detailId: String(row.id),
      section: 'traceability',
      relatedTo: props.moduleKey,
    },
  })
}

async function refresh() {
  loading.value = true
  try {
    const pageSize = props.compact ? 6 : 10
    const [reminders, invoices, payments, moves] = await Promise.all([
      fetchReminders({
        limit: props.compact ? 12 : 24,
        moduleKey: props.moduleKey,
      }),
      fetchEntityPage<InvoiceRow>('/account/account-invoice', { current: 1, size: pageSize }),
      fetchEntityPage<PaymentRow>('/account/account-payment', { current: 1, size: pageSize }),
      fetchEntityPage<MoveRow>('/account/account-move', { current: 1, size: pageSize }),
    ])
    reminderItems.value = reminders
    invoiceRows.value = invoices.records || []
    paymentRows.value = payments.records || []
    moveRows.value = moves.records || []
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
  <article class="erp-card payment-linkage-panel" :class="[`tone-${panelTone}`, { compact }]">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
      <el-tag :type="panelTone" effect="plain">
        {{ unresolvedCount > 0 ? (isEnglish ? 'Repair Needed' : '待修补') : (isEnglish ? 'Anchored' : '已锚定') }}
      </el-tag>
    </div>

    <div v-if="loading" class="panel-empty">
      {{ isEnglish ? 'Loading payment linkage...' : '正在加载付款联动...' }}
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
          v-for="row in linkageRows"
          :key="row.key"
          type="button"
          class="record-row"
          :class="`tone-${row.status}`"
          @click="openRow(row)"
        >
          <div class="record-head">
            <strong>{{ row.ref }}</strong>
            <span>{{ moduleTitle(row.moduleKey) }}</span>
          </div>
          <p>{{ row.primaryText }}</p>
          <small>
            {{ row.secondaryText }}
            <template v-if="row.dateLabel">
              · {{ formatDateTime(row.dateLabel) }}
            </template>
          </small>
        </button>
      </div>

      <div class="panel-actions">
        <el-button size="small" type="primary" @click="openLinkageDesk">
          {{ isEnglish ? 'Open Linkage Desk' : '打开联动台' }}
        </el-button>
        <el-button size="small" @click="openSettlementDesk">
          {{ isEnglish ? 'Open Settlement Desk' : '打开结算台' }}
        </el-button>
      </div>
    </template>
  </article>
</template>

<style scoped>
.payment-linkage-panel {
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
