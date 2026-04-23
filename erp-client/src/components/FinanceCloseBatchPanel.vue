<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { createCloseTask, createFinanceBatchReview, createFinanceResultPack } from '@/api/cutover-ops'
import { downloadText } from '@/utils/export'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import {
  buildFinanceCloseBatchPacket,
  buildFinanceCloseBatchRowPacket,
  type FinanceCloseBatchRow,
} from '@/utils/cutover-role-desk'
import type { CutoverFinanceBatchReviewStatus } from '@/utils/cutover-ops'

interface PanelRouteTarget {
  name: string
  query?: Record<string, string | undefined>
}

interface FinanceCloseBatchPanelRow extends FinanceCloseBatchRow {
  key: string
  scopeType: 'chain' | 'module'
  closeTarget?: PanelRouteTarget | null
  settlementTarget?: PanelRouteTarget | null
  financeTarget?: PanelRouteTarget | null
  roleTarget?: PanelRouteTarget | null
  documentsTarget?: PanelRouteTarget | null
  timelineTarget?: PanelRouteTarget | null
  reconcileTarget?: PanelRouteTarget | null
}

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    rows: FinanceCloseBatchPanelRow[]
    english?: boolean
  }>(),
  {
    title: undefined,
    description: undefined,
    english: false,
  },
)

const router = useRouter()
const authStore = useAuthStore()
const cutoverOpsStore = useCutoverOpsStore()
const search = ref('')
const onlyAttention = ref(false)
const showAllRows = ref(false)
const compactRowLimit = 6
const panelTitle = computed(() => props.title || (props.english ? 'Finance Close Batch' : '财务关账批量台'))
const panelDescription = computed(() =>
  props.description || (props.english
    ? 'Keep close, settlement, trace, and reconcile entry points on one surface before finance scope expands.'
    : '把关账、结算、追溯和对账入口固定在同一处，避免财务试点扩围前还在多处找动作。'),
)
const filteredRows = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return props.rows.filter((row) => {
    const latest = cutoverOpsStore.latestFinanceBatchReview(row.scopeType, row.key)
    const attention = (row.blockerLabels?.length || 0) > 0
      || Boolean(row.topRiskLabel)
      || latest?.status === 'blocked'
    if (onlyAttention.value && !attention) {
      return false
    }
    if (!keyword) {
      return true
    }
    return [
      row.label,
      row.scopeLabel,
      row.closeLabel,
      row.settlementLabel,
      row.financialTraceLabel,
      row.financeCockpitLabel,
      row.roleDeskLabel,
      row.topRiskLabel,
      ...(row.blockerLabels || []),
    ].some((item) => String(item || '').toLowerCase().includes(keyword))
  })
})
const sortedRows = computed(() =>
  [...filteredRows.value].sort((left, right) => {
    const leftLatest = latestReview(left)
    const rightLatest = latestReview(right)
    const leftScore = ((left.blockerLabels?.length || 0) * 4)
      + (left.topRiskLabel ? 3 : 0)
      + (leftLatest?.status === 'blocked' ? 3 : 0)
      + (!leftLatest ? 2 : 0)
      + (leftLatest?.status === 'reconciled' ? -2 : 0)
    const rightScore = ((right.blockerLabels?.length || 0) * 4)
      + (right.topRiskLabel ? 3 : 0)
      + (rightLatest?.status === 'blocked' ? 3 : 0)
      + (!rightLatest ? 2 : 0)
      + (rightLatest?.status === 'reconciled' ? -2 : 0)
    if (rightScore !== leftScore) return rightScore - leftScore
    return left.label.localeCompare(right.label)
  }),
)
const visibleRows = computed(() =>
  showAllRows.value ? sortedRows.value : sortedRows.value.slice(0, compactRowLimit),
)
const hiddenRowCount = computed(() => Math.max(sortedRows.value.length - visibleRows.value.length, 0))
const syncLabel = computed(() =>
  cutoverOpsStore.serverSyncedAt
    ? `${props.english ? 'Synced' : '同步'} ${formatDateTime(cutoverOpsStore.serverSyncedAt)}`
    : (props.english ? 'Not Synced' : '尚未同步'),
)

onMounted(() => {
  void syncBoard()
})

function listOrDash(items?: string[]) {
  return items?.length ? items.join(' / ') : '-'
}

function actingUser() {
  return authStore.displayName || authStore.user?.username || (props.english ? 'finance-operator' : '财务操作员')
}

function resolveStatusLabel(status?: CutoverFinanceBatchReviewStatus | null) {
  if (status === 'blocked') return props.english ? 'Blocked' : '已阻塞'
  if (status === 'reconciled') return props.english ? 'Reconciled' : '已对账'
  if (status === 'reviewed') return props.english ? 'Reviewed' : '已复核'
  return props.english ? 'Open' : '待复核'
}

function latestReview(row: FinanceCloseBatchPanelRow) {
  return cutoverOpsStore.latestFinanceBatchReview(row.scopeType, row.key)
}

function historyCount(row: FinanceCloseBatchPanelRow) {
  return cutoverOpsStore.financeBatchHistoryFor(row.scopeType, row.key).length
}

function packCount(row: FinanceCloseBatchPanelRow) {
  return cutoverOpsStore.financeResultPackHistoryFor(row.scopeType, row.key).length
}

function closeTaskCount(row: FinanceCloseBatchPanelRow) {
  return cutoverOpsStore.closeTaskHistoryFor(row.scopeType, row.key, resolveCloseTaskModuleKey(row)).length
}

async function recordReview(row: FinanceCloseBatchPanelRow, status: CutoverFinanceBatchReviewStatus) {
  const note = status === 'blocked'
    ? `${row.label} · ${props.english ? 'blocked because blockers remain in finance close scope' : '因财务关账阻塞仍存在而挂起'}`
    : status === 'reconciled'
      ? `${row.label} · ${props.english ? 'reconcile lane checked' : '已完成对账链路核对'}`
      : `${row.label} · ${props.english ? 'finance close scope reviewed' : '财务关账范围已复核'}`
  try {
    const saved = await createFinanceBatchReview({
      scopeType: row.scopeType,
      scopeKey: row.key,
      scopeLabel: row.label,
      status,
      note,
      updatedBy: actingUser(),
    })
    cutoverOpsStore.upsertFinanceBatchReview(saved)
  } catch {
    // Keep finance close review moving even if the shared backend is
    // temporarily unreachable, then rely on snapshot sync as fallback.
    cutoverOpsStore.addFinanceBatchReview({
      scopeType: row.scopeType,
      scopeKey: row.key,
      scopeLabel: row.label,
      status,
      note,
      updatedBy: actingUser(),
    })
  }
  await recordCloseTask(row, status)
  ElMessage.success(
    status === 'blocked'
      ? (props.english ? 'Finance batch blocked' : '财务批量条目已标记阻塞')
      : status === 'reconciled'
        ? (props.english ? 'Finance batch reconciled' : '财务批量条目已记录对账')
        : (props.english ? 'Finance batch reviewed' : '财务批量条目已复核'),
  )
}

async function recordCloseTask(row: FinanceCloseBatchPanelRow, status: CutoverFinanceBatchReviewStatus) {
  const taskStatus = status === 'blocked' ? 'blocked' : status === 'reconciled' ? 'done' : 'in_progress'
  const taskType = status === 'reconciled' ? 'finance-reconcile' : 'finance-close-review'
  const taskLabel = status === 'reconciled'
    ? (props.english ? 'Finance Reconcile' : '财务对账任务')
    : (props.english ? 'Finance Close Review' : '财务关账复核')
  const note = `${row.label} · ${resolveStatusLabel(status)}`
  try {
    const saved = await createCloseTask({
      scopeType: row.scopeType,
      scopeKey: row.key,
      scopeLabel: row.label,
      moduleKey: resolveCloseTaskModuleKey(row),
      taskType,
      taskLabel,
      status: taskStatus,
      note,
      updatedBy: actingUser(),
    })
    cutoverOpsStore.upsertCloseTask(saved)
  } catch {
    cutoverOpsStore.addCloseTask({
      scopeType: row.scopeType,
      scopeKey: row.key,
      scopeLabel: row.label,
      moduleKey: resolveCloseTaskModuleKey(row),
      taskType,
      taskLabel,
      status: taskStatus,
      note,
      updatedBy: actingUser(),
    })
  }
}

function openTarget(target?: PanelRouteTarget | null) {
  if (!target) return
  void router.push({
    name: target.name,
    query: target.query,
  })
}

function exportRow(row: FinanceCloseBatchPanelRow) {
  const filename = `neko_erp_finance_close_${row.scopeType}_${row.key}_${new Date().toISOString().slice(0, 10)}.md`
  const content = buildFinanceCloseBatchRowPacket({
    english: props.english,
    generatedAt: formatDateTime(new Date().toISOString()),
    row,
    title: props.english ? `${row.label} Finance Close Batch` : `${row.label} 财务关账批处理包`,
  })
  downloadText(filename, content, 'text/markdown;charset=utf-8')
  void archiveResultPack(row.scopeType, row.key, row.label, 'row-packet', filename, 1, content)
  ElMessage.success(props.english ? 'Finance close row exported' : '财务关账条目已导出')
}

async function copyRow(row: FinanceCloseBatchPanelRow) {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildFinanceCloseBatchRowPacket({
    english: props.english,
    generatedAt: formatDateTime(new Date().toISOString()),
    row,
    title: props.english ? `${row.label} Finance Close Batch` : `${row.label} 财务关账批处理包`,
  }))
  ElMessage.success(props.english ? 'Finance close row copied' : '财务关账条目已复制')
}

async function syncBoard() {
  try {
    await cutoverOpsStore.syncServerBoard(240)
  } catch {
    ElMessage.warning(props.english ? 'Server sync unavailable, using local reviews' : '服务端同步暂不可用，当前继续使用本地复核记录')
  }
}

function exportVisibleRows() {
  const filename = `neko_erp_finance_close_panel_${new Date().toISOString().slice(0, 10)}.md`
  const content = buildFinanceCloseBatchPacket({
    english: props.english,
    generatedAt: formatDateTime(new Date().toISOString()),
    title: props.english ? 'Finance Close Batch Panel Packet' : '财务关账批量台批处理包',
    rows: visibleRows.value,
  })
  downloadText(filename, content, 'text/markdown;charset=utf-8')
  void archiveResultPack('global', 'finance-close-panel', props.english ? 'Finance Close Panel' : '财务关账批量台', 'panel-packet', filename, visibleRows.value.length, content)
  ElMessage.success(props.english ? 'Visible finance close rows exported' : '当前可见财务条目已导出')
}

async function archiveResultPack(
  scopeType: FinanceCloseBatchPanelRow['scopeType'] | 'global',
  scopeKey: string,
  scopeLabel: string,
  packType: string,
  filename: string,
  rowCount: number,
  content: string,
) {
  const summary = content.split('\n').slice(0, 8).join('\n')
  try {
    const saved = await createFinanceResultPack({
      scopeType,
      scopeKey,
      scopeLabel,
      packType,
      filename,
      rowCount,
      summary,
      createdBy: actingUser(),
    })
    cutoverOpsStore.upsertFinanceResultPack(saved)
  } catch {
    cutoverOpsStore.addFinanceResultPack({
      scopeType,
      scopeKey,
      scopeLabel,
      packType,
      filename,
      rowCount,
      summary,
      createdBy: actingUser(),
    })
  }
}

function resolveCloseTaskModuleKey(row: FinanceCloseBatchPanelRow) {
  if (row.scopeType === 'module') {
    return row.key
  }
  return 'accountMove'
}
</script>

<template>
  <article class="erp-card finance-close-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
      <div class="panel-metrics">
        <span>{{ english ? 'Rows' : '条目' }} {{ visibleRows.length }}/{{ sortedRows.length }}/{{ rows.length }}</span>
        <span>{{ english ? 'Blocked' : '阻塞' }} {{ sortedRows.filter((row) => row.blockerLabels?.length).length }}</span>
        <span>{{ english ? 'Server Reviews' : '服务端复核' }} {{ cutoverOpsStore.financeBatchSummary.totalCount }}</span>
        <span>{{ english ? 'Reconciled' : '已对账' }} {{ cutoverOpsStore.financeBatchSummary.statusCounts.reconciled || 0 }}</span>
        <span>{{ english ? 'Result Packs' : '结果包' }} {{ cutoverOpsStore.financeResultPackSummary.totalCount }}</span>
        <span>{{ english ? 'Close Tasks' : '关账任务' }} {{ cutoverOpsStore.closeTaskSummary.totalCount }}</span>
        <span>{{ syncLabel }}</span>
      </div>
    </div>

    <div class="panel-toolbar">
      <el-input
        v-model="search"
        size="small"
        clearable
        :placeholder="english ? 'Filter rows, trace, blockers' : '筛选条目、追溯、阻塞项'"
      />
      <el-switch
        v-model="onlyAttention"
        :active-text="english ? 'Attention Only' : '只看需关注'"
        :inactive-text="english ? 'All Rows' : '全部条目'"
      />
      <el-button
        size="small"
        :loading="cutoverOpsStore.serverSyncing"
        @click="syncBoard"
      >
        {{ english ? 'Sync' : '同步' }}
      </el-button>
      <el-button
        size="small"
        @click="exportVisibleRows"
      >
        {{ english ? 'Export Visible' : '导出当前视图' }}
      </el-button>
      <span
        v-if="cutoverOpsStore.serverSyncError"
        class="toolbar-error"
      >
        {{ english ? 'Server sync fallback active' : '服务端同步回退到本地模式' }}
      </span>
    </div>

    <div v-if="!sortedRows.length" class="panel-empty">
      {{ english ? 'No finance close rows yet.' : '当前还没有财务关账条目。' }}
    </div>

    <div v-else>
      <div class="panel-compact-note">
        <span>
          {{
            hiddenRowCount
              ? (english
                ? `Showing the ${visibleRows.length} highest-attention rows first. ${hiddenRowCount} more rows stay collapsed to keep the panel readable.`
                : `默认先展示最需要处理的 ${visibleRows.length} 条，另外 ${hiddenRowCount} 条先收起，避免财务面板继续摊平。`)
              : (english
                ? 'All finance close rows are currently visible.'
                : '当前财务关账条目已全部展开。')
          }}
        </span>
        <el-button
          v-if="sortedRows.length > compactRowLimit"
          link
          type="primary"
          @click="showAllRows = !showAllRows"
        >
          {{ showAllRows ? (english ? 'Collapse' : '收起') : (english ? 'Show All' : '展开全部') }}
        </el-button>
      </div>

      <div class="close-list">
      <article
        v-for="row in visibleRows"
        :key="row.key"
        class="close-card"
      >
        <div
          v-if="latestReview(row)"
          class="close-review-banner"
        >
          <strong>{{ english ? 'Latest Review' : '最近复核' }}</strong>
          <span>
            {{ resolveStatusLabel(latestReview(row)?.status) }}
            · {{ latestReview(row)?.updatedBy || '-' }}
            · {{ latestReview(row)?.createdAt ? formatDateTime(latestReview(row)?.createdAt || '') : '-' }}
            · {{ english ? 'History' : '历史' }} {{ historyCount(row) }}
            · {{ english ? 'Packs' : '结果包' }} {{ packCount(row) }}
            · {{ english ? 'Close Tasks' : '关账任务' }} {{ closeTaskCount(row) }}
          </span>
        </div>
        <div class="close-head">
          <div>
            <strong>{{ row.label }}</strong>
            <p>{{ row.scopeLabel }} · {{ row.closeLabel || row.financeCockpitLabel || '-' }}</p>
          </div>
          <div class="close-flags">
            <span class="metric neutral">{{ row.scopeType === 'chain' ? (english ? 'Chain' : '链路') : (english ? 'Module' : '模块') }}</span>
            <span v-if="row.blockerLabels?.length" class="metric warning">{{ row.blockerLabels.length }}</span>
          </div>
        </div>

        <div class="close-meta">
          <span>{{ english ? 'Settlement' : '结算' }}: {{ row.settlementLabel || '-' }}</span>
          <span>{{ english ? 'Trace' : '追溯' }}: {{ row.financialTraceLabel || '-' }}</span>
          <span>{{ english ? 'Finance Cockpit' : '财务驾驶舱' }}: {{ row.financeCockpitLabel || '-' }}</span>
          <span>{{ english ? 'Role Desk' : '责任台' }}: {{ row.roleDeskLabel || '-' }}</span>
          <span>{{ english ? 'Top Risk' : '最高风险' }}: {{ row.topRiskLabel || '-' }}</span>
          <span>{{ english ? 'Suggested Blockers' : '建议阻塞项' }}: {{ listOrDash(row.blockerLabels) }}</span>
        </div>

        <div class="close-actions">
          <el-button
            size="small"
            type="success"
            @click="recordReview(row, 'reviewed')"
          >
            {{ english ? 'Reviewed' : '已复核' }}
          </el-button>
          <el-button
            size="small"
            type="warning"
            @click="recordReview(row, 'blocked')"
          >
            {{ english ? 'Block' : '阻塞' }}
          </el-button>
          <el-button
            v-if="row.closeTarget"
            size="small"
            @click="openTarget(row.closeTarget)"
          >
            {{ english ? 'Close Desk' : '关账台' }}
          </el-button>
          <el-button
            v-if="row.settlementTarget"
            size="small"
            @click="openTarget(row.settlementTarget)"
          >
            {{ english ? 'Settlement' : '结算台' }}
          </el-button>
          <el-button
            v-if="row.financeTarget"
            size="small"
            @click="openTarget(row.financeTarget)"
          >
            {{ english ? 'Finance Cockpit' : '财务驾驶舱' }}
          </el-button>
          <el-button
            v-if="row.roleTarget"
            size="small"
            @click="openTarget(row.roleTarget)"
          >
            {{ english ? 'Role Desk' : '责任台' }}
          </el-button>
          <el-button
            v-if="row.reconcileTarget"
            size="small"
            type="primary"
            @click="recordReview(row, 'reconciled').finally(() => openTarget(row.reconcileTarget))"
          >
            {{ english ? 'Reconcile' : '对账' }}
          </el-button>
          <el-button
            v-if="row.documentsTarget"
            size="small"
            @click="openTarget(row.documentsTarget)"
          >
            {{ english ? 'Documents' : '文档' }}
          </el-button>
          <el-button
            v-if="row.timelineTarget"
            size="small"
            @click="openTarget(row.timelineTarget)"
          >
            {{ english ? 'Timeline' : '时间轴' }}
          </el-button>
          <el-button
            size="small"
            @click="exportRow(row)"
          >
            {{ english ? 'Export' : '导出' }}
          </el-button>
          <el-button
            size="small"
            @click="copyRow(row)"
          >
            {{ english ? 'Copy' : '复制' }}
          </el-button>
        </div>
      </article>
      </div>
    </div>
  </article>
</template>

<style scoped>
.finance-close-panel {
  padding: 22px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}

.panel-desc {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.panel-metrics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.panel-toolbar {
  margin-top: 14px;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto auto auto;
  gap: 10px;
  align-items: center;
}

.toolbar-error {
  color: var(--app-warning);
  font-size: 12px;
}

.panel-compact-note {
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px dashed color-mix(in srgb, var(--app-primary) 22%, var(--app-border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--app-primary) 6%, var(--app-surface));
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.close-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.close-card {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 16px;
  background: var(--app-panel);
}

.close-review-banner {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-primary) 8%, var(--app-surface));
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.close-review-banner strong {
  color: var(--app-text);
}

.close-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.close-head strong {
  font-size: 14px;
  color: var(--app-text);
}

.close-head p {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.close-flags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.close-meta {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.close-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric {
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.metric.neutral {
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
  color: var(--app-primary);
}

.metric.warning {
  background: color-mix(in srgb, var(--app-warning) 18%, transparent);
  color: var(--app-warning);
}

.panel-empty {
  margin-top: 16px;
  padding: 18px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  color: var(--app-text-secondary);
  font-size: 13px;
}

@media (max-width: 960px) {
  .panel-toolbar {
    grid-template-columns: 1fr;
  }

  .panel-compact-note {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
