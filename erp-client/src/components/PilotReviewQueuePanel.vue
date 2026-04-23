<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { fetchFinancialTraceCockpit, fetchFinancialTraceDetail, type FinancialTraceCockpit } from '@/api/financial-trace'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import { usePilotReviewStore } from '@/stores/pilot-review'
import { useI18n } from '@/i18n'
import { downloadText } from '@/utils/export'
import {
  buildFinancialTraceBundleFilename,
  buildFinancialTraceBundlePacket,
  buildFinancialTraceDetailPacket,
  supportsFinancialTraceDetailModule,
} from '@/utils/financial-trace-packets'
import { formatDateTime } from '@/utils/format'
import {
  collectScopeTraceBundleTargets,
  listScopeFinancialTraceModules,
} from '@/utils/scope-financial-trace'
import { resolveReminderSection, severityRank } from '@/utils/reminders'
import { buildModuleDetailRouteTarget } from '@/utils/module-navigation'

interface QueueItem {
  key: string
  moduleKey: ModuleKey
  recordId: number
  count: number
  severity: ReminderRecord['severity']
  title: string
  content: string
  reminderIds: string[]
  relatedRef?: string | null
  createdAt?: string | null
}

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    moduleKeys: ModuleKey[]
    limit?: number
  }>(),
  {
    title: undefined,
    description: undefined,
    limit: 6,
  },
)

const router = useRouter()
const pilotReviewStore = usePilotReviewStore()
const { locale, moduleTitle } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const loading = ref(false)
const items = ref<QueueItem[]>([])
const moduleFinancialTraceCockpitMap = ref<Partial<Record<ModuleKey, FinancialTraceCockpit>>>({})
const traceBusyKey = ref('')
const panelTraceBusy = ref(false)

const panelTitle = computed(() => props.title || (isEnglish.value ? 'Pilot Review Queue' : '试点审核队列'))
const panelDescription = computed(() =>
  props.description || (isEnglish.value
    ? 'Prioritize risky first-wave records before widening the pilot scope.'
    : '在扩大试点范围前，优先处理这些高风险的首批记录。'),
)
const queueSourceModuleKey = computed(() => (props.moduleKeys.length === 1 ? props.moduleKeys[0] : undefined))
const criticalCount = computed(() => items.value.filter((item) => item.severity === 'critical').length)
const warningCount = computed(() => items.value.filter((item) => item.severity === 'warning').length)

async function loadQueue() {
  loading.value = true
  try {
    const [source, cockpitResults] = await Promise.all([
      fetchReminders({ limit: Math.max(props.limit * 4, 20) }),
      Promise.allSettled(
        listScopeFinancialTraceModules(props.moduleKeys).map(async (moduleKey) => ({
          moduleKey,
          cockpit: await fetchFinancialTraceCockpit(moduleKey, 8),
        })),
      ),
    ])
    moduleFinancialTraceCockpitMap.value = cockpitResults.reduce<Partial<Record<ModuleKey, FinancialTraceCockpit>>>((summary, item) => {
      if (item.status === 'fulfilled') {
        summary[item.value.moduleKey] = item.value.cockpit
      }
      return summary
    }, {})
    const allowed = new Set(props.moduleKeys)
    const grouped = new Map<string, QueueItem>()

    // Multiple reminder rows often point to the same business record, so the
    // queue groups them into one review item instead of flooding the pilot UI.
    for (const item of source) {
      if (pilotReviewStore.isHidden(item)) continue
      if (!allowed.has(item.moduleKey as ModuleKey) || !item.recordId) continue
      const key = `${item.moduleKey}:${item.recordId}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, {
          key,
          moduleKey: item.moduleKey as ModuleKey,
          recordId: Number(item.recordId),
          count: 1,
          severity: item.severity,
          title: item.title,
          content: item.content,
          reminderIds: [item.id],
          relatedRef: item.relatedRef,
          createdAt: item.createdAt,
        })
        continue
      }
      existing.count += 1
      existing.reminderIds.push(item.id)
      if (severityRank(item.severity) > severityRank(existing.severity)) {
        existing.severity = item.severity
        existing.title = item.title
        existing.content = item.content
        existing.relatedRef = item.relatedRef
        existing.createdAt = item.createdAt
      }
    }

    items.value = [...grouped.values()]
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.count - a.count)
      .slice(0, props.limit)
  } finally {
    loading.value = false
  }
}

function markItemReviewed(item: QueueItem) {
  pilotReviewStore.markReviewed(item.reminderIds)
  items.value = items.value.filter((candidate) => candidate.key !== item.key)
}

function snoozeItem(item: QueueItem) {
  pilotReviewStore.snooze(item.reminderIds)
  items.value = items.value.filter((candidate) => candidate.key !== item.key)
}

function severityLabel(value: ReminderRecord['severity']) {
  if (isEnglish.value) {
    if (value === 'critical') return 'Critical'
    if (value === 'warning') return 'Warning'
    return 'Info'
  }
  if (value === 'critical') return '严重'
  if (value === 'warning') return '提醒'
  return '提示'
}

function buildQueueTarget(item: QueueItem, section?: string) {
  if (!item.recordId) return null
  return buildModuleDetailRouteTarget({
    targetModuleKey: item.moduleKey,
    recordId: item.recordId,
    section: section || resolveReminderSection(item),
    sourceModuleKey: queueSourceModuleKey.value,
  })
}

function openDocuments(item: QueueItem) {
  const target = buildQueueTarget(item, 'documents')
  if (!target) return
  void router.push(target)
}

function openTimeline(item: QueueItem) {
  const target = buildQueueTarget(item, 'timeline')
  if (!target) return
  void router.push(target)
}

function canExportItemTrace(item: QueueItem) {
  return supportsFinancialTraceDetailModule(String(item.moduleKey))
}

async function exportItemTrace(item: QueueItem) {
  if (!canExportItemTrace(item) || traceBusyKey.value) return
  traceBusyKey.value = item.key
  try {
    const detail = await fetchFinancialTraceDetail(item.moduleKey, item.recordId)
    downloadText(
      `neko_erp_${item.moduleKey}_queue_trace_${item.recordId}_${new Date().toISOString().slice(0, 10)}.md`,
      buildFinancialTraceDetailPacket({
        english: isEnglish.value,
        generatedAt: formatDateTime(new Date().toISOString()),
        detail,
        moduleTitle,
        title: isEnglish.value ? `${moduleTitle(item.moduleKey)} Queue Trace` : `${moduleTitle(item.moduleKey)} 队列追溯包`,
      }),
      'text/markdown;charset=utf-8',
    )
    ElMessage.success(isEnglish.value ? 'Trace packet exported' : '追溯包已导出')
  } catch (error: any) {
    ElMessage.error(error?.message || (isEnglish.value ? 'Failed to export trace packet' : '导出追溯包失败'))
  } finally {
    traceBusyKey.value = ''
  }
}

function hasPanelTraceBundle() {
  return collectScopeTraceBundleTargets({
    moduleKeys: props.moduleKeys,
    cockpitMap: moduleFinancialTraceCockpitMap.value,
    moduleTitle,
    english: isEnglish.value,
    limit: 4,
  }).length > 0
}

async function buildPanelTraceBundleContent() {
  const generatedAt = formatDateTime(new Date().toISOString())
  const targets = collectScopeTraceBundleTargets({
    moduleKeys: props.moduleKeys,
    cockpitMap: moduleFinancialTraceCockpitMap.value,
    moduleTitle,
    english: isEnglish.value,
    limit: 4,
  })
  if (!targets.length) {
    return buildFinancialTraceBundlePacket({
      english: isEnglish.value,
      generatedAt,
      title: isEnglish.value ? `${panelTitle.value} Financial Trace Bundle` : `${panelTitle.value} 财务追溯证据包`,
      moduleTitle,
      entries: [],
    })
  }
  const results = await Promise.allSettled(
    targets.map(async (target) => ({
      moduleKey: target.moduleKey,
      packetTitle: isEnglish.value
        ? `${moduleTitle(target.moduleKey)} Queue Trace`
        : `${moduleTitle(target.moduleKey)} 队列追溯详情`,
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
    title: isEnglish.value ? `${panelTitle.value} Financial Trace Bundle` : `${panelTitle.value} 财务追溯证据包`,
    moduleTitle,
    entries,
    failedRefs,
  })
}

async function exportPanelTraceBundle() {
  if (panelTraceBusy.value) return
  panelTraceBusy.value = true
  try {
    downloadText(
      buildFinancialTraceBundleFilename({
        scope: props.moduleKeys.join('_'),
        date: new Date().toISOString().slice(0, 10),
      }),
      await buildPanelTraceBundleContent(),
      'text/markdown;charset=utf-8',
    )
    ElMessage.success(isEnglish.value ? 'Trace bundle exported' : '财务追溯证据包已导出')
  } catch (error: any) {
    ElMessage.error(error?.message || (isEnglish.value ? 'Failed to export trace bundle' : '导出财务追溯证据包失败'))
  } finally {
    panelTraceBusy.value = false
  }
}

async function copyPanelTraceBundle() {
  if (panelTraceBusy.value || !navigator.clipboard) return
  panelTraceBusy.value = true
  try {
    await navigator.clipboard.writeText(await buildPanelTraceBundleContent())
    ElMessage.success(isEnglish.value ? 'Trace bundle copied' : '财务追溯证据包已复制')
  } catch (error: any) {
    ElMessage.error(error?.message || (isEnglish.value ? 'Failed to copy trace bundle' : '复制财务追溯证据包失败'))
  } finally {
    panelTraceBusy.value = false
  }
}

function openItem(item: QueueItem) {
  const target = buildQueueTarget(item)
  if (!target) return
  void router.push(target)
}

onMounted(() => {
  void loadQueue()
})

watch(
  () => `${locale.value}::${props.limit}::${props.moduleKeys.join('|')}`,
  () => {
    void loadQueue()
  },
)
</script>

<template>
  <article class="erp-card review-queue-panel">
    <div class="queue-header">
      <div>
        <div class="queue-title">{{ panelTitle }}</div>
        <p class="queue-desc">{{ panelDescription }}</p>
      </div>
      <div class="queue-header-side">
        <div class="queue-metrics">
          <span v-if="criticalCount" class="metric critical">{{ criticalCount }}</span>
          <span v-if="warningCount" class="metric warning">{{ warningCount }}</span>
        </div>
        <div v-if="hasPanelTraceBundle()" class="queue-toolbar">
          <el-button size="small" :loading="panelTraceBusy" @click="copyPanelTraceBundle">
            {{ isEnglish ? 'Copy Bundle' : '复制证据包' }}
          </el-button>
          <el-button size="small" :loading="panelTraceBusy" @click="exportPanelTraceBundle">
            {{ isEnglish ? 'Export Bundle' : '导出证据包' }}
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="queue-empty">
      {{ isEnglish ? 'Loading queue...' : '正在加载审核队列...' }}
    </div>

    <div v-else-if="items.length" class="queue-list">
      <div
        v-for="item in items"
        :key="item.key"
        :class="['queue-item', item.severity]"
        @click="openItem(item)"
      >
        <div class="queue-topline">
          <strong>{{ item.title }}</strong>
          <span>{{ severityLabel(item.severity) }}</span>
        </div>
        <p>{{ item.content }}</p>
        <div class="queue-meta">
          <span>{{ moduleTitle(item.moduleKey) }} · #{{ item.recordId }}</span>
          <span>{{ item.count }}x</span>
        </div>
        <div class="queue-foot">
          <span>{{ item.relatedRef || '-' }}</span>
          <span>{{ item.createdAt ? formatDateTime(item.createdAt) : '-' }}</span>
        </div>
        <div class="queue-actions">
          <el-button size="small" text @click.stop="openDocuments(item)">
            {{ isEnglish ? 'Documents' : '文档' }}
          </el-button>
          <el-button size="small" text @click.stop="openTimeline(item)">
            {{ isEnglish ? 'Timeline' : '时间轴' }}
          </el-button>
          <el-button
            v-if="canExportItemTrace(item)"
            size="small"
            text
            :loading="traceBusyKey === item.key"
            @click.stop="exportItemTrace(item)"
          >
            {{ isEnglish ? 'Trace' : '追溯包' }}
          </el-button>
          <el-button size="small" text @click.stop="snoozeItem(item)">
            {{ isEnglish ? 'Later' : '稍后处理' }}
          </el-button>
          <el-button size="small" type="primary" text @click.stop="markItemReviewed(item)">
            {{ isEnglish ? 'Reviewed' : '已核对' }}
          </el-button>
        </div>
      </div>
    </div>

    <div v-else class="queue-empty">
      {{ isEnglish ? 'No review queue items in this scope.' : '当前范围内没有待审核队列项。' }}
    </div>
  </article>
</template>

<style scoped>
.review-queue-panel {
  padding: 22px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.queue-header-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.queue-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}

.queue-desc {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.queue-metrics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.queue-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.metric {
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.metric.critical {
  background: color-mix(in srgb, var(--app-danger) 18%, transparent);
  color: var(--app-danger);
}

.metric.warning {
  background: color-mix(in srgb, var(--app-warning) 18%, transparent);
  color: var(--app-warning);
}

.queue-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.queue-item {
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.queue-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.queue-item.warning {
  border-color: color-mix(in srgb, var(--app-warning) 35%, var(--app-border));
}

.queue-item.critical {
  border-color: color-mix(in srgb, var(--app-danger) 45%, var(--app-border));
  background: color-mix(in srgb, var(--app-danger) 4%, var(--app-panel));
}

.queue-topline,
.queue-meta,
.queue-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.queue-topline strong {
  font-size: 13px;
}

.queue-item p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.queue-meta,
.queue-foot {
  margin-top: 10px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.queue-empty {
  margin-top: 16px;
  padding: 18px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  color: var(--app-text-secondary);
  font-size: 13px;
}
</style>
