<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { fetchFinancialTraceCockpit, fetchFinancialTraceDetail, type FinancialTraceCockpit } from '@/api/financial-trace'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import { useAuthStore } from '@/stores/auth'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import { usePilotReviewStore } from '@/stores/pilot-review'
import { useI18n } from '@/i18n'
import type { CutoverFinancialTraceState } from '@/utils/cutover-financial-trace'
import { resolveCutoverSettingsQuery } from '@/utils/cutover'
import { downloadCsv, downloadText } from '@/utils/export'
import {
  buildFinancialTraceBundleFilename,
  buildFinancialTraceBundlePacket,
  buildFinancialTraceDetailPacket,
  supportsFinancialTraceDetailModule,
} from '@/utils/financial-trace-packets'
import { formatDateTime } from '@/utils/format'
import { pickTopReminder, resolveReminderSection } from '@/utils/reminders'
import {
  buildScopeFinancialTraceState,
  buildScopeFinancialTraceTarget,
  buildScopeModuleFinancialTraceStateMap,
  collectScopeTraceBundleTargets,
  listScopeFinancialTraceModules,
  resolveScopeTopTraceRecord,
} from '@/utils/scope-financial-trace'
import { buildModuleDetailRouteTarget, buildModuleRouteTarget, isModuleRouteName } from '@/utils/module-navigation'

interface ScopeRow {
  key: string
  label: string
  description: string
  moduleKeys: ModuleKey[]
  chainKey?: string
  routeName?: string
  query?: Record<string, string | undefined>
  buttonLabel?: string
  topRiskRouteName?: string
  topRiskQuery?: Record<string, string | undefined>
  topRiskLabel?: string
}

interface ScopeBatchRow extends ScopeRow {
  total: number
  recordCount: number
  critical: number
  warning: number
  topRecord?: ReminderRecord
  financialTraceSummary: CutoverFinancialTraceState
  traceTarget: ReturnType<typeof buildScopeFinancialTraceTarget>
  documentsTarget: ReturnType<typeof buildScopeFinancialTraceTarget>
  timelineTarget: ReturnType<typeof buildScopeFinancialTraceTarget>
}

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    rows: ScopeRow[]
    limit?: number
  }>(),
  {
    title: undefined,
    description: undefined,
    limit: 120,
  },
)

const router = useRouter()
const authStore = useAuthStore()
const cutoverOpsStore = useCutoverOpsStore()
const pilotReviewStore = usePilotReviewStore()
const { locale, moduleTitle } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const loading = ref(false)
const batchRows = ref<ScopeBatchRow[]>([])
const batchRowsSource = ref<ReminderRecord[]>([])
const moduleFinancialTraceCockpitMap = ref<Partial<Record<ModuleKey, FinancialTraceCockpit>>>({})
const traceBundleBusyKey = ref('')
const showAllRows = ref(false)
const compactRowLimit = 5

const panelTitle = computed(() => props.title || (isEnglish.value ? 'Pilot Batch Actions' : '试点批处理'))
const panelDescription = computed(() =>
  props.description || (isEnglish.value
    ? 'Export scope exceptions, open the top-risk record, and prepare rollback reviews from one surface.'
    : '在同一入口完成范围异常导出、最高风险记录跳转和回退核对准备。'),
)
const prioritizedBatchRows = computed(() =>
  [...batchRows.value].sort((left, right) => {
    const leftScore = (left.critical * 8)
      + (left.warning * 4)
      + (left.financialTraceSummary.missingCount * 3)
      + (left.financialTraceSummary.warningCount * 2)
      + (left.total > 0 ? 2 : 0)
      + (left.topRecord ? 1 : 0)
    const rightScore = (right.critical * 8)
      + (right.warning * 4)
      + (right.financialTraceSummary.missingCount * 3)
      + (right.financialTraceSummary.warningCount * 2)
      + (right.total > 0 ? 2 : 0)
      + (right.topRecord ? 1 : 0)
    if (rightScore !== leftScore) return rightScore - leftScore
    if (right.recordCount !== left.recordCount) return right.recordCount - left.recordCount
    return left.label.localeCompare(right.label)
  }),
)
const visibleBatchRows = computed(() =>
  showAllRows.value ? prioritizedBatchRows.value : prioritizedBatchRows.value.slice(0, compactRowLimit),
)
const hiddenBatchRowCount = computed(() => Math.max(prioritizedBatchRows.value.length - visibleBatchRows.value.length, 0))

function buildScopeRow(
  row: ScopeRow,
  source: ReminderRecord[],
  moduleTraceStateMap: Partial<Record<ModuleKey, CutoverFinancialTraceState>>,
): ScopeBatchRow {
  const allowed = new Set(row.moduleKeys)
  const matches = source.filter((item) => allowed.has(item.moduleKey as ModuleKey) && !pilotReviewStore.isHidden(item))
  const uniqueRecords = new Set(matches.filter((item) => item.recordId).map((item) => `${item.moduleKey}:${item.recordId}`))
  const financialTraceSummary = buildScopeFinancialTraceState({
    moduleKeys: row.moduleKeys,
    moduleStates: moduleTraceStateMap,
    isEnglish: isEnglish.value,
    moduleTitle,
  })
  return {
    ...row,
    total: matches.length,
    recordCount: uniqueRecords.size,
    critical: matches.filter((item) => item.severity === 'critical').length,
    warning: matches.filter((item) => item.severity === 'warning').length,
    // Rollback review should prefer the real cockpit top risk and only
    // fall back to reminder severity when backend trace detail is absent.
    topRecord: pickTopReminder(matches),
    financialTraceSummary,
    traceTarget: buildScopeFinancialTraceTarget(financialTraceSummary, 'traceability'),
    documentsTarget: buildScopeFinancialTraceTarget(financialTraceSummary, 'documents'),
    timelineTarget: buildScopeFinancialTraceTarget(financialTraceSummary, 'timeline'),
  }
}

function markScopeReviewed(row: ScopeBatchRow) {
  const rows = collectScopeRows(row)
  pilotReviewStore.markReviewed(rows.map((item) => item.id))
  rebuildRows()
  ElMessage.success(isEnglish.value ? 'Scope marked as reviewed' : '当前范围已标记为已核对')
}

function snoozeScope(row: ScopeBatchRow) {
  const rows = collectScopeRows(row)
  pilotReviewStore.snooze(rows.map((item) => item.id))
  rebuildRows()
  ElMessage.success(isEnglish.value ? 'Scope snoozed' : '当前范围已暂缓处理')
}

function openScope(row: ScopeBatchRow) {
  if (!row.routeName) return
  if (isModuleRouteName(row.routeName)) {
    void router.push(buildModuleRouteTarget({
      targetModuleKey: row.routeName,
      rawQuery: row.query,
      chainKey: row.chainKey,
    }))
    return
  }
  void router.push({
    name: row.routeName,
    query: row.query,
  })
}

function openScopeHandoff(row: ScopeBatchRow) {
  const moduleKey = row.moduleKeys.length === 1 ? row.moduleKeys[0] : undefined
  if (!row.chainKey && !moduleKey) return
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({
      chainKey: row.chainKey,
      moduleKey,
      section: 'handoff',
    }),
  })
}

function openScopeClosedLoop(row: ScopeBatchRow) {
  const moduleKey = row.moduleKeys.length === 1 ? row.moduleKeys[0] : undefined
  if (!row.chainKey && !moduleKey) return
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({
      chainKey: row.chainKey,
      moduleKey,
      section: 'ops',
    }),
  })
}

function openTopRecord(row: ScopeBatchRow) {
  if (row.traceTarget) {
    void router.push({
      name: row.traceTarget.routeName,
      query: row.traceTarget.query,
    })
    return
  }
  if (row.topRiskRouteName && row.topRiskQuery) {
    void router.push({
      name: row.topRiskRouteName,
      query: row.topRiskQuery,
    })
    return
  }
  if (!row.topRecord?.recordId || !row.topRecord.moduleKey) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: row.topRecord.moduleKey as ModuleKey,
    recordId: row.topRecord.recordId,
    section: resolveReminderSection(row.topRecord),
    sourceModuleKey: row.routeName && isModuleRouteName(row.routeName) ? row.routeName : undefined,
    chainKey: row.chainKey,
  }))
}

function openTopDocuments(row: ScopeBatchRow) {
  if (row.documentsTarget) {
    void router.push({
      name: row.documentsTarget.routeName,
      query: row.documentsTarget.query,
    })
    return
  }
  if (!row.topRecord?.recordId || !row.topRecord.moduleKey) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: row.topRecord.moduleKey as ModuleKey,
    recordId: row.topRecord.recordId,
    section: 'documents',
    sourceModuleKey: row.routeName && isModuleRouteName(row.routeName) ? row.routeName : undefined,
    chainKey: row.chainKey,
  }))
}

function openTopTimeline(row: ScopeBatchRow) {
  if (row.timelineTarget) {
    void router.push({
      name: row.timelineTarget.routeName,
      query: row.timelineTarget.query,
    })
    return
  }
  if (!row.topRecord?.recordId || !row.topRecord.moduleKey) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: row.topRecord.moduleKey as ModuleKey,
    recordId: row.topRecord.recordId,
    section: 'timeline',
    sourceModuleKey: row.routeName && isModuleRouteName(row.routeName) ? row.routeName : undefined,
    chainKey: row.chainKey,
  }))
}

function exportScopeExceptions(row: ScopeBatchRow) {
  const rows = collectScopeRows(row)
  const filename = `neko_erp_${row.key}_exceptions_${new Date().toISOString().slice(0, 10)}.csv`
  downloadCsv(
    filename,
    [
      { key: 'severity', title: isEnglish.value ? 'Severity' : '严重级别' },
      { key: 'moduleKey', title: isEnglish.value ? 'Module' : '模块' },
      { key: 'recordId', title: isEnglish.value ? 'Record ID' : '记录ID' },
      { key: 'title', title: isEnglish.value ? 'Title' : '标题' },
      { key: 'relatedRef', title: isEnglish.value ? 'Reference' : '引用' },
      { key: 'content', title: isEnglish.value ? 'Content' : '内容' },
      { key: 'createdAt', title: isEnglish.value ? 'Created At' : '创建时间' },
    ],
    rows,
  )
  cutoverOpsStore.addExceptionExport({
    scopeType: row.moduleKeys.length > 1 ? 'chain' : 'module',
    scopeKey: row.key,
    scopeLabel: row.label,
    filename,
    rowCount: rows.length,
    exportedBy: authStore.displayName || authStore.user?.username || 'pilot-batch',
  })
  ElMessage.success(isEnglish.value ? 'Scope exception list exported' : '范围异常清单已导出')
}

function resolveTopTraceRecord(row: ScopeBatchRow) {
  return resolveScopeTopTraceRecord({
    state: row.financialTraceSummary,
    fallbackReminder: row.topRecord,
    fallbackLabel: row.topRiskLabel,
    moduleTitle,
    english: isEnglish.value,
  })
}

function canExportTopTracePacket(row: ScopeBatchRow) {
  const target = resolveTopTraceRecord(row)
  return Boolean(target && supportsFinancialTraceDetailModule(String(target.moduleKey)))
}

function hasScopeTraceBundle(row: ScopeBatchRow) {
  return collectScopeTraceBundleTargets({
    moduleKeys: row.moduleKeys,
    cockpitMap: moduleFinancialTraceCockpitMap.value,
    moduleTitle,
    english: isEnglish.value,
  }).length > 0
}

async function buildScopeTraceBundleContent(row: ScopeBatchRow) {
  const generatedAt = formatDateTime(new Date().toISOString())
  const targets = collectScopeTraceBundleTargets({
    moduleKeys: row.moduleKeys,
    cockpitMap: moduleFinancialTraceCockpitMap.value,
    moduleTitle,
    english: isEnglish.value,
    limit: 4,
  })
  if (!targets.length) {
    return buildFinancialTraceBundlePacket({
      english: isEnglish.value,
      generatedAt,
      title: isEnglish.value ? `${row.label} Financial Trace Bundle` : `${row.label} 财务追溯证据包`,
      moduleTitle,
      entries: [],
    })
  }

  const results = await Promise.allSettled(
    targets.map(async (target) => ({
      moduleKey: target.moduleKey,
      packetTitle: isEnglish.value
        ? `${row.label} · ${moduleTitle(target.moduleKey)}`
        : `${row.label} · ${moduleTitle(target.moduleKey)} 追溯详情`,
      detail: await fetchFinancialTraceDetail(target.moduleKey, target.recordId),
    })),
  )
  const entries = results
    .filter((item): item is PromiseFulfilledResult<{
      moduleKey: ModuleKey
      packetTitle: string
      detail: Awaited<ReturnType<typeof fetchFinancialTraceDetail>>
    }> => item.status === 'fulfilled')
    .map((item) => item.value)
  const failedRefs = results
    .map((item, index) => ({ item, target: targets[index] }))
    .filter((item): item is { item: PromiseRejectedResult; target: ReturnType<typeof collectScopeTraceBundleTargets>[number] } => item.item.status === 'rejected')
    .map(({ target }) =>
      `${moduleTitle(target.moduleKey)} · ${target.recordRef || `#${target.recordId}`} · ${isEnglish.value ? 'detail unavailable from backend' : '后端详情暂不可用'}`,
    )

  return buildFinancialTraceBundlePacket({
    english: isEnglish.value,
    generatedAt,
    title: isEnglish.value ? `${row.label} Financial Trace Bundle` : `${row.label} 财务追溯证据包`,
    moduleTitle,
    entries,
    failedRefs,
  })
}

async function exportScopeTraceBundle(row: ScopeBatchRow) {
  if (traceBundleBusyKey.value) return
  traceBundleBusyKey.value = row.key
  try {
    downloadText(
      buildFinancialTraceBundleFilename({
        scope: row.key,
        date: new Date().toISOString().slice(0, 10),
      }),
      await buildScopeTraceBundleContent(row),
      'text/markdown;charset=utf-8',
    )
    ElMessage.success(isEnglish.value ? 'Trace bundle exported' : '财务追溯证据包已导出')
  } catch (error: any) {
    ElMessage.error(error?.message || (isEnglish.value ? 'Failed to export trace bundle' : '导出财务追溯证据包失败'))
  } finally {
    traceBundleBusyKey.value = ''
  }
}

async function copyScopeTraceBundle(row: ScopeBatchRow) {
  if (traceBundleBusyKey.value || !navigator.clipboard) return
  traceBundleBusyKey.value = row.key
  try {
    await navigator.clipboard.writeText(await buildScopeTraceBundleContent(row))
    ElMessage.success(isEnglish.value ? 'Trace bundle copied' : '财务追溯证据包已复制')
  } catch (error: any) {
    ElMessage.error(error?.message || (isEnglish.value ? 'Failed to copy trace bundle' : '复制财务追溯证据包失败'))
  } finally {
    traceBundleBusyKey.value = ''
  }
}

async function exportTopTracePacket(row: ScopeBatchRow) {
  const target = resolveTopTraceRecord(row)
  if (!target || !supportsFinancialTraceDetailModule(String(target.moduleKey))) return
  try {
    const detail = await fetchFinancialTraceDetail(target.moduleKey, target.recordId)
    downloadText(
      `neko_erp_${row.key}_top_trace_${target.recordId}_${new Date().toISOString().slice(0, 10)}.md`,
      buildFinancialTraceDetailPacket({
        english: isEnglish.value,
        generatedAt: formatDateTime(new Date().toISOString()),
        detail,
        moduleTitle,
        title: isEnglish.value ? `${row.label} Top Risk Trace Packet` : `${row.label} 最高风险追溯包`,
      }),
      'text/markdown;charset=utf-8',
    )
    ElMessage.success(isEnglish.value ? 'Top trace packet exported' : '最高风险追溯包已导出')
  } catch {
    ElMessage.warning(isEnglish.value ? 'Trace packet is temporarily unavailable' : '追溯包暂时不可用')
  }
}

async function exportRollbackReview(row: ScopeBatchRow) {
  const rows = collectScopeRows(row)
  const topTraceRecord = resolveTopTraceRecord(row)
  let traceDetailBlock = ''
  if (topTraceRecord && supportsFinancialTraceDetailModule(String(topTraceRecord.moduleKey))) {
    try {
      const detail = await fetchFinancialTraceDetail(topTraceRecord.moduleKey, topTraceRecord.recordId)
      traceDetailBlock = [
        '',
        buildFinancialTraceDetailPacket({
          english: isEnglish.value,
          generatedAt: formatDateTime(new Date().toISOString()),
          detail,
          moduleTitle,
          title: isEnglish.value ? 'Top Risk Trace Detail' : '最高风险追溯详情',
        }),
      ].join('\n')
    } catch {
      traceDetailBlock = [
        '',
        `## ${isEnglish.value ? 'Top Risk Trace Detail' : '最高风险追溯详情'}`,
        `- ${isEnglish.value ? 'Backend trace detail is temporarily unavailable. Use the detail page for manual review.' : '后端追溯详情暂时不可用，请在详情页手动复核。'}`,
      ].join('\n')
    }
  }
  const content = [
    `# ${row.label}`,
    '',
    `${isEnglish.value ? 'Description' : '说明'}: ${row.description}`,
    `${isEnglish.value ? 'Records' : '记录'}: ${row.recordCount}`,
    `${isEnglish.value ? 'Reminders' : '提醒'}: ${row.total}`,
    `${isEnglish.value ? 'Critical' : '严重'}: ${row.critical}`,
    `${isEnglish.value ? 'Warning' : '提醒'}: ${row.warning}`,
    `${isEnglish.value ? 'Financial Trace' : '财务追溯'}: ${row.financialTraceSummary.statusLabel}`,
    '',
    `## ${isEnglish.value ? 'Top Risk Record' : '最高风险记录'}`,
    topTraceRecord
      ? [
          `- ${isEnglish.value ? 'Module' : '模块'}: ${moduleTitle(topTraceRecord.moduleKey)}`,
          `- ${isEnglish.value ? 'Record ID' : '记录ID'}: ${topTraceRecord.recordId}`,
          `- ${isEnglish.value ? 'Reference' : '引用'}: ${topTraceRecord.label}`,
        ].join('\n')
      : row.topRiskLabel
        ? `- ${isEnglish.value ? 'Reference' : '引用'}: ${row.topRiskLabel}`
        : `- ${isEnglish.value ? 'No high-risk record in this scope.' : '当前范围内没有高风险记录。'}`,
    '',
    `## ${isEnglish.value ? 'Reminder Rows' : '提醒明细'}`,
    rows.length
      ? rows
          .map((item) => [
            `- [${item.severity}] ${moduleTitle(item.moduleKey as ModuleKey)} #${item.recordId ?? '-'}`,
            `  ${isEnglish.value ? 'Title' : '标题'}: ${item.title}`,
            `  ${isEnglish.value ? 'Reference' : '引用'}: ${item.relatedRef || '-'}`,
            `  ${isEnglish.value ? 'Created At' : '创建时间'}: ${item.createdAt ? formatDateTime(item.createdAt) : '-'}`,
            `  ${isEnglish.value ? 'Content' : '内容'}: ${item.content}`,
          ].join('\n'))
          .join('\n\n')
      : `- ${isEnglish.value ? 'No reminders in this scope.' : '当前范围内没有提醒。'}`,
    traceDetailBlock,
  ].join('\n')

  downloadText(
    `neko_erp_${row.key}_rollback_review_${new Date().toISOString().slice(0, 10)}.md`,
    content,
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(isEnglish.value ? 'Rollback review exported' : '回退核对摘要已导出')
}

function collectScopeRows(row: ScopeBatchRow) {
  const allowed = new Set(row.moduleKeys)
  return batchRowsSource.value.filter((item) => allowed.has(item.moduleKey as ModuleKey) && !pilotReviewStore.isHidden(item))
}

function rebuildRows() {
  const allModuleKeys = props.rows.flatMap((row) => row.moduleKeys)
  const moduleTraceStateMap = buildScopeModuleFinancialTraceStateMap({
    moduleKeys: allModuleKeys,
    reminders: batchRowsSource.value,
    cockpitMap: moduleFinancialTraceCockpitMap.value,
    isEnglish: isEnglish.value,
    moduleTitle,
  })
  batchRows.value = props.rows.map((row) => buildScopeRow(row, batchRowsSource.value, moduleTraceStateMap))
}

async function refreshSource() {
  loading.value = true
  try {
    const allModuleKeys = props.rows.flatMap((row) => row.moduleKeys)
    const [reminders, cockpitResults] = await Promise.all([
      fetchReminders({ limit: props.limit }),
      Promise.allSettled(
        listScopeFinancialTraceModules(allModuleKeys).map(async (moduleKey) => ({
          moduleKey,
          cockpit: await fetchFinancialTraceCockpit(moduleKey, 8),
        })),
      ),
    ])
    batchRowsSource.value = reminders
    moduleFinancialTraceCockpitMap.value = cockpitResults.reduce<Partial<Record<ModuleKey, FinancialTraceCockpit>>>((summary, item) => {
      if (item.status === 'fulfilled') {
        summary[item.value.moduleKey] = item.value.cockpit
      }
      return summary
    }, {})
    rebuildRows()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refreshSource()
})

watch(
  () => `${locale.value}::${props.limit}::${props.rows.map((row) => `${row.key}:${row.moduleKeys.join('|')}`).join('||')}`,
  () => {
    void refreshSource()
  },
)
</script>

<template>
  <article class="erp-card batch-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
    </div>

    <div v-if="loading" class="panel-empty">
      {{ isEnglish ? 'Loading batch actions...' : '正在加载批处理入口...' }}
    </div>

    <div v-else>
      <div class="panel-compact-note">
        <span>
          {{
            hiddenBatchRowCount
              ? (isEnglish
                ? `Showing ${visibleBatchRows.length} highest-priority pilot scopes first. ${hiddenBatchRowCount} more scopes stay collapsed so the action desk remains focused.`
                : `默认先展示最需要处理的 ${visibleBatchRows.length} 个试点范围，另外 ${hiddenBatchRowCount} 个范围先收起，让批处理面板保持聚焦。`)
              : (isEnglish
                ? 'All pilot scopes are currently visible.'
                : '当前试点范围已全部展开。')
          }}
        </span>
        <el-button
          v-if="prioritizedBatchRows.length > compactRowLimit"
          link
          type="primary"
          @click="showAllRows = !showAllRows"
        >
          {{ showAllRows ? (isEnglish ? 'Collapse' : '收起') : (isEnglish ? 'Show All' : '展开全部') }}
        </el-button>
      </div>

      <div class="batch-list">
      <div
        v-for="row in visibleBatchRows"
        :key="row.key"
        class="batch-row"
      >
        <div class="batch-copy">
          <div class="batch-headline">
            <strong>{{ row.label }}</strong>
            <div class="batch-metrics">
              <span class="metric neutral">{{ row.recordCount }}</span>
              <span v-if="row.warning" class="metric warning">{{ row.warning }}</span>
              <span v-if="row.critical" class="metric critical">{{ row.critical }}</span>
            </div>
          </div>
          <p>{{ row.description }}</p>
          <div class="batch-meta">
            <span>{{ isEnglish ? 'Records' : '记录' }} {{ row.recordCount }}</span>
            <span>{{ isEnglish ? 'Reminders' : '提醒' }} {{ row.total }}</span>
            <span v-if="row.financialTraceSummary.expectedCount">
              {{ isEnglish ? 'Trace' : '追溯' }}: {{ row.financialTraceSummary.statusLabel }}
            </span>
            <span v-if="row.financialTraceSummary.topRiskRefs[0] || row.topRiskLabel">
              {{ isEnglish ? 'Top Risk' : '最高风险' }}: {{ row.financialTraceSummary.topRiskRefs[0] || row.topRiskLabel }}
            </span>
            <span v-else-if="row.topRecord">
              {{ isEnglish ? 'Top Risk' : '最高风险' }}: {{ moduleTitle(row.topRecord.moduleKey as ModuleKey) }} #{{ row.topRecord.recordId ?? '-' }}
            </span>
          </div>
        </div>

        <div class="batch-actions">
          <el-button
            v-if="row.routeName"
            size="small"
            @click="openScope(row)"
          >
            {{ row.buttonLabel || (isEnglish ? 'Open Scope' : '打开范围') }}
          </el-button>
          <el-button
            v-if="row.chainKey || row.moduleKeys.length === 1"
            size="small"
            @click="openScopeHandoff(row)"
          >
            {{ isEnglish ? 'Handoff' : '交接台' }}
          </el-button>
          <el-button
            v-if="row.chainKey || row.moduleKeys.length === 1"
            size="small"
            @click="openScopeClosedLoop(row)"
          >
            {{ isEnglish ? 'Closed Loop' : '闭环台' }}
          </el-button>
          <el-button
            size="small"
            type="primary"
            :disabled="!row.topRecord?.recordId && !row.topRiskQuery && !row.traceTarget"
            @click="openTopRecord(row)"
          >
            {{ isEnglish ? 'Open Top Risk' : '打开最高风险记录' }}
          </el-button>
          <el-button
            v-if="row.documentsTarget || row.topRecord?.recordId"
            size="small"
            @click="openTopDocuments(row)"
          >
            {{ isEnglish ? 'Documents' : '文档' }}
          </el-button>
          <el-button
            v-if="row.timelineTarget || row.topRecord?.recordId"
            size="small"
            @click="openTopTimeline(row)"
          >
            {{ isEnglish ? 'Timeline' : '时间轴' }}
          </el-button>
          <el-button
            size="small"
            :disabled="!canExportTopTracePacket(row)"
            @click="exportTopTracePacket(row)"
          >
            {{ isEnglish ? 'Export Top Trace' : '导出最高追溯包' }}
          </el-button>
          <el-button
            size="small"
            :loading="traceBundleBusyKey === row.key"
            :disabled="!hasScopeTraceBundle(row)"
            @click="copyScopeTraceBundle(row)"
          >
            {{ isEnglish ? 'Copy Trace Bundle' : '复制追溯证据包' }}
          </el-button>
          <el-button
            size="small"
            :loading="traceBundleBusyKey === row.key"
            :disabled="!hasScopeTraceBundle(row)"
            @click="exportScopeTraceBundle(row)"
          >
            {{ isEnglish ? 'Export Trace Bundle' : '导出追溯证据包' }}
          </el-button>
          <el-button
            size="small"
            @click="exportScopeExceptions(row)"
          >
            {{ isEnglish ? 'Export Exceptions' : '导出异常清单' }}
          </el-button>
          <el-button
            size="small"
            @click="exportRollbackReview(row)"
          >
            {{ isEnglish ? 'Export Rollback Review' : '导出回退核对' }}
          </el-button>
          <el-button
            size="small"
            :disabled="!row.total"
            @click="snoozeScope(row)"
          >
            {{ isEnglish ? 'Later' : '稍后处理' }}
          </el-button>
          <el-button
            size="small"
            type="primary"
            :disabled="!row.total"
            @click="markScopeReviewed(row)"
          >
            {{ isEnglish ? 'Mark Reviewed' : '标记已核对' }}
          </el-button>
        </div>
      </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.batch-panel {
  padding: 22px;
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
  line-height: 1.5;
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

.batch-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-row {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 16px;
  background: var(--app-panel);
}

.batch-headline {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.batch-copy strong {
  font-size: 14px;
}

.batch-copy p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.batch-meta {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.batch-actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.batch-metrics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.metric.critical {
  background: color-mix(in srgb, var(--app-danger) 18%, transparent);
  color: var(--app-danger);
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
  .panel-compact-note {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
