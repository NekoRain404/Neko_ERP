<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { createRoleDeskTask } from '@/api/cutover-ops'
import { downloadText } from '@/utils/export'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import {
  buildRoleDeskQueueBuckets,
  buildRoleDeskQueuePacket,
  buildRoleDeskQueueRowPacket,
  type RoleDeskQueueRow,
} from '@/utils/cutover-role-desk'
import type {
  CutoverRoleDeskActorKey,
  CutoverRoleDeskSlaStatus,
  CutoverRoleDeskTaskStatus,
} from '@/utils/cutover-ops'

interface PanelRouteTarget {
  name: string
  query?: Record<string, string | undefined>
}

interface RoleDeskQueuePanelRow extends RoleDeskQueueRow {
  key: string
  scopeType: 'chain' | 'module'
  scopeTarget?: PanelRouteTarget | null
  handoffTarget?: PanelRouteTarget | null
  closeTarget?: PanelRouteTarget | null
  financeTarget?: PanelRouteTarget | null
  documentsTarget?: PanelRouteTarget | null
  timelineTarget?: PanelRouteTarget | null
}

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    rows: RoleDeskQueuePanelRow[]
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
const showAllBuckets = ref(false)
const expandedBucketKeys = ref<string[]>([])
const compactBucketLimit = 3
const compactBucketRowLimit = 3
const panelTitle = computed(() => props.title || (props.english ? 'Role Desk Queue' : '责任待办台'))
const panelDescription = computed(() =>
  props.description || (props.english
    ? 'Group close responsibilities by owner lane so unresolved role gaps are visible before pilot scope grows.'
    : '按责任链角色聚合关账待办，在扩大试点范围前先看清谁还背着缺口和阻塞项。'),
)
const filteredRows = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return props.rows.filter((row) => {
    const latest = cutoverOpsStore.latestRoleDeskTask(row.scopeType, row.key)
    const attention = row.missingRoles.length > 0
      || row.checklistBlockers.length > 0
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
      row.roleDeskLabel,
      row.owner,
      row.reviewer,
      row.financeOwner,
      row.signoffOwner,
      row.fallbackOwner,
      ...(row.missingRoles || []),
      ...(row.checklistBlockers || []),
    ].some((item) => String(item || '').toLowerCase().includes(keyword))
  })
})
const ownerBuckets = computed(() =>
  buildRoleDeskQueueBuckets({
    english: props.english,
    rows: filteredRows.value,
  }) as unknown as Array<{
    key: string
    roleKey: CutoverRoleDeskActorKey
    roleLabel: string
    ownerLabel: string
    rowCount: number
    readyCount: number
    blockerCount: number
    rows: RoleDeskQueuePanelRow[]
  }>,
)
const prioritizedOwnerBuckets = computed(() =>
  ownerBuckets.value
    .map((bucket) => ({
      ...bucket,
      rows: [...bucket.rows].sort((left, right) => {
        const leftLatest = latestTask(left, bucket.roleKey, bucket.ownerLabel)
        const rightLatest = latestTask(right, bucket.roleKey, bucket.ownerLabel)
        const leftScore = (left.missingRoles.length * 5)
          + (left.checklistBlockers.length * 4)
          + ((left.blockerLabels?.length || 0) * 2)
          + (leftLatest?.status === 'blocked' ? 4 : 0)
          + (leftLatest?.slaStatus === 'overdue' ? 3 : 0)
          + (leftLatest?.slaStatus === 'risk' ? 2 : 0)
        const rightScore = (right.missingRoles.length * 5)
          + (right.checklistBlockers.length * 4)
          + ((right.blockerLabels?.length || 0) * 2)
          + (rightLatest?.status === 'blocked' ? 4 : 0)
          + (rightLatest?.slaStatus === 'overdue' ? 3 : 0)
          + (rightLatest?.slaStatus === 'risk' ? 2 : 0)
        if (rightScore !== leftScore) return rightScore - leftScore
        return left.label.localeCompare(right.label)
      }),
    }))
    .sort((left, right) => {
      const leftScore = (left.blockerCount * 5) + (left.rowCount * 2) - left.readyCount
      const rightScore = (right.blockerCount * 5) + (right.rowCount * 2) - right.readyCount
      if (rightScore !== leftScore) return rightScore - leftScore
      return left.roleLabel.localeCompare(right.roleLabel)
    }),
)
const visibleBuckets = computed(() =>
  showAllBuckets.value ? prioritizedOwnerBuckets.value : prioritizedOwnerBuckets.value.slice(0, compactBucketLimit),
)
const hiddenBucketCount = computed(() => Math.max(prioritizedOwnerBuckets.value.length - visibleBuckets.value.length, 0))
const visibleRowsForExport = computed(() =>
  visibleBuckets.value.flatMap((bucket) => resolveVisibleBucketRows(bucket)),
)
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
  return authStore.displayName || authStore.user?.username || (props.english ? 'pilot-operator' : '试点操作员')
}

function resolveStatusLabel(status?: CutoverRoleDeskTaskStatus | null) {
  if (status === 'blocked') return props.english ? 'Blocked' : '已阻塞'
  if (status === 'done') return props.english ? 'Done' : '已完成'
  if (status === 'assigned') return props.english ? 'Assigned' : '已指派'
  if (status === 'reassigned') return props.english ? 'Reassigned' : '已转派'
  if (status === 'claimed') return props.english ? 'Claimed' : '已认领'
  return props.english ? 'Open' : '待处理'
}

function resolveSlaLabel(status?: CutoverRoleDeskSlaStatus | null) {
  if (status === 'met') return props.english ? 'SLA Met' : 'SLA 达标'
  if (status === 'overdue') return props.english ? 'Overdue' : '已超时'
  if (status === 'risk') return props.english ? 'Due Soon' : '即将超时'
  return props.english ? 'Open SLA' : '未设时限'
}

function latestTask(row: RoleDeskQueuePanelRow, roleKey: CutoverRoleDeskActorKey, owner: string) {
  return cutoverOpsStore.latestRoleDeskTask(row.scopeType, row.key, roleKey, owner)
}

function historyCount(row: RoleDeskQueuePanelRow, roleKey: CutoverRoleDeskActorKey, owner: string) {
  return cutoverOpsStore.roleDeskHistoryFor(row.scopeType, row.key, roleKey, owner).length
}

async function recordTask(
  row: RoleDeskQueuePanelRow,
  roleKey: CutoverRoleDeskActorKey,
  roleLabel: string,
  owner: string,
  status: CutoverRoleDeskTaskStatus,
  assignee?: string,
  dueAt?: string,
) {
  const note = status === 'blocked'
    ? `${row.label} · ${roleLabel} · ${props.english ? 'blocked by open role gaps or checklist blockers' : '因角色缺口或清单阻塞被挂起'}`
    : status === 'done'
      ? `${row.label} · ${roleLabel} · ${props.english ? 'lane reviewed and cleared' : '责任链已复核并清理'}`
      : status === 'assigned'
        ? `${row.label} · ${roleLabel} · ${props.english ? `assigned to ${assignee || owner}` : `已指派给 ${assignee || owner}`}`
        : status === 'reassigned'
          ? `${row.label} · ${roleLabel} · ${props.english ? `reassigned to ${assignee || owner}` : `已转派给 ${assignee || owner}`}`
      : `${row.label} · ${roleLabel} · ${props.english ? 'claimed for follow-up' : '已认领待跟进'}`
  try {
    const saved = await createRoleDeskTask({
      scopeType: row.scopeType,
      scopeKey: row.key,
      scopeLabel: row.label,
      roleKey,
      roleLabel,
      owner,
      assignee: assignee || owner,
      status,
      dueAt: dueAt || '',
      note,
      updatedBy: actingUser(),
    })
    cutoverOpsStore.upsertRoleDeskTask(saved)
  } catch {
    // When the snapshot backend is unavailable, keep governance usable locally
    // and let the next shared snapshot save carry the pending record upstream.
    cutoverOpsStore.addRoleDeskTask({
      scopeType: row.scopeType,
      scopeKey: row.key,
      scopeLabel: row.label,
      roleKey,
      roleLabel,
      owner,
      assignee: assignee || owner,
      status,
      dueAt,
      note,
      updatedBy: actingUser(),
    })
  }
  ElMessage.success(
    status === 'blocked'
      ? (props.english ? 'Role task blocked' : '责任任务已标记阻塞')
      : status === 'done'
        ? (props.english ? 'Role task completed' : '责任任务已标记完成')
        : status === 'assigned'
          ? (props.english ? 'Role task assigned' : '责任任务已指派')
          : status === 'reassigned'
            ? (props.english ? 'Role task reassigned' : '责任任务已转派')
        : (props.english ? 'Role task claimed' : '责任任务已认领'),
  )
}

function resolveReassignTarget(row: RoleDeskQueuePanelRow, currentOwner: string) {
  const candidates = [
    row.fallbackOwner,
    row.reviewer,
    row.financeOwner,
    row.signoffOwner,
    row.owner,
  ]
    .map((item) => String(item || '').trim())
    .filter((item) => item && item !== '-' && item !== currentOwner)
  return candidates[0] || currentOwner
}

function dueAtIn(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

function openTarget(target?: PanelRouteTarget | null) {
  if (!target) return
  void router.push({
    name: target.name,
    query: target.query,
  })
}

function exportRow(row: RoleDeskQueuePanelRow) {
  downloadText(
    `neko_erp_role_desk_${row.scopeType}_${row.key}_${new Date().toISOString().slice(0, 10)}.md`,
    buildRoleDeskQueueRowPacket({
      english: props.english,
      generatedAt: formatDateTime(new Date().toISOString()),
      row,
      title: props.english ? `${row.label} Role Desk Packet` : `${row.label} 责任台待办包`,
    }),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(props.english ? 'Role desk row exported' : '责任待办条目已导出')
}

async function copyRow(row: RoleDeskQueuePanelRow) {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildRoleDeskQueueRowPacket({
    english: props.english,
    generatedAt: formatDateTime(new Date().toISOString()),
    row,
    title: props.english ? `${row.label} Role Desk Packet` : `${row.label} 责任台待办包`,
  }))
  ElMessage.success(props.english ? 'Role desk row copied' : '责任待办条目已复制')
}

async function syncBoard() {
  try {
    await cutoverOpsStore.syncServerBoard(240)
  } catch {
    ElMessage.warning(props.english ? 'Server sync unavailable, using local records' : '服务端同步暂不可用，当前继续使用本地记录')
  }
}

function exportVisibleRows() {
  downloadText(
    `neko_erp_role_desk_panel_${new Date().toISOString().slice(0, 10)}.md`,
    buildRoleDeskQueuePacket({
      english: props.english,
      generatedAt: formatDateTime(new Date().toISOString()),
      title: props.english ? 'Role Desk Queue Panel Packet' : '责任待办台批量包',
      rows: visibleRowsForExport.value,
    }),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(props.english ? 'Visible role desk rows exported' : '当前可见责任条目已导出')
}

function latestTaskSummary(row: RoleDeskQueuePanelRow, roleKey: CutoverRoleDeskActorKey, owner: string) {
  const task = latestTask(row, roleKey, owner)
  if (!task) return '-'
  return [
    resolveStatusLabel(task.status),
    task.assignee || owner,
    task.dueAt ? formatDateTime(task.dueAt) : null,
    resolveSlaLabel(task.slaStatus),
  ].filter(Boolean).join(' · ')
}

function isBucketExpanded(bucketKey: string) {
  return showAllBuckets.value || expandedBucketKeys.value.includes(bucketKey)
}

function resolveVisibleBucketRows(bucket: (typeof prioritizedOwnerBuckets.value)[number]) {
  return isBucketExpanded(bucket.key) ? bucket.rows : bucket.rows.slice(0, compactBucketRowLimit)
}

function hiddenBucketRowCount(bucket: (typeof prioritizedOwnerBuckets.value)[number]) {
  return Math.max(bucket.rows.length - resolveVisibleBucketRows(bucket).length, 0)
}

function toggleBucketRows(bucketKey: string) {
  expandedBucketKeys.value = expandedBucketKeys.value.includes(bucketKey)
    ? expandedBucketKeys.value.filter((item) => item !== bucketKey)
    : [...expandedBucketKeys.value, bucketKey]
}
</script>

<template>
  <article class="erp-card role-queue-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
      <div class="panel-metrics">
        <span>{{ english ? 'Rows' : '条目' }} {{ visibleRowsForExport.length }}/{{ filteredRows.length }}/{{ rows.length }}</span>
        <span>{{ english ? 'Buckets' : '角色桶' }} {{ visibleBuckets.length }}/{{ ownerBuckets.length }}</span>
        <span>{{ english ? 'Server Tasks' : '服务端任务' }} {{ cutoverOpsStore.roleDeskSummary.totalCount }}</span>
        <span>{{ english ? 'Blocked' : '阻塞' }} {{ cutoverOpsStore.roleDeskSummary.statusCounts.blocked || 0 }}</span>
        <span>{{ english ? 'Overdue' : '超时' }} {{ cutoverOpsStore.roleDeskSummary.slaCounts.overdue || 0 }}</span>
        <span>{{ syncLabel }}</span>
      </div>
    </div>

    <div class="panel-toolbar">
      <el-input
        v-model="search"
        size="small"
        clearable
        :placeholder="english ? 'Filter rows, owners, blockers' : '筛选条目、责任人、阻塞项'"
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

    <div v-if="!ownerBuckets.length" class="panel-empty">
      {{ english ? 'No role desk rows yet.' : '当前还没有责任待办条目。' }}
    </div>

    <div v-else>
      <div class="panel-compact-note">
        <span>
          {{
            hiddenBucketCount
              ? (english
                ? `Showing ${visibleBuckets.length} priority owner buckets first. ${hiddenBucketCount} more buckets stay collapsed so the queue remains readable.`
                : `默认先展示最值得处理的 ${visibleBuckets.length} 个责任桶，另外 ${hiddenBucketCount} 个桶先收起，避免责任台被长队列刷满。`)
              : (english
                ? 'All owner buckets are currently visible.'
                : '当前责任桶已全部展开。')
          }}
        </span>
        <el-button
          v-if="prioritizedOwnerBuckets.length > compactBucketLimit"
          link
          type="primary"
          @click="showAllBuckets = !showAllBuckets"
        >
          {{ showAllBuckets ? (english ? 'Collapse Buckets' : '收起责任桶') : (english ? 'Show All Buckets' : '展开全部责任桶') }}
        </el-button>
      </div>

      <div class="bucket-list">
      <section
        v-for="bucket in visibleBuckets"
        :key="bucket.key"
        class="bucket-card"
      >
        <div class="bucket-header">
          <div>
            <div class="bucket-title">{{ bucket.roleLabel }} · {{ bucket.ownerLabel }}</div>
            <p class="bucket-desc">
              {{ english
                ? `${bucket.readyCount}/${bucket.rowCount} rows ready, ${bucket.blockerCount} blockers still visible.`
                : `已就绪 ${bucket.readyCount}/${bucket.rowCount}，当前仍有 ${bucket.blockerCount} 个阻塞信号。` }}
            </p>
          </div>
          <div class="bucket-metrics">
            <span class="metric neutral">{{ bucket.rowCount }}</span>
            <span class="metric success">{{ bucket.readyCount }}</span>
            <span v-if="bucket.blockerCount" class="metric warning">{{ bucket.blockerCount }}</span>
          </div>
        </div>

        <div class="bucket-rows">
          <article
            v-for="row in resolveVisibleBucketRows(bucket)"
            :key="`${bucket.key}-${row.label}`"
            class="scope-card"
          >
            <div
              v-if="latestTask(row, bucket.roleKey, bucket.ownerLabel)"
              class="scope-task-banner"
            >
              <strong>{{ english ? 'Latest Task' : '最近任务' }}</strong>
              <span>
                {{ latestTaskSummary(row, bucket.roleKey, bucket.ownerLabel) }}
                · {{ latestTask(row, bucket.roleKey, bucket.ownerLabel)?.updatedBy || '-' }}
                · {{ latestTask(row, bucket.roleKey, bucket.ownerLabel)?.createdAt ? formatDateTime(latestTask(row, bucket.roleKey, bucket.ownerLabel)?.createdAt || '') : '-' }}
                · {{ english ? 'History' : '历史' }} {{ historyCount(row, bucket.roleKey, bucket.ownerLabel) }}
              </span>
            </div>
            <div class="scope-header">
              <div>
                <strong>{{ row.label }}</strong>
                <p>{{ row.scopeLabel }} · {{ row.roleDeskLabel }}</p>
              </div>
              <span class="scope-pill">
                {{ row.scopeType === 'chain' ? (english ? 'Chain' : '链路') : (english ? 'Module' : '模块') }}
              </span>
            </div>
            <div class="scope-meta">
              <span>{{ english ? 'Missing Roles' : '缺失角色' }}: {{ listOrDash(row.missingRoles) }}</span>
              <span>{{ english ? 'Checklist Blockers' : '清单阻塞项' }}: {{ listOrDash(row.checklistBlockers) }}</span>
              <span>{{ english ? 'Suggested Blockers' : '建议阻塞项' }}: {{ listOrDash(row.blockerLabels) }}</span>
              <span v-if="latestTask(row, bucket.roleKey, bucket.ownerLabel)?.assignee">{{ english ? 'Assignee' : '指派给' }}: {{ latestTask(row, bucket.roleKey, bucket.ownerLabel)?.assignee }}</span>
              <span v-if="latestTask(row, bucket.roleKey, bucket.ownerLabel)?.dueAt">{{ english ? 'Due At' : '截止时间' }}: {{ formatDateTime(latestTask(row, bucket.roleKey, bucket.ownerLabel)?.dueAt || '') }}</span>
            </div>
            <div class="scope-actions">
              <el-button
                size="small"
                type="primary"
                @click="recordTask(row, bucket.roleKey, bucket.roleLabel, bucket.ownerLabel, 'claimed')"
              >
                {{ english ? 'Claim' : '认领' }}
              </el-button>
              <el-button
                size="small"
                @click="recordTask(row, bucket.roleKey, bucket.roleLabel, bucket.ownerLabel, 'assigned', bucket.ownerLabel, dueAtIn(4))"
              >
                {{ english ? 'Assign 4h' : '指派 4h' }}
              </el-button>
              <el-button
                size="small"
                @click="recordTask(row, bucket.roleKey, bucket.roleLabel, bucket.ownerLabel, 'reassigned', resolveReassignTarget(row, bucket.ownerLabel), dueAtIn(24))"
              >
                {{ english ? 'Reassign 24h' : '转派 24h' }}
              </el-button>
              <el-button
                size="small"
                type="warning"
                @click="recordTask(row, bucket.roleKey, bucket.roleLabel, bucket.ownerLabel, 'blocked')"
              >
                {{ english ? 'Block' : '阻塞' }}
              </el-button>
              <el-button
                size="small"
                type="success"
                @click="recordTask(row, bucket.roleKey, bucket.roleLabel, bucket.ownerLabel, 'done')"
              >
                {{ english ? 'Done' : '完成' }}
              </el-button>
              <el-button
                v-if="row.scopeTarget"
                size="small"
                @click="openTarget(row.scopeTarget)"
              >
                {{ english ? 'Open Scope' : '打开范围' }}
              </el-button>
              <el-button
                v-if="row.handoffTarget"
                size="small"
                @click="openTarget(row.handoffTarget)"
              >
                {{ english ? 'Handoff' : '交接台' }}
              </el-button>
              <el-button
                v-if="row.closeTarget"
                size="small"
                @click="openTarget(row.closeTarget)"
              >
                {{ english ? 'Close Desk' : '关账台' }}
              </el-button>
              <el-button
                v-if="row.financeTarget"
                size="small"
                @click="openTarget(row.financeTarget)"
              >
                {{ english ? 'Finance' : '财务' }}
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
        <div
          v-if="hiddenBucketRowCount(bucket) || isBucketExpanded(bucket.key)"
          class="bucket-compact-footer"
        >
          <span>
            {{
              hiddenBucketRowCount(bucket)
                ? (english
                  ? `${hiddenBucketRowCount(bucket)} more rows are hidden in this lane.`
                  : `当前责任桶还有 ${hiddenBucketRowCount(bucket)} 条次级待办已收起。`)
                : (english
                  ? 'All rows in this lane are visible.'
                  : '当前责任桶条目已全部展开。')
            }}
          </span>
          <el-button
            v-if="bucket.rows.length > compactBucketRowLimit && !showAllBuckets"
            link
            type="primary"
            @click="toggleBucketRows(bucket.key)"
          >
            {{ isBucketExpanded(bucket.key) ? (english ? 'Collapse Rows' : '收起条目') : (english ? 'Show All Rows' : '展开全部条目') }}
          </el-button>
        </div>
      </section>
      </div>
    </div>
  </article>
</template>

<style scoped>
.role-queue-panel {
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

.bucket-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bucket-card {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 16px;
  background: var(--app-panel);
}

.bucket-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.bucket-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--app-text);
}

.bucket-desc {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.bucket-metrics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bucket-rows {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bucket-compact-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed color-mix(in srgb, var(--app-primary) 18%, var(--app-border));
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.scope-card {
  border: 1px solid color-mix(in srgb, var(--app-border) 80%, transparent);
  border-radius: 14px;
  padding: 14px;
  background: color-mix(in srgb, var(--app-surface) 70%, var(--app-panel));
}

.scope-task-banner {
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

.scope-task-banner strong {
  color: var(--app-text);
}

.scope-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.scope-header strong {
  font-size: 14px;
  color: var(--app-text);
}

.scope-header p {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.scope-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
}

.scope-meta {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.scope-actions {
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

.metric.success {
  background: color-mix(in srgb, var(--app-success) 18%, transparent);
  color: var(--app-success);
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

  .panel-compact-note,
  .bucket-compact-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
