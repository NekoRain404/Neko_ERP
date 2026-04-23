<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchFinancialTraceCockpit, type FinancialTraceCockpit } from '@/api/financial-trace'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import { moduleManifestMap } from '@/config/module-manifest'
import { useCutoverStore } from '@/stores/cutover'
import { useI18n } from '@/i18n'
import type { CutoverFinancialTraceState } from '@/utils/cutover-financial-trace'
import { resolveDefaultChainContacts, resolveDefaultChainGateState } from '@/utils/cutover'
import { pickTopReminder, resolveReminderSection } from '@/utils/reminders'
import {
  buildScopeFinancialTraceState,
  buildScopeFinancialTraceTarget,
  buildScopeModuleFinancialTraceStateMap,
  listScopeFinancialTraceModules,
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

interface ScopeStatRow extends ScopeRow {
  critical: number
  warning: number
  total: number
  recordCount: number
  topRisk?: ReminderRecord
  topRiskResolvedLabel?: string
  owner: string
  pendingGateCount: number
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
  }>(),
  {
    title: undefined,
    description: undefined,
  },
)

const router = useRouter()
const cutoverStore = useCutoverStore()
const { locale, moduleTitle: i18nModuleTitle } = useI18n()
const isEnglish = computed(() => locale.value === 'en-US')
const loading = ref(false)
const statRows = ref<ScopeStatRow[]>([])
const moduleFinancialTraceCockpitMap = ref<Partial<Record<ModuleKey, FinancialTraceCockpit>>>({})
const showAllRows = ref(false)
const compactRowLimit = 5

const panelTitle = computed(() => props.title || (isEnglish.value ? 'Pilot Risk Stats' : '试点风险统计'))
const panelDescription = computed(() =>
  props.description || (isEnglish.value
    ? 'Track risk density by pilot scope before widening the cutover.'
    : '在扩大切换范围前，先按试点范围观察风险密度。'),
)
const prioritizedStatRows = computed(() =>
  [...statRows.value].sort((left, right) => {
    const leftScore = (left.critical * 8)
      + (left.warning * 4)
      + (left.pendingGateCount * 3)
      + (left.financialTraceSummary.missingCount * 3)
      + (left.financialTraceSummary.warningCount * 2)
      + (left.topRiskResolvedLabel ? 1 : 0)
    const rightScore = (right.critical * 8)
      + (right.warning * 4)
      + (right.pendingGateCount * 3)
      + (right.financialTraceSummary.missingCount * 3)
      + (right.financialTraceSummary.warningCount * 2)
      + (right.topRiskResolvedLabel ? 1 : 0)
    if (rightScore !== leftScore) return rightScore - leftScore
    if (right.recordCount !== left.recordCount) return right.recordCount - left.recordCount
    return left.label.localeCompare(right.label)
  }),
)
const visibleStatRows = computed(() =>
  showAllRows.value ? prioritizedStatRows.value : prioritizedStatRows.value.slice(0, compactRowLimit),
)
const hiddenStatRowCount = computed(() => Math.max(prioritizedStatRows.value.length - visibleStatRows.value.length, 0))

function moduleTitle(moduleKey: ModuleKey) {
  return i18nModuleTitle(moduleKey) || moduleManifestMap[moduleKey]?.title || moduleKey
}

async function loadStats() {
  loading.value = true
  try {
    const allModuleKeys = props.rows.flatMap((row) => row.moduleKeys)
    const [source, cockpitResults] = await Promise.all([
      fetchReminders({ limit: 80 }),
      Promise.allSettled(
        listScopeFinancialTraceModules(allModuleKeys).map(async (moduleKey) => ({
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
    const moduleTraceStateMap = buildScopeModuleFinancialTraceStateMap({
      moduleKeys: allModuleKeys,
      reminders: source,
      cockpitMap: moduleFinancialTraceCockpitMap.value,
      isEnglish: isEnglish.value,
      moduleTitle,
    })
    statRows.value = props.rows.map((row) => buildStatRow(row, source, moduleTraceStateMap))
  } finally {
    loading.value = false
  }
}

function buildStatRow(
  row: ScopeRow,
  source: ReminderRecord[],
  moduleTraceStateMap: Partial<Record<ModuleKey, CutoverFinancialTraceState>>,
): ScopeStatRow {
  const allowed = new Set(row.moduleKeys)
  const matches = source.filter((item) => allowed.has(item.moduleKey as ModuleKey))
  const recordKeys = new Set(matches.filter((item) => item.recordId).map((item) => `${item.moduleKey}:${item.recordId}`))
  const topRisk = pickTopReminder(matches)
  const financialTraceSummary = buildScopeFinancialTraceState({
    moduleKeys: row.moduleKeys,
    moduleStates: moduleTraceStateMap,
    isEnglish: isEnglish.value,
    moduleTitle,
  })
  const chain = row.chainKey ? cutoverStore.chainRows.find((item) => item.key === row.chainKey) : undefined
  const contacts = chain
    ? cutoverStore.chainContactFor(chain.key, resolveDefaultChainContacts(chain.key, isEnglish.value))
    : null
  const gateState = chain
    ? cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
    : null
  const pendingGateCount = gateState
    ? [
        gateState.smokeReady,
        gateState.workbenchReady,
        gateState.rollbackReady,
        gateState.traceabilityReady,
        gateState.manualReady,
        gateState.pilotConfirmed,
      ].filter((value) => !value).length
    : 0
  return {
    ...row,
    total: matches.length,
    recordCount: recordKeys.size,
    critical: matches.filter((item) => item.severity === 'critical').length,
    warning: matches.filter((item) => item.severity === 'warning').length,
    topRisk,
    topRiskResolvedLabel: financialTraceSummary.topRiskRefs[0] || row.topRiskLabel || topRisk?.relatedRef || topRisk?.title || '',
    owner: contacts?.owner || '',
    pendingGateCount,
    financialTraceSummary,
    traceTarget: buildScopeFinancialTraceTarget(financialTraceSummary, 'traceability'),
    documentsTarget: buildScopeFinancialTraceTarget(financialTraceSummary, 'documents'),
    timelineTarget: buildScopeFinancialTraceTarget(financialTraceSummary, 'timeline'),
  }
}

function openRow(row: ScopeStatRow) {
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

function openTopRisk(row: ScopeStatRow) {
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
  if (!row.topRisk?.recordId || !row.topRisk.moduleKey) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: row.topRisk.moduleKey as ModuleKey,
    recordId: row.topRisk.recordId,
    section: resolveReminderSection(row.topRisk),
    sourceModuleKey: row.routeName && isModuleRouteName(row.routeName) ? row.routeName : undefined,
    chainKey: row.chainKey,
  }))
}

function openDocuments(row: ScopeStatRow) {
  if (row.documentsTarget) {
    void router.push({
      name: row.documentsTarget.routeName,
      query: row.documentsTarget.query,
    })
    return
  }
  if (!row.topRisk?.recordId || !row.topRisk.moduleKey) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: row.topRisk.moduleKey as ModuleKey,
    recordId: row.topRisk.recordId,
    section: 'documents',
    sourceModuleKey: row.routeName && isModuleRouteName(row.routeName) ? row.routeName : undefined,
    chainKey: row.chainKey,
  }))
}

function openTimeline(row: ScopeStatRow) {
  if (row.timelineTarget) {
    void router.push({
      name: row.timelineTarget.routeName,
      query: row.timelineTarget.query,
    })
    return
  }
  if (!row.topRisk?.recordId || !row.topRisk.moduleKey) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: row.topRisk.moduleKey as ModuleKey,
    recordId: row.topRisk.recordId,
    section: 'timeline',
    sourceModuleKey: row.routeName && isModuleRouteName(row.routeName) ? row.routeName : undefined,
    chainKey: row.chainKey,
  }))
}

onMounted(() => {
  void loadStats()
})

watch(
  () => `${locale.value}::${props.rows.map((row) => `${row.key}:${row.moduleKeys.join('|')}`).join('||')}`,
  () => {
    void loadStats()
  },
)
</script>

<template>
  <article class="erp-card risk-stats-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">{{ panelTitle }}</div>
        <p class="panel-desc">{{ panelDescription }}</p>
      </div>
    </div>

    <div v-if="loading" class="panel-empty">
      {{ isEnglish ? 'Loading risk stats...' : '正在加载风险统计...' }}
    </div>

    <div v-else>
      <div class="panel-compact-note">
        <span>
          {{
            hiddenStatRowCount
              ? (isEnglish
                ? `Showing ${visibleStatRows.length} highest-risk scopes first. ${hiddenStatRowCount} more scopes stay collapsed so the dashboard remains readable.`
                : `默认先展示最危险的 ${visibleStatRows.length} 个范围，另外 ${hiddenStatRowCount} 个范围先收起，避免首页和设置页继续拉长。`)
              : (isEnglish
                ? 'All pilot risk scopes are currently visible.'
                : '当前试点风险范围已全部展开。')
          }}
        </span>
        <el-button
          v-if="prioritizedStatRows.length > compactRowLimit"
          link
          type="primary"
          @click="showAllRows = !showAllRows"
        >
          {{ showAllRows ? (isEnglish ? 'Collapse' : '收起') : (isEnglish ? 'Show All' : '展开全部') }}
        </el-button>
      </div>

      <div class="stats-list">
      <div
        v-for="row in visibleStatRows"
        :key="row.key"
        class="stats-row"
      >
        <div class="stats-copy">
          <strong>{{ row.label }}</strong>
          <p>{{ row.description }}</p>
        </div>
        <div class="stats-metrics">
          <span class="metric neutral">{{ row.recordCount }}</span>
          <span v-if="row.warning" class="metric warning">{{ row.warning }}</span>
          <span v-if="row.critical" class="metric critical">{{ row.critical }}</span>
        </div>
        <div v-if="row.owner || row.pendingGateCount || row.topRisk || row.topRiskQuery || row.financialTraceSummary.expectedCount" class="stats-context">
          <span v-if="row.owner">{{ isEnglish ? 'Owner' : '负责人' }} · {{ row.owner }}</span>
          <span v-if="row.pendingGateCount">{{ isEnglish ? 'Pending Gates' : '未完成门槛' }} · {{ row.pendingGateCount }}</span>
          <span v-if="row.topRiskResolvedLabel">{{ isEnglish ? 'Top Risk' : '最高风险' }} · {{ row.topRiskResolvedLabel }}</span>
          <span v-if="row.financialTraceSummary.expectedCount">{{ isEnglish ? 'Trace' : '追溯' }} · {{ row.financialTraceSummary.statusLabel }}</span>
        </div>
        <div class="stats-foot">
          <span>
            {{ isEnglish ? 'Records' : '记录' }} {{ row.recordCount }} · {{ isEnglish ? 'Reminders' : '提醒' }} {{ row.total }}
          </span>
          <div class="stats-actions">
            <el-button
              v-if="row.topRisk || row.topRiskQuery || row.traceTarget"
              size="small"
              type="primary"
              @click="openTopRisk(row)"
            >
              {{ isEnglish ? 'Open Top Risk' : '打开最高风险' }}
            </el-button>
            <el-button
              v-if="row.documentsTarget || row.topRisk?.recordId"
              size="small"
              @click="openDocuments(row)"
            >
              {{ isEnglish ? 'Documents' : '文档' }}
            </el-button>
            <el-button
              v-if="row.timelineTarget || row.topRisk?.recordId"
              size="small"
              @click="openTimeline(row)"
            >
              {{ isEnglish ? 'Timeline' : '时间轴' }}
            </el-button>
            <el-button
              v-if="row.routeName"
              size="small"
              @click="openRow(row)"
            >
              {{ row.buttonLabel || (isEnglish ? 'Open' : '打开') }}
            </el-button>
          </div>
        </div>
      </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.risk-stats-panel {
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

.stats-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-row {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 14px 16px;
  background: var(--app-panel);
}

.stats-copy strong {
  font-size: 14px;
}

.stats-copy p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.stats-metrics {
  margin-top: 12px;
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

.stats-foot {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.stats-context {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.stats-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
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
