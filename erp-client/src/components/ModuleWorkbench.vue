<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref, useSlots, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchFinancialTraceCockpit, fetchFinancialTraceDetail, type FinancialTraceCockpit } from '@/api/financial-trace'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import CompactNoticeBar from '@/components/CompactNoticeBar.vue'
import CollapsibleWorkbenchDesk from '@/components/CollapsibleWorkbenchDesk.vue'
import EntityTableView from '@/components/EntityTableView.vue'
import { moduleManifestMap, type ModuleKey } from '@/config/module-manifest'
import { useAuthStore } from '@/stores/auth'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import { useCutoverStore, type PilotChainKey } from '@/stores/cutover'
import { usePreferencesStore } from '@/stores/preferences'
import type { ModuleConfig } from '@/types/api'
import { useI18n } from '@/i18n'
import { resolveCutoverSettingsQuery, resolveDefaultChainContacts, resolveDefaultChainGateState } from '@/utils/cutover'
import { buildAggregateClosedLoopSummary, buildCutoverCloseSummary } from '@/utils/cutover-close'
import {
  buildChainCloseChecklist,
  buildCloseRecentActivityLines,
  buildCloseRoleSnapshot,
  buildModuleCloseChecklist,
  countPaymentLinkageIssues,
  summarizeCloseChecklist,
} from '@/utils/cutover-close-cockpit'
import { buildCutoverClosedLoopSummary } from '@/utils/cutover-ops'
import { buildSharedGuardrailRulesPacket, buildSharedRollbackDrillPacket } from '@/utils/cutover-protection'
import {
  buildSharedModuleExceptionPacket,
  buildSharedModuleGatePacket,
  buildSharedModuleHandbookContent,
  buildSharedModuleRehearsalContent,
} from '@/utils/cutover-packets'
import { downloadCsv, downloadText } from '@/utils/export'
import {
  buildModuleEvidenceExpectation,
  buildModuleEvidencePresets,
  sortEvidencePresetsByPriority,
} from '@/utils/first-wave-evidence'
import {
  buildFirstWaveGateChecklist,
  buildFirstWaveModuleStageCards,
  buildFirstWavePlaybook,
  summarizeFirstWaveGateState,
} from '@/utils/first-wave-playbook'
import {
  buildChainCutoverFinancialTraceState,
  buildCutoverFinancialTraceState,
  supportsCutoverFinancialTraceModule,
} from '@/utils/cutover-financial-trace'
import {
  buildPaymentLinkageGovernanceSummary,
  buildQuantImpactGovernanceSummary,
  supportsPaymentLinkageModule,
  supportsQuantImpactModule,
  PAYMENT_LINKAGE_REMINDER_TYPES,
  QUANT_IMPACT_REMINDER_TYPES,
} from '@/utils/cutover-governance'
import { buildChainFinanceCockpitSummary, buildModuleFinanceCockpitSummary } from '@/utils/cutover-finance-cockpit'
import { buildModuleFinancialTraceSummary } from '@/utils/financial-trace'
import {
  buildFinancialTraceBundleFilename,
  buildFinancialTraceBundlePacket,
  buildFinancialTraceDetailPacket,
  buildFinancialTracePacketFilename,
  buildFinancialTracePacketRefLabel,
} from '@/utils/financial-trace-packets'
import { buildChainSettlementSummary, buildModuleSettlementSummary } from '@/utils/first-wave-settlement'
import { formatDateTime } from '@/utils/format'
import { buildReminderFamilyBlockers, compareReminderSeverity, pickTopReminder, resolveReminderSection } from '@/utils/reminders'
import {
  listSysScriptPresetsForModule,
  resolvePrimarySysScriptModelForModule,
  resolveSysScriptLanesForModule,
} from '@/utils/sys-script-presets'
import type { WorkbenchShortcutItem } from '@/utils/first-wave-workbench-shortcuts'
import { buildModuleWorkbenchRouteQuery } from '@/utils/module-navigation'

const PilotBatchActionPanel = defineAsyncComponent(() => import('@/components/PilotBatchActionPanel.vue'))
const PilotRiskStatsPanel = defineAsyncComponent(() => import('@/components/PilotRiskStatsPanel.vue'))
const SettlementCockpitPanel = defineAsyncComponent(() => import('@/components/SettlementCockpitPanel.vue'))
const StockExecutionFeedbackPanel = defineAsyncComponent(() => import('@/components/StockExecutionFeedbackPanel.vue'))
const PaymentLinkagePanel = defineAsyncComponent(() => import('@/components/PaymentLinkagePanel.vue'))
const QuantImpactPanel = defineAsyncComponent(() => import('@/components/QuantImpactPanel.vue'))

interface HighlightItem {
  label: string
  value: string
  description: string
}

interface FocusItem {
  label: string
  description: string
}

interface ActionItem {
  label: string
  value: string
  description: string
}

interface ChecklistItem {
  title: string
  description: string
}

interface QuickLinkItem {
  label: string
  description: string
  routeName: string
  query?: Record<string, string | undefined>
  buttonType?: string
}

interface ReadinessItem {
  label: string
  value: string
  description: string
  tone?: string
}

interface GuardrailPresetCard {
  key: string
  title: string
  description: string
  model: string
  eventName: string
  remark: string
}

interface ExecutionActionRow {
  key: string
  title: string
  description: string
  meta: string
  tone: 'success' | 'warning' | 'danger' | 'info'
  buttonLabel: string
  buttonType?: 'primary' | 'success' | 'warning' | 'info' | 'danger'
  actionKey:
    | 'reopen-module'
    | 'open-gates'
    | 'open-closed-loop'
    | 'open-financial-trace'
    | 'open-settlement-cockpit'
    | 'open-payment-linkage'
    | 'open-execution-feedback'
    | 'open-quant-impact'
    | 'open-chain-documents'
    | 'open-chain-timeline'
    | 'open-settlement'
    | 'open-top-risk'
    | 'export-exceptions'
    | 'open-guardrail'
    | 'open-evidence'
    | 'export-drill'
    | 'export-handbook'
  chainKey?: PilotChainKey
}

type WorkbenchDeskKey =
  | 'riskStats'
  | 'batchActions'
  | 'settlement'
  | 'paymentLinkage'
  | 'executionFeedback'
  | 'quantImpact'
  | 'guardrails'
  | 'evidence'
  | 'handbook'
  | 'rehearsal'
  | 'financialTrace'
  | 'rollback'

const EXECUTION_TONE_PRIORITY: Record<ExecutionActionRow['tone'], number> = {
  danger: 0,
  warning: 1,
  success: 2,
  info: 3,
}

const WORKBENCH_SECTION_DESK_MAP: Partial<Record<string, WorkbenchDeskKey>> = {
  'ops-settlement': 'settlement',
  'ops-payment-linkage': 'paymentLinkage',
  'ops-execution-feedback': 'executionFeedback',
  'ops-quant-impact': 'quantImpact',
  'ops-guardrails': 'guardrails',
  'ops-evidence': 'evidence',
  'ops-handbook': 'handbook',
  'ops-rehearsal': 'rehearsal',
  'ops-financial-trace': 'financialTrace',
  'ops-rollback': 'rollback',
}

const props = withDefaults(
  defineProps<{
    moduleKey: ModuleKey
    config: ModuleConfig
    title?: string
    description?: string
    highlights?: HighlightItem[]
    focusItems?: FocusItem[]
    actionItems?: ActionItem[]
    pilotGuideItems?: ChecklistItem[]
    rollbackItems?: ChecklistItem[]
    quickLinkItems?: QuickLinkItem[]
    readinessItems?: ReadinessItem[]
    cockpitShortcutItems?: WorkbenchShortcutItem[]
    note?: string
  }>(),
  {
    title: undefined,
    description: undefined,
    highlights: () => [],
    focusItems: () => [],
    actionItems: () => [],
    pilotGuideItems: () => [],
    rollbackItems: () => [],
    quickLinkItems: () => [],
    readinessItems: () => [],
    cockpitShortcutItems: () => [],
    note: undefined,
  },
)

const route = useRoute()
const router = useRouter()
const slots = useSlots()
const authStore = useAuthStore()
const cutoverOpsStore = useCutoverOpsStore()
const cutoverStore = useCutoverStore()
const preferencesStore = usePreferencesStore()
const config = computed(() => props.config)
const { group: groupLabel, moduleTitle, t } = useI18n()
const pageTitle = computed(() => props.title ?? config.value.title)
const pageDescription = computed(() => props.description ?? config.value.description)
const pilotGuideItems = computed(() => props.pilotGuideItems)
const rollbackItems = computed(() => props.rollbackItems)
const quickLinkItems = computed(() => props.quickLinkItems)
const readinessItems = computed(() => props.readinessItems)
const cockpitShortcutItems = computed(() => props.cockpitShortcutItems)
const hasWorkspaceSlot = computed(() => Boolean(slots.workspace))
const parentModuleKey = computed(() => {
  const raw = route.query.relatedTo
  const key = typeof raw === 'string' ? (raw as ModuleKey) : undefined
  return key && moduleManifestMap[key] ? key : undefined
})
const hasParentContext = computed(() => Boolean(parentModuleKey.value && route.query.contextValue))
const parentContextLabel = computed(() => {
  const field = typeof route.query.contextField === 'string' ? route.query.contextField : 'id'
  const value = typeof route.query.contextValue === 'string' ? route.query.contextValue : '-'
  return `${field} = ${value}`
})
const parentModuleTitle = computed(() => (parentModuleKey.value ? moduleTitle(parentModuleKey.value) : ''))
const isFirstWaveModule = computed(() => cutoverStore.isFirstWaveModule(props.moduleKey))
const moduleEnabled = computed(() => cutoverStore.isModuleEnabled(props.moduleKey))
const supportsSettlementCockpit = computed(() => ['accountInvoice', 'accountPayment', 'accountMove'].includes(props.moduleKey))
const supportsPaymentLinkage = computed(() => supportsPaymentLinkageModule(props.moduleKey))
const supportsExecutionFeedback = computed(() => props.moduleKey === 'stockPicking')
const supportsQuantImpact = computed(() => supportsQuantImpactModule(props.moduleKey))
const moduleReminderItems = ref<ReminderRecord[]>([])
const moduleFinancialTraceCockpit = ref<FinancialTraceCockpit | null>(null)
const relatedModuleFinancialTraceCockpitMap = ref<Partial<Record<ModuleKey, FinancialTraceCockpit>>>({})
const rehearsalLoading = ref(false)
const tracePacketBusy = ref(false)
const workbenchSectionRefs: Record<string, HTMLElement | null> = {}
const expandedWorkbenchDesks = ref<Record<WorkbenchDeskKey, boolean>>({
  riskStats: false,
  batchActions: false,
  settlement: false,
  paymentLinkage: false,
  executionFeedback: false,
  quantImpact: false,
  guardrails: false,
  evidence: false,
  handbook: false,
  rehearsal: false,
  financialTrace: false,
  rollback: false,
})
const cutoverChainLabel = computed(() =>
  cutoverStore
    .chainsForModule(props.moduleKey)
    .map((chain) => (preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel))
    .join(' / '),
)
const firstWavePlaybook = computed(() => buildFirstWavePlaybook(props.moduleKey, preferencesStore.language === 'en-US'))
const moduleStageCards = computed(() => buildFirstWaveModuleStageCards(props.moduleKey, preferencesStore.language === 'en-US'))
const chainContactRows = computed(() =>
  cutoverStore.chainsForModule(props.moduleKey).map((chain) => ({
    key: chain.key,
    label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
    contacts: cutoverStore.chainContactFor(
      chain.key,
      resolveDefaultChainContacts(chain.key, preferencesStore.language === 'en-US'),
    ),
  })),
)
const activeChainKey = computed(() => {
  const raw = route.query.chainKey
  return typeof raw === 'string' ? raw : chainGateRows.value[0]?.key
})
const chainGateRows = computed(() =>
  cutoverStore.chainsForModule(props.moduleKey).map((chain) => {
    const state = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
    const latestDrill = cutoverOpsStore.latestRollbackDrill(chain.key)
    const latestSignoff = cutoverOpsStore.latestPilotSignoff(chain.key)
    const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', chain.key)
    const closedLoopSummary = buildCutoverClosedLoopSummary({
      isEnglish: preferencesStore.language === 'en-US',
      latestDrill,
      latestSignoff,
      latestExceptionExport,
    })
    const readyCount = [
      state.smokeReady,
      state.workbenchReady,
      state.rollbackReady,
      state.traceabilityReady,
      state.manualReady,
      state.pilotConfirmed,
    ].filter(Boolean).length
    const settlementSummary = buildChainSettlementSummary({
      moduleKeys: chain.moduleKeys,
      isEnglish: preferencesStore.language === 'en-US',
      reminders: moduleReminderItems.value
        .filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey))
        .map((item) => ({
          moduleKey: item.moduleKey as ModuleKey,
          type: item.type,
          severity: item.severity,
        })),
    })
    const blockerLabels = buildReminderFamilyBlockers(
      moduleReminderItems.value.filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey)),
      preferencesStore.language === 'en-US',
    )
    const financialTraceModuleStates = Array.from(new Set(chain.moduleKeys))
      .map((moduleKey) => ({
        moduleKey,
        moduleLabel: moduleTitle(moduleKey),
        state: buildModuleFinancialTraceStateFor(moduleKey),
      }))
      .filter((item) => item.state.expectedCount > 0 || item.state.recordRefs.length > 0)
    const financialTraceSummary = financialTraceModuleStates.length
      ? buildChainCutoverFinancialTraceState({
          isEnglish: preferencesStore.language === 'en-US',
          moduleStates: financialTraceModuleStates,
        })
      : buildModuleFinancialTraceStateFor(props.moduleKey)
    const financialTracePacketRefs = financialTraceModuleStates.flatMap((item) =>
      buildModuleFinancialTracePacketRefs(item.moduleKey, item.state),
    ).slice(0, 6)
    const financeCockpitSummary = buildChainFinanceCockpitSummary({
      chainKey: chain.key,
      isEnglish: preferencesStore.language === 'en-US',
      reminders: moduleReminderItems.value.filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey)),
      settlementSummary,
      financialTraceSummary,
      blockerLabels,
    })
    return {
      key: chain.key,
      label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
      moduleKeys: chain.moduleKeys,
      modulesLabel: chain.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / '),
      readyCount,
      pendingCount: 6 - readyCount,
      note: state.note,
      summary: summarizeFirstWaveGateState(state, preferencesStore.language === 'en-US'),
      checklist: buildFirstWaveGateChecklist(state, preferencesStore.language === 'en-US'),
      latestDrill,
      latestSignoff,
      latestExceptionExport,
      closedLoopSummary,
      settlementSummary,
      blockerLabels,
      financialTraceSummary,
      financialTraceRecordRefs: financialTraceSummary.recordRefs,
      financialTracePacketRefs,
      financeCockpitSummary,
    }
  }),
)
function resolveChainGateRow(chainKey = chainGateRows.value[0]?.key) {
  return chainGateRows.value.find((row) => row.key === chainKey) ?? null
}

function buildChainTopRiskRoute(chainKey = chainGateRows.value[0]?.key, section = 'traceability') {
  const row = resolveChainGateRow(chainKey)
  if (!row?.financialTraceSummary.topRiskModuleKey || !row.financialTraceSummary.topRiskRecordId) return null
  return {
    name: row.financialTraceSummary.topRiskModuleKey,
    query: {
      detailId: String(row.financialTraceSummary.topRiskRecordId),
      section,
      relatedTo: props.moduleKey,
      chainKey: row.key,
    },
  }
}

function describeChainTopRiskLabel(chainKey = chainGateRows.value[0]?.key) {
  const row = resolveChainGateRow(chainKey)
  if (!row) return '-'
  return row.financialTraceSummary.topRiskRefs[0]
    || row.financialTraceRecordRefs[0]
    || (preferencesStore.language === 'en-US' ? 'No chain top-risk record' : '当前链路没有 top-risk 记录')
}

const cutoverTitle = computed(() => {
  if (!isFirstWaveModule.value) return ''
  return moduleEnabled.value
    ? preferencesStore.language === 'en-US'
      ? 'First-Wave Pilot Active'
      : '首批试点已启用'
    : preferencesStore.language === 'en-US'
      ? 'First-Wave Pilot Disabled'
      : '首批试点已关闭'
})
const cutoverDescription = computed(() => {
  if (!isFirstWaveModule.value) return ''
  return moduleEnabled.value
    ? preferencesStore.language === 'en-US'
      ? 'This workbench is inside the current pilot scope. Keep data traceable and use the rollback entry if the trial needs to stop.'
      : '当前工作台处于试点范围内。请保持数据可追溯，如需停止试点可直接使用回退入口。'
    : preferencesStore.language === 'en-US'
      ? 'This module is currently outside the active pilot scope and should be reopened through cutover settings.'
      : '当前模块不在启用中的试点范围内，应通过切换设置重新开放。'
})
const moduleRiskRows = computed(() => [
  {
    key: props.moduleKey,
    label: moduleTitle(props.moduleKey),
    description: preferencesStore.language === 'en-US'
      ? 'Current reminder density and review pressure for this pilot module.'
      : '当前试点模块的提醒密度和审核压力。',
    moduleKeys: [props.moduleKey],
    routeName: props.moduleKey,
    buttonLabel: preferencesStore.language === 'en-US' ? 'Open Module' : '打开模块',
  },
])
const moduleTopRisk = computed(() =>
  pickTopReminder(moduleReminderItems.value),
)
const evidenceExpectation = computed(() =>
  buildModuleEvidenceExpectation(props.moduleKey, preferencesStore.language === 'en-US'),
)
const moduleEvidencePresets = computed(() =>
  sortEvidencePresetsByPriority(
    buildModuleEvidencePresets(props.moduleKey, preferencesStore.language === 'en-US'),
    evidenceExpectation.value.recommendedKey,
  ),
)
const requiredEvidencePresets = computed(() => moduleEvidencePresets.value.filter((item) => item.required))
const optionalEvidencePresets = computed(() => moduleEvidencePresets.value.filter((item) => !item.required))
const recommendedEvidencePreset = computed(() =>
  moduleEvidencePresets.value.find((item) => item.key === evidenceExpectation.value.recommendedKey) ?? moduleEvidencePresets.value[0] ?? null,
)
const moduleGuardrailPresets = computed<GuardrailPresetCard[]>(() =>
  listSysScriptPresetsForModule(props.moduleKey).map((preset) => ({
    key: preset.key,
    title: preferencesStore.language === 'en-US' ? preset.titleEn : preset.titleZh,
    description: preferencesStore.language === 'en-US' ? preset.descriptionEn : preset.descriptionZh,
    model: preset.model,
    eventName: preset.eventName,
    remark: preset.remark,
  })),
)
const moduleGuardrailSummary = computed(() => ({
  total: moduleGuardrailPresets.value.length,
  beforeSave: moduleGuardrailPresets.value.filter((item) => item.eventName === 'before_save').length,
  beforeAction: moduleGuardrailPresets.value.filter((item) => item.eventName === 'before_action').length,
  lanes: resolveSysScriptLanesForModule(props.moduleKey),
}))
const handbookGuideCount = computed(() => pilotGuideItems.value.length + rollbackItems.value.length)
const handbookActionCount = computed(() => quickLinkItems.value.length + readinessItems.value.length + cockpitShortcutItems.value.length)
const rehearsalSummaryRows = computed(() => ({
  total: moduleReminderItems.value.length,
  critical: moduleReminderItems.value.filter((item) => item.severity === 'critical').length,
  warning: moduleReminderItems.value.filter((item) => item.severity === 'warning').length,
}))
const responsibilitySummaryRows = computed(() =>
  chainContactRows.value.map((row) => {
    const roleSnapshot = buildCloseRoleSnapshot({
      contacts: row.contacts,
      isEnglish: preferencesStore.language === 'en-US',
      moduleKey: props.moduleKey,
      chainKey: row.key,
    })
    const gateRow = chainGateRows.value.find((item) => item.key === row.key)
    const relatedReminders = moduleReminderItems.value.filter((item) => gateRow?.moduleKeys.includes(item.moduleKey as ModuleKey))
    const closeChecklist = gateRow
      ? buildChainCloseChecklist({
          chainKey: row.key,
          isEnglish: preferencesStore.language === 'en-US',
          gatePendingCount: gateRow.pendingCount,
          settlementIssueCount: gateRow.settlementSummary.missingCount + gateRow.settlementSummary.warningCount,
          financialTraceIssueCount: gateRow.financialTraceSummary.missingCount + gateRow.financialTraceSummary.warningCount,
          closedLoopIssueCount: gateRow.closedLoopSummary.missingLabels.length + gateRow.closedLoopSummary.staleLabels.length,
          paymentLinkageIssueCount: countPaymentLinkageIssues(relatedReminders),
          blockerLabels: gateRow.blockerLabels,
        })
      : []
    const closeActivityLines = buildCloseRecentActivityLines({
      isEnglish: preferencesStore.language === 'en-US',
      closeLabel: gateRow ? `${gateRow.label} · ${gateRow.summary.label}` : '-',
      latestDrill: gateRow?.latestDrill,
      latestSignoff: gateRow?.latestSignoff,
      latestExceptionExport: gateRow?.latestExceptionExport,
      formatDateTime,
    })
    return {
      key: row.key,
      label: row.label,
      ...roleSnapshot,
      closeChecklist,
      closeChecklistLabel: summarizeCloseChecklist(closeChecklist, preferencesStore.language === 'en-US'),
      closeActivityLines,
    }
  }),
)
const moduleClosedLoopSummary = computed(() =>
  buildAggregateClosedLoopSummary({
    isEnglish: preferencesStore.language === 'en-US',
    summaries: chainGateRows.value.map((item) => item.closedLoopSummary),
  }),
)
const moduleSettlementSummary = computed(() =>
  buildModuleSettlementSummary({
    moduleKey: props.moduleKey,
    isEnglish: preferencesStore.language === 'en-US',
    reminders: moduleReminderItems.value,
  }),
)
const supportsBackendFinancialTrace = computed(() => supportsCutoverFinancialTraceModule(props.moduleKey))
const relatedFinancialTraceModuleKeys = computed<ModuleKey[]>(() =>
  Array.from(
    new Set(
      cutoverStore
        .chainsForModule(props.moduleKey)
        .flatMap((chain) => chain.moduleKeys)
        .filter((moduleKey): moduleKey is ModuleKey => supportsCutoverFinancialTraceModule(moduleKey)),
    ),
  ),
)
const moduleFinancialTraceSummary = computed(() =>
  buildModuleFinancialTraceSummary({
    moduleKey: props.moduleKey,
    isEnglish: preferencesStore.language === 'en-US',
    reminders: moduleReminderItems.value
      .filter((item) => item.moduleKey === props.moduleKey)
      .map((item) => ({
        type: item.type,
        severity: item.severity,
      })),
  }),
)
function buildModuleFinancialTraceStateFor(moduleKey: ModuleKey) {
  const reminderRows = moduleReminderItems.value
    .filter((item) => item.moduleKey === moduleKey)
    .map((item) => ({
      type: item.type,
      severity: item.severity,
    }))
  const summary = buildModuleFinancialTraceSummary({
    moduleKey,
    isEnglish: preferencesStore.language === 'en-US',
    reminders: reminderRows,
  })
  return buildCutoverFinancialTraceState({
    moduleKey,
    moduleLabel: moduleTitle(moduleKey),
    isEnglish: preferencesStore.language === 'en-US',
    summary,
    cockpit: relatedModuleFinancialTraceCockpitMap.value[moduleKey] ?? null,
  })
}
const moduleFinancialTraceState = computed(() => {
  return buildModuleFinancialTraceStateFor(props.moduleKey)
})
const modulePaymentLinkageSummary = computed(() =>
  buildPaymentLinkageGovernanceSummary({
    moduleKey: props.moduleKey,
    isEnglish: preferencesStore.language === 'en-US',
    reminders: moduleReminderItems.value,
    settlementSummary: moduleSettlementSummary.value,
    financialTraceSummary: moduleFinancialTraceState.value,
  }),
)
const moduleQuantImpactSummary = computed(() =>
  buildQuantImpactGovernanceSummary({
    moduleKey: props.moduleKey,
    isEnglish: preferencesStore.language === 'en-US',
    reminders: moduleReminderItems.value,
    settlementSummary: moduleSettlementSummary.value,
    financialTraceSummary: moduleFinancialTraceState.value,
    pendingGateCount: chainGateRows.value.reduce((sum, row) => sum + row.pendingCount, 0),
    blockerLabels: chainGateRows.value.flatMap((row) => row.blockerLabels),
  }),
)
const moduleFinanceCockpitSummary = computed(() =>
  buildModuleFinanceCockpitSummary({
    moduleKey: props.moduleKey,
    isEnglish: preferencesStore.language === 'en-US',
    reminders: moduleReminderItems.value,
    settlementSummary: moduleSettlementSummary.value,
    financialTraceSummary: moduleFinancialTraceState.value,
    blockerLabels: chainGateRows.value.flatMap((row) => row.blockerLabels),
  }),
)
const moduleCloseSummary = computed(() =>
  buildCutoverCloseSummary({
    isEnglish: preferencesStore.language === 'en-US',
    gatePendingCount: chainGateRows.value.reduce((sum, row) => sum + row.pendingCount, 0),
    settlementSummary: moduleSettlementSummary.value,
    financialTraceSummary: moduleFinancialTraceState.value,
    closedLoopSummary: moduleClosedLoopSummary.value,
    paymentLinkageIssueCount: modulePaymentLinkageSummary.value.issueCount,
    quantImpactIssueCount: moduleQuantImpactSummary.value.issueCount,
    blockerLabels: chainGateRows.value.flatMap((row) => row.blockerLabels),
  }),
)
const moduleCloseChecklist = computed(() =>
  buildModuleCloseChecklist({
    moduleKey: props.moduleKey,
    isEnglish: preferencesStore.language === 'en-US',
    gatePendingCount: moduleCloseSummary.value.gatePendingCount,
    settlementIssueCount: moduleCloseSummary.value.settlementIssueCount,
    financialTraceIssueCount: moduleCloseSummary.value.financialTraceIssueCount,
    closedLoopIssueCount: moduleCloseSummary.value.closedLoopIssueCount,
    paymentLinkageIssueCount: moduleCloseSummary.value.paymentLinkageIssueCount,
    quantImpactIssueCount: moduleCloseSummary.value.quantImpactIssueCount,
    blockerLabels: chainGateRows.value.flatMap((row) => row.blockerLabels),
  }),
)
const topBackendTraceRecord = computed(() =>
  moduleFinancialTraceCockpit.value?.records.find((item) => item.status !== 'ready')
  || moduleFinancialTraceCockpit.value?.records[0]
  || null,
)
const executionActionRows = computed<ExecutionActionRow[]>(() => {
  const rows: ExecutionActionRow[] = []

  if (!moduleEnabled.value) {
    rows.push({
      key: 'reopen-module',
      title: preferencesStore.language === 'en-US' ? 'Reopen Pilot Entry' : '重新打开试点入口',
      description: preferencesStore.language === 'en-US'
        ? 'This module is outside the active pilot scope. Re-enable the module before operators continue using this workbench.'
        : '当前模块已经离开活动试点范围，操作员继续使用前应先重新启用模块。',
      meta: preferencesStore.language === 'en-US'
        ? 'Settings > Cutover > Handoff'
        : '设置 > 切换 > 交接',
      tone: 'danger',
      buttonLabel: preferencesStore.language === 'en-US' ? 'Open Cutover' : '打开切换设置',
      buttonType: 'danger',
      actionKey: 'reopen-module',
    })
  }

  chainGateRows.value
    .filter((row) => row.pendingCount > 0)
    .forEach((row) => {
      rows.push({
        key: `gate-${row.key}`,
        title: `${row.label} · ${preferencesStore.language === 'en-US' ? 'Finish Acceptance Gates' : '补齐放行门槛'}`,
        description: preferencesStore.language === 'en-US'
          ? `This chain still has ${row.pendingCount} pending checks and should not widen real traffic yet.`
          : `该链路仍有 ${row.pendingCount} 项未完成检查，当前不应继续扩大真实流量。`,
        meta: row.summary.pendingLabels.join(' / ') || '-',
        tone: row.pendingCount >= 3 ? 'danger' : 'warning',
        buttonLabel: preferencesStore.language === 'en-US' ? 'Open Gates' : '打开门槛台',
        buttonType: row.pendingCount >= 3 ? 'danger' : 'warning',
        actionKey: 'open-gates',
        chainKey: row.key,
      })
    })

  chainGateRows.value
    .filter((row) => !row.closedLoopSummary.ready)
    .forEach((row) => {
      rows.push({
        key: `closed-loop-${row.key}`,
        title: `${row.label} · ${preferencesStore.language === 'en-US' ? 'Repair Closed Loop' : '补齐闭环证据'}`,
        description: preferencesStore.language === 'en-US'
          ? 'Rollback drill, pilot sign-off, or exception evidence is still missing or stale for this chain.'
          : '该链路的回退演练、试点签收或异常证据仍缺失或已过期。',
        meta: describeClosedLoopSummary(row.closedLoopSummary),
        tone: row.closedLoopSummary.tone === 'danger' ? 'danger' : 'warning',
        buttonLabel: preferencesStore.language === 'en-US' ? 'Open Closed Loop' : '打开闭环台',
        buttonType: row.closedLoopSummary.tone === 'danger' ? 'danger' : 'warning',
        actionKey: 'open-closed-loop',
        chainKey: row.key,
      })
    })

  chainGateRows.value
    .filter((row) =>
      row.financialTraceSummary.topRiskRecordId
      && (row.financialTraceSummary.missingCount > 0 || row.financialTraceSummary.warningCount > 0),
    )
    .forEach((row) => {
      rows.push({
        key: `chain-trace-${row.key}`,
        title: `${row.label} · ${preferencesStore.language === 'en-US' ? 'Repair Chain Financial Trace' : '补齐链路财务追溯'}`,
        description: preferencesStore.language === 'en-US'
          ? 'Open the chain top-risk record directly so source, journal, and evidence continuity can be repaired from the real cockpit.'
          : '直接打开链路 top-risk 记录，从真实驾驶舱修补来源、凭证和证据连续性。',
        meta: [
          row.financialTraceSummary.missingLabels.join(' / '),
          row.financialTraceSummary.warningLabels.join(' / '),
          describeChainTopRiskLabel(row.key),
        ].filter(Boolean).join(' · ') || row.financialTraceSummary.statusLabel,
        tone: row.financialTraceSummary.missingCount > 0 ? 'danger' : 'warning',
        buttonLabel: preferencesStore.language === 'en-US' ? 'Open Chain Trace' : '打开链路追溯',
        buttonType: row.financialTraceSummary.missingCount > 0 ? 'danger' : 'warning',
        actionKey: 'open-financial-trace',
        chainKey: row.key,
      })
    })

  if (moduleSettlementSummary.value.missingCount || moduleSettlementSummary.value.warningCount) {
    rows.push({
      key: 'settlement',
      title: preferencesStore.language === 'en-US' ? 'Close Settlement Gaps' : '补齐结算闭环',
      description: preferencesStore.language === 'en-US'
        ? 'The current module still has open settlement continuity gaps across billing, payment, or accounting evidence.'
        : '当前模块在开票、付款或会计证据连续性上仍存在待补齐的结算缺口。',
      meta: [
        moduleSettlementSummary.value.missingLabels.join(' / '),
        moduleSettlementSummary.value.warningLabels.join(' / '),
      ].filter(Boolean).join(' · ') || moduleSettlementSummary.value.statusLabel,
      tone: moduleSettlementSummary.value.missingCount ? 'danger' : 'warning',
      buttonLabel: preferencesStore.language === 'en-US' ? 'Open Settlement Desk' : '打开结算入口',
      buttonType: moduleSettlementSummary.value.missingCount ? 'danger' : 'warning',
      actionKey: 'open-settlement',
    })
  }

  if (supportsSettlementCockpit.value) {
    const openItemCount = moduleFinancialTraceCockpit.value?.records?.reduce(
      (sum, item) => sum + Number(item.openLineCount || 0),
      0,
    ) || 0
    const repairCount = (moduleFinancialTraceCockpit.value?.missingCount || 0) + (moduleFinancialTraceCockpit.value?.warningCount || 0)
    if (repairCount > 0 || openItemCount > 0 || moduleSettlementSummary.value.missingCount || moduleSettlementSummary.value.warningCount) {
      rows.push({
        key: 'settlement-cockpit',
        title: preferencesStore.language === 'en-US' ? 'Review Settlement Cockpit' : '核对结算驾驶舱',
        description: preferencesStore.language === 'en-US'
          ? 'Open the shared settlement and reconciliation cockpit to inspect open items, payment linkage, and evidence continuity together.'
          : '打开共享结算与对账驾驶舱，把未清项、付款链接和证据连续性放在一起核对。',
        meta: [
          props.moduleKey === 'accountMove'
            ? `${preferencesStore.language === 'en-US' ? 'Open items' : '未清项'} ${openItemCount}`
            : null,
          `${preferencesStore.language === 'en-US' ? 'Repair records' : '待修记录'} ${repairCount}`,
          moduleFinanceCockpitSummary.value.label,
          moduleSettlementSummary.value.statusLabel,
        ].filter(Boolean).join(' · '),
        tone: openItemCount > 0 || moduleSettlementSummary.value.missingCount ? 'danger' : 'warning',
        buttonLabel: preferencesStore.language === 'en-US' ? 'Open Cockpit' : '打开驾驶舱',
        buttonType: openItemCount > 0 || moduleSettlementSummary.value.missingCount ? 'danger' : 'warning',
        actionKey: 'open-settlement-cockpit',
      })
    }
  }

  if (supportsPaymentLinkage.value) {
    const shouldOpenLinkage = moduleReminderItems.value.some((item) => PAYMENT_LINKAGE_REMINDER_TYPES.includes(item.type as any))
      || modulePaymentLinkageSummary.value.issueCount > 0
    if (shouldOpenLinkage) {
      rows.push({
        key: 'payment-linkage',
        title: preferencesStore.language === 'en-US' ? 'Repair Payment Linkage' : '补齐付款联动',
        description: preferencesStore.language === 'en-US'
          ? 'Open the shared linkage desk and keep invoice anchors, payment artifacts, and journal refs continuous.'
          : '打开共享联动台，把发票锚点、付款结果对象和凭证引用放在一起补齐。',
        meta: [
          modulePaymentLinkageSummary.value.label,
          moduleFinanceCockpitSummary.value.label,
          moduleSettlementSummary.value.statusLabel,
          moduleFinancialTraceState.value.statusLabel,
        ].join(' · '),
        tone: modulePaymentLinkageSummary.value.issueCount > 2 ? 'danger' : 'warning',
        buttonLabel: preferencesStore.language === 'en-US' ? 'Open Linkage' : '打开联动台',
        buttonType: modulePaymentLinkageSummary.value.issueCount > 2 ? 'danger' : 'warning',
        actionKey: 'open-payment-linkage',
      })
    }
  }

  if (moduleFinancialTraceState.value.missingCount || moduleFinancialTraceState.value.warningCount) {
    rows.push({
      key: 'financial-trace',
      title: preferencesStore.language === 'en-US' ? 'Repair Financial Trace' : '补齐财务追溯',
      description: preferencesStore.language === 'en-US'
        ? 'Source linkage, journal continuity, or finance-side evidence is still incomplete for the current module.'
        : '当前模块的来源链接、凭证连续性或财务侧证据仍不完整。',
      meta: [
        moduleFinancialTraceState.value.missingLabels.join(' / '),
        moduleFinancialTraceState.value.warningLabels.join(' / '),
      ].filter(Boolean).join(' · ') || moduleFinancialTraceState.value.statusLabel,
      tone: moduleFinancialTraceState.value.missingCount ? 'danger' : 'warning',
      buttonLabel: preferencesStore.language === 'en-US' ? 'Open Trace Desk' : '打开追溯台',
      buttonType: moduleFinancialTraceState.value.missingCount ? 'danger' : 'warning',
      actionKey: 'open-financial-trace',
    })
  }

  if (supportsExecutionFeedback.value) {
    const assignedChains = chainGateRows.value.filter((row) => row.readyCount > 0).length
    if (moduleReminderItems.value.length > 0 || moduleSettlementSummary.value.missingCount || moduleFinancialTraceState.value.warningCount || assignedChains > 0) {
      rows.push({
        key: 'execution-feedback',
        title: preferencesStore.language === 'en-US' ? 'Review Execution Feedback' : '核对执行反馈',
        description: preferencesStore.language === 'en-US'
          ? 'Open the transfer execution cockpit and inspect picking progress, move completion, and rollback-sensitive warehouse pressure.'
          : '打开调拨执行驾驶舱，核对 picking 进度、移动完成度和对回退敏感的仓储压力。',
        meta: [
          `${preferencesStore.language === 'en-US' ? 'Reminders' : '提醒'} ${moduleReminderItems.value.length}`,
          `${preferencesStore.language === 'en-US' ? 'Active chains' : '活跃链路'} ${assignedChains}`,
          moduleFinancialTraceState.value.statusLabel,
        ].join(' · '),
        tone: moduleReminderItems.value.some((item) => item.severity === 'critical') ? 'danger' : 'warning',
        buttonLabel: preferencesStore.language === 'en-US' ? 'Open Execution' : '打开执行台',
        buttonType: moduleReminderItems.value.some((item) => item.severity === 'critical') ? 'danger' : 'warning',
        actionKey: 'open-execution-feedback',
      })
    }
  }

  if (supportsQuantImpact.value) {
    const shouldReviewQuant = moduleReminderItems.value.some((item) => QUANT_IMPACT_REMINDER_TYPES.includes(item.type as any))
      || moduleQuantImpactSummary.value.issueCount > 0
    if (shouldReviewQuant) {
      rows.push({
        key: 'quant-impact',
        title: preferencesStore.language === 'en-US' ? 'Review Quant Impact' : '核对库存影响',
        description: preferencesStore.language === 'en-US'
          ? 'Open the shared quant impact desk and keep source/destination stock pressure visible before rollback widens.'
          : '打开共享库存影响台，在回退范围扩大前先看清来源/目标库存压力。',
        meta: [
          moduleQuantImpactSummary.value.label,
          `${preferencesStore.language === 'en-US' ? 'Reminders' : '提醒'} ${moduleReminderItems.value.length}`,
          moduleFinancialTraceState.value.statusLabel,
        ].join(' · '),
        tone: moduleQuantImpactSummary.value.issueCount > 2 ? 'danger' : 'warning',
        buttonLabel: preferencesStore.language === 'en-US' ? 'Open Quant Desk' : '打开库存影响台',
        buttonType: moduleQuantImpactSummary.value.issueCount > 2 ? 'danger' : 'warning',
        actionKey: 'open-quant-impact',
      })
    }
  }

  if (moduleTopRisk.value?.recordId) {
    rows.push({
      key: 'top-risk',
      title: preferencesStore.language === 'en-US' ? 'Resolve Top-Risk Record' : '先处理最高风险记录',
      description: preferencesStore.language === 'en-US'
        ? 'The current module already has a highest-risk record. Clear it before broadening pilot throughput.'
        : '当前模块已经出现最高风险记录，应先处理后再扩大试点吞吐。',
      meta: `${moduleTitle(moduleTopRisk.value.moduleKey as ModuleKey)} #${moduleTopRisk.value.recordId ?? '-'} · ${moduleTopRisk.value.title}`,
      tone: moduleTopRisk.value.severity === 'critical' ? 'danger' : 'warning',
      buttonLabel: preferencesStore.language === 'en-US' ? 'Open Top Risk' : '打开最高风险',
      buttonType: moduleTopRisk.value.severity === 'critical' ? 'danger' : 'warning',
      actionKey: 'open-top-risk',
    })
  }

  if (moduleReminderItems.value.length > 0) {
    rows.push({
      key: 'exceptions',
      title: preferencesStore.language === 'en-US' ? 'Export Exception Evidence' : '导出异常证据',
      description: preferencesStore.language === 'en-US'
        ? 'Export the current exception list so rollback and pilot sign-off reviews use the same evidence base.'
        : '导出当前异常清单，让回退核对和试点签收使用同一份证据底稿。',
      meta: preferencesStore.language === 'en-US'
        ? `${moduleReminderItems.value.length} reminder rows`
        : `${moduleReminderItems.value.length} 条提醒记录`,
      tone: rehearsalSummaryRows.value.critical > 0 ? 'warning' : 'info',
      buttonLabel: preferencesStore.language === 'en-US' ? 'Export Exceptions' : '导出异常清单',
      buttonType: rehearsalSummaryRows.value.critical > 0 ? 'warning' : 'info',
      actionKey: 'export-exceptions',
    })
  }

  if (moduleGuardrailPresets.value.length > 0) {
    rows.push({
      key: 'guardrail',
      title: preferencesStore.language === 'en-US' ? 'Review Guardrail Rules' : '核对 Guardrail 规则',
      description: preferencesStore.language === 'en-US'
        ? 'Open the script desk and confirm that first-wave before_save / before_action rules still protect the mainline.'
        : '打开脚本台，确认首批 before_save / before_action 规则仍然在保护主链。',
      meta: preferencesStore.language === 'en-US'
        ? `${moduleGuardrailSummary.value.beforeSave}/${moduleGuardrailSummary.value.beforeAction} save/action lanes`
        : `${moduleGuardrailSummary.value.beforeSave}/${moduleGuardrailSummary.value.beforeAction} 条保存/动作规则通道`,
      tone: 'info',
      buttonLabel: preferencesStore.language === 'en-US' ? 'Open Script Desk' : '打开脚本台',
      buttonType: 'info',
      actionKey: 'open-guardrail',
    })
  }

  if (requiredEvidencePresets.value.length > 0) {
    rows.push({
      key: 'evidence',
      title: preferencesStore.language === 'en-US' ? 'Close Evidence Gaps' : '补齐证据缺口',
      description: preferencesStore.language === 'en-US'
        ? 'Use the top-risk record or a new draft to upload the required files and preserve Monica-style context memory.'
        : '通过最高风险记录或新草稿补齐必备文件，并保留 Monica 风格的关系上下文记忆。',
      meta: requiredEvidencePresets.value.map((item) => item.label).join(' / ') || '-',
      tone: 'info',
      buttonLabel: moduleTopRisk.value?.recordId
        ? (preferencesStore.language === 'en-US' ? 'Open Risk Docs' : '打开风险文档')
        : (preferencesStore.language === 'en-US' ? 'Open New Draft' : '打开新草稿'),
      buttonType: 'primary',
      actionKey: 'open-evidence',
    })
  }

  if (
    moduleEnabled.value
    && chainGateRows.value.length > 0
    && chainGateRows.value.every((row) => row.pendingCount === 0 && row.closedLoopSummary.ready)
    && rehearsalSummaryRows.value.critical === 0
  ) {
    rows.push({
      key: 'export-drill',
      title: preferencesStore.language === 'en-US' ? 'Freeze Rollback Drill Pack' : '冻结回退演练包',
      description: preferencesStore.language === 'en-US'
        ? 'The module is currently in a safer state. Export a rollback drill packet before the pilot expands.'
        : '当前模块已进入更安全状态，在扩大试点前先导出回退演练包。',
      meta: moduleClosedLoopSummary.value.label,
      tone: 'success',
      buttonLabel: preferencesStore.language === 'en-US' ? 'Export Drill Packet' : '导出演练包',
      buttonType: 'success',
      actionKey: 'export-drill',
    })
    rows.push({
      key: 'export-handbook',
      title: preferencesStore.language === 'en-US' ? 'Freeze Operator Handbook' : '冻结操作手册',
      description: preferencesStore.language === 'en-US'
        ? 'Export the latest operator handbook so pilot teams use the same routes, evidence rules, and rollback path.'
        : '导出最新操作手册，让试点团队使用同一套入口、证据规则和回退路径。',
      meta: preferencesStore.language === 'en-US'
        ? `${handbookGuideCount.value} guide steps / ${handbookActionCount.value} launch targets`
        : `${handbookGuideCount.value} 个步骤 / ${handbookActionCount.value} 个快捷目标`,
      tone: 'success',
      buttonLabel: preferencesStore.language === 'en-US' ? 'Export Handbook' : '导出手册',
      buttonType: 'success',
      actionKey: 'export-handbook',
    })
  }

  return rows
})
const executionSummary = computed(() => ({
  total: executionActionRows.value.length,
  danger: executionActionRows.value.filter((item) => item.tone === 'danger').length,
  warning: executionActionRows.value.filter((item) => item.tone === 'warning').length,
  success: executionActionRows.value.filter((item) => item.tone === 'success').length,
}))
const prioritizedExecutionActionRows = computed(() =>
  executionActionRows.value
    .map((item, index) => ({ item, index }))
    .sort((left, right) =>
      EXECUTION_TONE_PRIORITY[left.item.tone] - EXECUTION_TONE_PRIORITY[right.item.tone]
      || left.index - right.index,
    )
    .map(({ item }) => item),
)
const visibleExecutionActionRows = computed(() => prioritizedExecutionActionRows.value.slice(0, 6))
const hiddenExecutionActionCount = computed(() => Math.max(prioritizedExecutionActionRows.value.length - visibleExecutionActionRows.value.length, 0))
const visibleWorkbenchShortcutItems = computed(() => cockpitShortcutItems.value.slice(0, 6))
const hiddenWorkbenchShortcutCount = computed(() => Math.max(cockpitShortcutItems.value.length - visibleWorkbenchShortcutItems.value.length, 0))

function describeClosedLoopSummary(summary: {
  label: string
  missingLabels: string[]
  staleLabels: string[]
}) {
  const segments = [summary.label]
  if (summary.missingLabels.length) {
    segments.push(`${preferencesStore.language === 'en-US' ? 'Missing' : '缺少'}: ${summary.missingLabels.join(' / ')}`)
  }
  if (summary.staleLabels.length) {
    segments.push(`${preferencesStore.language === 'en-US' ? 'Stale' : '过期'}: ${summary.staleLabels.join(' / ')}`)
  }
  return segments.join(' · ')
}

function buildModuleClosedLoopLines() {
  const lines = [`- ${preferencesStore.language === 'en-US' ? 'Module' : '模块'}: ${moduleClosedLoopSummary.value.label}`]
  if (moduleClosedLoopSummary.value.missingLabels.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Missing' : '缺少'}: ${moduleClosedLoopSummary.value.missingLabels.join(' / ')}`)
  }
  if (moduleClosedLoopSummary.value.staleLabels.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Stale' : '过期'}: ${moduleClosedLoopSummary.value.staleLabels.join(' / ')}`)
  }
  chainGateRows.value.forEach((row) => {
    lines.push(`- ${row.label}: ${describeClosedLoopSummary(row.closedLoopSummary)}`)
  })
  return lines
}

function buildModuleSettlementLines() {
  const lines = [`- ${preferencesStore.language === 'en-US' ? 'Module' : '模块'}: ${moduleSettlementSummary.value.statusLabel}`]
  if (moduleSettlementSummary.value.expectedLabels.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Expected Steps' : '预期步骤'}: ${moduleSettlementSummary.value.expectedLabels.join(' / ')}`)
  }
  if (moduleSettlementSummary.value.missingLabels.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Missing' : '缺失'}: ${moduleSettlementSummary.value.missingLabels.join(' / ')}`)
  }
  if (moduleSettlementSummary.value.warningLabels.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Pending' : '待推进'}: ${moduleSettlementSummary.value.warningLabels.join(' / ')}`)
  }
  chainGateRows.value.forEach((row) => {
    lines.push(`- ${row.label}: ${row.settlementSummary.statusLabel}`)
    row.settlementSummary.lines.forEach((item) => {
      lines.push(`  - ${item}`)
    })
  })
  return lines
}

function buildModuleFinancialTraceLines() {
  const lines = [`- ${preferencesStore.language === 'en-US' ? 'Module' : '模块'}: ${moduleFinancialTraceState.value.statusLabel}`]
  if (moduleFinancialTraceSummary.value.expectedLabels.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Expected Checks' : '预期检查项'}: ${moduleFinancialTraceSummary.value.expectedLabels.join(' / ')}`)
  }
  if (moduleFinancialTraceState.value.missingLabels.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Missing' : '缺失'}: ${moduleFinancialTraceState.value.missingLabels.join(' / ')}`)
  }
  if (moduleFinancialTraceState.value.warningLabels.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Pending' : '待推进'}: ${moduleFinancialTraceState.value.warningLabels.join(' / ')}`)
  }
  if (supportsBackendFinancialTrace.value && moduleFinancialTraceCockpit.value) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Reviewed Records' : '已审记录'}: ${moduleFinancialTraceCockpit.value.recordCount}`)
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Evidence Totals' : '证据总量'}: ${moduleFinancialTraceCockpit.value.attachmentCount}/${moduleFinancialTraceCockpit.value.noteCount}/${moduleFinancialTraceCockpit.value.logCount}`)
  }
  chainGateRows.value.forEach((row) => {
    lines.push(`- ${row.label}: ${row.financialTraceSummary.statusLabel}`)
    row.financialTraceSummary.lines.forEach((item) => {
      lines.push(`  - ${item}`)
    })
    if (row.financialTraceRecordRefs.length) {
      lines.push(`  - ${preferencesStore.language === 'en-US' ? 'Trace Records' : '追溯记录'}: ${row.financialTraceRecordRefs.join(' / ')}`)
    }
    if (row.financialTracePacketRefs.length) {
      lines.push(`  - ${preferencesStore.language === 'en-US' ? 'Trace Packets' : '追溯包'}: ${row.financialTracePacketRefs.join(' / ')}`)
    }
  })
  return lines
}

function buildModulePaymentLinkageLines() {
  if (!modulePaymentLinkageSummary.value.enabled) return []
  const lines = [...modulePaymentLinkageSummary.value.lines]
  chainGateRows.value.forEach((row) => {
    lines.push(`- ${row.label}: ${row.settlementSummary.statusLabel} · ${row.financialTraceSummary.statusLabel}`)
    if (row.financialTraceRecordRefs.length) {
      lines.push(`  - ${preferencesStore.language === 'en-US' ? 'Trace Records' : '追溯记录'}: ${row.financialTraceRecordRefs.join(' / ')}`)
    }
  })
  return lines
}

function buildChainFinanceCockpitLines(chainKey: PilotChainKey) {
  const row = resolveChainGateRow(chainKey)
  if (!row?.financeCockpitSummary.enabled) return []
  const lines = [...row.financeCockpitSummary.lines]
  if (row.financialTraceRecordRefs.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Trace Records' : '追溯记录'}: ${row.financialTraceRecordRefs.join(' / ')}`)
  }
  if (row.blockerLabels.length) {
    lines.push(`- ${preferencesStore.language === 'en-US' ? 'Suggested Blockers' : '建议阻塞项'}: ${row.blockerLabels.join(' / ')}`)
  }
  return lines
}

function buildModuleFinanceCockpitLines() {
  if (!moduleFinanceCockpitSummary.value.enabled) return []
  const lines = [...moduleFinanceCockpitSummary.value.lines]
  chainGateRows.value.forEach((row) => {
    lines.push(`- ${row.label}: ${row.financeCockpitSummary.label} · ${row.settlementSummary.statusLabel} · ${row.financialTraceSummary.statusLabel}`)
    if (row.financialTraceRecordRefs.length) {
      lines.push(`  - ${preferencesStore.language === 'en-US' ? 'Trace Records' : '追溯记录'}: ${row.financialTraceRecordRefs.join(' / ')}`)
    }
    if (row.blockerLabels.length) {
      lines.push(`  - ${preferencesStore.language === 'en-US' ? 'Suggested Blockers' : '建议阻塞项'}: ${row.blockerLabels.join(' / ')}`)
    }
  })
  return lines
}

function buildModuleQuantImpactLines() {
  if (!moduleQuantImpactSummary.value.enabled) return []
  const lines = [...moduleQuantImpactSummary.value.lines]
  chainGateRows.value.forEach((row) => {
    lines.push(`- ${row.label}: ${row.pendingCount === 0 ? (preferencesStore.language === 'en-US' ? 'Gate ready' : '门槛就绪') : `${row.pendingCount} ${preferencesStore.language === 'en-US' ? 'gates pending' : '项待完成'}`}`)
    if (row.blockerLabels.length) {
      lines.push(`  - ${preferencesStore.language === 'en-US' ? 'Suggested Blockers' : '建议阻塞项'}: ${row.blockerLabels.join(' / ')}`)
    }
  })
  return lines
}

function buildModuleCloseChecklistLines() {
  return moduleCloseChecklist.value.map((item) =>
    `- ${item.label}: ${item.ready ? (preferencesStore.language === 'en-US' ? 'Ready' : '就绪') : (preferencesStore.language === 'en-US' ? 'Blocked' : '阻塞')} · ${item.description}`,
  )
}

function buildModuleCloseActivityLines() {
  return responsibilitySummaryRows.value.flatMap((row) =>
    row.closeActivityLines.map((line) => `- ${row.label}: ${line}`),
  )
}

function buildExecutionExportItems() {
  const executionItems = executionActionRows.value.map((item) => ({
    title: item.title,
    description: item.meta ? `${item.description} (${item.meta})` : item.description,
  }))
  const shortcutItems = cockpitShortcutItems.value.map((item) => ({
    title: item.title,
    description: item.meta ? `${item.description} (${item.meta})` : item.description,
  }))
  return [...executionItems, ...shortcutItems]
}

function openParentModule() {
  if (!parentModuleKey.value) return
  void router.push({ name: parentModuleKey.value })
}

// Child workspaces can jump back to the exact parent record when they were opened
// from a notebook or related-list context.
function openParentRecord() {
  if (!parentModuleKey.value || typeof route.query.contextValue !== 'string') return
  void router.push({
    name: parentModuleKey.value,
    query: {
      detailId: route.query.contextValue,
      relatedTo: props.moduleKey,
    },
  })
}

function openCutoverSettings() {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({ moduleKey: props.moduleKey, section: 'handoff' }),
  })
}

function openCutoverGateSettings(chainKey = chainGateRows.value[0]?.key) {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({ moduleKey: props.moduleKey, chainKey, section: 'gates' }),
  })
}

function openCutoverClosedLoop(chainKey = chainGateRows.value[0]?.key) {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({ moduleKey: props.moduleKey, chainKey, section: 'ops' }),
  })
}

function openRoleDeskSettings(chainKey = chainGateRows.value[0]?.key) {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({ moduleKey: props.moduleKey, chainKey, section: 'roleDesk' }),
  })
}

function openFinanceBatchSettings(chainKey = chainGateRows.value[0]?.key) {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({ moduleKey: props.moduleKey, chainKey, section: 'financeBatch' }),
  })
}

function openChainSettings(chainKey: string) {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({ moduleKey: props.moduleKey, chainKey, section: 'handoff' }),
  })
}

// Rollback stays visible on the workbench so pilot operators can stop a module
// without leaving the current business surface or guessing where the control is.
function rollbackCurrentModule() {
  cutoverStore.rollbackModule(props.moduleKey)
  openCutoverSettings()
}

async function exportModuleExceptions() {
  const rows = await fetchReminders({
    limit: 50,
    moduleKey: props.moduleKey,
  })
  const filename = `neko_erp_${props.moduleKey}_exceptions_${new Date().toISOString().slice(0, 10)}.csv`
  downloadCsv(
    filename,
    [
      { key: 'severity', title: preferencesStore.language === 'en-US' ? 'Severity' : '严重级别' },
      { key: 'recordId', title: preferencesStore.language === 'en-US' ? 'Record ID' : '记录ID' },
      { key: 'title', title: preferencesStore.language === 'en-US' ? 'Title' : '标题' },
      { key: 'relatedRef', title: preferencesStore.language === 'en-US' ? 'Reference' : '引用' },
      { key: 'content', title: preferencesStore.language === 'en-US' ? 'Content' : '内容' },
      { key: 'createdAt', title: preferencesStore.language === 'en-US' ? 'Created At' : '创建时间' },
    ],
    rows,
  )
  cutoverOpsStore.addExceptionExport({
    scopeType: 'module',
    scopeKey: props.moduleKey,
    scopeLabel: moduleTitle(props.moduleKey),
    filename,
    rowCount: rows.length,
    exportedBy: authStore.displayName || authStore.user?.username || 'module-workbench',
  })
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module exception list exported' : '模块异常清单已导出')
}

function buildWorkbenchRouteQuery(routeName: string, rawQuery?: Record<string, string | undefined>) {
  return buildModuleWorkbenchRouteQuery({
    targetRouteName: routeName,
    rawQuery,
    sourceModuleKey: props.moduleKey === 'sysScript' ? undefined : props.moduleKey,
    chainKey: isFirstWaveModule.value ? activeChainKey.value : undefined,
  })
}

// Quick links are defined as route descriptors so each first-wave module can
// reuse the same shell while still exposing module-specific launch points.
function openQuickLink(item: QuickLinkItem) {
  void router.push({
    name: item.routeName,
    query: buildWorkbenchRouteQuery(item.routeName, item.query),
  })
}

function openWorkbenchSection(section: string) {
  void router.push({
    name: props.moduleKey,
    query: {
      ...route.query,
      section,
    },
  })
}

function runExecutionAction(item: ExecutionActionRow) {
  switch (item.actionKey) {
    case 'reopen-module':
      openCutoverSettings()
      return
    case 'open-gates':
      openCutoverGateSettings(item.chainKey)
      return
    case 'open-closed-loop':
      openCutoverClosedLoop(item.chainKey)
      return
    case 'open-financial-trace':
      openFinancialTraceDesk(item.chainKey)
      return
    case 'open-settlement-cockpit':
      openSettlementDesk()
      return
    case 'open-payment-linkage':
      openPaymentLinkageDesk()
      return
    case 'open-execution-feedback':
      openExecutionFeedbackDesk()
      return
    case 'open-quant-impact':
      openQuantImpactDesk()
      return
    case 'open-chain-documents':
      openChainTopRiskDocuments(item.chainKey)
      return
    case 'open-chain-timeline':
      openChainTopRiskTimeline(item.chainKey)
      return
    case 'open-settlement':
      openSettlementDesk()
      return
    case 'open-top-risk':
      openTopRiskRecord()
      return
    case 'export-exceptions':
      void exportModuleExceptions()
      return
    case 'open-guardrail':
      openGuardrailDesk()
      return
    case 'open-evidence':
      if (moduleTopRisk.value?.recordId) {
        openTopRiskDocuments()
        return
      }
      openModuleCreateDesk()
      return
    case 'export-drill':
      exportModuleRollbackDrill()
      return
    case 'export-handbook':
      exportOperatorHandbook()
      return
  }
}

function runCockpitShortcut(item: WorkbenchShortcutItem) {
  switch (item.actionKey) {
    case 'open-create':
      openModuleCreateDesk()
      return
    case 'open-section':
      if (item.section) {
        openWorkbenchSection(item.section)
      }
      return
    case 'open-route':
      if (item.routeName) {
        void router.push({
          name: item.routeName,
          query: buildWorkbenchRouteQuery(item.routeName, item.query),
        })
      }
      return
    case 'open-cutover':
      openCutoverSettings()
      return
    case 'open-gates':
      openCutoverGateSettings()
      return
    case 'open-closed-loop':
      openCutoverClosedLoop()
      return
    case 'open-guardrail':
      openGuardrailDesk()
      return
    case 'open-settlement':
      openSettlementDesk()
      return
    case 'open-top-risk':
      openTopRiskRecord()
      return
    case 'open-top-risk-documents':
      openTopRiskDocuments()
      return
    case 'open-top-risk-timeline':
      openTopRiskTimeline()
      return
    case 'open-financial-trace':
      openFinancialTraceDesk()
      return
    case 'export-exceptions':
      void exportModuleExceptions()
      return
    case 'export-exception-packet':
      exportModuleExceptionPacket()
      return
    case 'export-trace-bundle':
      void exportModuleTraceBundle()
      return
    case 'export-top-trace':
      void exportTopFinancialTracePacket()
      return
    case 'export-rollback-drill':
      exportModuleRollbackDrill()
      return
    case 'export-handbook':
      exportOperatorHandbook()
      return
  }
}

function registerWorkbenchSection(key: string, el: unknown) {
  workbenchSectionRefs[key] = el instanceof HTMLElement ? el : null
}

function toggleWorkbenchDesk(key: WorkbenchDeskKey) {
  expandedWorkbenchDesks.value[key] = !expandedWorkbenchDesks.value[key]
}

function workbenchDeskExpanded(key: WorkbenchDeskKey) {
  return expandedWorkbenchDesks.value[key]
}

function ensureWorkbenchDeskExpanded(section: string) {
  const deskKey = WORKBENCH_SECTION_DESK_MAP[section]
  if (deskKey) {
    expandedWorkbenchDesks.value[deskKey] = true
  }
}

async function focusWorkbenchSection(rawSection: unknown) {
  const section = typeof rawSection === 'string' ? rawSection : ''
  if (!['cutover', 'ops-close', 'ops-settlement', 'ops-payment-linkage', 'ops-execution-feedback', 'ops-quant-impact', 'ops-handbook', 'ops-rehearsal', 'ops-gates', 'ops-guardrails', 'ops-evidence', 'ops-financial-trace', 'ops-rollback'].includes(section)) return
  ensureWorkbenchDeskExpanded(section)
  await nextTick()
  // Workbench deep links let the command palette and dashboard reopen the
  // exact handoff desk instead of dropping the operator at page top.
  workbenchSectionRefs[section]?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

async function refreshModuleReminders() {
  if (!isFirstWaveModule.value) {
    moduleReminderItems.value = []
    moduleFinancialTraceCockpit.value = null
    relatedModuleFinancialTraceCockpitMap.value = {}
    return
  }
  rehearsalLoading.value = true
  try {
    const [reminders, cockpitResults] = await Promise.all([
      fetchReminders({
        limit: 60,
        moduleKey: props.moduleKey,
      }),
      Promise.allSettled(
        relatedFinancialTraceModuleKeys.value.map(async (moduleKey) => ({
          moduleKey,
          cockpit: await fetchFinancialTraceCockpit(moduleKey, 8),
        })),
      ),
    ])
    const cockpitMap = cockpitResults.reduce<Partial<Record<ModuleKey, FinancialTraceCockpit>>>((summary, item) => {
      if (item.status === 'fulfilled' && item.value.cockpit) {
        summary[item.value.moduleKey] = item.value.cockpit
      }
      return summary
    }, {})
    moduleReminderItems.value = reminders
    relatedModuleFinancialTraceCockpitMap.value = cockpitMap
    moduleFinancialTraceCockpit.value = cockpitMap[props.moduleKey] ?? null
    moduleReminderItems.value.sort(compareReminderSeverity)
  } finally {
    rehearsalLoading.value = false
  }
}

function buildTopBackendTraceDetailQuery(section = 'traceability') {
  if (!supportsBackendFinancialTrace.value || !moduleFinancialTraceState.value.topRiskRecordId) return null
  return {
    name: props.moduleKey,
    query: {
      detailId: String(moduleFinancialTraceState.value.topRiskRecordId),
      section,
      relatedTo: props.moduleKey,
    },
  }
}

function buildModuleFinancialTracePacketRefs(
  moduleKey = props.moduleKey,
  state = moduleKey === props.moduleKey ? moduleFinancialTraceState.value : buildModuleFinancialTraceStateFor(moduleKey),
) {
  if (!supportsCutoverFinancialTraceModule(moduleKey) || !state.topRiskRecordId) return []
  const date = new Date().toISOString().slice(0, 10)
  const refs = [
    buildFinancialTracePacketRefLabel({
      english: preferencesStore.language === 'en-US',
      moduleKey,
      moduleLabel: moduleTitle(moduleKey),
      recordId: state.topRiskRecordId,
      recordRef: state.topRiskRecordRef,
      date,
    }),
  ]
  if (relatedModuleFinancialTraceCockpitMap.value[moduleKey]?.records.length) {
    refs.push(
      `${moduleTitle(moduleKey)} · ${preferencesStore.language === 'en-US' ? 'bundle' : '证据包'} -> ${buildFinancialTraceBundleFilename({
        scope: moduleKey,
        date,
      })}`,
    )
  }
  return refs
}

function collectModuleTraceBundleTargets() {
  if (!supportsBackendFinancialTrace.value || !moduleFinancialTraceCockpit.value?.records.length) return []
  const prioritized = [
    ...moduleFinancialTraceCockpit.value.records.filter((item) => item.status !== 'ready'),
    ...moduleFinancialTraceCockpit.value.records.filter((item) => item.status === 'ready'),
  ]
  const deduped = new Map<number, { id: number; ref?: string | null }>()
  prioritized.slice(0, 3).forEach((record) => {
    if (!deduped.has(record.id)) {
      deduped.set(record.id, { id: record.id, ref: record.ref })
    }
  })
  return Array.from(deduped.values())
}

async function buildModuleTraceBundleContent() {
  const generatedAt = formatDateTime(new Date().toISOString())
  const targets = collectModuleTraceBundleTargets()
  if (!targets.length) {
    return buildFinancialTraceBundlePacket({
      english: preferencesStore.language === 'en-US',
      generatedAt,
      title: preferencesStore.language === 'en-US'
        ? `${pageTitle.value} Financial Trace Bundle`
        : `${pageTitle.value} 财务追溯证据包`,
      moduleTitle,
      entries: [],
    })
  }
  const results = await Promise.allSettled(
    targets.map(async (target) => ({
      moduleKey: props.moduleKey,
      packetTitle: preferencesStore.language === 'en-US'
        ? `${pageTitle.value} Trace ${target.ref || `#${target.id}`}`
        : `${pageTitle.value} 追溯 ${target.ref || `#${target.id}`}`,
      detail: await fetchFinancialTraceDetail(props.moduleKey, target.id),
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
    .filter((item): item is { item: PromiseRejectedResult; target: { id: number; ref?: string | null } } => item.item.status === 'rejected')
    .map(({ target }) =>
      `${moduleTitle(props.moduleKey)} · ${target.ref || `#${target.id}`} · ${preferencesStore.language === 'en-US' ? 'detail unavailable from backend' : '后端详情暂不可用'}`,
    )
  return buildFinancialTraceBundlePacket({
    english: preferencesStore.language === 'en-US',
    generatedAt,
    title: preferencesStore.language === 'en-US'
      ? `${pageTitle.value} Financial Trace Bundle`
      : `${pageTitle.value} 财务追溯证据包`,
    moduleTitle,
    entries,
    failedRefs,
  })
}

function openTopRiskRecord() {
  const traceQuery = buildTopBackendTraceDetailQuery('traceability')
  if (traceQuery) {
    void router.push(traceQuery)
    return
  }
  if (!moduleTopRisk.value?.recordId) return
  void router.push({
    name: moduleTopRisk.value.moduleKey,
    query: {
      detailId: String(moduleTopRisk.value.recordId),
      section: resolveReminderSection(moduleTopRisk.value),
      relatedTo: moduleTopRisk.value.moduleKey,
    },
  })
}

function openSettlementDesk() {
  openWorkbenchSection('ops-settlement')
}

function openPaymentLinkageDesk() {
  openWorkbenchSection('ops-payment-linkage')
}

function openExecutionFeedbackDesk() {
  openWorkbenchSection('ops-execution-feedback')
}

function openQuantImpactDesk() {
  openWorkbenchSection('ops-quant-impact')
}

function openFinancialTraceDesk(chainKey?: PilotChainKey) {
  const chainTraceQuery = buildChainTopRiskRoute(chainKey, 'traceability')
  if (chainTraceQuery) {
    void router.push(chainTraceQuery)
    return
  }
  const traceQuery = buildTopBackendTraceDetailQuery('traceability')
  if (traceQuery) {
    void router.push(traceQuery)
    return
  }
  if (moduleTopRisk.value?.recordId) {
    void router.push({
      name: moduleTopRisk.value.moduleKey,
      query: {
        detailId: String(moduleTopRisk.value.recordId),
        section: 'traceability',
      },
    })
    return
  }
  void router.push({
    name: props.moduleKey,
    query: {
      section: 'traceability',
    },
  })
}

function openChainTopRiskDocuments(chainKey?: PilotChainKey) {
  const traceQuery = buildChainTopRiskRoute(chainKey, 'documents')
  if (!traceQuery) return
  void router.push(traceQuery)
}

function openChainTopRiskTimeline(chainKey?: PilotChainKey) {
  const traceQuery = buildChainTopRiskRoute(chainKey, 'timeline')
  if (!traceQuery) return
  void router.push(traceQuery)
}

async function exportModuleTraceBundle() {
  if (!supportsBackendFinancialTrace.value || tracePacketBusy.value) return
  tracePacketBusy.value = true
  try {
    downloadText(
      buildFinancialTraceBundleFilename({
        scope: props.moduleKey,
        date: new Date().toISOString().slice(0, 10),
      }),
      await buildModuleTraceBundleContent(),
      'text/markdown;charset=utf-8',
    )
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Trace bundle exported' : '财务追溯证据包已导出')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to export trace bundle' : '导出财务追溯证据包失败'))
  } finally {
    tracePacketBusy.value = false
  }
}

async function copyModuleTraceBundle() {
  if (!supportsBackendFinancialTrace.value || tracePacketBusy.value || !navigator.clipboard) return
  tracePacketBusy.value = true
  try {
    await navigator.clipboard.writeText(await buildModuleTraceBundleContent())
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Trace bundle copied' : '财务追溯证据包已复制')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to copy trace bundle' : '复制财务追溯证据包失败'))
  } finally {
    tracePacketBusy.value = false
  }
}

async function buildTopFinancialTracePacketContent() {
  if (!supportsBackendFinancialTrace.value || !topBackendTraceRecord.value?.id) return ''
  const detail = await fetchFinancialTraceDetail(props.moduleKey, topBackendTraceRecord.value.id)
  return buildFinancialTraceDetailPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    detail,
    moduleTitle,
    title: preferencesStore.language === 'en-US'
      ? `${pageTitle.value} Top Trace Record`
      : `${pageTitle.value} 最高风险追溯记录`,
  })
}

async function exportTopFinancialTracePacket() {
  if (!supportsBackendFinancialTrace.value || !topBackendTraceRecord.value?.id || tracePacketBusy.value) return
  tracePacketBusy.value = true
  try {
    const content = await buildTopFinancialTracePacketContent()
    if (!content) return
    downloadText(
      buildFinancialTracePacketFilename({
        moduleKey: props.moduleKey,
        recordId: topBackendTraceRecord.value.id,
        date: new Date().toISOString().slice(0, 10),
      }),
      content,
      'text/markdown;charset=utf-8',
    )
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Top trace packet exported' : '最高风险追溯包已导出')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to export top trace packet' : '导出最高风险追溯包失败'))
  } finally {
    tracePacketBusy.value = false
  }
}

async function copyTopFinancialTracePacket() {
  if (!supportsBackendFinancialTrace.value || !topBackendTraceRecord.value?.id || tracePacketBusy.value || !navigator.clipboard) return
  tracePacketBusy.value = true
  try {
    const content = await buildTopFinancialTracePacketContent()
    if (!content) return
    await navigator.clipboard.writeText(content)
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Top trace packet copied' : '最高风险追溯包已复制')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to copy top trace packet' : '复制最高风险追溯包失败'))
  } finally {
    tracePacketBusy.value = false
  }
}

function openModuleCreateDesk() {
  void router.push({
    name: props.moduleKey,
    query: {
      create: '1',
    },
  })
}

function openTopRiskDocuments() {
  const traceQuery = buildTopBackendTraceDetailQuery('documents')
  if (traceQuery) {
    void router.push(traceQuery)
    return
  }
  if (!moduleTopRisk.value?.recordId) return
  void router.push({
    name: moduleTopRisk.value.moduleKey,
    query: {
      detailId: String(moduleTopRisk.value.recordId),
      section: 'documents',
    },
  })
}

function openTopRiskTimeline() {
  const traceQuery = buildTopBackendTraceDetailQuery('timeline')
  if (traceQuery) {
    void router.push(traceQuery)
    return
  }
  if (!moduleTopRisk.value?.recordId) return
  void router.push({
    name: moduleTopRisk.value.moduleKey,
    query: {
      detailId: String(moduleTopRisk.value.recordId),
      section: 'timeline',
    },
  })
}

function openGuardrailDesk() {
  void router.push({
    name: 'sysScript',
    query: {
      guardrailModule: props.moduleKey,
      model: resolvePrimarySysScriptModelForModule(props.moduleKey),
      status: '1',
    },
  })
}

function openGuardrailPreset(key: string) {
  void router.push({
    name: 'sysScript',
    query: {
      guardrailModule: props.moduleKey,
      create: '1',
      preset: key,
    },
  })
}

function openGuardrailRules(model: string, eventName: string) {
  void router.push({
    name: 'sysScript',
    query: {
      guardrailModule: props.moduleKey,
      model,
      eventName,
      status: '1',
    },
  })
}

function buildModuleGuardrailPacketContent() {
  return buildSharedGuardrailRulesPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US'
      ? `${pageTitle.value} Guardrail Rules`
      : `${pageTitle.value} Guardrail 规则`,
    presets: listSysScriptPresetsForModule(props.moduleKey),
  })
}

function exportModuleGuardrailPacket() {
  downloadText(
    `neko_erp_${props.moduleKey}_guardrail_rules_${new Date().toISOString().slice(0, 10)}.md`,
    buildModuleGuardrailPacketContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module guardrail packet exported' : '模块 guardrail 包已导出')
}

async function copyModuleGuardrailPacket() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildModuleGuardrailPacketContent())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module guardrail packet copied' : '模块 guardrail 包已复制')
}

function buildModuleRollbackDrillContent() {
  return buildSharedRollbackDrillPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US'
      ? `${pageTitle.value} Rollback Drill Packet`
      : `${pageTitle.value} 回退演练包`,
    chains: chainGateRows.value.map((row) => {
      const contacts = chainContactRows.value.find((item) => item.key === row.key)?.contacts
      return {
        label: row.label,
        enabled: moduleEnabled.value,
        modulesLabel: row.modulesLabel,
        readyLabel: `${row.readyCount}/6`,
        summaryLabel: row.summary.label,
        pendingLabels: row.summary.pendingLabels,
        blockerLabels: row.blockerLabels,
        closedLoopLabel: row.closedLoopSummary.label,
        closedLoopMissingLabels: row.closedLoopSummary.missingLabels,
        closedLoopStaleLabels: row.closedLoopSummary.staleLabels,
        settlementLabel: row.settlementSummary.statusLabel,
        settlementMissingLabels: row.settlementSummary.missingLabels,
        settlementWarningLabels: row.settlementSummary.warningLabels,
        settlementLines: row.settlementSummary.lines,
        financialTraceLabel: row.financialTraceSummary.statusLabel,
        financialTraceMissingLabels: row.financialTraceSummary.missingLabels,
        financialTraceWarningLabels: row.financialTraceSummary.warningLabels,
        financialTraceLines: row.financialTraceSummary.lines,
        financialTraceRecordRefs: row.financialTraceRecordRefs,
        financialTracePacketRefs: row.financialTracePacketRefs,
        financeCockpitLabel: row.financeCockpitSummary.label,
        financeCockpitLines: buildChainFinanceCockpitLines(row.key),
        topRiskLabel: row.financialTraceSummary.topRiskRefs[0] || row.financialTraceRecordRefs[0] || '-',
        owner: contacts?.owner,
        fallbackOwner: contacts?.fallbackOwner,
        rehearsalOwner: contacts?.rehearsalOwner,
        pilotConfirmOwner: contacts?.pilotConfirmOwner,
        reviewerOwner: contacts?.reviewerOwner,
        financeOwner: contacts?.financeOwner,
      }
    }),
    modules: [
      {
        title: moduleTitle(props.moduleKey),
        enabled: moduleEnabled.value,
        reminders: rehearsalSummaryRows.value.total,
        critical: rehearsalSummaryRows.value.critical,
        warning: rehearsalSummaryRows.value.warning,
        topRiskLabel: moduleFinancialTraceState.value.topRiskRefs[0] || moduleTopRisk.value?.title || '-',
        blockerLabels: chainGateRows.value.flatMap((row) => row.summary.pendingLabels),
        requiredLabels: evidenceExpectation.value.requiredLabels,
        recommendedLabel: evidenceExpectation.value.recommendedLabel,
        settlementLabel: moduleSettlementSummary.value.statusLabel,
        settlementMissingLabels: moduleSettlementSummary.value.missingLabels,
        settlementWarningLabels: moduleSettlementSummary.value.warningLabels,
        settlementLines: buildModuleSettlementLines(),
        financialTraceLabel: moduleFinancialTraceState.value.statusLabel,
        financialTraceMissingLabels: moduleFinancialTraceState.value.missingLabels,
        financialTraceWarningLabels: moduleFinancialTraceState.value.warningLabels,
        financialTraceLines: buildModuleFinancialTraceLines(),
        financialTraceRecordRefs: moduleFinancialTraceState.value.recordRefs,
        financialTracePacketRefs: buildModuleFinancialTracePacketRefs(),
        financeCockpitLabel: moduleFinanceCockpitSummary.value.label,
        financeCockpitLines: buildModuleFinanceCockpitLines(),
        paymentLinkageLines: buildModulePaymentLinkageLines(),
        quantImpactLines: buildModuleQuantImpactLines(),
      },
    ],
  })
}

function exportModuleRollbackDrill() {
  downloadText(
    `neko_erp_${props.moduleKey}_rollback_drill_${new Date().toISOString().slice(0, 10)}.md`,
    buildModuleRollbackDrillContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module rollback drill exported' : '模块回退演练包已导出')
}

async function copyModuleRollbackDrill() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildModuleRollbackDrillContent())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module rollback drill copied' : '模块回退演练包已复制')
}

function buildModuleEvidencePacketContent() {
  const gateLines = chainGateRows.value.length
    ? chainGateRows.value.map((row) => `- ${row.label}: ${row.readyCount}/6 · ${row.summary.label}`)
    : [`- ${preferencesStore.language === 'en-US' ? 'No attached pilot chain.' : '当前没有关联试点链路。'}`]
  const topRiskLines = moduleTopRisk.value
    ? [
        `- ${preferencesStore.language === 'en-US' ? 'Record ID' : '记录ID'}: ${moduleTopRisk.value.recordId ?? '-'}`,
        `- ${preferencesStore.language === 'en-US' ? 'Severity' : '级别'}: ${moduleTopRisk.value.severity}`,
        `- ${preferencesStore.language === 'en-US' ? 'Title' : '标题'}: ${moduleTopRisk.value.title}`,
        `- ${preferencesStore.language === 'en-US' ? 'Reference' : '引用'}: ${moduleTopRisk.value.relatedRef || '-'}`,
      ]
    : [`- ${preferencesStore.language === 'en-US' ? 'No top-risk record is currently attached to this module.' : '当前模块没有挂接最高风险记录。'}`]

  return [
    `# ${preferencesStore.language === 'en-US' ? `${pageTitle.value} Evidence Discipline Packet` : `${pageTitle.value} 证据纪律包`}`,
    '',
    `${preferencesStore.language === 'en-US' ? 'Generated At' : '生成时间'}: ${formatDateTime(new Date().toISOString())}`,
    `${preferencesStore.language === 'en-US' ? 'Module' : '模块'}: ${moduleTitle(props.moduleKey)}`,
    `${preferencesStore.language === 'en-US' ? 'Pilot Chains' : '试点链路'}: ${cutoverChainLabel.value || '-'}`,
    `${preferencesStore.language === 'en-US' ? 'Required Evidence' : '必备证据'}: ${requiredEvidencePresets.value.map((item) => item.label).join(' / ') || '-'}`,
    `${preferencesStore.language === 'en-US' ? 'Recommended Upload' : '推荐上传'}: ${recommendedEvidencePreset.value?.label || evidenceExpectation.value.recommendedLabel}`,
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Timeline Hint' : '时间轴提示'}`,
    evidenceExpectation.value.timelineHint,
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Required Checklist' : '必备清单'}`,
    ...(requiredEvidencePresets.value.length
      ? requiredEvidencePresets.value.map((item) => `- ${item.label}: ${item.description}`)
      : [`- ${preferencesStore.language === 'en-US' ? 'No mandatory evidence categories.' : '当前没有强制证据类别。'}`]),
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Recommended Checklist' : '建议清单'}`,
    ...(optionalEvidencePresets.value.length
      ? optionalEvidencePresets.value.map((item) => `- ${item.label}: ${item.description}`)
      : [`- ${preferencesStore.language === 'en-US' ? 'No optional evidence categories.' : '当前没有建议证据类别。'}`]),
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Gate Pressure' : '门槛压力'}`,
    ...gateLines,
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Settlement Closure' : '结算闭环'}`,
    ...buildModuleSettlementLines(),
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Financial Trace' : '财务追溯'}`,
    ...buildModuleFinancialTraceLines(),
    ...(moduleFinanceCockpitSummary.value.enabled
      ? [
          '',
          `## ${preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱'}`,
          ...buildModuleFinanceCockpitLines(),
        ]
      : []),
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Close Checklist' : '关账清单'}`,
    ...buildModuleCloseChecklistLines(),
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Recent Close Activity' : '最近关账活动'}`,
    ...buildModuleCloseActivityLines(),
    ...(modulePaymentLinkageSummary.value.enabled
      ? [
          '',
          `## ${preferencesStore.language === 'en-US' ? 'Payment Linkage' : '付款联动'}`,
          ...buildModulePaymentLinkageLines(),
        ]
      : []),
    ...(moduleQuantImpactSummary.value.enabled
      ? [
          '',
          `## ${preferencesStore.language === 'en-US' ? 'Quant Impact' : '库存影响'}`,
          ...buildModuleQuantImpactLines(),
        ]
      : []),
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Top Risk Evidence Target' : '最高风险证据目标'}`,
    ...topRiskLines,
    '',
    `## ${preferencesStore.language === 'en-US' ? 'Operator Moves' : '操作步骤'}`,
    `1. ${preferencesStore.language === 'en-US' ? 'Open a new module draft if the evidence should be prepared before record creation.' : '如果需要先准备证据，再打开新的模块草稿。'}`,
    `2. ${preferencesStore.language === 'en-US' ? 'Upload required evidence first, then continue with the recommended upload category.' : '先上传必备证据，再补推荐上传类别。'}`,
    `3. ${preferencesStore.language === 'en-US' ? 'Use the timeline to explain the current collection state and follow-up owner.' : '在时间轴里补充当前收集状态和后续负责人。'}`,
    `4. ${preferencesStore.language === 'en-US' ? 'Export rollback drill artifacts if evidence is still incomplete before pilot expansion.' : '如果在扩大试点前证据仍不完整，就同步导出回退演练包。'}`,
  ].join('\n')
}

function exportModuleEvidencePacket() {
  downloadText(
    `neko_erp_${props.moduleKey}_evidence_discipline_${new Date().toISOString().slice(0, 10)}.md`,
    buildModuleEvidencePacketContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module evidence packet exported' : '模块证据纪律包已导出')
}

async function copyModuleEvidencePacket() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildModuleEvidencePacketContent())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module evidence packet copied' : '模块证据纪律包已复制')
}

function buildOperatorHandbookContent() {
  return buildSharedModuleHandbookContent({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    pageTitle: pageTitle.value,
    moduleTitle: moduleTitle(props.moduleKey),
    pilotChainsLabel: cutoverChainLabel.value || '-',
    moduleEnabled: moduleEnabled.value,
    contacts: chainContactRows.value.map((row) => ({
      label: row.label,
      owner: row.contacts.owner,
      fallbackOwner: row.contacts.fallbackOwner,
      rehearsalOwner: row.contacts.rehearsalOwner,
      pilotConfirmOwner: row.contacts.pilotConfirmOwner,
      reviewerOwner: row.contacts.reviewerOwner,
      financeOwner: row.contacts.financeOwner,
    })),
    pageDescription: pageDescription.value,
    note: props.note,
    pilotGuides: pilotGuideItems.value.map((item) => ({ title: item.title, description: item.description })),
    rollbackItems: rollbackItems.value.map((item) => ({ title: item.title, description: item.description })),
    quickLinks: quickLinkItems.value.map((item) => ({ title: item.label, description: item.description })),
    executionItems: buildExecutionExportItems(),
    stageItems: moduleStageCards.value.map((item) => ({ label: item.label, value: item.value, description: item.description })),
    readinessItems: readinessItems.value.map((item) => ({ label: item.label, value: item.value, description: item.description })),
    settlementLines: buildModuleSettlementLines(),
    financialTraceLines: buildModuleFinancialTraceLines(),
    financialTraceRecordRefs: moduleFinancialTraceState.value.recordRefs,
    financialTracePacketRefs: buildModuleFinancialTracePacketRefs(),
    financeCockpitLines: buildModuleFinanceCockpitLines(),
    closeChecklistLines: buildModuleCloseChecklistLines(),
    closeActivityLines: buildModuleCloseActivityLines(),
    paymentLinkageLines: buildModulePaymentLinkageLines(),
    quantImpactLines: buildModuleQuantImpactLines(),
  })
}

function exportOperatorHandbook() {
  downloadText(
    `neko_erp_${props.moduleKey}_operator_handbook_${new Date().toISOString().slice(0, 10)}.md`,
    buildOperatorHandbookContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Operator handbook exported' : '操作手册已导出')
}

async function copyOperatorHandbook() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildOperatorHandbookContent())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Operator handbook copied' : '操作手册已复制')
}

function buildModuleGatePacketContent() {
  return buildSharedModuleGatePacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    pageTitle: preferencesStore.language === 'en-US'
      ? `${pageTitle.value} Gate Packet`
      : `${pageTitle.value} 门槛包`,
    moduleTitle: moduleTitle(props.moduleKey),
    pilotChainsLabel: cutoverChainLabel.value || '-',
    moduleEnabled: moduleEnabled.value,
    readinessItems: readinessItems.value.map((item) => ({ label: item.label, value: item.value, description: item.description })),
    stageItems: moduleStageCards.value.map((item) => ({ label: item.label, value: item.value, description: item.description })),
    gateRows: chainGateRows.value.map((row) => {
      const contacts = chainContactRows.value.find((item) => item.key === row.key)?.contacts
      return {
        label: row.label,
        readyLabel: `${row.readyCount}/6`,
        summaryLabel: row.summary.label,
        closedLoopLabel: row.closedLoopSummary.label,
        closedLoopMissingLabels: row.closedLoopSummary.missingLabels,
        closedLoopStaleLabels: row.closedLoopSummary.staleLabels,
        settlementLabel: row.settlementSummary.statusLabel,
        settlementMissingLabels: row.settlementSummary.missingLabels,
        settlementWarningLabels: row.settlementSummary.warningLabels,
        settlementLines: row.settlementSummary.lines,
        financialTraceLabel: row.financialTraceSummary.statusLabel,
        financialTraceMissingLabels: row.financialTraceSummary.missingLabels,
        financialTraceWarningLabels: row.financialTraceSummary.warningLabels,
        financialTraceLines: row.financialTraceSummary.lines,
        financialTraceRecordRefs: row.financialTraceRecordRefs,
        financialTracePacketRefs: row.financialTracePacketRefs,
        topRiskLabel: row.financialTraceSummary.topRiskRefs[0] || row.financialTraceRecordRefs[0] || '-',
        financeCockpitLabel: row.financeCockpitSummary.label,
        financeCockpitLines: buildChainFinanceCockpitLines(row.key),
        paymentLinkageLines: buildModulePaymentLinkageLines(),
        quantImpactLines: buildModuleQuantImpactLines(),
        pendingLabels: row.summary.pendingLabels,
        note: row.note,
        blockerLabels: row.blockerLabels,
        owner: contacts?.owner,
        fallbackOwner: contacts?.fallbackOwner,
        rehearsalOwner: contacts?.rehearsalOwner,
        pilotConfirmOwner: contacts?.pilotConfirmOwner,
        reviewerOwner: contacts?.reviewerOwner,
        financeOwner: contacts?.financeOwner,
      }
    }),
  })
}

function exportModuleGatePacket() {
  downloadText(
    `neko_erp_${props.moduleKey}_gate_packet_${new Date().toISOString().slice(0, 10)}.md`,
    buildModuleGatePacketContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module gate packet exported' : '模块门槛包已导出')
}

async function copyModuleGatePacket() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildModuleGatePacketContent())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module gate packet copied' : '模块门槛包已复制')
}

function buildCutoverRehearsalContent() {
  return buildSharedModuleRehearsalContent({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    pageTitle: pageTitle.value,
    moduleTitle: moduleTitle(props.moduleKey),
    pilotChainsLabel: cutoverChainLabel.value || '-',
    criticalCount: rehearsalSummaryRows.value.critical,
    warningCount: rehearsalSummaryRows.value.warning,
    totalCount: rehearsalSummaryRows.value.total,
    gatePressureLines: chainGateRows.value.map((row) => [
      `- ${row.label}: ${row.summary.label} (${row.readyCount}/6)`,
      `  ${preferencesStore.language === 'en-US' ? 'Pending' : '待完成'}: ${row.summary.pendingLabels.join(' / ') || '-'}`,
      `  ${preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环'}: ${describeClosedLoopSummary(row.closedLoopSummary)}`,
      `  ${preferencesStore.language === 'en-US' ? 'Settlement Closure' : '结算闭环'}: ${row.settlementSummary.statusLabel}`,
      `  ${preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱'}: ${row.financeCockpitSummary.label}`,
      `  ${preferencesStore.language === 'en-US' ? 'Financial Trace' : '财务追溯'}: ${row.financialTraceSummary.statusLabel}`,
      `  ${preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险'}: ${row.financialTraceSummary.topRiskRefs[0] || row.financialTraceRecordRefs[0] || '-'}`,
    ].join('\n')),
    closedLoopLines: buildModuleClosedLoopLines(),
    settlementLines: buildModuleSettlementLines(),
    financialTraceLines: buildModuleFinancialTraceLines(),
    financialTraceRecordRefs: moduleFinancialTraceState.value.recordRefs,
    financialTracePacketRefs: buildModuleFinancialTracePacketRefs(),
    financeCockpitLines: buildModuleFinanceCockpitLines(),
    closeChecklistLines: buildModuleCloseChecklistLines(),
    closeActivityLines: buildModuleCloseActivityLines(),
    paymentLinkageLines: buildModulePaymentLinkageLines(),
    quantImpactLines: buildModuleQuantImpactLines(),
    topRiskLines: moduleTopRisk.value
      ? [
          `- ${preferencesStore.language === 'en-US' ? 'Module' : '模块'}: ${moduleTitle(moduleTopRisk.value.moduleKey as ModuleKey)}`,
          `- ${preferencesStore.language === 'en-US' ? 'Record ID' : '记录ID'}: ${moduleTopRisk.value.recordId ?? '-'}`,
          `- ${preferencesStore.language === 'en-US' ? 'Severity' : '级别'}: ${moduleTopRisk.value.severity}`,
          `- ${preferencesStore.language === 'en-US' ? 'Title' : '标题'}: ${moduleTopRisk.value.title}`,
          `- ${preferencesStore.language === 'en-US' ? 'Reference' : '引用'}: ${moduleTopRisk.value.relatedRef || '-'}`,
        ]
      : [],
    executionItems: buildExecutionExportItems(),
    rollbackItems: rollbackItems.value.map((item) => ({ title: item.title, description: item.description })),
    reminderDetails: moduleReminderItems.value.map((item) => ({
      severity: item.severity,
      moduleTitle: moduleTitle(item.moduleKey as ModuleKey),
      recordId: item.recordId,
      title: item.title,
      relatedRef: item.relatedRef,
      createdAt: item.createdAt ? formatDateTime(item.createdAt) : '-',
      content: item.content,
    })),
  })
}

function exportCutoverRehearsal() {
  downloadText(
    `neko_erp_${props.moduleKey}_cutover_rehearsal_${new Date().toISOString().slice(0, 10)}.md`,
    buildCutoverRehearsalContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Cutover rehearsal exported' : '切换演练摘要已导出')
}

async function copyCutoverRehearsal() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildCutoverRehearsalContent())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Cutover rehearsal copied' : '切换演练摘要已复制')
}

function buildModuleExceptionPacketContent() {
  const blockerLines = chainGateRows.value.flatMap((row) => {
    if (!row.summary.pendingLabels.length && !row.financialTraceSummary.missingCount && !row.financialTraceSummary.warningCount) return []
    return [
      `- ${row.label}: ${row.summary.pendingLabels.join(' / ') || row.blockerLabels.join(' / ') || '-'}`,
      `  ${preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱'}: ${row.financeCockpitSummary.label}`,
      row.financialTraceSummary.missingCount || row.financialTraceSummary.warningCount
        ? `  ${preferencesStore.language === 'en-US' ? 'Financial Trace' : '财务追溯'}: ${row.financialTraceSummary.statusLabel} · ${row.financialTraceSummary.topRiskRefs[0] || row.financialTraceRecordRefs[0] || '-'}`
        : null,
    ].filter(Boolean) as string[]
  })
  return buildSharedModuleExceptionPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    pageTitle: preferencesStore.language === 'en-US'
      ? `${pageTitle.value} Exception Packet`
      : `${pageTitle.value} 异常包`,
    moduleTitle: moduleTitle(props.moduleKey),
    pilotChainsLabel: cutoverChainLabel.value || '-',
    summaryItems: [
      {
        label: preferencesStore.language === 'en-US' ? 'Critical Reminders' : '严重提醒',
        value: String(rehearsalSummaryRows.value.critical),
        description: preferencesStore.language === 'en-US'
          ? 'Critical rows that should stop pilot expansion.'
          : '会阻止试点扩大的严重提醒数量。',
      },
      {
        label: preferencesStore.language === 'en-US' ? 'Warning Reminders' : '警告提醒',
        value: String(rehearsalSummaryRows.value.warning),
        description: preferencesStore.language === 'en-US'
          ? 'Warnings that still need operator review.'
          : '仍需操作员核对的警告数量。',
      },
      {
        label: preferencesStore.language === 'en-US' ? 'Reminder Rows' : '提醒总数',
        value: String(rehearsalSummaryRows.value.total),
        description: preferencesStore.language === 'en-US'
          ? 'Direct reminder rows already attached to this module.'
          : '当前模块已挂接的直接提醒总数。',
      },
      {
        label: preferencesStore.language === 'en-US' ? 'Gate Pressure' : '门槛压力',
        value: chainGateRows.value.map((row) => `${row.label} ${row.readyCount}/6`).join(' / ') || '-',
        description: preferencesStore.language === 'en-US'
          ? 'Acceptance gate readiness for attached pilot chains.'
          : '关联试点链路当前的放行门槛状态。',
      },
      {
        label: preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环状态',
        value: moduleClosedLoopSummary.value.label,
        description: preferencesStore.language === 'en-US'
          ? 'Rollback drill, pilot sign-off, and exception evidence readiness for attached chains.'
          : '关联链路的回退演练、试点签收和异常证据就绪度。',
      },
      {
        label: preferencesStore.language === 'en-US' ? 'Settlement Closure' : '结算闭环',
        value: moduleSettlementSummary.value.statusLabel,
        description: preferencesStore.language === 'en-US'
          ? 'Collection, invoice, payment, and accounting settlement continuity for the current module.'
          : '当前模块的收款、开票、付款和会计结算连续性。',
      },
      {
        label: preferencesStore.language === 'en-US' ? 'Financial Trace' : '财务追溯',
        value: moduleFinancialTraceState.value.statusLabel,
        description: preferencesStore.language === 'en-US'
          ? 'Source linkage, journal continuity, and finance-side evidence continuity for the current module.'
          : '当前模块的来源链接、凭证连续性和财务侧证据连续性。',
      },
      ...(moduleFinanceCockpitSummary.value.enabled
        ? [{
            label: preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱',
            value: moduleFinanceCockpitSummary.value.label,
            description: preferencesStore.language === 'en-US'
              ? 'Shared finance closure semantics across posting, payment linkage, reconcile pressure, and accounting review.'
              : '把过账、付款联动、对账压力和会计复核收敛成一份共享财务关账语义。',
          }]
        : []),
      ...(modulePaymentLinkageSummary.value.enabled
        ? [{
            label: preferencesStore.language === 'en-US' ? 'Payment Linkage' : '付款联动',
            value: modulePaymentLinkageSummary.value.label,
            description: preferencesStore.language === 'en-US'
              ? 'Invoice, payment, and journal anchors that still need to stay continuous before finance cutover widens.'
              : '在财务切换继续扩大前，仍需保持连续的发票、付款和凭证锚点情况。',
          }]
        : []),
      ...(moduleQuantImpactSummary.value.enabled
        ? [{
            label: preferencesStore.language === 'en-US' ? 'Quant Impact' : '库存影响',
            value: moduleQuantImpactSummary.value.label,
            description: preferencesStore.language === 'en-US'
              ? 'Quant-side pressure, rollback-sensitive locations, and pending inventory-side blockers.'
              : 'quant 侧压力、回退敏感库位以及待处理的库存侧阻塞情况。',
          }]
        : []),
    ],
    blockerLines,
    closedLoopLines: buildModuleClosedLoopLines(),
    settlementLines: buildModuleSettlementLines(),
    financialTraceLines: buildModuleFinancialTraceLines(),
    financialTraceRecordRefs: moduleFinancialTraceState.value.recordRefs,
    financialTracePacketRefs: buildModuleFinancialTracePacketRefs(),
    financeCockpitLines: buildModuleFinanceCockpitLines(),
    closeChecklistLines: buildModuleCloseChecklistLines(),
    closeActivityLines: buildModuleCloseActivityLines(),
    paymentLinkageLines: buildModulePaymentLinkageLines(),
    quantImpactLines: buildModuleQuantImpactLines(),
    topRiskLines: moduleTopRisk.value
      ? [
          `- ${preferencesStore.language === 'en-US' ? 'Module' : '模块'}: ${moduleTitle(moduleTopRisk.value.moduleKey as ModuleKey)}`,
          `- ${preferencesStore.language === 'en-US' ? 'Record ID' : '记录ID'}: ${moduleTopRisk.value.recordId ?? '-'}`,
          `- ${preferencesStore.language === 'en-US' ? 'Severity' : '严重级别'}: ${moduleTopRisk.value.severity}`,
          `- ${preferencesStore.language === 'en-US' ? 'Title' : '标题'}: ${moduleTopRisk.value.title}`,
          `- ${preferencesStore.language === 'en-US' ? 'Reference' : '引用'}: ${moduleTopRisk.value.relatedRef || '-'}`,
          `- ${preferencesStore.language === 'en-US' ? 'Suggested Section' : '建议查看区域'}: ${resolveReminderSection(moduleTopRisk.value)}`,
        ]
      : [],
    executionItems: buildExecutionExportItems(),
    rollbackItems: rollbackItems.value.map((item) => ({ title: item.title, description: item.description })),
    reminderDetails: moduleReminderItems.value.map((item) => ({
      severity: item.severity,
      moduleTitle: moduleTitle(item.moduleKey as ModuleKey),
      recordId: item.recordId,
      title: item.title,
      relatedRef: item.relatedRef,
      createdAt: item.createdAt ? formatDateTime(item.createdAt) : '-',
      content: item.content,
    })),
  })
}

function exportModuleExceptionPacket() {
  downloadText(
    `neko_erp_${props.moduleKey}_exception_packet_${new Date().toISOString().slice(0, 10)}.md`,
    buildModuleExceptionPacketContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Module exception packet exported' : '模块异常包已导出')
}

onMounted(() => {
  void refreshModuleReminders()
  void focusWorkbenchSection(route.query.section)
})

watch(
  () => props.moduleKey,
  () => {
    void refreshModuleReminders()
  },
)

watch(
  () => route.query.section,
  (value) => {
    void focusWorkbenchSection(value)
  },
)
</script>

<template>
  <div class="workbench-shell">
    <section
      v-if="isFirstWaveModule"
      :ref="(el) => registerWorkbenchSection('cutover', el)"
      class="erp-card cutover-banner"
      :class="{ disabled: !moduleEnabled }"
    >
      <div class="cutover-copy">
        <span class="cutover-kicker">{{ preferencesStore.language === 'en-US' ? 'Cutover Control' : '切换控制' }}</span>
        <strong>{{ cutoverTitle }}</strong>
        <p>{{ cutoverDescription }}</p>
        <span class="cutover-pill">
          {{ preferencesStore.language === 'en-US' ? 'Pilot Chains' : '试点链路' }}: {{ cutoverChainLabel }}
        </span>
        <div class="cutover-contact-list">
          <button
            v-for="row in chainContactRows"
            :key="row.key"
            type="button"
            class="cutover-contact-pill"
            @click="openChainSettings(row.key)"
          >
            {{ row.label }} · {{ preferencesStore.language === 'en-US' ? 'Owner' : '负责人' }}: {{ row.contacts.owner }} · {{ preferencesStore.language === 'en-US' ? 'Confirm' : '确认' }}: {{ row.contacts.pilotConfirmOwner }}
          </button>
        </div>
        <div class="cutover-contact-list">
          <button
            v-for="row in chainGateRows"
            :key="`gate-${row.key}`"
            type="button"
            class="cutover-contact-pill gate-pill"
            @click="openCutoverGateSettings(row.key)"
          >
            {{ row.label }} · {{ preferencesStore.language === 'en-US' ? 'Gates' : '门槛' }}: {{ row.readyCount }}/6
          </button>
        </div>
        <div class="cutover-contact-list">
          <button
            v-for="row in chainGateRows"
            :key="`closed-loop-${row.key}`"
            type="button"
            class="cutover-contact-pill gate-pill"
            @click="openCutoverClosedLoop(row.key)"
          >
            {{ row.label }} · {{ preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环' }}: {{ row.closedLoopSummary.label }}
          </button>
        </div>
        <div v-if="moduleStageCards.length" class="cutover-stage-grid">
          <article
            v-for="item in moduleStageCards"
            :key="item.key"
            :class="['cutover-stage-card', `tone-${item.tone}`]"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </div>
      <div class="cutover-actions">
        <el-button size="small" @click="exportModuleExceptions">
          {{ preferencesStore.language === 'en-US' ? 'Export Exceptions' : '导出异常清单' }}
        </el-button>
        <el-button size="small" @click="exportModuleExceptionPacket">
          {{ preferencesStore.language === 'en-US' ? 'Export Exception Packet' : '导出异常包' }}
        </el-button>
        <el-button size="small" @click="openCutoverSettings">
          {{ preferencesStore.language === 'en-US' ? 'Open Cutover Settings' : '打开切换设置' }}
        </el-button>
        <el-button size="small" @click="openCutoverGateSettings">
          {{ preferencesStore.language === 'en-US' ? 'Open Gates' : '打开门槛' }}
        </el-button>
        <el-button size="small" @click="openCutoverClosedLoop">
          {{ preferencesStore.language === 'en-US' ? 'Open Closed Loop' : '打开闭环台' }}
        </el-button>
        <el-button v-if="moduleEnabled" type="danger" size="small" @click="rollbackCurrentModule">
          {{ preferencesStore.language === 'en-US' ? 'Rollback This Module' : '回退当前模块' }}
        </el-button>
      </div>
    </section>

    <template v-if="isFirstWaveModule">
      <CompactNoticeBar
        v-if="!workbenchDeskExpanded('riskStats')"
        inline
        :message="preferencesStore.language === 'en-US'
          ? 'Module risk stats stay collapsed until you need to reassess whether this module should remain inside the pilot scope.'
          : '模块风险统计默认收起，只有在重新评估该模块是否继续留在试点范围时再展开。'"
      >
        <template #actions>
          <el-button link type="primary" @click="toggleWorkbenchDesk('riskStats')">
            {{ preferencesStore.language === 'en-US' ? 'Expand Risk Stats' : '展开风险统计' }}
          </el-button>
        </template>
      </CompactNoticeBar>
      <template v-else>
        <CompactNoticeBar
          inline
          :message="preferencesStore.language === 'en-US'
            ? 'Module risk stats are expanded. Collapse them after finishing the current scope review.'
            : '模块风险统计已展开，当前范围核对完成后可以再次收起。'"
        >
          <template #actions>
            <el-button link type="primary" @click="toggleWorkbenchDesk('riskStats')">
              {{ preferencesStore.language === 'en-US' ? 'Collapse Risk Stats' : '收起风险统计' }}
            </el-button>
          </template>
        </CompactNoticeBar>
        <PilotRiskStatsPanel
          :title="preferencesStore.language === 'en-US' ? 'Module Risk Stats' : '模块风险统计'"
          :description="preferencesStore.language === 'en-US'
            ? 'Track review pressure before deciding whether to keep this module inside the pilot.'
            : '在决定是否继续保留当前模块试点前，先看清审核压力。'"
          :rows="moduleRiskRows"
        />
      </template>

      <CompactNoticeBar
        v-if="!workbenchDeskExpanded('batchActions')"
        inline
        :message="preferencesStore.language === 'en-US'
          ? 'Module batch actions stay collapsed until operators need exception export, rollback review, or top-risk jump actions.'
          : '模块批处理默认收起，只有需要异常导出、回退核对或最高风险跳转时再展开。'"
      >
        <template #actions>
          <el-button link type="primary" @click="toggleWorkbenchDesk('batchActions')">
            {{ preferencesStore.language === 'en-US' ? 'Expand Batch Actions' : '展开批处理' }}
          </el-button>
        </template>
      </CompactNoticeBar>
      <template v-else>
        <CompactNoticeBar
          inline
          :message="preferencesStore.language === 'en-US'
            ? 'Module batch actions are expanded. Collapse them after the current export or rollback review finishes.'
            : '模块批处理已展开，当前导出或回退核对完成后可以再次收起。'"
        >
          <template #actions>
            <el-button link type="primary" @click="toggleWorkbenchDesk('batchActions')">
              {{ preferencesStore.language === 'en-US' ? 'Collapse Batch Actions' : '收起批处理' }}
            </el-button>
          </template>
        </CompactNoticeBar>
        <PilotBatchActionPanel
          :title="preferencesStore.language === 'en-US' ? 'Module Batch Actions' : '模块批处理'"
          :description="preferencesStore.language === 'en-US'
            ? 'Export exceptions, open the top-risk record, and prepare rollback reviews without leaving this workbench.'
            : '不离开当前工作台，直接完成异常导出、最高风险记录跳转和回退核对准备。'"
          :rows="moduleRiskRows"
        />
      </template>
    </template>

    <section v-if="isFirstWaveModule" class="ops-grid">
      <article
        :ref="(el) => registerWorkbenchSection('ops-close', el)"
        class="erp-card ops-panel close-panel"
      >
        <div class="ops-header">
          <div>
            <div class="ops-title">{{ preferencesStore.language === 'en-US' ? 'Role And Close Desk' : '责任与关账台' }}</div>
            <p class="ops-desc">
              {{ preferencesStore.language === 'en-US'
                ? 'Keep role ownership, close blockers, and close actions visible on the same workbench before pilot traffic widens.'
                : '在扩大试点流量前，把责任归属、关账阻塞项和关账动作固定在同一工作台里。' }}
            </p>
          </div>
          <div class="ops-actions">
            <el-button size="small" @click="openCutoverSettings">
              {{ preferencesStore.language === 'en-US' ? 'Open Cutover' : '打开切换设置' }}
            </el-button>
            <el-button size="small" @click="openRoleDeskSettings">
              {{ preferencesStore.language === 'en-US' ? 'Role Desk' : '责任台' }}
            </el-button>
            <el-button size="small" @click="openFinanceBatchSettings">
              {{ preferencesStore.language === 'en-US' ? 'Finance Batch' : '财务批量台' }}
            </el-button>
            <el-button size="small" @click="openCutoverGateSettings">
              {{ preferencesStore.language === 'en-US' ? 'Open Gates' : '打开门槛台' }}
            </el-button>
            <el-button size="small" @click="openCutoverClosedLoop">
              {{ preferencesStore.language === 'en-US' ? 'Open Closed Loop' : '打开闭环台' }}
            </el-button>
            <el-button size="small" type="primary" @click="openSettlementDesk">
              {{ preferencesStore.language === 'en-US' ? 'Open Settlement' : '打开结算台' }}
            </el-button>
          </div>
        </div>
        <div class="ops-metrics">
          <article :class="['ops-card', 'close-summary-card', `tone-${moduleCloseSummary.tone}`]">
            <span>{{ preferencesStore.language === 'en-US' ? 'Close Status' : '关账状态' }}</span>
            <strong>{{ moduleCloseSummary.label }}</strong>
            <p>{{ preferencesStore.language === 'en-US'
              ? 'This summary merges gates, settlement, financial trace, and closed-loop evidence into one close snapshot.'
              : '这个摘要会把门槛、结算、财务追溯和闭环证据合并成一份关账快照。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Gate Pressure' : '门槛压力' }}</span>
            <strong>{{ moduleCloseSummary.gatePendingCount }}</strong>
            <p>{{ preferencesStore.language === 'en-US'
              ? 'Pending acceptance checks still blocking pilot broadening.'
              : '仍在阻止试点扩大范围的放行检查数量。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Settlement / Trace' : '结算 / 追溯' }}</span>
            <strong>{{ moduleCloseSummary.settlementIssueCount + moduleCloseSummary.financialTraceIssueCount }}</strong>
            <p>
              {{ preferencesStore.language === 'en-US'
                ? `Settlement ${moduleCloseSummary.settlementIssueCount} · Trace ${moduleCloseSummary.financialTraceIssueCount}`
                : `结算 ${moduleCloseSummary.settlementIssueCount} · 追溯 ${moduleCloseSummary.financialTraceIssueCount}` }}
            </p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Closed Loop Gaps' : '闭环缺口' }}</span>
            <strong>{{ moduleCloseSummary.closedLoopIssueCount }}</strong>
            <p>{{ preferencesStore.language === 'en-US'
              ? 'Missing or stale drill / sign-off / exception evidence.'
              : '缺少或过期的演练、签收或异常证据数量。' }}</p>
          </article>
          <article v-if="supportsPaymentLinkage" class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Payment Linkage' : '付款联动' }}</span>
            <strong>{{ moduleCloseSummary.paymentLinkageIssueCount }}</strong>
            <p>{{ preferencesStore.language === 'en-US'
              ? 'Invoice, payment, and journal anchors still blocking finance close.'
              : '仍在阻塞财务关账的发票、付款和凭证锚点数量。' }}</p>
          </article>
          <article v-if="supportsQuantImpact" class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Quant Impact' : '库存影响' }}</span>
            <strong>{{ moduleCloseSummary.quantImpactIssueCount }}</strong>
            <p>{{ preferencesStore.language === 'en-US'
              ? 'Inventory-side impact and rollback pressure still needing explanation.'
              : '仍需要解释的库存侧影响和回退压力数量。' }}</p>
          </article>
        </div>
        <div class="pending-gate-list gate-pressure-list">
          <span
            v-for="item in moduleCloseChecklist"
            :key="item.key"
            :class="`tone-${item.ready ? 'success' : 'warning'}`"
          >
            {{ item.label }} · {{ item.ready ? (preferencesStore.language === 'en-US' ? 'Ready' : '就绪') : (preferencesStore.language === 'en-US' ? 'Blocked' : '阻塞') }}
          </span>
        </div>
        <p class="gate-blocker-note">{{ moduleCloseChecklist.map((item) => `${item.label}: ${item.description}`).join(' · ') }}</p>
        <div class="guardrail-preset-list responsibility-list">
          <article v-for="row in responsibilitySummaryRows" :key="row.key" class="guardrail-preset-card responsibility-card">
            <div class="guardrail-preset-head">
              <div>
                <strong>{{ row.label }}</strong>
                <span>{{ preferencesStore.language === 'en-US' ? 'Role Snapshot' : '责任快照' }}</span>
              </div>
              <span class="guardrail-remark">{{ preferencesStore.language === 'en-US' ? 'Close Scope' : '关账范围' }}</span>
            </div>
            <p>
              {{ preferencesStore.language === 'en-US'
                ? `Owner: ${row.owner} · Fallback: ${row.fallbackOwner} · Reviewer: ${row.reviewer} · Finance: ${row.financeOwner} · Sign-off: ${row.signoffOwner}`
                : `负责人：${row.owner} · 兜底：${row.fallbackOwner} · 复核：${row.reviewer} · 财务：${row.financeOwner} · 签收：${row.signoffOwner}` }}
            </p>
            <p class="guardrail-remark">{{ preferencesStore.language === 'en-US' ? 'Company Scope' : '公司范围' }} · {{ row.companyLabel }}</p>
            <p class="guardrail-remark">{{ preferencesStore.language === 'en-US' ? 'Checklist Blockers' : '清单阻塞项' }} · {{ row.closeChecklistLabel }}</p>
            <p
              v-for="line in row.closeActivityLines"
              :key="`${row.key}-${line}`"
              class="guardrail-remark"
            >
              {{ line }}
            </p>
          </article>
        </div>
      </article>

      <CollapsibleWorkbenchDesk
        v-if="supportsSettlementCockpit"
        :ref="(el) => registerWorkbenchSection('ops-settlement', el)"
        article-class="settlement-panel"
        :expanded="workbenchDeskExpanded('settlement')"
        :title="preferencesStore.language === 'en-US' ? 'Settlement / Reconciliation Desk' : '结算 / 对账台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Keep payment linkage, reconcile pressure, and finance evidence continuous from one cockpit before close tasks widen.'
          : '在关账任务继续扩大前，把付款链接、对账压力和财务证据连续性固定在同一块驾驶舱里。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Settlement and reconciliation desk stays collapsed until finance operators need to inspect open settlement, trace, or reconcile pressure.'
          : '结算 / 对账台默认收起，只有财务需要核对结算、追溯或对账压力时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('settlement')"
      >
        <template #actions>
          <el-button size="small" type="primary" @click="openSettlementDesk">
            {{ preferencesStore.language === 'en-US' ? 'Stay On This Desk' : '停留在此驾驶舱' }}
          </el-button>
          <el-button size="small" @click="openFinancialTraceDesk">
            {{ preferencesStore.language === 'en-US' ? 'Open Trace Desk' : '打开追溯台' }}
          </el-button>
          <el-button size="small" @click="openCutoverClosedLoop">
            {{ preferencesStore.language === 'en-US' ? 'Open Closed Loop' : '打开闭环台' }}
          </el-button>
        </template>
        <div class="ops-metrics">
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱' }}</span>
            <strong>{{ moduleFinanceCockpitSummary.label }}</strong>
            <p>
              {{
                moduleFinanceCockpitSummary.lines[1]?.replace(/^- /, '')
                  || (preferencesStore.language === 'en-US' ? 'Shared settlement, payment, and journal review posture for this module.' : '当前模块共享的结算、付款和凭证复核姿态。')
              }}
            </p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Settlement Closure' : '结算闭环' }}</span>
            <strong>{{ moduleSettlementSummary.statusLabel }}</strong>
            <p>
              {{
                moduleSettlementSummary.missingLabels.length || moduleSettlementSummary.warningLabels.length
                  ? [
                      moduleSettlementSummary.missingLabels.length
                        ? `${preferencesStore.language === 'en-US' ? 'Missing' : '缺失'}: ${moduleSettlementSummary.missingLabels.join(' / ')}`
                        : null,
                      moduleSettlementSummary.warningLabels.length
                        ? `${preferencesStore.language === 'en-US' ? 'Pending' : '待推进'}: ${moduleSettlementSummary.warningLabels.join(' / ')}`
                        : null,
                    ].filter(Boolean).join(' · ')
                  : (preferencesStore.language === 'en-US' ? 'No open settlement continuity gap.' : '当前没有开放中的结算连续性缺口。')
              }}
            </p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Financial Trace' : '财务追溯' }}</span>
            <strong>{{ moduleFinancialTraceState.statusLabel }}</strong>
            <p>
              {{
                moduleFinancialTraceState.missingLabels.length || moduleFinancialTraceState.warningLabels.length
                  ? [
                      moduleFinancialTraceState.missingLabels.length
                        ? `${preferencesStore.language === 'en-US' ? 'Missing' : '缺失'}: ${moduleFinancialTraceState.missingLabels.join(' / ')}`
                        : null,
                      moduleFinancialTraceState.warningLabels.length
                        ? `${preferencesStore.language === 'en-US' ? 'Pending' : '待推进'}: ${moduleFinancialTraceState.warningLabels.join(' / ')}`
                        : null,
                    ].filter(Boolean).join(' · ')
                  : (preferencesStore.language === 'en-US' ? 'Trace continuity is currently stable.' : '当前追溯连续性已经稳定。')
              }}
            </p>
          </article>
        </div>
        <SettlementCockpitPanel :module-key="props.moduleKey" />
      </CollapsibleWorkbenchDesk>

      <CollapsibleWorkbenchDesk
        v-if="supportsPaymentLinkage"
        :ref="(el) => registerWorkbenchSection('ops-payment-linkage', el)"
        article-class="linkage-panel"
        :expanded="workbenchDeskExpanded('paymentLinkage')"
        :title="preferencesStore.language === 'en-US' ? 'Payment Linkage Desk' : '付款联动台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Keep invoice anchors, payment artifacts, and journal refs visible together so finance closure stays explainable.'
          : '把发票锚点、付款结果对象和凭证引用固定展示，让财务闭环始终可解释。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Payment linkage desk stays collapsed until operators need to inspect invoice anchors, payment artifacts, or journal linkage.'
          : '付款联动台默认收起，只有需要核对发票锚点、付款结果对象或凭证联动时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('paymentLinkage')"
      >
        <template #actions>
          <el-button size="small" type="primary" @click="openPaymentLinkageDesk">
            {{ preferencesStore.language === 'en-US' ? 'Stay On This Desk' : '停留在此联动台' }}
          </el-button>
          <el-button size="small" @click="openSettlementDesk">
            {{ preferencesStore.language === 'en-US' ? 'Open Settlement' : '打开结算台' }}
          </el-button>
          <el-button size="small" @click="openFinancialTraceDesk">
            {{ preferencesStore.language === 'en-US' ? 'Open Trace Desk' : '打开追溯台' }}
          </el-button>
        </template>
        <div class="ops-metrics">
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Payment Linkage' : '付款联动' }}</span>
            <strong>{{ modulePaymentLinkageSummary.label }}</strong>
            <p>
              {{
                modulePaymentLinkageSummary.lines[1]?.replace(/^- /, '')
                  || (preferencesStore.language === 'en-US' ? 'Invoice anchors, payment artifacts, and journal refs stay visible from the same shell.' : '把发票锚点、付款结果对象和凭证引用收在同一个壳层里可见。')
              }}
            </p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱' }}</span>
            <strong>{{ moduleFinanceCockpitSummary.label }}</strong>
            <p>
              {{
                moduleFinanceCockpitSummary.lines[4]?.replace(/^- /, '')
                  || (preferencesStore.language === 'en-US' ? 'Shared finance closure semantics are available for this linkage desk.' : '当前联动台已经挂上共享财务关账语义。')
              }}
            </p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Suggested Blockers' : '建议阻塞项' }}</span>
            <strong>{{ chainGateRows.flatMap((row) => row.blockerLabels).length }}</strong>
            <p>
              {{ chainGateRows.flatMap((row) => row.blockerLabels).join(' / ')
                || (preferencesStore.language === 'en-US' ? 'No blocker recommendation currently exists.' : '当前没有建议阻塞项。') }}
            </p>
          </article>
        </div>
        <PaymentLinkagePanel :module-key="props.moduleKey" />
      </CollapsibleWorkbenchDesk>

      <CollapsibleWorkbenchDesk
        v-if="supportsExecutionFeedback"
        :ref="(el) => registerWorkbenchSection('ops-execution-feedback', el)"
        article-class="execution-feedback-panel"
        :expanded="workbenchDeskExpanded('executionFeedback')"
        :title="preferencesStore.language === 'en-US' ? 'Execution Feedback Desk' : '执行反馈台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Keep transfer progress, move completion, and rollback-sensitive warehouse pressure visible before inventory scope widens.'
          : '在库存范围继续扩大前，把调拨进度、移动完成度和对回退敏感的仓储压力固定展示。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Execution feedback desk stays collapsed until warehouse operators need transfer progress or rollback-sensitive execution detail.'
          : '执行反馈台默认收起，只有仓储人员需要查看调拨进度或回退敏感执行细节时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('executionFeedback')"
      >
        <template #actions>
          <el-button size="small" type="primary" @click="openExecutionFeedbackDesk">
            {{ preferencesStore.language === 'en-US' ? 'Stay On This Desk' : '停留在此驾驶舱' }}
          </el-button>
          <el-button size="small" @click="openSettlementDesk">
            {{ preferencesStore.language === 'en-US' ? 'Open Handoff Desk' : '打开交接台' }}
          </el-button>
          <el-button size="small" @click="openCutoverGateSettings">
            {{ preferencesStore.language === 'en-US' ? 'Open Gates' : '打开门槛台' }}
          </el-button>
        </template>
        <StockExecutionFeedbackPanel />
      </CollapsibleWorkbenchDesk>

      <CollapsibleWorkbenchDesk
        v-if="supportsQuantImpact"
        :ref="(el) => registerWorkbenchSection('ops-quant-impact', el)"
        article-class="quant-impact-ops-panel"
        :expanded="workbenchDeskExpanded('quantImpact')"
        :title="preferencesStore.language === 'en-US' ? 'Quant Impact Desk' : '库存影响台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Keep quant-side impact, touched locations, and rollback-sensitive transfers visible before inventory scope widens.'
          : '在库存范围继续扩大前，把 quant 副作用、涉及库位和回退敏感调拨固定展示。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Quant impact desk stays collapsed until inventory operators need to inspect touched locations or rollback-sensitive quant changes.'
          : '库存影响台默认收起，只有库存人员需要核对涉及库位或回退敏感的 quant 变化时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('quantImpact')"
      >
        <template #actions>
          <el-button size="small" type="primary" @click="openQuantImpactDesk">
            {{ preferencesStore.language === 'en-US' ? 'Stay On This Desk' : '停留在此库存影响台' }}
          </el-button>
          <el-button size="small" @click="openExecutionFeedbackDesk">
            {{ preferencesStore.language === 'en-US' ? 'Open Execution Desk' : '打开执行台' }}
          </el-button>
          <el-button size="small" @click="openCutoverClosedLoop">
            {{ preferencesStore.language === 'en-US' ? 'Open Closed Loop' : '打开闭环台' }}
          </el-button>
        </template>
        <QuantImpactPanel />
      </CollapsibleWorkbenchDesk>

      <article
        :ref="(el) => registerWorkbenchSection('ops-gates', el)"
        class="erp-card ops-panel gate-panel"
      >
        <div class="ops-header">
          <div>
            <div class="ops-title">{{ preferencesStore.language === 'en-US' ? 'Acceptance Gate Desk' : '放行门槛台' }}</div>
            <p class="ops-desc">
              {{ preferencesStore.language === 'en-US'
                ? 'See whether the owning pilot chain is ready for cutover before operators expand real usage.'
                : '在扩大真实试点前，先看清所属链路是否满足放行门槛。' }}
            </p>
          </div>
          <div class="ops-actions">
            <el-button size="small" @click="copyModuleGatePacket">
              {{ preferencesStore.language === 'en-US' ? 'Copy Gate Packet' : '复制门槛包' }}
            </el-button>
            <el-button size="small" @click="exportModuleGatePacket">
              {{ preferencesStore.language === 'en-US' ? 'Export Gate Packet' : '导出门槛包' }}
            </el-button>
            <el-button size="small" type="primary" @click="openCutoverGateSettings">
              {{ preferencesStore.language === 'en-US' ? 'Open Gate Settings' : '打开门槛设置' }}
            </el-button>
          </div>
        </div>
        <div class="ops-metrics">
          <article v-for="row in chainGateRows" :key="row.key" class="ops-card">
            <div class="ops-card-head">
              <span>{{ row.label }}</span>
              <strong>{{ row.readyCount }}/6</strong>
            </div>
            <p class="ops-card-summary">
              {{ row.summary.label }}
              ·
              {{ row.pendingCount
                ? (preferencesStore.language === 'en-US' ? `${row.pendingCount} checks pending.` : `还有 ${row.pendingCount} 项待完成。`)
                : (preferencesStore.language === 'en-US' ? 'All checks complete.' : '全部检查已完成。') }}
            </p>
            <p class="ops-card-summary">
              {{ preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环' }} · {{ row.closedLoopSummary.label }}
            </p>
            <p class="ops-card-summary">
              {{ preferencesStore.language === 'en-US' ? 'Financial Trace' : '财务追溯' }} · {{ row.financialTraceSummary.statusLabel }}
            </p>
            <p class="ops-card-summary">
              {{ preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱' }} · {{ row.financeCockpitSummary.label }}
            </p>
            <div class="ops-gate-chip-list">
              <span
                v-for="item in row.checklist"
                :key="`${row.key}-${item.key}`"
                :class="['ops-gate-chip', item.ready ? 'ready' : 'pending']"
              >
                {{ item.label }}
              </span>
            </div>
            <p v-if="row.closedLoopSummary.missingLabels.length || row.closedLoopSummary.staleLabels.length" class="ops-card-note">
              {{
                [
                  row.closedLoopSummary.missingLabels.length
                    ? `${preferencesStore.language === 'en-US' ? 'Missing' : '缺少'}: ${row.closedLoopSummary.missingLabels.join(' / ')}`
                    : null,
                  row.closedLoopSummary.staleLabels.length
                    ? `${preferencesStore.language === 'en-US' ? 'Stale' : '过期'}: ${row.closedLoopSummary.staleLabels.join(' / ')}`
                    : null,
                ].filter(Boolean).join(' · ')
              }}
            </p>
            <p v-if="row.financialTraceRecordRefs.length" class="ops-card-note">
              {{ preferencesStore.language === 'en-US' ? 'Trace Records' : '追溯记录' }}: {{ row.financialTraceRecordRefs.join(' / ') }}
            </p>
            <div v-if="row.financialTraceSummary.topRiskRecordId" class="ops-card-actions">
              <el-button size="small" @click="openFinancialTraceDesk(row.key)">
                {{ preferencesStore.language === 'en-US' ? 'Open Chain Trace' : '打开链路追溯' }}
              </el-button>
              <el-button size="small" plain @click="openChainTopRiskDocuments(row.key)">
                {{ preferencesStore.language === 'en-US' ? 'Documents' : '文档' }}
              </el-button>
              <el-button size="small" plain @click="openChainTopRiskTimeline(row.key)">
                {{ preferencesStore.language === 'en-US' ? 'Timeline' : '时间轴' }}
              </el-button>
            </div>
            <p v-if="row.note" class="ops-card-note">{{ row.note }}</p>
          </article>
        </div>
      </article>

      <CollapsibleWorkbenchDesk
        :ref="(el) => registerWorkbenchSection('ops-guardrails', el)"
        article-class="guardrail-panel"
        :expanded="workbenchDeskExpanded('guardrails')"
        :title="preferencesStore.language === 'en-US' ? 'Guardrail Ops Desk' : 'Guardrail 运维台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Keep ERPNext-style server scripts close to the module workbench so operators can open presets, review live rules, and export reusable rule packs.'
          : '把 ERPNext 风格的服务端脚本贴近模块工作台，让操作员直接打开预设、查看生效规则并导出可复用规则包。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Guardrail desk stays collapsed until operators need to inspect live rules, presets, or export reusable script packets.'
          : 'Guardrail 运维台默认收起，只有需要查看生效规则、预设或导出脚本包时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('guardrails')"
      >
        <template #actions>
          <el-button size="small" @click="copyModuleGuardrailPacket">
            {{ preferencesStore.language === 'en-US' ? 'Copy Rules' : '复制规则包' }}
          </el-button>
          <el-button size="small" @click="exportModuleGuardrailPacket">
            {{ preferencesStore.language === 'en-US' ? 'Export Rules' : '导出规则包' }}
          </el-button>
          <el-button size="small" type="primary" @click="openGuardrailDesk">
            {{ preferencesStore.language === 'en-US' ? 'Open Script Desk' : '打开脚本台' }}
          </el-button>
        </template>
        <div class="ops-metrics">
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Relevant Presets' : '关联预设' }}</span>
            <strong>{{ moduleGuardrailSummary.total }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Reusable rules currently mapped to this module and its pilot chain.' : '当前映射到该模块及其试点链路的可复用规则数量。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'before_save' : 'before_save' }}</span>
            <strong>{{ moduleGuardrailSummary.beforeSave }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Draft-time checks that should stop bad data before it fans out.' : '在草稿阶段提前拦住坏数据，避免继续扩散。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'before_action' : 'before_action' }}</span>
            <strong>{{ moduleGuardrailSummary.beforeAction }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Transition guards for confirm, validate, post, and payment-side actions.' : '用于确认、校验、过账和付款动作的流转保护。' }}</p>
          </article>
        </div>
        <div v-if="moduleGuardrailPresets.length" class="guardrail-preset-list">
          <article v-for="item in moduleGuardrailPresets" :key="item.key" class="guardrail-preset-card">
            <div class="guardrail-preset-head">
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.model }} · {{ item.eventName }}</span>
              </div>
              <span class="guardrail-remark">{{ item.remark }}</span>
            </div>
            <p>{{ item.description }}</p>
            <div class="guardrail-preset-actions">
              <el-button size="small" @click="openGuardrailRules(item.model, item.eventName)">
                {{ preferencesStore.language === 'en-US' ? 'Live Rules' : '查看生效规则' }}
              </el-button>
              <el-button size="small" type="primary" plain @click="openGuardrailPreset(item.key)">
                {{ preferencesStore.language === 'en-US' ? 'Open Preset Draft' : '打开预设草稿' }}
              </el-button>
            </div>
          </article>
        </div>
      </CollapsibleWorkbenchDesk>

      <CollapsibleWorkbenchDesk
        :ref="(el) => registerWorkbenchSection('ops-evidence', el)"
        article-class="evidence-ops-panel"
        :expanded="workbenchDeskExpanded('evidence')"
        :title="preferencesStore.language === 'en-US' ? 'Evidence Ops Desk' : '证据运维台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Keep Monica-style context and ERPNext-style traceability grounded by making required files, recommended uploads, and evidence targets explicit at the module level.'
          : '把 Monica 式关系上下文和 ERPNext 式追溯要求落到模块层，明确必备文件、推荐上传和证据目标。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Evidence desk stays collapsed until operators need to inspect required uploads, recommended files, or trace targets for this module.'
          : '证据运维台默认收起，只有需要核对必备上传、推荐文件或追溯目标时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('evidence')"
      >
        <template #actions>
          <el-button size="small" @click="copyModuleEvidencePacket">
            {{ preferencesStore.language === 'en-US' ? 'Copy Evidence Packet' : '复制证据包' }}
          </el-button>
          <el-button size="small" @click="exportModuleEvidencePacket">
            {{ preferencesStore.language === 'en-US' ? 'Export Evidence Packet' : '导出证据包' }}
          </el-button>
          <el-button size="small" type="primary" @click="openModuleCreateDesk">
            {{ preferencesStore.language === 'en-US' ? 'Open New Draft' : '打开新草稿' }}
          </el-button>
        </template>
        <div class="ops-metrics">
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Required Categories' : '必备类别' }}</span>
            <strong>{{ requiredEvidencePresets.length }}</strong>
            <p>{{ requiredEvidencePresets.map((item) => item.label).join(' / ') || '-' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Recommended Upload' : '推荐上传' }}</span>
            <strong>{{ recommendedEvidencePreset?.label || evidenceExpectation.recommendedLabel }}</strong>
            <p>{{ evidenceExpectation.timelineHint }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Evidence Scope' : '证据范围' }}</span>
            <strong>{{ moduleEvidencePresets.length }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Total file categories expected for this module during first-wave pilot work.' : '当前模块在首批试点阶段建议维护的全部文件类别数量。' }}</p>
          </article>
        </div>
        <div class="guardrail-preset-list evidence-preset-list">
          <article
            v-for="item in moduleEvidencePresets"
            :key="item.key"
            :class="['guardrail-preset-card', 'evidence-preset-card', { recommended: evidenceExpectation.recommendedKey === item.key }]"
          >
            <div class="guardrail-preset-head">
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.namePrefix }}</span>
              </div>
              <span class="guardrail-remark">
                {{ item.required
                  ? (preferencesStore.language === 'en-US' ? 'Required' : '必备')
                  : (preferencesStore.language === 'en-US' ? 'Recommended' : '建议') }}
              </span>
            </div>
            <p>{{ item.description }}</p>
            <div v-if="moduleTopRisk?.recordId && evidenceExpectation.recommendedKey === item.key" class="guardrail-preset-actions">
              <el-button size="small" :disabled="!moduleTopRisk?.recordId" @click="openTopRiskDocuments">
                {{ preferencesStore.language === 'en-US' ? 'Open Top Risk Docs' : '打开最高风险文档' }}
              </el-button>
              <el-button size="small" plain :disabled="!moduleTopRisk?.recordId" @click="openTopRiskTimeline">
                {{ preferencesStore.language === 'en-US' ? 'Open Top Risk Timeline' : '打开最高风险时间轴' }}
              </el-button>
            </div>
          </article>
        </div>
      </CollapsibleWorkbenchDesk>

      <CollapsibleWorkbenchDesk
        :ref="(el) => registerWorkbenchSection('ops-handbook', el)"
        :expanded="workbenchDeskExpanded('handbook')"
        :title="preferencesStore.language === 'en-US' ? 'Operator Handbook Desk' : '操作手册台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Export the module handbook and keep pilot guidance, rollback steps, and launch targets in one reusable handoff pack.'
          : '把模块操作手册、回退步骤和快捷入口导成一份可复用的交接包。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Operator handbook desk stays collapsed until someone needs a reusable handoff packet for pilot operation.'
          : '操作手册台默认收起，只有需要导出可复用交接包时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('handbook')"
      >
        <template #actions>
          <el-button size="small" @click="copyOperatorHandbook">
            {{ preferencesStore.language === 'en-US' ? 'Copy Handbook' : '复制手册' }}
          </el-button>
          <el-button size="small" type="primary" @click="exportOperatorHandbook">
            {{ preferencesStore.language === 'en-US' ? 'Export Handbook' : '导出手册' }}
          </el-button>
        </template>
        <div class="ops-metrics">
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Guide Steps' : '操作步骤' }}</span>
            <strong>{{ handbookGuideCount }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Guide and rollback items in the current workbench.' : '当前工作台里包含的操作和回退步骤数量。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Launch Targets' : '快捷目标' }}</span>
            <strong>{{ handbookActionCount }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Quick links and readiness entries ready for operator handoff.' : '可用于操作员交接的快捷入口和准备度项。' }}</p>
          </article>
        </div>
      </CollapsibleWorkbenchDesk>

      <CollapsibleWorkbenchDesk
        :ref="(el) => registerWorkbenchSection('ops-rehearsal', el)"
        article-class="rehearsal-panel"
        :expanded="workbenchDeskExpanded('rehearsal')"
        :title="preferencesStore.language === 'en-US' ? 'Cutover Rehearsal Desk' : '切换演练台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Export a rollback drill note, inspect the top-risk record, and rehearse fallback handling before widening the pilot.'
          : '导出演练摘要、打开最高风险记录，并在扩大试点前先演练回退处理。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Cutover rehearsal desk stays collapsed until the team needs rollback drill, top-risk inspection, or exception export preparation.'
          : '切换演练台默认收起，只有团队需要做回退演练、最高风险核对或异常导出准备时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('rehearsal')"
      >
        <template #actions>
          <el-button size="small" @click="copyCutoverRehearsal">
            {{ preferencesStore.language === 'en-US' ? 'Copy Drill' : '复制演练' }}
          </el-button>
          <el-button size="small" @click="openCutoverSettings">
            {{ preferencesStore.language === 'en-US' ? 'Open Cutover' : '打开切换设置' }}
          </el-button>
          <el-button
            size="small"
            :disabled="!moduleTopRisk?.recordId"
            @click="openTopRiskRecord"
          >
            {{ preferencesStore.language === 'en-US' ? 'Open Top Risk' : '打开最高风险' }}
          </el-button>
          <el-button size="small" @click="exportModuleExceptionPacket">
            {{ preferencesStore.language === 'en-US' ? 'Export Exception Packet' : '导出异常包' }}
          </el-button>
          <el-button size="small" type="primary" @click="exportCutoverRehearsal">
            {{ preferencesStore.language === 'en-US' ? 'Export Drill' : '导出演练' }}
          </el-button>
        </template>
        <div v-if="rehearsalLoading" class="ops-empty">
          {{ preferencesStore.language === 'en-US' ? 'Loading reminder pressure...' : '正在加载提醒压力...' }}
        </div>
        <div v-else class="ops-metrics">
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Critical' : '严重' }}</span>
            <strong>{{ rehearsalSummaryRows.critical }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Critical reminders currently blocking this module.' : '当前阻塞该模块的严重提醒数量。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Warnings' : '警告' }}</span>
            <strong>{{ rehearsalSummaryRows.warning }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Warnings that should be reviewed before pilot expansion.' : '在试点扩大前应先核对的警告提醒。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Top Risk Record' : '最高风险记录' }}</span>
            <strong>{{ moduleTopRisk?.recordId ? `#${moduleTopRisk.recordId}` : '-' }}</strong>
            <p>
              {{ moduleTopRisk
                ? `${moduleTitle(moduleTopRisk.moduleKey as ModuleKey)} · ${moduleTopRisk.title}`
                : (preferencesStore.language === 'en-US' ? 'No top-risk record in this module.' : '当前模块没有最高风险记录。') }}
            </p>
          </article>
        </div>
      </CollapsibleWorkbenchDesk>

      <CollapsibleWorkbenchDesk
        :ref="(el) => registerWorkbenchSection('ops-financial-trace', el)"
        article-class="trace-ops-panel"
        :expanded="workbenchDeskExpanded('financialTrace')"
        :title="preferencesStore.language === 'en-US' ? 'Financial Trace Desk' : '财务追溯台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Keep ERPNext-style source continuity and Monica-style finance memory visible from one cockpit before settlement and rollback widen.'
          : '在结算和回退继续扩大前，把 ERPNext 式来源连续性和 Monica 式财务记忆收进同一块驾驶舱。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Financial trace desk stays collapsed until operators need source continuity, top-risk trace packets, or evidence bundle exports.'
          : '财务追溯台默认收起，只有需要查看来源连续性、最高风险追溯包或证据包导出时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('financialTrace')"
      >
        <template #actions>
          <el-button size="small" @click="openFinancialTraceDesk">
            {{ preferencesStore.language === 'en-US' ? 'Open Traceability' : '打开追溯区' }}
          </el-button>
          <el-button
            size="small"
            :loading="tracePacketBusy"
            :disabled="!supportsBackendFinancialTrace || !topBackendTraceRecord"
            @click="copyTopFinancialTracePacket"
          >
            {{ preferencesStore.language === 'en-US' ? 'Copy Top Trace' : '复制最高追溯包' }}
          </el-button>
          <el-button
            size="small"
            :loading="tracePacketBusy"
            :disabled="!supportsBackendFinancialTrace || !topBackendTraceRecord"
            @click="exportTopFinancialTracePacket"
          >
            {{ preferencesStore.language === 'en-US' ? 'Export Top Trace' : '导出最高追溯包' }}
          </el-button>
          <el-button
            size="small"
            :loading="tracePacketBusy"
            :disabled="!supportsBackendFinancialTrace || !moduleFinancialTraceCockpit?.records?.length"
            @click="copyModuleTraceBundle"
          >
            {{ preferencesStore.language === 'en-US' ? 'Copy Trace Bundle' : '复制追溯证据包' }}
          </el-button>
          <el-button
            size="small"
            :loading="tracePacketBusy"
            :disabled="!supportsBackendFinancialTrace || !moduleFinancialTraceCockpit?.records?.length"
            @click="exportModuleTraceBundle"
          >
            {{ preferencesStore.language === 'en-US' ? 'Export Trace Bundle' : '导出追溯证据包' }}
          </el-button>
          <el-button size="small" @click="exportModuleExceptionPacket">
            {{ preferencesStore.language === 'en-US' ? 'Export Exception Packet' : '导出异常包' }}
          </el-button>
          <el-button size="small" type="primary" @click="openCutoverSettings">
            {{ preferencesStore.language === 'en-US' ? 'Open Cutover' : '打开切换设置' }}
          </el-button>
        </template>
        <div class="ops-metrics">
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Trace Status' : '追溯状态' }}</span>
            <strong>{{ moduleFinancialTraceState.statusLabel }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Shared finance trace readiness across source, journal, and evidence continuity.' : '来源、凭证和证据连续性的共享财务追溯就绪度。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Ready Checks' : '已就绪检查项' }}</span>
            <strong>{{ moduleFinancialTraceState.readyCount }}/{{ moduleFinancialTraceState.expectedCount }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Checks already closed without open reminder pressure.' : '当前没有开放提醒压力、已经闭合的检查项数量。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Blocked / Pending' : '阻塞 / 待推进' }}</span>
            <strong>{{ moduleFinancialTraceState.missingCount + moduleFinancialTraceState.warningCount }}</strong>
            <p>
              {{
                [
                  moduleFinancialTraceState.missingLabels.length
                    ? `${preferencesStore.language === 'en-US' ? 'Missing' : '缺失'}: ${moduleFinancialTraceState.missingLabels.join(' / ')}`
                    : null,
                  moduleFinancialTraceState.warningLabels.length
                    ? `${preferencesStore.language === 'en-US' ? 'Pending' : '待推进'}: ${moduleFinancialTraceState.warningLabels.join(' / ')}`
                    : null,
                ].filter(Boolean).join(' · ')
                  || (preferencesStore.language === 'en-US' ? 'No open financial trace gap.' : '当前没有开放中的财务追溯缺口。')
              }}
            </p>
          </article>
        </div>
        <div class="guardrail-preset-list trace-preset-list">
          <article
            v-for="item in moduleFinancialTraceSummary.items"
            :key="item.key"
            :class="['guardrail-preset-card', 'trace-preset-card', `tone-${item.status}`]"
          >
            <div class="guardrail-preset-head">
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ preferencesStore.language === 'en-US'
                  ? (item.status === 'ready' ? 'Ready' : item.status === 'warning' ? 'Pending' : 'Blocked')
                  : (item.status === 'ready' ? '已就绪' : item.status === 'warning' ? '待推进' : '阻塞') }}</span>
              </div>
              <span class="guardrail-remark">{{ item.familyKey }}</span>
            </div>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </CollapsibleWorkbenchDesk>

      <CollapsibleWorkbenchDesk
        :ref="(el) => registerWorkbenchSection('ops-rollback', el)"
        article-class="rollback-ops-panel"
        :expanded="workbenchDeskExpanded('rollback')"
        :title="preferencesStore.language === 'en-US' ? 'Rollback Drill Desk' : '回退演练台'"
        :description="preferencesStore.language === 'en-US'
          ? 'Package rollback evidence, operator contacts, and required uploads at the module level before the pilot scope widens.'
          : '在扩大试点范围前，先把模块级回退证据、联系人和必备上传项打包。'"
        :collapsed-message="preferencesStore.language === 'en-US'
          ? 'Rollback drill desk stays collapsed until the pilot needs a rollback packet, contact check, or controlled rollback action.'
          : '回退演练台默认收起，只有试点需要导出演练包、核对联系人或执行受控回退时再展开。'"
        :expand-label="preferencesStore.language === 'en-US' ? 'Expand Desk' : '展开台面'"
        :collapse-label="preferencesStore.language === 'en-US' ? 'Collapse Desk' : '收起台面'"
        @toggle="toggleWorkbenchDesk('rollback')"
      >
        <template #actions>
          <el-button size="small" @click="copyModuleRollbackDrill">
            {{ preferencesStore.language === 'en-US' ? 'Copy Drill Packet' : '复制演练包' }}
          </el-button>
          <el-button size="small" @click="exportModuleRollbackDrill">
            {{ preferencesStore.language === 'en-US' ? 'Export Drill Packet' : '导出演练包' }}
          </el-button>
          <el-button v-if="moduleEnabled" size="small" type="danger" @click="rollbackCurrentModule">
            {{ preferencesStore.language === 'en-US' ? 'Rollback Module Now' : '立即回退模块' }}
          </el-button>
        </template>
        <div class="ops-metrics">
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Required Evidence' : '必备证据' }}</span>
            <strong>{{ evidenceExpectation.requiredCount }}</strong>
            <p>{{ evidenceExpectation.requiredLabels.join(' / ') || '-' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Recommended Upload' : '推荐上传' }}</span>
            <strong>{{ evidenceExpectation.recommendedLabel }}</strong>
            <p>{{ evidenceExpectation.timelineHint }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Gate Pressure' : '门槛压力' }}</span>
            <strong>{{ chainGateRows.map((row) => `${row.readyCount}/6`).join(' · ') || '-' }}</strong>
            <p>{{ preferencesStore.language === 'en-US' ? 'Rollback drills should cover every attached pilot chain before widening module traffic.' : '在扩大模块流量前，演练应覆盖所有关联试点链路。' }}</p>
          </article>
          <article class="ops-card">
            <span>{{ preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环就绪' }}</span>
            <strong>{{ moduleClosedLoopSummary.label }}</strong>
            <p>
              {{
                moduleClosedLoopSummary.missingLabels.length || moduleClosedLoopSummary.staleLabels.length
                  ? [
                      moduleClosedLoopSummary.missingLabels.length
                        ? `${preferencesStore.language === 'en-US' ? 'Missing' : '缺少'}: ${moduleClosedLoopSummary.missingLabels.join(' / ')}`
                        : null,
                      moduleClosedLoopSummary.staleLabels.length
                        ? `${preferencesStore.language === 'en-US' ? 'Stale' : '过期'}: ${moduleClosedLoopSummary.staleLabels.join(' / ')}`
                        : null,
                    ].filter(Boolean).join(' · ')
                  : (preferencesStore.language === 'en-US' ? 'Every attached pilot chain already has drill, sign-off, and exception evidence.' : '当前关联试点链已经具备演练、签收和异常证据。')
              }}
            </p>
          </article>
        </div>
      </CollapsibleWorkbenchDesk>
    </section>

    <section v-if="hasParentContext" class="erp-card context-banner">
      <div class="context-copy">
        <span class="context-kicker">{{ t('app.childWorkspaceTitle') }}</span>
        <strong>{{ parentModuleTitle }}</strong>
        <p>{{ t('app.childWorkspaceContextReady') }}</p>
        <span class="context-pill">
          {{ t('app.parentRecordContext') }}: {{ parentContextLabel }}
        </span>
      </div>
      <div class="context-actions">
        <el-button size="small" @click="openParentModule">{{ t('app.openParentModule') }}</el-button>
        <el-button type="primary" size="small" @click="openParentRecord">{{ t('app.openParentRecord') }}</el-button>
      </div>
    </section>

    <section class="overview-grid">
      <article class="hero-panel erp-card">
        <div class="hero-copy">
          <div class="hero-group">{{ groupLabel(config.group) }}</div>
          <h2>{{ pageTitle }}</h2>
          <p class="erp-muted">{{ pageDescription }}</p>
        </div>
        <div v-if="highlights.length" class="highlight-grid">
          <div v-for="item in highlights" :key="item.label" class="highlight-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </article>

      <article class="focus-panel erp-card">
        <div class="panel-title">{{ t('moduleWorkbench.focusTitle') }}</div>
        <div v-if="focusItems.length" class="focus-list">
          <div v-for="item in focusItems" :key="item.label" class="focus-item">
            <strong>{{ item.label }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
        <p v-else class="erp-muted">{{ t('moduleWorkbench.focusFallback') }}</p>
        <div v-if="note" class="panel-note">{{ note }}</div>
      </article>
    </section>

    <section v-if="firstWavePlaybook" class="stage-overview-grid">
      <article class="erp-card stage-overview-panel">
        <div class="panel-title">{{ preferencesStore.language === 'en-US' ? 'First-Wave Chain Map' : '首批主线地图' }}</div>
        <p class="erp-muted stage-overview-desc">{{ firstWavePlaybook.description }}</p>
        <div class="stage-overview-list">
          <div
            v-for="item in firstWavePlaybook.stages"
            :key="item.key"
            :class="['stage-overview-item', `tone-${item.tone}`]"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </article>

      <article class="erp-card stage-overview-panel">
        <div class="panel-title">{{ preferencesStore.language === 'en-US' ? 'Gate Notes' : '门禁说明' }}</div>
        <div class="stage-overview-list gate-note-list">
          <div v-for="item in firstWavePlaybook.gates" :key="item.key" class="gate-note-item">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </article>
    </section>

    <section v-if="actionItems.length" class="erp-card action-panel">
      <div class="action-header">
        <h3>{{ t('moduleWorkbench.actionTitle') }}</h3>
        <p class="erp-muted">{{ t('moduleWorkbench.actionDesc') }}</p>
      </div>
      <div class="action-grid">
        <article v-for="item in actionItems" :key="item.label" class="action-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section v-if="isFirstWaveModule && executionActionRows.length" class="erp-card execution-panel">
      <div class="action-header">
        <h3>{{ preferencesStore.language === 'en-US' ? 'Cutover Execution Desk' : '切换执行台' }}</h3>
        <p class="erp-muted">
          {{ preferencesStore.language === 'en-US'
            ? 'Turn gate pressure, closed-loop gaps, reminders, and guardrails into the next executable move on the same workbench.'
            : '把门槛压力、闭环缺口、提醒和 guardrail 转成同一工作台里的下一步执行动作。' }}
        </p>
      </div>
      <div class="execution-summary-grid">
        <article class="execution-summary-card tone-danger">
          <span>{{ preferencesStore.language === 'en-US' ? 'Critical Moves' : '关键动作' }}</span>
          <strong>{{ executionSummary.danger }}</strong>
          <p>{{ preferencesStore.language === 'en-US' ? 'These actions should be handled before real pilot traffic widens.' : '这些动作应在扩大真实试点流量前优先处理。' }}</p>
        </article>
        <article class="execution-summary-card tone-warning">
          <span>{{ preferencesStore.language === 'en-US' ? 'Review Moves' : '待核对动作' }}</span>
          <strong>{{ executionSummary.warning }}</strong>
          <p>{{ preferencesStore.language === 'en-US' ? 'These actions close remaining gate or evidence gaps.' : '这些动作用于补齐剩余的门槛或证据缺口。' }}</p>
        </article>
        <article class="execution-summary-card tone-success">
          <span>{{ preferencesStore.language === 'en-US' ? 'Freeze Moves' : '冻结动作' }}</span>
          <strong>{{ executionSummary.success }}</strong>
          <p>{{ preferencesStore.language === 'en-US' ? 'These actions export the current stable state into reusable packets.' : '这些动作会把当前稳定状态冻结成可复用的交接包。' }}</p>
        </article>
      </div>
      <div class="execution-grid">
        <article
          v-for="item in visibleExecutionActionRows"
          :key="item.key"
          :class="['execution-card', `tone-${item.tone}`]"
        >
          <div class="execution-card-head">
            <div>
              <span>{{ item.title }}</span>
              <strong>{{ item.meta }}</strong>
            </div>
            <el-tag size="small" effect="plain" :type="item.tone">
              {{ item.tone }}
            </el-tag>
          </div>
          <p>{{ item.description }}</p>
          <div class="execution-actions">
            <el-button :type="item.buttonType ?? 'primary'" size="small" @click="runExecutionAction(item)">
              {{ item.buttonLabel }}
            </el-button>
          </div>
        </article>
      </div>
      <p v-if="hiddenExecutionActionCount" class="workbench-compact-hint">
        {{ preferencesStore.language === 'en-US'
          ? `Showing the highest-priority ${visibleExecutionActionRows.length} execution moves first. ${hiddenExecutionActionCount} lower-priority moves remain available as the module stabilizes.`
          : `当前先展示优先级最高的 ${visibleExecutionActionRows.length} 个执行动作，另外还有 ${hiddenExecutionActionCount} 个低优先级动作会在模块进一步稳定后继续保留可用。` }}
      </p>
    </section>

    <section v-if="cockpitShortcutItems.length" class="erp-card shortcut-panel">
      <div class="action-header">
        <h3>{{ preferencesStore.language === 'en-US' ? 'Module Fast Lane' : '模块快车道' }}</h3>
        <p class="erp-muted">
          {{ preferencesStore.language === 'en-US'
            ? 'Keep the most important module-specific desks, exports, and evidence moves one click away on the same first-wave cockpit.'
            : '把最重要的模块专属入口、导出动作和证据操作固定在同一块首批驾驶舱里，一键可达。' }}
        </p>
      </div>
      <div class="shortcut-grid">
        <article
          v-for="item in visibleWorkbenchShortcutItems"
          :key="item.key"
          :class="['shortcut-card', item.tone ? `tone-${item.tone}` : 'tone-default']"
        >
          <div class="shortcut-card-head">
            <div>
              <span>{{ item.title }}</span>
              <strong>{{ item.meta || '-' }}</strong>
            </div>
            <el-tag
              size="small"
              effect="plain"
              :type="item.buttonType === 'default' ? 'info' : (item.buttonType || 'info')"
            >
              {{ item.tone || 'default' }}
            </el-tag>
          </div>
          <p>{{ item.description }}</p>
          <div class="execution-actions">
            <el-button :type="item.buttonType ?? 'primary'" size="small" @click="runCockpitShortcut(item)">
              {{ item.buttonLabel }}
            </el-button>
          </div>
        </article>
      </div>
      <p v-if="hiddenWorkbenchShortcutCount" class="workbench-compact-hint">
        {{ preferencesStore.language === 'en-US'
          ? `Focused on the top ${visibleWorkbenchShortcutItems.length} module fast-lane entries. ${hiddenWorkbenchShortcutCount} extra tools still remain reachable from the same workbench.`
          : `当前只默认展示最关键的 ${visibleWorkbenchShortcutItems.length} 个模块快车道入口，另外还有 ${hiddenWorkbenchShortcutCount} 个工具仍保留在同一工作台中。` }}
      </p>
    </section>

    <section v-if="quickLinkItems.length || readinessItems.length" class="launchpad-grid">
      <article v-if="quickLinkItems.length" class="erp-card launchpad-panel">
        <div class="launchpad-title">
          {{ preferencesStore.language === 'en-US' ? 'Pilot Launchpad' : '试点启动台' }}
        </div>
        <div class="launchpad-list">
          <div v-for="item in quickLinkItems" :key="`${item.routeName}:${item.label}`" class="launchpad-item">
            <div class="launchpad-copy">
              <strong>{{ item.label }}</strong>
              <p>{{ item.description }}</p>
            </div>
            <el-button :type="item.buttonType ?? 'default'" size="small" @click="openQuickLink(item)">
              {{ preferencesStore.language === 'en-US' ? 'Open' : '打开' }}
            </el-button>
          </div>
        </div>
      </article>

      <article v-if="readinessItems.length" class="erp-card readiness-panel">
        <div class="launchpad-title">
          {{ preferencesStore.language === 'en-US' ? 'Pilot Readiness' : '试点准备度' }}
        </div>
        <div class="readiness-list">
          <div
            v-for="item in readinessItems"
            :key="item.label"
            class="readiness-item"
            :class="item.tone ?? 'neutral'"
          >
            <div class="readiness-header">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </article>
    </section>

    <section v-if="pilotGuideItems.length || rollbackItems.length" class="guide-grid">
      <article v-if="pilotGuideItems.length" class="erp-card guide-panel">
        <div class="guide-title">
          {{ preferencesStore.language === 'en-US' ? 'Pilot Operating Guide' : '试点操作手册' }}
        </div>
        <div class="guide-list">
          <div v-for="item in pilotGuideItems" :key="item.title" class="guide-item">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </article>

      <article v-if="rollbackItems.length" class="erp-card guide-panel rollback-panel">
        <div class="guide-title">
          {{ preferencesStore.language === 'en-US' ? 'Rollback Checklist' : '回退步骤清单' }}
        </div>
        <div class="guide-list">
          <div v-for="item in rollbackItems" :key="item.title" class="guide-item">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </article>
    </section>

    <slot name="workspace" />

    <EntityTableView v-if="!hasWorkspaceSlot" :module-key="moduleKey" :config="config" />
  </div>
</template>

<style scoped>
.workbench-shell {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cutover-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 22px;
  background:
    linear-gradient(135deg, rgba(35, 128, 99, 0.1), rgba(15, 118, 110, 0.05)),
    var(--app-panel);
}

.cutover-banner.disabled {
  background:
    linear-gradient(135deg, rgba(148, 163, 184, 0.12), rgba(100, 116, 139, 0.06)),
    var(--app-panel);
}

.cutover-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cutover-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--app-primary);
  text-transform: uppercase;
}

.cutover-copy strong {
  font-size: 18px;
}

.cutover-copy p {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.cutover-pill {
  display: inline-flex;
  width: fit-content;
  min-height: 30px;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(35, 128, 99, 0.12);
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.cutover-contact-list {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cutover-contact-pill {
  border: none;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--app-muted-bg);
  color: var(--app-text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.cutover-contact-pill:hover {
  color: var(--app-primary);
}

.cutover-contact-pill.gate-pill {
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  color: var(--app-primary);
}

.cutover-stage-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.cutover-stage-card {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.cutover-stage-card span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 11px;
}

.cutover-stage-card strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 14px;
}

.cutover-stage-card p {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.cutover-stage-card.tone-success,
.stage-overview-item.tone-success {
  background: color-mix(in srgb, var(--app-primary) 7%, var(--app-panel));
}

.cutover-stage-card.tone-warning,
.stage-overview-item.tone-warning {
  background: color-mix(in srgb, #f97316 7%, var(--app-panel));
}

.cutover-stage-card.tone-danger,
.stage-overview-item.tone-danger {
  background: color-mix(in srgb, #ef4444 7%, var(--app-panel));
}

.context-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 22px;
  background:
    linear-gradient(135deg, rgba(40, 167, 156, 0.08), rgba(21, 94, 99, 0.05)),
    var(--app-panel);
}

.context-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.context-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--app-primary);
  text-transform: uppercase;
}

.context-copy strong {
  font-size: 18px;
}

.context-copy p {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.context-pill {
  display: inline-flex;
  width: fit-content;
  min-height: 30px;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(40, 167, 156, 0.12);
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.context-actions {
  display: flex;
  gap: 10px;
}

.cutover-actions {
  display: flex;
  gap: 10px;
}

.ops-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.ops-panel {
  padding: 20px 22px;
}

.ops-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.ops-title {
  font-size: 16px;
  font-weight: 800;
}

.ops-desc {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.ops-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.ops-metrics {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.ops-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.ops-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ops-card-head span {
  color: var(--app-text-secondary);
  font-size: 12px;
}

.ops-card-head strong {
  margin-top: 0;
  color: var(--app-text);
  font-size: 18px;
}

.ops-card span {
  display: block;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.ops-card strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
}

.ops-card p {
  margin: 10px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.close-summary-card.tone-success {
  background: color-mix(in srgb, var(--app-primary) 7%, var(--app-panel));
}

.close-summary-card.tone-warning {
  background: color-mix(in srgb, #f97316 7%, var(--app-panel));
}

.close-summary-card.tone-danger {
  background: color-mix(in srgb, #ef4444 7%, var(--app-panel));
}

.ops-card-summary {
  margin-top: 10px;
}

.ops-card-note {
  padding-top: 10px;
  border-top: 1px solid var(--app-border);
}

.ops-card-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ops-gate-chip-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ops-gate-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
  font-size: 11px;
  font-weight: 700;
}

.ops-gate-chip.ready {
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
}

.ops-empty {
  margin-top: 16px;
  color: var(--app-text-secondary);
  font-size: 13px;
}

.guardrail-preset-list {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.guardrail-preset-card {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-primary) 4%, var(--app-panel));
}

.guardrail-preset-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.guardrail-preset-head strong {
  display: block;
  color: var(--app-text);
  font-size: 14px;
}

.guardrail-preset-head span {
  display: block;
  margin-top: 6px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.guardrail-remark {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.guardrail-preset-card p {
  margin: 10px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.guardrail-preset-actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.evidence-preset-card.recommended {
  border-color: color-mix(in srgb, #f97316 35%, var(--app-border));
  background: color-mix(in srgb, #f97316 6%, var(--app-panel));
}

.trace-preset-card.tone-ready {
  border-color: color-mix(in srgb, #10b981 30%, var(--app-border));
  background: color-mix(in srgb, #10b981 7%, var(--app-panel));
}

.trace-preset-card.tone-warning {
  border-color: color-mix(in srgb, #f59e0b 30%, var(--app-border));
  background: color-mix(in srgb, #f59e0b 7%, var(--app-panel));
}

.trace-preset-card.tone-missing {
  border-color: color-mix(in srgb, #ef4444 30%, var(--app-border));
  background: color-mix(in srgb, #ef4444 7%, var(--app-panel));
}

.stage-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
  gap: 18px;
}

.stage-overview-panel {
  padding: 22px;
}

.stage-overview-desc {
  margin-top: 8px;
}

.stage-overview-list {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.stage-overview-item,
.gate-note-item {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.stage-overview-item span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.stage-overview-item strong,
.gate-note-item strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 14px;
}

.stage-overview-item p,
.gate-note-item p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.gate-note-list {
  grid-template-columns: 1fr;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 18px;
}

.hero-panel,
.focus-panel {
  padding: 22px;
}

.hero-panel {
  background:
    radial-gradient(circle at top left, rgba(40, 167, 156, 0.14), transparent 45%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(244, 250, 249, 0.96));
}

.hero-copy h2 {
  margin: 10px 0 8px;
  font-size: 28px;
  line-height: 1.1;
}

.hero-group {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(40, 167, 156, 0.12);
  color: var(--erp-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.highlight-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.highlight-card {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(40, 167, 156, 0.08);
}

.highlight-card span {
  display: block;
  color: var(--erp-muted);
  font-size: 12px;
}

.highlight-card strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  line-height: 1.1;
}

.highlight-card p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--erp-muted);
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
}

.focus-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.focus-item {
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--erp-primary-soft);
}

.focus-item strong {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
}

.focus-item p,
.panel-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--erp-muted);
}

.panel-note {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--erp-line);
}

.action-panel {
  padding: 22px;
}

.execution-panel {
  padding: 22px;
}

.execution-summary-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.execution-summary-card {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.execution-summary-card span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.execution-summary-card strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 24px;
}

.execution-summary-card p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.execution-summary-card.tone-danger {
  background: color-mix(in srgb, #ef4444 7%, var(--app-panel));
}

.execution-summary-card.tone-warning {
  background: color-mix(in srgb, #f97316 7%, var(--app-panel));
}

.execution-summary-card.tone-success {
  background: color-mix(in srgb, var(--app-primary) 7%, var(--app-panel));
}

.execution-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.workbench-compact-hint {
  margin: 14px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.execution-card {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.execution-card.tone-danger {
  background: color-mix(in srgb, #ef4444 5%, var(--app-panel));
}

.execution-card.tone-warning {
  background: color-mix(in srgb, #f97316 5%, var(--app-panel));
}

.execution-card.tone-success {
  background: color-mix(in srgb, var(--app-primary) 5%, var(--app-panel));
}

.execution-card.tone-info {
  background: color-mix(in srgb, #2563eb 4%, var(--app-panel));
}

.execution-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.execution-card-head span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.execution-card-head strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 16px;
  line-height: 1.45;
}

.execution-card p {
  margin: 12px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.execution-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.shortcut-panel {
  padding: 22px;
}

.shortcut-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.shortcut-card {
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.shortcut-card.tone-default {
  background: color-mix(in srgb, var(--app-primary) 3%, var(--app-panel));
}

.shortcut-card.tone-danger {
  background: color-mix(in srgb, #ef4444 5%, var(--app-panel));
}

.shortcut-card.tone-warning {
  background: color-mix(in srgb, #f97316 5%, var(--app-panel));
}

.shortcut-card.tone-success {
  background: color-mix(in srgb, var(--app-primary) 5%, var(--app-panel));
}

.shortcut-card.tone-info {
  background: color-mix(in srgb, #2563eb 4%, var(--app-panel));
}

.shortcut-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.shortcut-card-head span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.shortcut-card-head strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 15px;
  line-height: 1.45;
}

.shortcut-card p {
  margin: 12px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.launchpad-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.launchpad-panel,
.readiness-panel {
  padding: 22px;
}

.launchpad-title {
  font-size: 16px;
  font-weight: 700;
}

.launchpad-list,
.readiness-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.launchpad-item,
.readiness-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
}

.launchpad-copy {
  min-width: 0;
}

.launchpad-copy strong {
  display: block;
  color: var(--app-text);
  font-size: 14px;
}

.launchpad-copy p,
.readiness-item p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.readiness-item {
  flex-direction: column;
  align-items: stretch;
}

.readiness-item.success {
  background: color-mix(in srgb, var(--app-primary) 7%, var(--app-panel));
}

.readiness-item.warning {
  background: color-mix(in srgb, #f97316 7%, var(--app-panel));
}

.readiness-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.readiness-header span {
  color: var(--app-text-secondary);
  font-size: 12px;
}

.readiness-header strong {
  color: var(--app-text);
  font-size: 16px;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.guide-panel {
  padding: 22px;
}

.guide-title {
  font-size: 16px;
  font-weight: 700;
}

.guide-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-item {
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
}

.rollback-panel .guide-item {
  background: color-mix(in srgb, #f97316 4%, var(--app-panel));
}

.guide-item strong {
  display: block;
  color: var(--app-text);
  font-size: 14px;
}

.guide-item p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--app-text-secondary);
}

.action-header h3 {
  margin: 0;
  font-size: 18px;
}

.action-header p {
  margin: 6px 0 0;
}

.action-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.action-card {
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(21, 94, 99, 0.07), rgba(40, 167, 156, 0.1));
  border: 1px solid rgba(21, 94, 99, 0.08);
}

.action-card span {
  display: block;
  color: var(--erp-muted);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.action-card strong {
  display: block;
  margin-top: 8px;
  font-size: 18px;
}

.action-card p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--erp-muted);
}

@media (max-width: 1080px) {
  .ops-grid,
  .overview-grid,
  .stage-overview-grid {
    grid-template-columns: 1fr;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }

  .execution-summary-grid,
  .execution-grid,
  .shortcut-grid {
    grid-template-columns: 1fr;
  }

  .guide-grid {
    grid-template-columns: 1fr;
  }

  .launchpad-grid {
    grid-template-columns: 1fr;
  }

  .context-banner {
    flex-direction: column;
    align-items: stretch;
  }

  .cutover-banner {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 720px) {
  .highlight-grid {
    grid-template-columns: 1fr;
  }

  .context-actions {
    flex-direction: column;
  }

  .cutover-actions {
    flex-direction: column;
  }

  .cutover-stage-grid,
  .stage-overview-list {
    grid-template-columns: 1fr;
  }

  .ops-actions {
    justify-content: stretch;
    flex-direction: column;
  }

  .guardrail-preset-head {
    flex-direction: column;
  }

  .launchpad-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
