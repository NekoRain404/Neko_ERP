<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { createCloseTask } from '@/api/cutover-ops'
import { downloadText } from '@/utils/export'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import type { CutoverCloseTaskStatus } from '@/utils/cutover-ops'
import { buildModuleWorkbenchRouteQuery, isModuleRouteName } from '@/utils/module-navigation'

interface CloseTaskRow {
  taskType: string
  taskLabel: string
  description: string
  routeName?: string
  query?: Record<string, string | undefined>
}

const props = withDefaults(
  defineProps<{
    moduleKey: string
    title?: string
    description?: string
    english?: boolean
    scopeType?: 'module' | 'chain'
    scopeKey?: string
    scopeLabel?: string
  }>(),
  {
    title: undefined,
    description: undefined,
    english: false,
    scopeType: 'module',
    scopeKey: undefined,
    scopeLabel: undefined,
  },
)

const router = useRouter()
const authStore = useAuthStore()
const cutoverOpsStore = useCutoverOpsStore()
const scopeKey = computed(() => props.scopeKey || props.moduleKey)
const scopeLabel = computed(() => props.scopeLabel || props.moduleKey)

const panelTitle = computed(() => props.title || (props.english ? 'Close Tasks' : '关账任务台'))
const panelDescription = computed(() =>
  props.description || (props.english
    ? 'Track open-item, reverse-safe, and journal-review tasks as explicit close objects instead of leaving them in notes.'
    : '把未清项、可安全冲销和分录复核下沉成显式关账任务对象，而不是继续留在备注里。'),
)

const rows = computed<CloseTaskRow[]>(() => {
  if (props.moduleKey === 'accountMove') {
    return [
      {
        taskType: 'reconcile-open-items',
        taskLabel: props.english ? 'Reconcile Open Items' : '核未清项',
        description: props.english ? 'Check whether open items and matched lines are stable before close traffic grows.' : '在关账流量继续扩大前，先核未清项和已匹配分录是否稳定。',
        routeName: 'accountMove',
        query: { section: 'ops-settlement' },
      },
      {
        taskType: 'reverse-safety',
        taskLabel: props.english ? 'Reverse-safe Review' : '冲销安全复核',
        description: props.english ? 'Review whether reverse, draft rollback, and cleanup impact remain controlled.' : '复核 reverse、回草稿和清理副作用是否仍受控。',
        routeName: 'accountMove',
        query: { section: 'ops-close' },
      },
      {
        taskType: 'journal-item-review',
        taskLabel: props.english ? 'Journal Item Review' : '分录审查',
        description: props.english ? 'Keep line-level journal evidence and imbalance signals reviewable from one shell.' : '把分录级证据和异常信号固定在同一壳层内可审查。',
        routeName: 'accountMove',
        query: { section: 'traceability' },
      },
      {
        taskType: 'source-anchor-check',
        taskLabel: props.english ? 'Source Anchor Check' : '来源锚点核对',
        description: props.english ? 'Confirm invoice, payment, and upstream source anchors still reopen cleanly.' : '确认发票、付款和上游来源锚点仍能被稳定重开。',
        routeName: 'accountMove',
        query: { section: 'traceability', relatedTo: 'accountMove' },
      },
    ]
  }
  return [
    {
      taskType: 'shared-close-review',
      taskLabel: props.english ? 'Shared Close Review' : '共享关账复核',
      description: props.english ? 'Record shared close review progress for this scope.' : '记录当前范围的共享关账复核进度。',
      routeName: props.moduleKey,
      query: { section: 'ops-close' },
    },
  ]
})

onMounted(() => {
  void syncBoard()
})

function actingUser() {
  return authStore.displayName || authStore.user?.username || (props.english ? 'close-operator' : '关账操作员')
}

function latestTask(row: CloseTaskRow) {
  return cutoverOpsStore.latestCloseTask(props.scopeType, scopeKey.value, row.taskType, props.moduleKey)
}

function historyCount(row: CloseTaskRow) {
  return cutoverOpsStore.closeTaskHistoryFor(props.scopeType, scopeKey.value, props.moduleKey, row.taskType).length
}

function resolveStatusLabel(status?: CutoverCloseTaskStatus | null) {
  if (status === 'in_progress') return props.english ? 'In Progress' : '进行中'
  if (status === 'blocked') return props.english ? 'Blocked' : '阻塞'
  if (status === 'done') return props.english ? 'Done' : '完成'
  return props.english ? 'Open' : '待处理'
}

async function recordTask(row: CloseTaskRow, status: CutoverCloseTaskStatus) {
  const note = `${row.taskLabel} · ${resolveStatusLabel(status)}`
  try {
    const saved = await createCloseTask({
      scopeType: props.scopeType,
      scopeKey: scopeKey.value,
      scopeLabel: scopeLabel.value,
      moduleKey: props.moduleKey,
      taskType: row.taskType,
      taskLabel: row.taskLabel,
      status,
      note,
      updatedBy: actingUser(),
    })
    cutoverOpsStore.upsertCloseTask(saved)
  } catch {
    cutoverOpsStore.addCloseTask({
      scopeType: props.scopeType,
      scopeKey: scopeKey.value,
      scopeLabel: scopeLabel.value,
      moduleKey: props.moduleKey,
      taskType: row.taskType,
      taskLabel: row.taskLabel,
      status,
      note,
      updatedBy: actingUser(),
    })
  }
  ElMessage.success(props.english ? 'Close task updated' : '关账任务已更新')
}

function openTask(row: CloseTaskRow) {
  if (!row.routeName) return
  void router.push({
    name: row.routeName,
    query: buildModuleWorkbenchRouteQuery({
      targetRouteName: row.routeName,
      rawQuery: row.query,
      sourceModuleKey: isModuleRouteName(props.moduleKey) ? props.moduleKey : undefined,
      chainKey: props.scopeType === 'chain' ? scopeKey.value : undefined,
    }),
  })
}

async function syncBoard() {
  try {
    await cutoverOpsStore.syncServerBoard(240)
  } catch {
    ElMessage.warning(props.english ? 'Close task sync unavailable' : '关账任务同步暂不可用')
  }
}

function exportPacket() {
  const content = [
    `# ${panelTitle.value}`,
    '',
    `${props.english ? 'Scope' : '范围'}: ${scopeLabel.value}`,
    `${props.english ? 'Generated At' : '生成时间'}: ${formatDateTime(new Date().toISOString())}`,
    '',
    ...rows.value.map((row) => {
      const latest = latestTask(row)
      return [
        `## ${row.taskLabel}`,
        row.description,
        `${props.english ? 'Latest' : '最近状态'}: ${latest ? resolveStatusLabel(latest.status) : '-'}`,
        `${props.english ? 'Updated By' : '更新人'}: ${latest?.updatedBy || '-'}`,
        `${props.english ? 'Created At' : '创建时间'}: ${latest?.createdAt ? formatDateTime(latest.createdAt) : '-'}`,
        `${props.english ? 'History Count' : '历史条数'}: ${historyCount(row)}`,
      ].join('\n')
    }),
  ].join('\n')
  downloadText(
    `neko_erp_close_tasks_${props.moduleKey}_${new Date().toISOString().slice(0, 10)}.md`,
    content,
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(props.english ? 'Close task packet exported' : '关账任务包已导出')
}
</script>

<template>
  <article class="erp-card close-task-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
      <div class="panel-metrics">
        <span>{{ english ? 'Tasks' : '任务' }} {{ rows.length }}</span>
        <span>{{ english ? 'Server Close Tasks' : '服务端关账任务' }} {{ cutoverOpsStore.closeTaskSummary.totalCount }}</span>
        <span>{{ english ? 'Blocked' : '阻塞' }} {{ cutoverOpsStore.closeTaskSummary.statusCounts.blocked || 0 }}</span>
      </div>
    </div>

    <div class="panel-toolbar">
      <el-button size="small" :loading="cutoverOpsStore.serverSyncing" @click="syncBoard">
        {{ english ? 'Sync' : '同步' }}
      </el-button>
      <el-button size="small" @click="exportPacket">
        {{ english ? 'Export Packet' : '导出任务包' }}
      </el-button>
    </div>

    <div class="task-list">
      <article v-for="row in rows" :key="row.taskType" class="task-card">
        <div class="task-head">
          <div>
            <strong>{{ row.taskLabel }}</strong>
            <p>{{ row.description }}</p>
          </div>
          <span class="task-status">{{ resolveStatusLabel(latestTask(row)?.status) }}</span>
        </div>
        <div class="task-meta">
          <span>{{ english ? 'Updated By' : '更新人' }}: {{ latestTask(row)?.updatedBy || '-' }}</span>
          <span>{{ english ? 'Created At' : '创建时间' }}: {{ latestTask(row)?.createdAt ? formatDateTime(latestTask(row)?.createdAt || '') : '-' }}</span>
          <span>{{ english ? 'History' : '历史' }}: {{ historyCount(row) }}</span>
        </div>
        <div class="task-actions">
          <el-button size="small" @click="recordTask(row, 'open')">
            {{ english ? 'Open' : '待处理' }}
          </el-button>
          <el-button size="small" type="primary" @click="recordTask(row, 'in_progress')">
            {{ english ? 'In Progress' : '推进中' }}
          </el-button>
          <el-button size="small" type="warning" @click="recordTask(row, 'blocked')">
            {{ english ? 'Block' : '阻塞' }}
          </el-button>
          <el-button size="small" type="success" @click="recordTask(row, 'done')">
            {{ english ? 'Done' : '完成' }}
          </el-button>
          <el-button v-if="row.routeName" size="small" @click="openTask(row)">
            {{ english ? 'Open Desk' : '打开台面' }}
          </el-button>
        </div>
      </article>
    </div>
  </article>
</template>

<style scoped>
.close-task-panel {
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

.panel-metrics,
.task-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.panel-toolbar {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.task-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 16px;
  background: var(--app-panel);
}

.task-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.task-head strong {
  font-size: 14px;
  color: var(--app-text);
}

.task-head p {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.task-status {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
}

.task-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
