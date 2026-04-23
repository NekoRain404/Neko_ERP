<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  fetchFinancialTraceCockpit,
  fetchFinancialTraceDetail,
  type FinancialTraceCockpit,
  type FinancialTraceCockpitRecord,
  type FinancialTraceDetail,
  type FinancialTraceLink,
} from '@/api/financial-trace'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import { useI18n } from '@/i18n'
import { usePreferencesStore } from '@/stores/preferences'
import { buildModuleFinancialTraceSummary } from '@/utils/financial-trace'
import { buildFinancialTraceDetailPacket, buildFinancialTracePacketFilename } from '@/utils/financial-trace-packets'
import { downloadText } from '@/utils/export'
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
const loading = ref(false)
const reminderItems = ref<ReminderRecord[]>([])
const cockpit = ref<FinancialTraceCockpit | null>(null)
const detailVisible = ref(false)
const detailLoading = ref(false)
const activeDetail = ref<FinancialTraceDetail | null>(null)
const isEnglish = computed(() => preferencesStore.language === 'en-US')
const supportsBackendCockpit = computed(() => ['accountInvoice', 'accountPayment', 'accountMove'].includes(props.moduleKey))

const panelTitle = computed(() =>
  props.title || (isEnglish.value ? `${moduleTitle(props.moduleKey)} Financial Trace` : `${moduleTitle(props.moduleKey)}财务追溯`),
)
const panelDescription = computed(() =>
  props.description || (isEnglish.value
    ? 'Keep source linkage, payment continuity, journal evidence, and Monica-style context memory visible from one shared finance cockpit.'
    : '把来源链接、付款连续性、凭证证据和 Monica 风格的上下文记忆收进同一块共享财务驾驶舱。'),
)
const summary = computed(() =>
  buildModuleFinancialTraceSummary({
    moduleKey: props.moduleKey,
    isEnglish: isEnglish.value,
    reminders: reminderItems.value,
  }),
)
const panelStatusLabel = computed(() => {
  if (cockpit.value && supportsBackendCockpit.value) {
    if (cockpit.value.missingCount > 0) return isEnglish.value ? 'Trace Blocked' : '追溯阻塞'
    if (cockpit.value.warningCount > 0) return isEnglish.value ? 'Trace In Progress' : '追溯推进中'
    return isEnglish.value ? 'Trace Ready' : '追溯就绪'
  }
  return summary.value.statusLabel
})
const metricCards = computed(() => {
  if (cockpit.value && supportsBackendCockpit.value) {
    return [
      {
        key: 'records',
        label: isEnglish.value ? 'Reviewed Records' : '已审记录',
        value: cockpit.value.recordCount,
        description: isEnglish.value ? 'Real finance objects sampled by the backend cockpit.' : '由后端真实驾驶舱抽样汇总的财务对象数量。',
      },
      {
        key: 'ready',
        label: isEnglish.value ? 'Ready' : '已就绪',
        value: cockpit.value.readyCount,
        description: isEnglish.value ? 'Records that already keep source, settlement, and evidence continuity.' : '已经保持来源、结算和证据连续性的记录数量。',
      },
      {
        key: 'risky',
        label: isEnglish.value ? 'At Risk' : '风险记录',
        value: cockpit.value.warningCount + cockpit.value.missingCount,
        description: isEnglish.value ? 'Records still missing source anchors, payment linkage, or evidence.' : '仍缺来源锚点、付款链接或证据的记录数量。',
      },
    ]
  }
  return [
    {
      key: 'expected',
      label: isEnglish.value ? 'Expected' : '检查项',
      value: summary.value.expectedCount,
      description: isEnglish.value ? 'Shared finance trace checkpoints attached to this module.' : '当前模块挂接的共享财务追溯检查项数量。',
    },
    {
      key: 'ready',
      label: isEnglish.value ? 'Ready' : '已就绪',
      value: summary.value.readyCount,
      description: isEnglish.value ? 'Trace checkpoints already closed without open reminder pressure.' : '当前没有开放提醒压力、已闭合的追溯检查项数量。',
    },
    {
      key: 'pending',
      label: isEnglish.value ? 'Pending / Blocked' : '待推进 / 阻塞',
      value: summary.value.warningCount + summary.value.missingCount,
      description: isEnglish.value ? 'Items that still need evidence, source explanation, or settlement follow-up.' : '仍需补证据、来源解释或结算跟进的项目数量。',
    },
  ]
})
const cockpitRecords = computed(() => {
  if (!cockpit.value || !supportsBackendCockpit.value) return []
  return cockpit.value.records.slice(0, props.compact ? 3 : 5)
})
const cockpitRiskText = computed(() => {
  if (!cockpit.value || !supportsBackendCockpit.value) return ''
  const parts = [
    cockpit.value.missingKeys?.length
      ? `${isEnglish.value ? 'Blocked' : '阻塞'}: ${cockpit.value.missingKeys.map((key) => translateTraceKey(key)).join(' / ')}`
      : null,
    cockpit.value.warningKeys?.length
      ? `${isEnglish.value ? 'Pending' : '待推进'}: ${cockpit.value.warningKeys.map((key) => translateTraceKey(key)).join(' / ')}`
      : null,
  ]
  return parts.filter(Boolean).join(' · ')
})

function toneBySummary() {
  if (cockpit.value && supportsBackendCockpit.value) {
    if (cockpit.value.missingCount) return 'danger'
    if (cockpit.value.warningCount) return 'warning'
    return 'success'
  }
  if (summary.value.missingCount) return 'danger'
  if (summary.value.warningCount) return 'warning'
  return 'success'
}

function refresh() {
  loading.value = true
  Promise.all([
    fetchReminders({
      limit: 40,
      moduleKey: props.moduleKey,
    }).then((rows) => {
      reminderItems.value = rows
    }),
    // 财务三模块优先切到后端真实聚合，接口异常时也不能拖垮整个追溯面板。
    supportsBackendCockpit.value
      ? fetchFinancialTraceCockpit(props.moduleKey, props.compact ? 4 : 8)
        .then((data) => {
          cockpit.value = data
        })
        .catch(() => {
          cockpit.value = null
        })
      : Promise.resolve().then(() => {
        cockpit.value = null
      }),
  ]).finally(() => {
    loading.value = false
  })
}

function openTraceDesk() {
  void router.push({
    name: props.moduleKey,
    query: {
      section: 'traceability',
    },
  })
}

function openRecord(record: FinancialTraceCockpitRecord) {
  void router.push({
    name: props.moduleKey,
    query: {
      detailId: String(record.id),
      section: 'traceability',
    },
  })
}

async function inspectRecord(record: FinancialTraceCockpitRecord) {
  if (!supportsBackendCockpit.value) return
  detailVisible.value = true
  detailLoading.value = true
  try {
    activeDetail.value = await fetchFinancialTraceDetail(props.moduleKey, record.id)
  } finally {
    detailLoading.value = false
  }
}

function openDetailLink(link: FinancialTraceLink) {
  void router.push({
    name: link.moduleKey as string,
    query: {
      detailId: String(link.recordId),
      section: ['accountInvoice', 'accountPayment', 'accountMove', 'saleOrder', 'purchaseOrder'].includes(String(link.moduleKey))
        ? 'traceability'
        : undefined,
      relatedTo: props.moduleKey,
    },
  })
}

function buildActiveDetailPacketContent() {
  if (!activeDetail.value) return ''
  return buildFinancialTraceDetailPacket({
    english: isEnglish.value,
    generatedAt: formatDateTime(new Date().toISOString()),
    detail: activeDetail.value,
    moduleTitle,
    title: isEnglish.value
      ? `${moduleTitle(props.moduleKey)} Trace Record ${activeDetail.value.record.ref || `#${activeDetail.value.record.id}`}`
      : `${moduleTitle(props.moduleKey)} 追溯记录 ${activeDetail.value.record.ref || `#${activeDetail.value.record.id}`}`,
  })
}

function exportActiveDetailPacket() {
  if (!activeDetail.value) return
  downloadText(
    buildFinancialTracePacketFilename({
      moduleKey: props.moduleKey,
      recordId: activeDetail.value.record.id,
      date: new Date().toISOString().slice(0, 10),
    }),
    buildActiveDetailPacketContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(isEnglish.value ? 'Trace packet exported' : '追溯包已导出')
}

async function copyActiveDetailPacket() {
  if (!activeDetail.value || !navigator.clipboard) return
  await navigator.clipboard.writeText(buildActiveDetailPacketContent())
  ElMessage.success(isEnglish.value ? 'Trace packet copied' : '追溯包已复制')
}

function openActiveDetailRecord() {
  if (!activeDetail.value) return
  void router.push({
    name: props.moduleKey,
    query: {
      detailId: String(activeDetail.value.record.id),
      section: 'traceability',
    },
  })
}

function translateTraceKey(key: string) {
  const dictionary = isEnglish.value
    ? {
        'origin-ref': 'Origin Anchor',
        'payment-linkage': 'Payment Linkage',
        'payment-state-open': 'Settlement Open',
        'billing-evidence': 'Billing Evidence',
        'invoice-ref': 'Invoice Anchor',
        'source-anchor': 'Source Anchor',
        'journal-entry': 'Journal Entry',
        'payment-proof': 'Payment Proof',
        'posting-pending': 'Posting Pending',
        'source-explanation': 'Source Explanation',
        'journal-lines': 'Journal Lines',
        'reconcile-open-items': 'Open Items',
        'reconcile-context': 'Reconcile Context',
        'journal-evidence': 'Journal Evidence',
      }
    : {
        'origin-ref': '来源锚点',
        'payment-linkage': '付款链接',
        'payment-state-open': '结算未闭环',
        'billing-evidence': '开票证据',
        'invoice-ref': '发票锚点',
        'source-anchor': '来源锚点',
        'journal-entry': '凭证引用',
        'payment-proof': '付款证据',
        'posting-pending': '过账待完成',
        'source-explanation': '来源解释',
        'journal-lines': '凭证分录',
        'reconcile-open-items': '未清项',
        'reconcile-context': '对账上下文',
        'journal-evidence': '凭证证据',
      }
  return dictionary[key as keyof typeof dictionary] || key
}

function traceRecordStatusLabel(status: FinancialTraceCockpitRecord['status']) {
  if (status === 'ready') return isEnglish.value ? 'Ready' : '已就绪'
  if (status === 'warning') return isEnglish.value ? 'Pending' : '待推进'
  return isEnglish.value ? 'Blocked' : '阻塞'
}

function buildRecordLines(record: FinancialTraceCockpitRecord) {
  if (props.moduleKey === 'accountInvoice') {
    return [
      `${isEnglish.value ? 'Origin' : '来源'}: ${record.originRef || '-'}`,
      `${isEnglish.value ? 'Payment' : '付款'}: ${record.paymentRef || record.paymentState || '-'}`,
      `${isEnglish.value ? 'Evidence' : '证据'}: ${record.attachmentCount || 0}${isEnglish.value ? ' files' : ' 个附件'} / ${record.noteCount || 0}${isEnglish.value ? ' notes' : ' 条备注'}`,
    ]
  }
  if (props.moduleKey === 'accountPayment') {
    return [
      `${isEnglish.value ? 'Invoice' : '发票'}: ${record.invoiceRef || '-'}`,
      `${isEnglish.value ? 'Origin' : '来源'}: ${record.originRef || '-'}`,
      `${isEnglish.value ? 'Journal' : '凭证'}: ${record.journalEntryRef || '-'}`,
    ]
  }
  if (props.moduleKey === 'accountMove') {
    return [
      `${isEnglish.value ? 'Source' : '来源'}: ${record.originRef || record.reversedFromRef || '-'}`,
      `${isEnglish.value ? 'Open Items' : '未清项'}: ${record.openLineCount || 0} / ${record.lineCount || 0}`,
      `${isEnglish.value ? 'Reconcile' : '对账'}: ${record.reconcileContext || (isEnglish.value ? 'No context' : '暂无上下文')}`,
    ]
  }
  return []
}

onMounted(refresh)
watch(() => props.moduleKey, refresh)
</script>

<template>
  <article :class="['erp-card', 'financial-trace-panel', { compact: props.compact }]">
    <div class="panel-head">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
      <div class="panel-actions">
        <el-tag size="small" effect="plain" :type="toneBySummary()">
          {{ panelStatusLabel }}
        </el-tag>
        <el-button size="small" @click="openTraceDesk">
          {{ isEnglish ? 'Open Traceability' : '打开追溯区' }}
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="panel-empty">
      {{ isEnglish ? 'Loading financial trace...' : '正在加载财务追溯...' }}
    </div>

    <template v-else>
      <div class="trace-metrics">
        <article v-for="item in metricCards" :key="item.key" class="trace-metric">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>

      <div class="trace-grid">
        <article
          v-for="item in summary.items"
          :key="item.key"
          :class="['trace-card', `tone-${item.status}`]"
        >
          <div class="trace-card-head">
            <span>{{ item.label }}</span>
            <strong>
              {{
                item.status === 'ready'
                  ? (isEnglish ? 'Ready' : '已就绪')
                  : item.status === 'warning'
                    ? (isEnglish ? 'Pending' : '待推进')
                    : (isEnglish ? 'Blocked' : '阻塞')
              }}
            </strong>
          </div>
          <p>{{ item.description }}</p>
        </article>
      </div>

      <div v-if="cockpitRecords.length" class="record-section">
        <div class="record-section-head">
          <strong>{{ isEnglish ? 'Backend Cockpit' : '后端真实驾驶舱' }}</strong>
          <span>
            {{
              isEnglish
                ? `${cockpit?.attachmentCount || 0} files / ${cockpit?.noteCount || 0} notes / ${cockpit?.logCount || 0} logs`
                : `${cockpit?.attachmentCount || 0} 个附件 / ${cockpit?.noteCount || 0} 条备注 / ${cockpit?.logCount || 0} 条日志`
            }}
          </span>
        </div>

        <div class="record-grid">
          <article
            v-for="record in cockpitRecords"
            :key="record.id"
            :class="['record-card', `tone-${record.status}`]"
            @click="inspectRecord(record)"
          >
            <div class="record-head">
              <div>
                <strong>{{ record.ref || `#${record.id}` }}</strong>
                <p>{{ buildRecordLines(record).join(' · ') }}</p>
              </div>
              <el-tag size="small" effect="plain" :type="record.status === 'missing' ? 'danger' : record.status === 'warning' ? 'warning' : 'success'">
                {{ traceRecordStatusLabel(record.status) }}
              </el-tag>
            </div>

            <div class="record-meta">
              <span>{{ isEnglish ? 'State' : '状态' }}: {{ record.state || '-' }}</span>
              <span v-if="record.amount !== undefined && record.amount !== null">{{ isEnglish ? 'Amount' : '金额' }}: {{ record.amount }}</span>
              <span v-if="record.lineCount !== undefined && record.lineCount !== null">{{ isEnglish ? 'Lines' : '分录' }}: {{ record.lineCount }}</span>
            </div>

            <div v-if="record.missingKeys?.length || record.warningKeys?.length" class="record-risk">
              {{
                [
                  record.missingKeys?.length
                    ? `${isEnglish ? 'Blocked' : '阻塞'}: ${record.missingKeys.map((key) => translateTraceKey(key)).join(' / ')}`
                    : null,
                  record.warningKeys?.length
                    ? `${isEnglish ? 'Pending' : '待推进'}: ${record.warningKeys.map((key) => translateTraceKey(key)).join(' / ')}`
                    : null,
                ].filter(Boolean).join(' · ')
              }}
            </div>

            <div class="record-actions">
              <el-button size="small" text @click.stop="inspectRecord(record)">
                {{ isEnglish ? 'Inspect Chain' : '查看链路' }}
              </el-button>
              <el-button size="small" type="primary" text @click.stop="openRecord(record)">
                {{ isEnglish ? 'Open Record' : '打开记录' }}
              </el-button>
            </div>
          </article>
        </div>
      </div>

      <div v-if="summary.missingLabels.length || summary.warningLabels.length" class="trace-note">
        {{
          [
            summary.missingLabels.length
              ? `${isEnglish ? 'Missing' : '缺失'}: ${summary.missingLabels.join(' / ')}`
              : null,
            summary.warningLabels.length
              ? `${isEnglish ? 'Pending' : '待推进'}: ${summary.warningLabels.join(' / ')}`
              : null,
          ].filter(Boolean).join(' · ')
        }}
      </div>

      <div v-if="cockpitRiskText" class="trace-note backend-note">
        {{ cockpitRiskText }}
      </div>
    </template>
  </article>

  <el-drawer
    v-model="detailVisible"
    :title="isEnglish ? 'Financial Trace Detail' : '财务追溯详情'"
    size="560px"
  >
    <div v-if="detailLoading" class="detail-empty">
      {{ isEnglish ? 'Loading trace detail...' : '正在加载追溯详情...' }}
    </div>

    <div v-else-if="activeDetail" class="detail-body">
      <article class="detail-block">
        <div class="detail-head">
          <strong>{{ activeDetail.record.ref || `#${activeDetail.record.id}` }}</strong>
          <el-tag size="small" effect="plain" :type="activeDetail.record.status === 'missing' ? 'danger' : activeDetail.record.status === 'warning' ? 'warning' : 'success'">
            {{ traceRecordStatusLabel(activeDetail.record.status) }}
          </el-tag>
        </div>
        <div class="detail-actions">
          <el-button size="small" @click="copyActiveDetailPacket">
            {{ isEnglish ? 'Copy Trace Packet' : '复制追溯包' }}
          </el-button>
          <el-button size="small" @click="exportActiveDetailPacket">
            {{ isEnglish ? 'Export Trace Packet' : '导出追溯包' }}
          </el-button>
          <el-button size="small" type="primary" @click="openActiveDetailRecord">
            {{ isEnglish ? 'Open Record' : '打开记录' }}
          </el-button>
        </div>
        <p class="detail-copy">
          {{
            [
              `${isEnglish ? 'State' : '状态'}: ${activeDetail.record.state || '-'}`,
              activeDetail.record.amount !== undefined && activeDetail.record.amount !== null ? `${isEnglish ? 'Amount' : '金额'}: ${activeDetail.record.amount}` : null,
              `${isEnglish ? 'Evidence' : '证据'}: ${activeDetail.record.attachmentCount || 0}${isEnglish ? ' files' : ' 个附件'} / ${activeDetail.record.noteCount || 0}${isEnglish ? ' notes' : ' 条备注'} / ${activeDetail.record.logCount || 0}${isEnglish ? ' logs' : ' 条日志'}`,
            ].filter(Boolean).join(' · ')
          }}
        </p>
      </article>

      <article class="detail-block">
        <div class="detail-section-title">{{ isEnglish ? 'Chain Explanation' : '链路解释' }}</div>
        <ul class="detail-list">
          <li v-for="line in activeDetail.explanationLines" :key="line">{{ line }}</li>
        </ul>
      </article>

      <article class="detail-block">
        <div class="detail-section-title">{{ isEnglish ? 'Settlement Path' : '结算路径' }}</div>
        <ul class="detail-list">
          <li v-for="line in activeDetail.settlementLines" :key="line">{{ line }}</li>
        </ul>
      </article>

      <article class="detail-block">
        <div class="detail-section-title">{{ isEnglish ? 'Related Objects' : '关联对象' }}</div>
        <div v-if="activeDetail.relatedLinks.length" class="detail-link-list">
          <button
            v-for="link in activeDetail.relatedLinks"
            :key="`${link.moduleKey}:${link.recordId}:${link.relationType}`"
            type="button"
            class="detail-link"
            @click="openDetailLink(link)"
          >
            <strong>{{ link.label }}</strong>
            <span>{{ link.ref || `#${link.recordId}` }}</span>
          </button>
        </div>
        <div v-else class="detail-empty">
          {{ isEnglish ? 'No linked business objects yet.' : '当前还没有可跳转的关联业务对象。' }}
        </div>
      </article>

      <article v-if="activeDetail.record.missingKeys?.length || activeDetail.record.warningKeys?.length" class="detail-block">
        <div class="detail-section-title">{{ isEnglish ? 'Risk Keys' : '风险键' }}</div>
        <div class="detail-copy">
          {{
            [
              activeDetail.record.missingKeys?.length
                ? `${isEnglish ? 'Blocked' : '阻塞'}: ${activeDetail.record.missingKeys.map((key) => translateTraceKey(key)).join(' / ')}`
                : null,
              activeDetail.record.warningKeys?.length
                ? `${isEnglish ? 'Pending' : '待推进'}: ${activeDetail.record.warningKeys.map((key) => translateTraceKey(key)).join(' / ')}`
                : null,
            ].filter(Boolean).join(' · ')
          }}
        </div>
      </article>
    </div>

    <div v-else class="detail-empty">
      {{ isEnglish ? 'Pick a backend record to inspect its trace chain.' : '请选择一条后端记录查看它的追溯链。' }}
    </div>
  </el-drawer>
</template>

<style scoped>
.financial-trace-panel {
  padding: 22px;
}

.financial-trace-panel.compact {
  padding: 18px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--erp-text);
}

.panel-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--erp-muted);
  line-height: 1.6;
}

.panel-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.panel-empty {
  padding: 20px 0;
  color: var(--erp-muted);
}

.trace-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.trace-metric {
  padding: 14px;
  border-radius: 14px;
  background: rgba(21, 94, 99, 0.05);
  border: 1px solid rgba(21, 94, 99, 0.08);
}

.trace-metric span {
  font-size: 12px;
  color: var(--erp-muted);
}

.trace-metric strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
  color: var(--erp-text);
}

.trace-metric p {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--erp-muted);
}

.trace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}

.trace-card {
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.72);
}

.trace-card.tone-ready {
  border-color: rgba(16, 185, 129, 0.24);
  background: rgba(236, 253, 245, 0.84);
}

.trace-card.tone-warning {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(255, 251, 235, 0.84);
}

.trace-card.tone-missing {
  border-color: rgba(239, 68, 68, 0.22);
  background: rgba(254, 242, 242, 0.84);
}

.trace-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.trace-card-head span {
  font-size: 13px;
  font-weight: 600;
  color: var(--erp-text);
}

.trace-card-head strong {
  font-size: 12px;
  color: var(--erp-muted);
}

.trace-card p {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--erp-muted);
}

.record-section {
  margin-top: 16px;
}

.record-section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--erp-muted);
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.record-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(248, 250, 252, 0.9);
  cursor: pointer;
}

.record-card.tone-ready {
  border-color: rgba(16, 185, 129, 0.24);
}

.record-card.tone-warning {
  border-color: rgba(245, 158, 11, 0.24);
}

.record-card.tone-missing {
  border-color: rgba(239, 68, 68, 0.24);
}

.record-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.record-head strong {
  color: var(--erp-text);
}

.record-head p {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--erp-muted);
  line-height: 1.6;
}

.record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--erp-muted);
}

.record-risk {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--erp-text);
}

.record-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.trace-note {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--erp-muted);
}

.backend-note {
  margin-top: 10px;
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-block {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(248, 250, 252, 0.88);
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.detail-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--erp-text);
}

.detail-copy {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--erp-muted);
}

.detail-list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--erp-text);
  font-size: 12px;
  line-height: 1.8;
}

.detail-link-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.detail-link {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.detail-link strong {
  display: block;
  color: var(--erp-text);
  font-size: 13px;
}

.detail-link span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--erp-muted);
}

.detail-empty {
  padding: 18px;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.24);
  color: var(--erp-muted);
  font-size: 12px;
}

@media (max-width: 900px) {
  .panel-head {
    flex-direction: column;
  }

  .panel-actions {
    justify-content: flex-start;
  }

  .trace-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
