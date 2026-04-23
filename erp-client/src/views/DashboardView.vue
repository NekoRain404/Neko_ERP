<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import CompactNoticeBar from '@/components/CompactNoticeBar.vue'
import SummaryCardGrid from '@/components/SummaryCardGrid.vue'
import { fetchFinancialTraceCockpit, fetchFinancialTraceDetail, type FinancialTraceCockpit } from '@/api/financial-trace'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import { visibleModuleManifests, type ModuleKey } from '@/config/module-manifest'
import { findSidebarSectionByModuleKey, sidebarSections } from '@/config/sidebar-schema'
import { useAuthStore } from '@/stores/auth'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import { useCutoverRemoteStore } from '@/stores/cutover-remote'
import { useCutoverStore } from '@/stores/cutover'
import { useCommandCenterStore } from '@/stores/command-center'
import { usePilotReviewStore } from '@/stores/pilot-review'
import { usePreferencesStore } from '@/stores/preferences'
import { useI18n } from '@/i18n'
import {
  buildCutoverConfigSnapshot,
  resolveDefaultChainGateState,
  resolveChainRouteName,
  resolveCutoverSettingsQuery,
  resolveDefaultChainContacts,
} from '@/utils/cutover'
import { buildAggregateClosedLoopSummary, buildCutoverCloseSummary } from '@/utils/cutover-close'
import {
  buildChainCloseChecklist,
  buildCloseRecentActivityLines,
  buildCloseRoleSnapshot,
  buildModuleCloseChecklist,
  countPaymentLinkageIssues,
  summarizeCloseChecklist,
} from '@/utils/cutover-close-cockpit'
import {
  buildPaymentLinkageGovernanceSummary,
  buildQuantImpactGovernanceSummary,
} from '@/utils/cutover-governance'
import {
  buildChainFinanceCockpitSummary,
  buildModuleFinanceCockpitSummary,
} from '@/utils/cutover-finance-cockpit'
import {
  buildFinanceCloseBatchPacket,
  buildRoleDeskQueuePacket,
  buildRoleDeskSummary,
} from '@/utils/cutover-role-desk'
import {
  buildPilotConfirmationTemplate,
  buildSharedAcceptancePacket,
  buildSharedChainContactMatrix,
  buildSharedCutoverBlockerPacket,
  buildSharedCutoverControlPacket,
  buildSharedFirstWaveRehearsalPack,
  buildSharedPendingGateMatrix,
  buildSharedPilotUserManualPack,
  type CutoverContactMatrixRow,
  type CutoverPacketChain,
  type CutoverPacketModule,
  type CutoverPendingGateRow,
} from '@/utils/cutover-packets'
import { downloadCsv, downloadText } from '@/utils/export'
import {
  buildFirstWaveGateChecklist,
  buildFirstWaveModuleStageCards,
  summarizeFirstWaveGateState,
} from '@/utils/first-wave-playbook'
import { buildModuleEvidenceExpectation } from '@/utils/first-wave-evidence'
import { buildModuleFinancialTraceSummary } from '@/utils/financial-trace'
import { buildChainSettlementSummary, buildModuleSettlementSummary } from '@/utils/first-wave-settlement'
import {
  buildChainCutoverFinancialTraceState,
  buildCutoverFinancialTraceState,
  supportsCutoverFinancialTraceModule,
  type CutoverFinancialTraceState,
} from '@/utils/cutover-financial-trace'
import { formatDateTime } from '@/utils/format'
import { listSysScriptPresets } from '@/utils/sys-script-presets'
import {
  buildReminderFamilyBadges,
  buildReminderFamilyBlockers,
  compareReminderSeverity,
  pickTopReminder,
  resolveReminderSection,
  summarizeReminderFamilies,
} from '@/utils/reminders'
import {
  buildCutoverContactRows,
  buildCutoverControlModules,
  buildCutoverPacketChains,
  buildCutoverPacketModules,
  buildCutoverPendingGateRows,
} from '@/utils/cutover-control'
import { buildCutoverClosedLoopSummary } from '@/utils/cutover-ops'
import {
  buildFinancialTraceBundleFilename,
  buildFinancialTraceBundlePacket,
  buildFinancialTracePacketRefLabel,
} from '@/utils/financial-trace-packets'
import {
  buildSharedGuardrailRulesPacket,
  buildSharedRollbackDrillPacket,
} from '@/utils/cutover-protection'
import { buildModuleDetailRouteTarget, buildModuleRouteTarget } from '@/utils/module-navigation'
import type { SummaryCardItem } from '@/types/summary-cards'

const FinanceCloseBatchPanel = defineAsyncComponent(() => import('@/components/FinanceCloseBatchPanel.vue'))
const PilotBatchActionPanel = defineAsyncComponent(() => import('@/components/PilotBatchActionPanel.vue'))
const PilotReviewQueuePanel = defineAsyncComponent(() => import('@/components/PilotReviewQueuePanel.vue'))
const PilotRiskStatsPanel = defineAsyncComponent(() => import('@/components/PilotRiskStatsPanel.vue'))
const RoleDeskQueuePanel = defineAsyncComponent(() => import('@/components/RoleDeskQueuePanel.vue'))

const router = useRouter()
const authStore = useAuthStore()
const cutoverOpsStore = useCutoverOpsStore()
const cutoverRemoteStore = useCutoverRemoteStore()
const cutoverStore = useCutoverStore()
const commandCenterStore = useCommandCenterStore()
const pilotReviewStore = usePilotReviewStore()
const preferencesStore = usePreferencesStore()
const { moduleDescription, moduleTitle, t } = useI18n()
const pilotReminderItems = ref<ReminderRecord[]>([])
const pilotReminderLoading = ref(false)
const traceBundleBusy = ref(false)
const moduleFinancialTraceCockpitMap = ref<Partial<Record<ModuleKey, FinancialTraceCockpit>>>({})
const showDashboardActionLibrary = ref(false)
const showDashboardGovernanceDesks = ref(false)
const showDashboardModuleOps = ref(false)
const showAllDashboardChains = ref(false)
const compactDashboardChainLimit = 2
const pilotChains = computed(() => cutoverStore.chainRows)
const firstWaveModules = computed(() =>
  cutoverStore.firstWaveModules.map((moduleKey) => {
    const stageCards = buildFirstWaveModuleStageCards(moduleKey, preferencesStore.language === 'en-US')
    const evidence = buildModuleEvidenceExpectation(moduleKey, preferencesStore.language === 'en-US')
    const chains = cutoverStore.chainsForModule(moduleKey).map((chain) => {
      const gateState = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
      return {
        key: chain.key,
        label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
        summary: summarizeFirstWaveGateState(gateState, preferencesStore.language === 'en-US'),
      }
    })
    return {
      moduleKey,
      title: moduleTitle(moduleKey),
      enabled: cutoverStore.isModuleEnabled(moduleKey),
      route: visibleModuleManifests.find((item) => item.key === moduleKey)?.route,
      stageCards,
      chains,
      evidence,
      chainLabel: chains.map((chain) => chain.label).join(' / '),
      stageCount: stageCards.find((item) => item.key === 'stages')?.value ?? '-',
    }
  }),
)
const enabledPilotCount = computed(() => firstWaveModules.value.filter((item) => item.enabled).length)
const dashboardRemoteDirty = computed(() =>
  cutoverRemoteStore.isSnapshotDirty(buildDashboardCutoverConfigSnapshot()),
)
const dashboardRemoteStatus = computed(() => {
  if (cutoverRemoteStore.remoteLoading) {
    return preferencesStore.language === 'en-US' ? 'Loading server snapshot...' : '正在加载服务端快照...'
  }
  if (cutoverRemoteStore.remoteSaving) {
    return preferencesStore.language === 'en-US' ? 'Saving server snapshot...' : '正在保存服务端快照...'
  }
  if (dashboardRemoteDirty.value) {
    return preferencesStore.language === 'en-US'
      ? 'Dashboard cutover state differs from the shared server baseline. Save once the pilot scope is ready.'
      : '当前首页看到的切换状态与共享服务端基线不一致，确认试点范围后请保存。'
  }
  if (cutoverRemoteStore.remoteUpdatedAt) {
    const base = preferencesStore.language === 'en-US' ? 'Shared snapshot updated' : '共享快照最近更新于'
    const by = cutoverRemoteStore.remoteUpdatedBy
      ? `${preferencesStore.language === 'en-US' ? ' by ' : '，更新人：'}${cutoverRemoteStore.remoteUpdatedBy}`
      : ''
    return `${base} ${formatDateTime(cutoverRemoteStore.remoteUpdatedAt)}${by}`
  }
  return preferencesStore.language === 'en-US'
    ? 'No shared server snapshot yet. Save the pilot baseline when the current scope is ready.'
    : '服务端还没有共享切换快照，当前范围稳定后可先保存试点基线。'
})
const pilotLaunchpadItems = computed(() =>
  cutoverStore.firstWaveModules.map((moduleKey) => {
    const latest = commandCenterStore.latestRecordFor(moduleKey)
    return {
      moduleKey,
      title: moduleTitle(moduleKey),
      enabled: cutoverStore.isModuleEnabled(moduleKey),
      latest,
    }
  }),
)
const readinessItems = computed(() =>
  preferencesStore.language === 'en-US'
    ? [
        {
          label: 'Cutover Guards',
          value: 'Ready',
          description: 'First-wave module switches and rollback entry are already visible from settings, workbenches, and dashboard.',
        },
        {
          label: 'Shared Workbenches',
          value: 'Ready',
          description: 'Partner, sales, purchase, transfer, and invoice now share the same pilot shell, guide panels, and jump surfaces.',
        },
        {
          label: 'Recent Reopen',
          value: commandCenterStore.recentRecords.length ? 'Active' : 'Warm Up',
          description: 'Recent records can be reopened directly after Electron restarts, which reduces pilot context loss.',
        },
      ]
    : [
        {
          label: '切换守卫',
          value: '已就绪',
          description: '首批模块开关和回退入口已经在设置、工作台和首页同时可见。',
        },
        {
          label: '共享工作台',
          value: '已就绪',
          description: '伙伴、销售、采购、调拨、发票已经共用同一套试点壳、指引面板和跳转入口。',
        },
        {
          label: '最近对象重开',
          value: commandCenterStore.recentRecords.length ? '已激活' : '待预热',
          description: '最近记录可以在 Electron 重启后继续直接重开，减少试点上下文丢失。',
        },
      ],
)
const evidenceGuideRows = computed(() =>
  firstWaveModules.value.map((item) => ({
    moduleKey: item.moduleKey,
    title: item.title,
    requiredCount: item.evidence.requiredCount,
    requiredLabels: item.evidence.requiredLabels,
    recommendedLabel: item.evidence.recommendedLabel,
    timelineHint: item.evidence.timelineHint,
  })),
)
const evidenceTotals = computed(() => ({
  required: evidenceGuideRows.value.reduce((sum, item) => sum + item.requiredCount, 0),
  total: firstWaveModules.value.length,
}))

function buildFinancialTraceDetailQuery(state?: CutoverFinancialTraceState | null) {
  if (!state?.topRiskModuleKey || !state.topRiskRecordId) return null
  return buildModuleDetailRouteTarget({
    targetModuleKey: state.topRiskModuleKey,
    recordId: state.topRiskRecordId,
    section: 'traceability',
  })
}

function buildModuleFinancialTracePacketRefs(moduleKey: ModuleKey, state: CutoverFinancialTraceState) {
  if (!supportsCutoverFinancialTraceModule(moduleKey) || !state.topRiskRecordId) return []
  return [
    buildFinancialTracePacketRefLabel({
      english: preferencesStore.language === 'en-US',
      moduleKey,
      moduleLabel: moduleTitle(moduleKey),
      recordId: state.topRiskRecordId,
      recordRef: state.topRiskRecordRef,
      date: new Date().toISOString().slice(0, 10),
    }),
  ]
}

function buildChainFinancialTracePacketRefs(moduleKeys: ModuleKey[]) {
  return moduleKeys
    .flatMap((moduleKey) => buildModuleFinancialTracePacketRefs(moduleKey, resolveModuleFinancialTraceState(moduleKey)))
    .slice(0, 4)
}

function buildDashboardFinancialTraceState(
  moduleKey: ModuleKey,
  summary: ReturnType<typeof buildModuleFinancialTraceSummary>,
  cockpit?: FinancialTraceCockpit | null,
): CutoverFinancialTraceState {
  return buildCutoverFinancialTraceState({
    moduleKey,
    moduleLabel: moduleTitle(moduleKey),
    isEnglish: preferencesStore.language === 'en-US',
    summary,
    cockpit,
  })
}

const moduleFinancialTraceStateMap = computed(() => {
  const states: Partial<Record<ModuleKey, CutoverFinancialTraceState>> = {}
  firstWaveModules.value.forEach((item) => {
    const reminders = pilotReminderItems.value.filter(
      (reminder) => reminder.moduleKey === item.moduleKey && !pilotReviewStore.isHidden(reminder),
    )
    const summary = buildModuleFinancialTraceSummary({
      moduleKey: item.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
    })
    states[item.moduleKey] = buildDashboardFinancialTraceState(
      item.moduleKey,
      summary,
      moduleFinancialTraceCockpitMap.value[item.moduleKey] || null,
    )
  })
  return states
})

function resolveModuleFinancialTraceState(moduleKey: ModuleKey) {
  return moduleFinancialTraceStateMap.value[moduleKey] || buildDashboardFinancialTraceState(
    moduleKey,
    buildModuleFinancialTraceSummary({
      moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders: [],
    }),
    null,
  )
}

function buildChainFinancialTraceState(moduleKeys: ModuleKey[]): CutoverFinancialTraceState {
  return buildChainCutoverFinancialTraceState({
    isEnglish: preferencesStore.language === 'en-US',
    moduleStates: moduleKeys.map((moduleKey) => ({
      moduleKey,
      moduleLabel: moduleTitle(moduleKey),
      state: resolveModuleFinancialTraceState(moduleKey),
    })),
  })
}

function resolveSettlementTone(summary: {
  missingCount: number
  warningCount: number
}) {
  if (summary.missingCount) return 'danger'
  if (summary.warningCount) return 'warning'
  return 'success'
}

function describeSettlementSummary(summary: {
  statusLabel: string
  missingLabels: string[]
  warningLabels: string[]
}) {
  return [
    summary.statusLabel,
    summary.missingLabels.length
      ? `${preferencesStore.language === 'en-US' ? 'Missing' : '缺失'}: ${summary.missingLabels.join(' / ')}`
      : null,
    summary.warningLabels.length
      ? `${preferencesStore.language === 'en-US' ? 'Pending' : '待推进'}: ${summary.warningLabels.join(' / ')}`
      : null,
  ].filter(Boolean).join(' · ')
}

function resolveFinancialTraceTone(summary: {
  missingCount: number
  warningCount: number
}) {
  if (summary.missingCount) return 'danger'
  if (summary.warningCount) return 'warning'
  return 'success'
}

function describeFinancialTraceSummary(summary: {
  statusLabel: string
  missingLabels: string[]
  warningLabels: string[]
  topRiskRefs?: string[]
}) {
  return [
    summary.statusLabel,
    summary.missingLabels.length
      ? `${preferencesStore.language === 'en-US' ? 'Missing' : '缺失'}: ${summary.missingLabels.join(' / ')}`
      : null,
    summary.warningLabels.length
      ? `${preferencesStore.language === 'en-US' ? 'Pending' : '待推进'}: ${summary.warningLabels.join(' / ')}`
      : null,
    summary.topRiskRefs?.length
      ? `${preferencesStore.language === 'en-US' ? 'Records' : '关键记录'}: ${summary.topRiskRefs.join(' / ')}`
      : null,
  ].filter(Boolean).join(' · ')
}

function resolveFinanceCockpitTone(summary: {
  issueCount: number
}) {
  if (summary.issueCount > 2) return 'danger'
  if (summary.issueCount > 0) return 'warning'
  return 'success'
}

function describeFinanceCockpitSummary(summary: {
  label: string
  lines: string[]
}) {
  return [
    summary.label,
    summary.lines[1]?.replace(/^- /, ''),
    summary.lines[4]?.replace(/^- /, ''),
  ].filter(Boolean).join(' · ')
}

function resolveRoleDeskTone(summary: {
  issueCount: number
}) {
  if (summary.issueCount > 2) return 'danger'
  if (summary.issueCount > 0) return 'warning'
  return 'success'
}

function describeRoleDeskSummary(summary: {
  label: string
  lines: string[]
}) {
  return [
    summary.label,
    summary.lines[1]?.replace(/^- /, ''),
    summary.lines[4]?.replace(/^- /, ''),
  ].filter(Boolean).join(' · ')
}
const chainOwnerRows = computed(() =>
  pilotChains.value.map((chain) => {
    const gateState = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
    const gateSummary = summarizeFirstWaveGateState(gateState, preferencesStore.language === 'en-US')
    const reminders = pilotReminderItems.value.filter(
      (item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey) && !pilotReviewStore.isHidden(item),
    )
    const reminderFamilies = summarizeReminderFamilies(reminders)
    const latestDrill = cutoverOpsStore.latestRollbackDrill(chain.key)
    const latestSignoff = cutoverOpsStore.latestPilotSignoff(chain.key)
    const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', chain.key)
    const topRisk = pickTopReminder(reminders)
    const evidenceModules = chain.moduleKeys.map((moduleKey) => ({
      moduleKey,
      title: moduleTitle(moduleKey),
      expectation: buildModuleEvidenceExpectation(moduleKey, preferencesStore.language === 'en-US'),
    }))
    const settlementSummary = buildChainSettlementSummary({
      moduleKeys: chain.moduleKeys,
      isEnglish: preferencesStore.language === 'en-US',
      reminders: reminders.map((item) => ({
        moduleKey: item.moduleKey as ModuleKey,
        type: item.type,
        severity: item.severity,
      })),
    })
    const financialTraceSummary = buildChainFinancialTraceState(chain.moduleKeys)
    const topRiskLink = buildFinancialTraceDetailQuery(financialTraceSummary)
      || (topRisk?.recordId
        ? buildModuleDetailRouteTarget({
            targetModuleKey: topRisk.moduleKey as ModuleKey,
            recordId: topRisk.recordId,
            section: resolveReminderSection(topRisk),
            sourceModuleKey: resolveChainRouteName(chain.key),
            chainKey: chain.key,
          })
        : null)
    const closedLoopSummary = buildCutoverClosedLoopSummary({
      isEnglish: preferencesStore.language === 'en-US',
      latestDrill,
      latestSignoff,
      latestExceptionExport,
    })
    const blockerLabels = buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US')
    const closeRoleSnapshot = buildCloseRoleSnapshot({
      contacts: cutoverStore.chainContactFor(
        chain.key,
        resolveDefaultChainContacts(chain.key, preferencesStore.language === 'en-US'),
      ),
      isEnglish: preferencesStore.language === 'en-US',
      chainKey: chain.key,
    })
    const closeChecklist = buildChainCloseChecklist({
      chainKey: chain.key,
      isEnglish: preferencesStore.language === 'en-US',
      gatePendingCount: gateSummary.pendingLabels.length,
      settlementIssueCount: settlementSummary.missingCount + settlementSummary.warningCount,
      financialTraceIssueCount: financialTraceSummary.missingCount + financialTraceSummary.warningCount,
      closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
      paymentLinkageIssueCount: countPaymentLinkageIssues(reminders),
      blockerLabels,
    })
    const financeCockpitSummary = buildChainFinanceCockpitSummary({
      chainKey: chain.key,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels,
    })
    return {
      ...chain,
      routeName: resolveChainRouteName(chain.key),
      contacts: cutoverStore.chainContactFor(
        chain.key,
        resolveDefaultChainContacts(chain.key, preferencesStore.language === 'en-US'),
      ),
      gateState,
      gateSummary,
      gateChecklist: buildFirstWaveGateChecklist(gateState, preferencesStore.language === 'en-US'),
      readyCount: gateSummary.readyCount,
      pendingLabels: gateSummary.pendingLabels,
      reminders: reminders.length,
      reminderItems: reminders,
      critical: reminders.filter((item) => item.severity === 'critical').length,
      warning: reminders.filter((item) => item.severity === 'warning').length,
      topRisk,
      reminderFamilies,
      reminderBadges: buildReminderFamilyBadges(reminders, preferencesStore.language === 'en-US'),
      blockerLabels,
      financeCockpitSummary,
      roleDeskSummary: buildRoleDeskSummary({
        isEnglish: preferencesStore.language === 'en-US',
        roleSnapshot: closeRoleSnapshot,
        closeChecklist,
        closeLabel: gateSummary.label,
        financeCockpitSummary,
      }),
      evidenceModules,
      requiredEvidenceCount: evidenceModules.reduce((sum, item) => sum + item.expectation.requiredCount, 0),
      latestDrill,
      latestSignoff,
      latestExceptionExport,
      settlementSummary,
      financialTraceSummary,
      topRiskRouteName: topRiskLink?.name,
      topRiskQuery: topRiskLink?.query,
      topRiskLabel: financialTraceSummary.topRiskRefs[0] || (topRisk?.relatedRef ?? topRisk?.title ?? '-'),
      closedLoopSummary,
      closeRoleSnapshot,
      closeChecklist,
      closeActivityLines: buildCloseRecentActivityLines({
        isEnglish: preferencesStore.language === 'en-US',
        closeLabel: gateSummary.label,
        latestDrill,
        latestSignoff,
        latestExceptionExport,
        formatDateTime,
      }),
      closeSummary: buildCutoverCloseSummary({
        isEnglish: preferencesStore.language === 'en-US',
        gatePendingCount: gateSummary.pendingLabels.length,
        settlementSummary,
        financialTraceSummary,
        closedLoopSummary,
        paymentLinkageIssueCount: countPaymentLinkageIssues(reminders),
        blockerLabels,
      }),
    }
  }),
)
const pilotRiskRows = computed(() =>
  chainOwnerRows.value.map((chain) => ({
    key: chain.key,
    chainKey: chain.key,
    label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
    description: chain.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / '),
    moduleKeys: chain.moduleKeys,
    routeName: chain.key === 'sales' ? 'saleOrder' : chain.key === 'purchase' ? 'purchaseOrder' : 'resPartner',
    buttonLabel: preferencesStore.language === 'en-US' ? 'Open Chain' : '打开链路',
    topRiskRouteName: chain.topRiskRouteName,
    topRiskQuery: chain.topRiskQuery,
    topRiskLabel: chain.topRiskLabel,
  })),
)
const moduleOpsRows = computed(() =>
  firstWaveModules.value.map((item) => {
    const reminders = pilotReminderItems.value.filter(
      (reminder) => reminder.moduleKey === item.moduleKey && !pilotReviewStore.isHidden(reminder),
    )
    const topRisk = pickTopReminder(reminders)
    const chainContacts = cutoverStore.chainsForModule(item.moduleKey).map((chain) => ({
      key: chain.key,
      label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
      contacts: cutoverStore.chainContactFor(
        chain.key,
        resolveDefaultChainContacts(chain.key, preferencesStore.language === 'en-US'),
      ),
    }))
    const financialTraceSummary = resolveModuleFinancialTraceState(item.moduleKey)
    const relatedChains = chainOwnerRows.value.filter((chain) => chain.moduleKeys.includes(item.moduleKey))
    const closedLoopSummary = buildAggregateClosedLoopSummary({
      isEnglish: preferencesStore.language === 'en-US',
      summaries: relatedChains.map((chain) => chain.closedLoopSummary),
    })
    const settlementSummary = buildModuleSettlementSummary({
      moduleKey: item.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
    })
    const paymentLinkageSummary = buildPaymentLinkageGovernanceSummary({
      moduleKey: item.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
    })
    const quantImpactSummary = buildQuantImpactGovernanceSummary({
      moduleKey: item.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels: buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US'),
    })
    const financeCockpitSummary = buildModuleFinanceCockpitSummary({
      moduleKey: item.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels: buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US'),
    })
    const closeChecklist = buildModuleCloseChecklist({
      moduleKey: item.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      gatePendingCount: relatedChains.reduce((sum, chain) => sum + chain.pendingLabels.length, 0),
      settlementIssueCount: settlementSummary.missingCount + settlementSummary.warningCount,
      financialTraceIssueCount: financialTraceSummary.missingCount + financialTraceSummary.warningCount,
      closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
      paymentLinkageIssueCount: paymentLinkageSummary.issueCount,
      quantImpactIssueCount: quantImpactSummary.issueCount,
      blockerLabels: buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US'),
    })
    const primaryRoleSnapshot = relatedChains[0]?.closeRoleSnapshot || null
    const topRiskLink = buildFinancialTraceDetailQuery(financialTraceSummary)
      || (topRisk?.recordId
        ? buildModuleDetailRouteTarget({
            targetModuleKey: topRisk.moduleKey as ModuleKey,
            recordId: topRisk.recordId,
            section: resolveReminderSection(topRisk),
            sourceModuleKey: item.moduleKey,
          })
        : null)
    return {
      ...item,
      reminders: reminders.length,
      critical: reminders.filter((reminder) => reminder.severity === 'critical').length,
      warning: reminders.filter((reminder) => reminder.severity === 'warning').length,
      reminderFamilies: summarizeReminderFamilies(reminders),
      reminderBadges: buildReminderFamilyBadges(reminders, preferencesStore.language === 'en-US'),
      blockerLabels: buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US'),
      topRisk,
      topRiskRouteName: topRiskLink?.name,
      topRiskQuery: topRiskLink?.query,
      topRiskLabel: financialTraceSummary.topRiskRefs[0] || (topRisk?.relatedRef ?? topRisk?.title ?? '-'),
      chainContacts,
      closeRoleSnapshot: primaryRoleSnapshot,
      closeChecklist,
      closeChecklistLabel: summarizeCloseChecklist(
        closeChecklist,
        preferencesStore.language === 'en-US',
      ),
      closeActivityLines: buildCloseRecentActivityLines({
        isEnglish: preferencesStore.language === 'en-US',
        closeLabel: closedLoopSummary.label,
        latestDrill: relatedChains.map((chain) => chain.latestDrill).filter(Boolean).sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null,
        latestSignoff: relatedChains.map((chain) => chain.latestSignoff).filter(Boolean).sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null,
        latestExceptionExport: relatedChains.map((chain) => chain.latestExceptionExport).filter(Boolean).sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null,
        formatDateTime,
      }),
      gateSummaries: item.chains.map((chain) => chain.summary),
      evidence: item.evidence,
      financeCockpitSummary,
      roleDeskSummary: buildRoleDeskSummary({
        isEnglish: preferencesStore.language === 'en-US',
        roleSnapshot: primaryRoleSnapshot,
        closeChecklist,
        closeLabel: closedLoopSummary.label,
        financeCockpitSummary,
      }),
      settlementSummary,
      financialTraceSummary,
      closedLoopSummary,
      closeSummary: buildCutoverCloseSummary({
        isEnglish: preferencesStore.language === 'en-US',
        gatePendingCount: relatedChains.reduce((sum, chain) => sum + chain.pendingLabels.length, 0),
        settlementSummary,
        financialTraceSummary,
        closedLoopSummary,
        paymentLinkageIssueCount: paymentLinkageSummary.issueCount,
        quantImpactIssueCount: quantImpactSummary.issueCount,
        blockerLabels: buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US'),
      }),
    }
  }),
)
const snapshotModuleRows = computed(() =>
  firstWaveModules.value.map((row) => ({
    moduleKey: row.moduleKey,
    title: row.title,
    enabled: row.enabled,
    chains: cutoverStore
      .chainsForModule(row.moduleKey)
      .map((chain) => (preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel))
      .join(' / '),
    overridden: cutoverStore.moduleOverrides[row.moduleKey] !== undefined,
  })),
)
const dashboardGatePressureSummary = computed(() => ({
  readyChains: chainOwnerRows.value.filter((chain) => chain.closeSummary.ready).length,
  criticalChains: chainOwnerRows.value.filter((chain) => chain.critical > 0).length,
  warningChains: chainOwnerRows.value.filter((chain) => chain.warning > 0 || chain.blockerLabels.length > 0).length,
  pendingGates: chainOwnerRows.value.reduce((sum, chain) => sum + chain.pendingLabels.length, 0),
  openReminders: chainOwnerRows.value.reduce((sum, chain) => sum + chain.reminders, 0),
  totalChains: chainOwnerRows.value.length,
  financeScopedChains: chainOwnerRows.value.filter((chain) => chain.financeCockpitSummary.enabled).length,
  closedLoopChains: chainOwnerRows.value.filter((chain) => chain.closedLoopSummary.ready).length,
  settlementReadyChains: chainOwnerRows.value.filter((chain) => !chain.settlementSummary.missingCount && !chain.settlementSummary.warningCount).length,
  financialTraceReadyChains: chainOwnerRows.value.filter((chain) => !chain.financialTraceSummary.missingCount && !chain.financialTraceSummary.warningCount).length,
  financeReadyChains: chainOwnerRows.value.filter((chain) => chain.financeCockpitSummary.enabled && chain.financeCockpitSummary.issueCount === 0).length,
  roleReadyChains: chainOwnerRows.value.filter((chain) => chain.roleDeskSummary.issueCount === 0).length,
  closeReadyChains: chainOwnerRows.value.filter((chain) => chain.closeSummary.ready).length,
  closeBlockers: chainOwnerRows.value.reduce((sum, chain) => sum + chain.closeSummary.blockerCount, 0),
  overdueRoleTasks: Number(cutoverOpsStore.roleDeskSummary.slaCounts.overdue || 0),
  riskRoleTasks: Number(cutoverOpsStore.roleDeskSummary.slaCounts.risk || 0),
  financeResultPacks: cutoverOpsStore.financeResultPackSummary.totalCount,
  closeTasks: cutoverOpsStore.closeTaskSummary.totalCount,
  blockedCloseTasks: Number(cutoverOpsStore.closeTaskSummary.statusCounts.blocked || 0),
}))
// Split the landing metrics into "core cutover posture" and
// "governance objects" so the dashboard stops reading like one long wall.
const dashboardCoreMetrics = computed(() => [
  {
    key: 'enabled-modules',
    label: preferencesStore.language === 'en-US' ? 'Enabled Modules' : '已启用模块',
    value: `${enabledPilotCount.value}/${firstWaveModules.value.length}`,
    tone: 'default',
  },
  {
    key: 'pilot-chains',
    label: preferencesStore.language === 'en-US' ? 'Pilot Chains' : '试点链路',
    value: `${pilotChains.value.filter((item) => item.enabled).length}/${pilotChains.value.length}`,
    tone: 'default',
  },
  {
    key: 'accepted-chains',
    label: preferencesStore.language === 'en-US' ? 'Accepted Chains' : '已放行链路',
    value: `${dashboardGatePressureSummary.value.readyChains}/${chainOwnerRows.value.length}`,
    tone: 'default',
  },
  {
    key: 'pending-gates',
    label: preferencesStore.language === 'en-US' ? 'Pending Gates' : '未完成门槛',
    value: String(dashboardGatePressureSummary.value.pendingGates),
    tone: dashboardGatePressureSummary.value.pendingGates > 0 ? 'warning' : 'default',
  },
  {
    key: 'open-reminders',
    label: preferencesStore.language === 'en-US' ? 'Open Reminders' : '未处理提醒',
    value: String(dashboardGatePressureSummary.value.openReminders),
    tone: dashboardGatePressureSummary.value.openReminders > 0 ? 'warning' : 'default',
  },
  {
    key: 'close-ready',
    label: preferencesStore.language === 'en-US' ? 'Close Ready' : '关账就绪',
    value: `${dashboardGatePressureSummary.value.closeReadyChains}/${chainOwnerRows.value.length}`,
    tone: 'default',
  },
  {
    key: 'close-blockers',
    label: preferencesStore.language === 'en-US' ? 'Close Blockers' : '关账阻塞项',
    value: String(dashboardGatePressureSummary.value.closeBlockers),
    tone: dashboardGatePressureSummary.value.closeBlockers > 0 ? 'warning' : 'default',
  },
  {
    key: 'reviewed',
    label: preferencesStore.language === 'en-US' ? 'Reviewed' : '已核对',
    value: String(pilotReviewStore.reviewedCount),
    tone: 'default',
  },
  {
    key: 'closed-loop',
    label: preferencesStore.language === 'en-US' ? 'Closed-Loop Ready' : '闭环就绪',
    value: `${dashboardGatePressureSummary.value.closedLoopChains}/${chainOwnerRows.value.length}`,
    tone: 'default',
  },
  {
    key: 'settlement-ready',
    label: preferencesStore.language === 'en-US' ? 'Settlement Ready' : '结算就绪',
    value: `${dashboardGatePressureSummary.value.settlementReadyChains}/${chainOwnerRows.value.length}`,
    tone: 'default',
  },
  {
    key: 'trace-ready',
    label: preferencesStore.language === 'en-US' ? 'Trace Ready' : '追溯就绪',
    value: `${dashboardGatePressureSummary.value.financialTraceReadyChains}/${chainOwnerRows.value.length}`,
    tone: 'default',
  },
  {
    key: 'snoozed',
    label: preferencesStore.language === 'en-US' ? 'Snoozed' : '稍后处理',
    value: String(pilotReviewStore.snoozedCount),
    tone: 'default',
  },
])
const dashboardGovernanceMetrics = computed(() => [
  {
    key: 'finance-ready',
    label: preferencesStore.language === 'en-US' ? 'Finance Cockpit Ready' : '财务驾驶舱就绪',
    value: `${dashboardGatePressureSummary.value.financeReadyChains}/${dashboardGatePressureSummary.value.financeScopedChains}`,
    tone: 'default',
  },
  {
    key: 'role-ready',
    label: preferencesStore.language === 'en-US' ? 'Role Desk Ready' : '责任台就绪',
    value: `${dashboardGatePressureSummary.value.roleReadyChains}/${chainOwnerRows.value.length}`,
    tone: 'default',
  },
  {
    key: 'overdue-role-tasks',
    label: preferencesStore.language === 'en-US' ? 'Overdue Role Tasks' : '超时责任任务',
    value: String(dashboardGatePressureSummary.value.overdueRoleTasks),
    tone: dashboardGatePressureSummary.value.overdueRoleTasks > 0 ? 'warning' : 'default',
  },
  {
    key: 'risk-role-tasks',
    label: preferencesStore.language === 'en-US' ? 'Risk Role Tasks' : '风险责任任务',
    value: String(dashboardGatePressureSummary.value.riskRoleTasks),
    tone: dashboardGatePressureSummary.value.riskRoleTasks > 0 ? 'warning' : 'default',
  },
  {
    key: 'finance-packs',
    label: preferencesStore.language === 'en-US' ? 'Finance Packs' : '财务结果包',
    value: String(dashboardGatePressureSummary.value.financeResultPacks),
    tone: 'default',
  },
  {
    key: 'close-tasks',
    label: preferencesStore.language === 'en-US' ? 'Close Tasks' : '关账任务',
    value: String(dashboardGatePressureSummary.value.closeTasks),
    tone: 'default',
  },
  {
    key: 'blocked-close-tasks',
    label: preferencesStore.language === 'en-US' ? 'Blocked Close Tasks' : '阻塞关账任务',
    value: String(dashboardGatePressureSummary.value.blockedCloseTasks),
    tone: dashboardGatePressureSummary.value.blockedCloseTasks > 0 ? 'warning' : 'default',
  },
])
const prioritizedDashboardChainRows = computed(() =>
  [...chainOwnerRows.value].sort((left, right) => {
    const leftScore = (left.enabled ? 8 : 0)
      + (left.critical * 8)
      + (left.warning * 4)
      + (left.pendingLabels.length * 3)
      + (left.blockerLabels.length * 2)
      + (left.reminders > 0 ? 1 : 0)
    const rightScore = (right.enabled ? 8 : 0)
      + (right.critical * 8)
      + (right.warning * 4)
      + (right.pendingLabels.length * 3)
      + (right.blockerLabels.length * 2)
      + (right.reminders > 0 ? 1 : 0)
    if (rightScore !== leftScore) return rightScore - leftScore
    return left.zhLabel.localeCompare(right.zhLabel)
  }),
)
const visibleDashboardChainRows = computed(() =>
  showAllDashboardChains.value
    ? prioritizedDashboardChainRows.value
    : prioritizedDashboardChainRows.value.slice(0, compactDashboardChainLimit),
)
const hiddenDashboardChainCount = computed(() =>
  Math.max(prioritizedDashboardChainRows.value.length - visibleDashboardChainRows.value.length, 0),
)
const dashboardModuleOpsSummary = computed(() => ({
  total: moduleOpsRows.value.length,
  critical: moduleOpsRows.value.filter((row) => row.critical > 0).length,
  warning: moduleOpsRows.value.filter((row) => !row.critical && row.warning > 0).length,
  blocked: moduleOpsRows.value.filter((row) => !row.enabled || row.blockerLabels.length > 0 || row.closeSummary.blockerCount > 0).length,
}))
const dashboardGovernanceDeskCards = computed<SummaryCardItem[]>(() => [
  {
    key: 'batch',
    label: preferencesStore.language === 'en-US' ? 'Batch Review Desk' : '批处理核对台',
    value: String(pilotRiskRows.value.length),
    description: preferencesStore.language === 'en-US'
      ? 'Chain and module scopes available for batch export and rollback review.'
      : '可进入批处理导出和回退核对的链路与模块范围数量。',
  },
  {
    key: 'role',
    label: preferencesStore.language === 'en-US' ? 'Role Desk Queue' : '责任待办台',
    value: String(cutoverOpsStore.roleDeskSummary.totalCount),
    description: preferencesStore.language === 'en-US'
      ? 'Shared role desk tasks currently tracked across pilot scopes.'
      : '当前试点范围内已经跟踪的责任台任务数。',
  },
  {
    key: 'finance',
    label: preferencesStore.language === 'en-US' ? 'Finance Close Batch' : '财务关账批量台',
    value: String(cutoverOpsStore.financeBatchSummary.totalCount),
    description: preferencesStore.language === 'en-US'
      ? 'Finance review rows synced from the shared close desk.'
      : '从共享财务关账台同步回来的复核条目数。',
  },
  {
    key: 'close',
    label: preferencesStore.language === 'en-US' ? 'Close Tasks' : '关账任务',
    value: String(cutoverOpsStore.closeTaskSummary.totalCount),
    description: preferencesStore.language === 'en-US'
      ? 'Structured close tasks that still support the finance cockpit.'
      : '当前仍在支撑财务驾驶舱的结构化关账任务数量。',
  },
])
// The governance desk area is collapsed by default, so defer the large queue
// payloads until operators explicitly expand those desks.
const dashboardRoleDeskPanelRows = computed(() => {
  if (!showDashboardGovernanceDesks.value) return []
  return [
    ...chainOwnerRows.value.map((row) => ({
      key: row.key,
      scopeType: 'chain' as const,
      label: preferencesStore.language === 'en-US' ? row.enLabel : row.zhLabel,
      scopeLabel: row.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / '),
      roleDeskLabel: row.roleDeskSummary.label,
      closeLabel: row.closeSummary.label,
      owner: row.closeRoleSnapshot.owner,
      reviewer: row.closeRoleSnapshot.reviewer,
      signoffOwner: row.closeRoleSnapshot.signoffOwner,
      fallbackOwner: row.closeRoleSnapshot.fallbackOwner,
      financeOwner: row.closeRoleSnapshot.financeOwner,
      companyLabel: row.closeRoleSnapshot.companyLabel,
      missingRoles: row.roleDeskSummary.missingRoles,
      checklistBlockers: row.roleDeskSummary.checklistBlockers,
      blockerLabels: row.blockerLabels,
      financeLines: row.financeCockpitSummary.enabled ? row.financeCockpitSummary.lines : [],
      recentActivityLines: row.closeActivityLines,
      scopeTarget: row.enabled ? { name: row.routeName, query: { section: 'ops-close' } } : null,
      handoffTarget: { name: 'settings', query: resolveCutoverSettingsQuery({ chainKey: row.key, section: 'handoff' }) },
      closeTarget: row.enabled
        ? { name: row.routeName, query: { section: 'ops-close' } }
        : { name: 'settings', query: resolveCutoverSettingsQuery({ chainKey: row.key, section: 'close' }) },
      financeTarget: row.financeCockpitSummary.enabled
        ? (row.enabled
          ? { name: row.routeName, query: { section: 'ops-close' } }
          : { name: 'settings', query: resolveCutoverSettingsQuery({ chainKey: row.key, section: 'financeBatch' }) })
        : null,
      documentsTarget: buildChainTraceQuery(row, 'documents'),
      timelineTarget: buildChainTraceQuery(row, 'timeline'),
    })),
    ...moduleOpsRows.value.map((row) => ({
      key: row.moduleKey,
      scopeType: 'module' as const,
      label: row.title,
      scopeLabel: row.chainContacts.map((item) => item.label).join(' / ') || row.chainLabel,
      roleDeskLabel: row.roleDeskSummary.label,
      closeLabel: row.closeSummary.label,
      owner: row.closeRoleSnapshot?.owner,
      reviewer: row.closeRoleSnapshot?.reviewer,
      signoffOwner: row.closeRoleSnapshot?.signoffOwner,
      fallbackOwner: row.closeRoleSnapshot?.fallbackOwner,
      financeOwner: row.closeRoleSnapshot?.financeOwner,
      companyLabel: row.closeRoleSnapshot?.companyLabel,
      missingRoles: row.roleDeskSummary.missingRoles,
      checklistBlockers: row.roleDeskSummary.checklistBlockers,
      blockerLabels: row.blockerLabels,
      financeLines: row.financeCockpitSummary.enabled ? row.financeCockpitSummary.lines : [],
      recentActivityLines: row.closeActivityLines,
      scopeTarget: { name: row.moduleKey, query: { section: 'ops-close' } },
      handoffTarget: { name: 'settings', query: resolveCutoverSettingsQuery({ moduleKey: row.moduleKey, section: 'handoff' }) },
      closeTarget: { name: row.moduleKey, query: { section: 'ops-close' } },
      financeTarget: row.financeCockpitSummary.enabled ? { name: row.moduleKey, query: { section: 'ops-settlement' } } : null,
      documentsTarget: buildModuleTraceQuery(row, 'documents'),
      timelineTarget: buildModuleTraceQuery(row, 'timeline'),
    })),
  ]
})
const dashboardFinanceBatchRows = computed(() => {
  if (!showDashboardGovernanceDesks.value) return []
  const rows: any[] = chainOwnerRows.value
    .filter((row) => row.financeCockpitSummary.enabled)
    .map((row) => ({
      key: row.key,
      scopeType: 'chain' as const,
      label: preferencesStore.language === 'en-US' ? row.enLabel : row.zhLabel,
      scopeLabel: row.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / '),
      closeLabel: row.closeSummary.label,
      settlementLabel: row.settlementSummary.statusLabel,
      financialTraceLabel: row.financialTraceSummary.statusLabel,
      financeCockpitLabel: row.financeCockpitSummary.label,
      roleDeskLabel: row.roleDeskSummary.label,
      topRiskLabel: row.topRiskLabel,
      blockerLabels: row.blockerLabels,
      financeLines: row.financeCockpitSummary.lines,
      roleLines: row.roleDeskSummary.lines,
      recentActivityLines: row.closeActivityLines,
      closeTarget: row.enabled
        ? { name: row.routeName, query: { section: 'ops-close' } }
        : { name: 'settings', query: resolveCutoverSettingsQuery({ chainKey: row.key, section: 'close' }) },
      settlementTarget: row.enabled
        ? { name: row.routeName, query: { section: 'ops-close' } }
        : { name: 'settings', query: resolveCutoverSettingsQuery({ chainKey: row.key, section: 'financeBatch' }) },
      financeTarget: row.enabled
        ? { name: row.routeName, query: { section: 'ops-close' } }
        : { name: 'settings', query: resolveCutoverSettingsQuery({ chainKey: row.key, section: 'financeBatch' }) },
      roleTarget: { name: 'settings', query: resolveCutoverSettingsQuery({ chainKey: row.key, section: 'roleDesk' }) },
      documentsTarget: buildChainTraceQuery(row, 'documents'),
      timelineTarget: buildChainTraceQuery(row, 'timeline'),
      reconcileTarget: { name: 'accountMove', query: { section: 'ops-settlement' } },
    }))

  for (const moduleKey of ['accountInvoice', 'accountPayment', 'accountMove'] as ModuleKey[]) {
    const reminders = pilotReminderItems.value.filter(
      (item) => item.moduleKey === moduleKey && !pilotReviewStore.isHidden(item),
    )
    const settlementSummary = buildModuleSettlementSummary({
      moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
    })
    const financialTraceSummary = resolveModuleFinancialTraceState(moduleKey)
    const blockerLabels = buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US')
    const financeCockpitSummary = buildModuleFinanceCockpitSummary({
      moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels,
    })
    if (!financeCockpitSummary.enabled || rows.some((row) => row.scopeType === 'module' && row.key === moduleKey)) {
      continue
    }
    rows.push({
      key: moduleKey,
      scopeType: 'module' as const,
      label: moduleTitle(moduleKey),
      scopeLabel: preferencesStore.language === 'en-US' ? 'Finance Support Module' : '财务支撑模块',
      closeLabel: financeCockpitSummary.label,
      settlementLabel: settlementSummary.statusLabel,
      financialTraceLabel: financialTraceSummary.statusLabel,
      financeCockpitLabel: financeCockpitSummary.label,
      roleDeskLabel: preferencesStore.language === 'en-US' ? 'Shared Finance Lane' : '共享财务链路',
      topRiskLabel: financialTraceSummary.topRiskRefs[0],
      blockerLabels,
      financeLines: financeCockpitSummary.lines,
      roleLines: [],
      recentActivityLines: [],
      closeTarget: { name: moduleKey, query: { section: 'ops-close' } },
      settlementTarget: { name: moduleKey, query: { section: 'ops-settlement' } },
      financeTarget: { name: moduleKey, query: { section: 'ops-settlement' } },
      roleTarget: { name: 'settings', query: resolveCutoverSettingsQuery({ section: 'roleDesk' }) },
      documentsTarget: buildModuleTraceQuery({ moduleKey, financialTraceSummary }, 'documents'),
      timelineTarget: buildModuleTraceQuery({ moduleKey, financialTraceSummary }, 'timeline'),
      reconcileTarget: { name: 'accountMove', query: { section: 'ops-settlement' } },
    })
  }

  return rows
})
const groupedModules = computed(() => {
  const modulesBySection = new Map<string, any[]>()
  for (const item of visibleModuleManifests) {
    const section = findSidebarSectionByModuleKey(item.key)
    const sectionKey = section?.key ?? item.group
    const bucket = modulesBySection.get(sectionKey) ?? []
    bucket.push(item)
    modulesBySection.set(sectionKey, bucket)
  }

  return sidebarSections
    .map((section) => ({
      key: section.key,
      label: preferencesStore.language === 'zh-CN' ? section.zhLabel : section.enLabel,
      modules: modulesBySection.get(section.key) ?? [],
    }))
    .filter((section) => section.modules.length > 0)
})

function openCutoverSettings(moduleKey?: string, chainKey?: string, section?: 'handoff' | 'import' | 'gates' | 'close' | 'ops' | 'roleDesk' | 'financeBatch') {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({ moduleKey, chainKey, section }),
  })
}

function openChainWorkbench(row: { key?: string; routeName: string }, section: 'ops-rehearsal' | 'ops-close' = 'ops-rehearsal') {
  void router.push(buildModuleRouteTarget({
    targetModuleKey: row.routeName as ModuleKey,
    rawQuery: { section },
    chainKey: row.key,
  }))
}

// Dashboard launch buttons stay explicit so operators can start a pilot task,
// reopen the latest record, or restore a disabled module without guessing.
function openPilotModule(moduleKey: string, create = false) {
  void router.push(buildModuleRouteTarget({
    targetModuleKey: moduleKey as ModuleKey,
    rawQuery: create ? { create: '1' } : undefined,
  }))
}

function reopenRecent(moduleKey: string) {
  const latest = commandCenterStore.latestRecordFor(moduleKey as never)
  if (!latest) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: moduleKey as ModuleKey,
    recordId: latest.id,
  }))
}

function openModuleSection(moduleKey: string, section: 'ops-handbook' | 'ops-rehearsal' | 'ops-close' | 'ops-settlement') {
  // Dashboard shortcuts preserve the same workbench deep-link contract used by
  // the command palette, so pilot leads and operators land on identical desks.
  void router.push(buildModuleRouteTarget({
    targetModuleKey: moduleKey as ModuleKey,
    rawQuery: { section },
  }))
}

function openModuleTopRisk(row: {
  moduleKey: string
  topRisk?: ReminderRecord
  topRiskRouteName?: string
  topRiskQuery?: Record<string, string | undefined>
}) {
  if (row.topRiskRouteName && row.topRiskQuery) {
    void router.push({
      name: row.topRiskRouteName,
      query: row.topRiskQuery,
    })
    return
  }
  if (!row.topRisk?.recordId) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: row.topRisk.moduleKey as ModuleKey,
    recordId: row.topRisk.recordId,
    section: resolveReminderSection(row.topRisk),
    sourceModuleKey: row.moduleKey as ModuleKey,
  }))
}

function openChainTopRisk(row: {
  topRisk?: ReminderRecord
  topRiskRouteName?: string
  topRiskQuery?: Record<string, string | undefined>
}) {
  if (row.topRiskRouteName && row.topRiskQuery) {
    void router.push({
      name: row.topRiskRouteName,
      query: row.topRiskQuery,
    })
    return
  }
  if (!row.topRisk?.recordId) return
  void router.push(buildModuleDetailRouteTarget({
    targetModuleKey: row.topRisk.moduleKey as ModuleKey,
    recordId: row.topRisk.recordId,
    section: resolveReminderSection(row.topRisk),
  }))
}

function buildChainTraceQuery(row: {
  key: string
  financialTraceSummary: CutoverFinancialTraceState
}, section = 'traceability') {
  if (!row.financialTraceSummary.topRiskModuleKey || !row.financialTraceSummary.topRiskRecordId) return null
  return buildModuleDetailRouteTarget({
    targetModuleKey: row.financialTraceSummary.topRiskModuleKey,
    recordId: row.financialTraceSummary.topRiskRecordId,
    section,
    sourceModuleKey: resolveChainRouteName(row.key),
    chainKey: row.key,
  })
}

function buildModuleTraceQuery(row: {
  moduleKey: ModuleKey
  financialTraceSummary: CutoverFinancialTraceState
}, section = 'traceability') {
  if (!row.financialTraceSummary.topRiskModuleKey || !row.financialTraceSummary.topRiskRecordId) return null
  return buildModuleDetailRouteTarget({
    targetModuleKey: row.financialTraceSummary.topRiskModuleKey,
    recordId: row.financialTraceSummary.topRiskRecordId,
    section,
    sourceModuleKey: row.moduleKey,
    rawQuery: {
      moduleKey: row.moduleKey,
    },
  })
}

function openChainTraceDocuments(row: {
  key: string
  financialTraceSummary: CutoverFinancialTraceState
}) {
  const target = buildChainTraceQuery(row, 'documents')
  if (!target) return
  void router.push(target)
}

function openChainTraceTimeline(row: {
  key: string
  financialTraceSummary: CutoverFinancialTraceState
}) {
  const target = buildChainTraceQuery(row, 'timeline')
  if (!target) return
  void router.push(target)
}

async function exportPilotExceptionList() {
  // Rollback needs an exportable exception list, not just visible reminder cards.
  const firstWaveSet = new Set(cutoverStore.firstWaveModules)
  const rows = (await fetchReminders({ limit: 50 })).filter((item) => firstWaveSet.has(item.moduleKey as any))
  const filename = `neko_erp_first_wave_exceptions_${new Date().toISOString().slice(0, 10)}.csv`
  downloadCsv(
    filename,
    [
      { key: 'severity', title: preferencesStore.language === 'en-US' ? 'Severity' : '严重级别' },
      { key: 'moduleKey', title: preferencesStore.language === 'en-US' ? 'Module' : '模块' },
      { key: 'recordId', title: preferencesStore.language === 'en-US' ? 'Record ID' : '记录ID' },
      { key: 'title', title: preferencesStore.language === 'en-US' ? 'Title' : '标题' },
      { key: 'relatedRef', title: preferencesStore.language === 'en-US' ? 'Reference' : '引用' },
      { key: 'content', title: preferencesStore.language === 'en-US' ? 'Content' : '内容' },
      { key: 'createdAt', title: preferencesStore.language === 'en-US' ? 'Created At' : '创建时间' },
    ],
    rows,
  )
  cutoverOpsStore.addExceptionExport({
    scopeType: 'global',
    scopeKey: 'firstWave',
    scopeLabel: preferencesStore.language === 'en-US' ? 'First-Wave Pilot' : '首批试点',
    filename,
    rowCount: rows.length,
    exportedBy: authStore.displayName || authStore.user?.username || 'dashboard',
  })
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Exception list exported' : '异常清单已导出')
}

function buildFirstWaveRehearsalPack() {
  return buildSharedFirstWaveRehearsalPack({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    enabledModulesLabel: `${enabledPilotCount.value}/${firstWaveModules.value.length}`,
    reviewedCount: pilotReviewStore.reviewedCount,
    snoozedCount: pilotReviewStore.snoozedCount,
    chains: dashboardPacketChains(),
    modules: dashboardControlModules(),
  })
}

function exportFirstWaveRehearsalPack() {
  downloadText(
    `neko_erp_first_wave_rehearsal_pack_${new Date().toISOString().slice(0, 10)}.md`,
    buildFirstWaveRehearsalPack(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Rehearsal pack exported' : '切换演练包已导出')
}

function dashboardPacketChains(): CutoverPacketChain[] {
  return buildCutoverPacketChains({
    isEnglish: preferencesStore.language === 'en-US',
    chains: chainOwnerRows.value.map((chain) => ({
      chainKey: chain.key,
      label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
      enabled: chain.enabled,
      moduleKeys: chain.moduleKeys,
      contacts: chain.contacts,
      gateState: chain.gateState,
      closedLoopSummary: chain.closedLoopSummary,
      reminders: chain.reminderItems,
      financialTrace: {
        statusLabel: chain.financialTraceSummary.statusLabel,
        missingLabels: chain.financialTraceSummary.missingLabels,
        warningLabels: chain.financialTraceSummary.warningLabels,
        lines: chain.financialTraceSummary.lines,
        recordRefs: chain.financialTraceSummary.recordRefs,
        packetRefs: buildChainFinancialTracePacketRefs(chain.moduleKeys),
        },
        topRiskLabel: chain.topRiskLabel,
        closeChecklistLines: chain.closeChecklist.map((item) =>
          `- [${item.ready ? (preferencesStore.language === 'en-US' ? 'Ready' : '已就绪') : (preferencesStore.language === 'en-US' ? 'Pending' : '待处理')}] ${item.label}: ${item.description}`,
        ),
        closeActivityLines: chain.closeActivityLines,
    })),
    moduleTitle,
    reminderDetailLimit: 8,
  })
}

function dashboardPacketModules(): CutoverPacketModule[] {
  return buildCutoverPacketModules({
    isEnglish: preferencesStore.language === 'en-US',
    modules: moduleOpsRows.value.map((row) => ({
      moduleKey: row.moduleKey,
      title: row.title,
      enabled: row.enabled,
      reminders: pilotReminderItems.value.filter(
        (item) => item.moduleKey === row.moduleKey && !pilotReviewStore.isHidden(item),
      ),
      pendingGateCount: row.closeSummary.gatePendingCount,
      blockerLabels: row.blockerLabels,
      financialTrace: {
        statusLabel: row.financialTraceSummary.statusLabel,
        missingLabels: row.financialTraceSummary.missingLabels,
        warningLabels: row.financialTraceSummary.warningLabels,
        lines: row.financialTraceSummary.lines,
        recordRefs: row.financialTraceSummary.recordRefs,
        packetRefs: buildModuleFinancialTracePacketRefs(row.moduleKey, row.financialTraceSummary),
      },
      topRiskLabel: row.topRiskLabel,
    })),
  })
}

function dashboardControlModules() {
  return buildCutoverControlModules({
    isEnglish: preferencesStore.language === 'en-US',
    modules: moduleOpsRows.value.map((row) => ({
      moduleKey: row.moduleKey,
      title: row.title,
      enabled: row.enabled,
      reminders: pilotReminderItems.value.filter(
        (item) => item.moduleKey === row.moduleKey && !pilotReviewStore.isHidden(item),
      ),
      pendingGateCount: row.closeSummary.gatePendingCount,
      blockerLabels: row.blockerLabels,
      financialTrace: {
        statusLabel: row.financialTraceSummary.statusLabel,
        missingLabels: row.financialTraceSummary.missingLabels,
        warningLabels: row.financialTraceSummary.warningLabels,
        lines: row.financialTraceSummary.lines,
        recordRefs: row.financialTraceSummary.recordRefs,
        packetRefs: buildModuleFinancialTracePacketRefs(row.moduleKey, row.financialTraceSummary),
      },
      topRiskLabel: row.topRiskLabel,
    })),
  })
}

function dashboardContactMatrixRows(): CutoverContactMatrixRow[] {
  return buildCutoverContactRows(dashboardPacketChains())
}

function dashboardPendingGateRows(): CutoverPendingGateRow[] {
  return buildCutoverPendingGateRows(dashboardPacketChains())
}

function buildDashboardControlPacket() {
  return buildSharedCutoverControlPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Dashboard Control Packet' : 'NEKO_ERP 首页控制包',
    reviewedCount: pilotReviewStore.reviewedCount,
    snoozedCount: pilotReviewStore.snoozedCount,
    chains: dashboardPacketChains(),
    modules: dashboardControlModules(),
  })
}

function exportDashboardControlPacket() {
  downloadText(
    `neko_erp_dashboard_control_packet_${new Date().toISOString().slice(0, 10)}.md`,
    buildDashboardControlPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Control packet exported' : '控制包已导出')
}

async function copyDashboardControlPacket() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildDashboardControlPacket())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Control packet copied' : '控制包已复制')
}

function collectDashboardTraceBundleTargets() {
  const targets = new Map<string, { moduleKey: ModuleKey; recordId: number; recordRef?: string }>()
  moduleOpsRows.value.forEach((row) => {
    if (!supportsCutoverFinancialTraceModule(row.moduleKey) || !row.financialTraceSummary.topRiskRecordId) return
    const key = `${row.moduleKey}:${row.financialTraceSummary.topRiskRecordId}`
    if (!targets.has(key)) {
      targets.set(key, {
        moduleKey: row.moduleKey,
        recordId: row.financialTraceSummary.topRiskRecordId,
        recordRef: row.financialTraceSummary.topRiskRecordRef,
      })
    }
  })
  return Array.from(targets.values())
}

async function buildDashboardTraceBundleContent() {
  const targets = collectDashboardTraceBundleTargets()
  const generatedAt = formatDateTime(new Date().toISOString())
  if (!targets.length) {
    return buildFinancialTraceBundlePacket({
      english: preferencesStore.language === 'en-US',
      generatedAt,
      title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Dashboard Financial Trace Bundle' : 'NEKO_ERP 首页财务追溯证据包',
      moduleTitle,
      entries: [],
    })
  }

  const results = await Promise.allSettled(
    targets.map(async (target) => ({
      moduleKey: target.moduleKey,
      packetTitle: preferencesStore.language === 'en-US'
        ? `${moduleTitle(target.moduleKey)} Top Risk Trace`
        : `${moduleTitle(target.moduleKey)} 最高风险追溯详情`,
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
    .filter((item): item is { item: PromiseRejectedResult; target: { moduleKey: ModuleKey; recordId: number; recordRef?: string } } => item.item.status === 'rejected')
    .map(({ target }) =>
      `${moduleTitle(target.moduleKey)} · ${target.recordRef || `#${target.recordId}`} · ${preferencesStore.language === 'en-US' ? 'detail unavailable from backend' : '后端详情暂不可用'}`,
    )

  return buildFinancialTraceBundlePacket({
    english: preferencesStore.language === 'en-US',
    generatedAt,
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Dashboard Financial Trace Bundle' : 'NEKO_ERP 首页财务追溯证据包',
    moduleTitle,
    entries,
    failedRefs,
  })
}

async function exportDashboardTraceBundle() {
  if (traceBundleBusy.value) return
  traceBundleBusy.value = true
  try {
    downloadText(
      buildFinancialTraceBundleFilename({
        scope: 'dashboard',
        date: new Date().toISOString().slice(0, 10),
      }),
      await buildDashboardTraceBundleContent(),
      'text/markdown;charset=utf-8',
    )
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Trace bundle exported' : '财务追溯证据包已导出')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to export trace bundle' : '导出财务追溯证据包失败'))
  } finally {
    traceBundleBusy.value = false
  }
}

async function copyDashboardTraceBundle() {
  if (traceBundleBusy.value || !navigator.clipboard) return
  traceBundleBusy.value = true
  try {
    await navigator.clipboard.writeText(await buildDashboardTraceBundleContent())
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Trace bundle copied' : '财务追溯证据包已复制')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to copy trace bundle' : '复制财务追溯证据包失败'))
  } finally {
    traceBundleBusy.value = false
  }
}

function buildDashboardBlockerPacket() {
  return buildSharedCutoverBlockerPacket({
    english: preferencesStore.language === 'en-US',
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Dashboard Cutover Blocker Packet' : 'NEKO_ERP 首页切换阻塞包',
    generatedAt: formatDateTime(new Date().toISOString()),
    summary: dashboardGatePressureSummary.value,
    chains: dashboardPacketChains(),
  })
}

function buildDashboardRollbackDrillPacket() {
  return buildSharedRollbackDrillPacket({
    english: preferencesStore.language === 'en-US',
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Dashboard Rollback Drill Packet' : 'NEKO_ERP 首页回退演练包',
    generatedAt: formatDateTime(new Date().toISOString()),
    chains: dashboardPacketChains(),
    modules: dashboardControlModules(),
  })
}

function exportDashboardRollbackDrillPacket() {
  downloadText(
    `neko_erp_dashboard_rollback_drill_${new Date().toISOString().slice(0, 10)}.md`,
    buildDashboardRollbackDrillPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Rollback drill packet exported' : '回退演练包已导出')
}

function buildDashboardGuardrailRulesPacket() {
  return buildSharedGuardrailRulesPacket({
    english: preferencesStore.language === 'en-US',
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Dashboard Guardrail Rules' : 'NEKO_ERP 首页 Guardrail 规则',
    generatedAt: formatDateTime(new Date().toISOString()),
    presets: listSysScriptPresets(),
  })
}

function exportDashboardGuardrailRulesPacket() {
  downloadText(
    `neko_erp_dashboard_guardrail_rules_${new Date().toISOString().slice(0, 10)}.md`,
    buildDashboardGuardrailRulesPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Guardrail rules exported' : 'Guardrail 规则已导出')
}

function exportDashboardBlockerPacket() {
  downloadText(
    `neko_erp_dashboard_blocker_packet_${new Date().toISOString().slice(0, 10)}.md`,
    buildDashboardBlockerPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Blocker packet exported' : '阻塞包已导出')
}

function buildDashboardRoleDeskQueuePacket() {
  return buildRoleDeskQueuePacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Dashboard Role Desk Queue' : 'NEKO_ERP 首页责任台待办包',
    rows: [
      ...chainOwnerRows.value.map((row) => ({
        label: preferencesStore.language === 'en-US' ? row.enLabel : row.zhLabel,
        scopeLabel: preferencesStore.language === 'en-US' ? 'Chain' : '链路',
        roleDeskLabel: row.roleDeskSummary.label,
        closeLabel: row.closeSummary.label,
        owner: row.closeRoleSnapshot.owner,
        reviewer: row.closeRoleSnapshot.reviewer,
        signoffOwner: row.closeRoleSnapshot.signoffOwner,
        fallbackOwner: row.closeRoleSnapshot.fallbackOwner,
        financeOwner: row.closeRoleSnapshot.financeOwner,
        companyLabel: row.closeRoleSnapshot.companyLabel,
        missingRoles: row.roleDeskSummary.missingRoles,
        checklistBlockers: row.roleDeskSummary.checklistBlockers,
        blockerLabels: row.blockerLabels,
        financeLines: row.financeCockpitSummary.enabled ? row.financeCockpitSummary.lines : [],
        recentActivityLines: row.closeActivityLines,
      })),
      ...moduleOpsRows.value.map((row) => ({
        label: row.title,
        scopeLabel: preferencesStore.language === 'en-US' ? 'Module' : '模块',
        roleDeskLabel: row.roleDeskSummary.label,
        closeLabel: row.closeSummary.label,
        owner: row.closeRoleSnapshot?.owner,
        reviewer: row.closeRoleSnapshot?.reviewer,
        signoffOwner: row.closeRoleSnapshot?.signoffOwner,
        fallbackOwner: row.closeRoleSnapshot?.fallbackOwner,
        financeOwner: row.closeRoleSnapshot?.financeOwner,
        companyLabel: row.closeRoleSnapshot?.companyLabel,
        missingRoles: row.roleDeskSummary.missingRoles,
        checklistBlockers: row.roleDeskSummary.checklistBlockers,
        blockerLabels: row.blockerLabels,
        financeLines: row.financeCockpitSummary.enabled ? row.financeCockpitSummary.lines : [],
        recentActivityLines: row.closeActivityLines,
      })),
    ],
  })
}

function exportDashboardRoleDeskQueuePacket() {
  downloadText(
    `neko_erp_dashboard_role_desk_queue_${new Date().toISOString().slice(0, 10)}.md`,
    buildDashboardRoleDeskQueuePacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Role desk queue exported' : '责任台待办包已导出')
}

function buildDashboardFinanceCloseBatchPacket() {
  return buildFinanceCloseBatchPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Dashboard Finance Close Batch' : 'NEKO_ERP 首页财务关账批处理包',
    rows: [
      ...chainOwnerRows.value
        .filter((row) => row.financeCockpitSummary.enabled)
        .map((row) => ({
          label: preferencesStore.language === 'en-US' ? row.enLabel : row.zhLabel,
          scopeLabel: preferencesStore.language === 'en-US' ? 'Chain' : '链路',
          closeLabel: row.closeSummary.label,
          settlementLabel: row.settlementSummary.statusLabel,
          financialTraceLabel: row.financialTraceSummary.statusLabel,
          financeCockpitLabel: row.financeCockpitSummary.label,
          roleDeskLabel: row.roleDeskSummary.label,
          topRiskLabel: row.topRiskLabel,
          blockerLabels: row.blockerLabels,
          financeLines: row.financeCockpitSummary.lines,
          roleLines: row.roleDeskSummary.lines,
          recentActivityLines: row.closeActivityLines,
        })),
      ...moduleOpsRows.value
        .filter((row) => row.financeCockpitSummary.enabled)
        .map((row) => ({
          label: row.title,
          scopeLabel: preferencesStore.language === 'en-US' ? 'Module' : '模块',
          closeLabel: row.closeSummary.label,
          settlementLabel: row.settlementSummary.statusLabel,
          financialTraceLabel: row.financialTraceSummary.statusLabel,
          financeCockpitLabel: row.financeCockpitSummary.label,
          roleDeskLabel: row.roleDeskSummary.label,
          topRiskLabel: row.topRiskLabel,
          blockerLabels: row.blockerLabels,
          financeLines: row.financeCockpitSummary.lines,
          roleLines: row.roleDeskSummary.lines,
          recentActivityLines: row.closeActivityLines,
        })),
    ],
  })
}

function exportDashboardFinanceCloseBatchPacket() {
  downloadText(
    `neko_erp_dashboard_finance_close_batch_${new Date().toISOString().slice(0, 10)}.md`,
    buildDashboardFinanceCloseBatchPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Finance close batch exported' : '财务关账批处理包已导出')
}

function buildPilotUserManualPack() {
  return buildSharedPilotUserManualPack({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    chains: dashboardPacketChains(),
    modules: dashboardPacketModules(),
  })
}

function exportPilotUserManualPack() {
  downloadText(
    `neko_erp_first_wave_user_manual_${new Date().toISOString().slice(0, 10)}.md`,
    buildPilotUserManualPack(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'User manual exported' : '用户手册已导出')
}

function exportPilotConfirmationTemplate() {
  downloadText(
    `neko_erp_pilot_confirmation_${new Date().toISOString().slice(0, 10)}.md`,
    buildPilotConfirmationTemplate({
      english: preferencesStore.language === 'en-US',
      generatedAt: formatDateTime(new Date().toISOString()),
      summary: dashboardGatePressureSummary.value,
      chains: dashboardPacketChains(),
    }),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Pilot confirmation exported' : '试点确认模板已导出')
}

function buildDashboardCutoverConfigSnapshot() {
  return buildCutoverConfigSnapshot({
    locale: preferencesStore.language,
    chainStates: cutoverStore.chainStates,
    moduleOverrides: cutoverStore.moduleOverrides,
    chainContacts: cutoverStore.chainContacts,
    chainGateStates: cutoverStore.chainGateStates,
    firstWaveModules: snapshotModuleRows.value,
    reviewedCount: pilotReviewStore.reviewedCount,
    snoozedCount: pilotReviewStore.snoozedCount,
    operations: cutoverOpsStore.snapshotData(),
  })
}

function exportCutoverConfigSnapshot() {
  downloadText(
    `neko_erp_dashboard_cutover_config_${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(buildDashboardCutoverConfigSnapshot(), null, 2),
    'application/json;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Cutover config exported' : '切换配置已导出')
}

async function copyCutoverConfigSnapshot() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(JSON.stringify(buildDashboardCutoverConfigSnapshot(), null, 2))
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Cutover config copied' : '切换配置已复制')
}

async function loadCutoverConfigFromServer() {
  try {
    const result = await cutoverRemoteStore.loadRemoteSnapshot()
    if (!result.found) {
      ElMessage.warning(preferencesStore.language === 'en-US' ? 'No server snapshot yet' : '服务端还没有切换快照')
      return
    }
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Server snapshot loaded' : '已载入服务端切换快照')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to load server snapshot' : '载入服务端切换快照失败'))
  }
}

async function saveCutoverConfigToServer() {
  try {
    await cutoverRemoteStore.saveRemoteSnapshot(
      buildDashboardCutoverConfigSnapshot(),
      authStore.displayName || authStore.user?.username || 'dashboard',
    )
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Server snapshot saved' : '服务端切换快照已保存')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to save server snapshot' : '保存服务端切换快照失败'))
  }
}

function buildDashboardAcceptancePacket() {
  return buildSharedAcceptancePacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    chains: dashboardPacketChains(),
  })
}

function exportAcceptancePacket() {
  downloadText(
    `neko_erp_first_wave_acceptance_packet_${new Date().toISOString().slice(0, 10)}.md`,
    buildDashboardAcceptancePacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Acceptance packet exported' : '放行包已导出')
}

async function copyPendingGateMatrix() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(
    buildSharedPendingGateMatrix({
      english: preferencesStore.language === 'en-US',
      rows: dashboardPendingGateRows(),
    }),
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Pending gates copied' : '未完成门槛已复制')
}

function exportPendingGateMatrix() {
  downloadText(
    `neko_erp_dashboard_pending_gate_matrix_${new Date().toISOString().slice(0, 10)}.md`,
    buildSharedPendingGateMatrix({
      english: preferencesStore.language === 'en-US',
      generatedAt: formatDateTime(new Date().toISOString()),
      rows: dashboardPendingGateRows(),
    }),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Pending gate matrix exported' : '未完成门槛矩阵已导出')
}

async function copyChainContactMatrix() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(
    buildSharedChainContactMatrix({
      english: preferencesStore.language === 'en-US',
      rows: dashboardContactMatrixRows(),
    }),
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Chain contacts copied' : '链路联系人已复制')
}

function exportChainContactMatrix() {
  downloadText(
    `neko_erp_dashboard_chain_contact_matrix_${new Date().toISOString().slice(0, 10)}.md`,
    buildSharedChainContactMatrix({
      english: preferencesStore.language === 'en-US',
      generatedAt: formatDateTime(new Date().toISOString()),
      rows: dashboardContactMatrixRows(),
    }),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Chain contact matrix exported' : '链路联系人矩阵已导出')
}

async function refreshPilotReminders() {
  pilotReminderLoading.value = true
  try {
    const cockpitModules = Array.from(new Set(firstWaveModules.value.map((item) => item.moduleKey).filter(supportsCutoverFinancialTraceModule)))
    const [reminders, cockpitEntries] = await Promise.all([
      fetchReminders({ limit: 120 }),
      Promise.all(cockpitModules.map(async (moduleKey) => {
        try {
          return [moduleKey, await fetchFinancialTraceCockpit(moduleKey, 8)] as const
        } catch {
          return [moduleKey, null] as const
        }
      })),
    ])
    pilotReminderItems.value = reminders.sort(compareReminderSeverity)
    moduleFinancialTraceCockpitMap.value = Object.fromEntries(
      cockpitEntries.filter((entry): entry is [ModuleKey, FinancialTraceCockpit] => Boolean(entry[1])),
    ) as Partial<Record<ModuleKey, FinancialTraceCockpit>>
  } catch (error: any) {
    pilotReminderItems.value = []
    moduleFinancialTraceCockpitMap.value = {}
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to load dashboard reminders' : '加载首页提醒失败'))
  } finally {
    pilotReminderLoading.value = false
  }
}

onMounted(() => {
  void refreshPilotReminders()
  if (!cutoverRemoteStore.hasRemoteSnapshot && !cutoverRemoteStore.remoteLoading) {
    void cutoverRemoteStore.loadRemoteSnapshot()
  }
})
</script>

<template>
  <div class="mb-workspace">
    <header class="mb-header">
      <div class="header-main">
        <nav class="mb-breadcrumb">{{ t('dashboard.breadcrumb') }}</nav>
        <div class="title-row">
          <h1 class="mb-page-title">{{ t('dashboard.title') }}</h1>
          <div class="header-actions">
            <span class="mb-chip">{{ t('dashboard.chipMode') }}</span>
            <span class="mb-chip secondary">{{ t('dashboard.chipTheme') }}</span>
          </div>
        </div>
        <p class="mb-subtitle">{{ t('dashboard.subtitle') }}</p>
      </div>
    </header>

    <main class="mb-content">
      <section class="pilot-summary-grid">
        <article class="pilot-hero mb-card">
          <div class="pilot-header">
            <div>
              <div class="pilot-kicker">{{ preferencesStore.language === 'en-US' ? 'Cutover Summary' : '切换摘要' }}</div>
              <h3>{{ preferencesStore.language === 'en-US' ? 'First-Wave Pilot Status' : '首批试点状态' }}</h3>
              <p>
                {{ preferencesStore.language === 'en-US'
                  ? 'Keep master data, sales, and purchase chains visible before widening the pilot scope.'
                  : '在扩大试点范围前，先把主数据、销售链和采购链的状态保持清晰可见。' }}
              </p>
            </div>
            <div class="hero-actions">
              <el-button @click="exportFirstWaveRehearsalPack">
                {{ preferencesStore.language === 'en-US' ? 'Export Rehearsal Pack' : '导出演练包' }}
              </el-button>
              <el-button @click="exportAcceptancePacket">
                {{ preferencesStore.language === 'en-US' ? 'Export Acceptance' : '导出放行包' }}
              </el-button>
              <el-button @click="openCutoverSettings(undefined, undefined, 'roleDesk')">
                {{ preferencesStore.language === 'en-US' ? 'Open Role Desk' : '打开责任台' }}
              </el-button>
              <el-button @click="openCutoverSettings(undefined, undefined, 'financeBatch')">
                {{ preferencesStore.language === 'en-US' ? 'Open Finance Batch' : '打开财务批量台' }}
              </el-button>
              <el-button @click="openCutoverSettings()">
                {{ preferencesStore.language === 'en-US' ? 'Open Cutover Settings' : '打开切换设置' }}
              </el-button>
              <el-button @click="openCutoverSettings(undefined, undefined, 'import')">
                {{ preferencesStore.language === 'en-US' ? 'Import Config' : '导入配置' }}
              </el-button>
              <el-button link type="primary" @click="showDashboardActionLibrary = !showDashboardActionLibrary">
                {{ showDashboardActionLibrary
                  ? (preferencesStore.language === 'en-US' ? 'Collapse Packages' : '收起次级打包动作')
                  : (preferencesStore.language === 'en-US' ? 'More Packages' : '展开更多打包动作') }}
              </el-button>
            </div>
          </div>
          <div v-if="showDashboardActionLibrary" class="hero-actions hero-actions-secondary">
            <el-button @click="exportDashboardBlockerPacket">
              {{ preferencesStore.language === 'en-US' ? 'Export Blockers' : '导出阻塞包' }}
            </el-button>
            <el-button @click="exportDashboardControlPacket">
              {{ preferencesStore.language === 'en-US' ? 'Export Control' : '导出控制包' }}
            </el-button>
            <el-button @click="exportDashboardRoleDeskQueuePacket">
              {{ preferencesStore.language === 'en-US' ? 'Export Role Queue' : '导出责任待办包' }}
            </el-button>
            <el-button @click="exportDashboardFinanceCloseBatchPacket">
              {{ preferencesStore.language === 'en-US' ? 'Export Finance Batch' : '导出财务关账批处理包' }}
            </el-button>
            <el-button @click="exportDashboardRollbackDrillPacket">
              {{ preferencesStore.language === 'en-US' ? 'Export Rollback Drill' : '导出回退演练包' }}
            </el-button>
            <el-button :loading="traceBundleBusy" @click="exportDashboardTraceBundle">
              {{ preferencesStore.language === 'en-US' ? 'Export Trace Bundle' : '导出追溯证据包' }}
            </el-button>
            <el-button :loading="traceBundleBusy" @click="copyDashboardTraceBundle">
              {{ preferencesStore.language === 'en-US' ? 'Copy Trace Bundle' : '复制追溯证据包' }}
            </el-button>
            <el-button @click="exportDashboardGuardrailRulesPacket">
              {{ preferencesStore.language === 'en-US' ? 'Export Guardrail Rules' : '导出 Guardrail 规则' }}
            </el-button>
            <el-button @click="copyDashboardControlPacket">
              {{ preferencesStore.language === 'en-US' ? 'Copy Control' : '复制控制包' }}
            </el-button>
            <el-button @click="exportPilotUserManualPack">
              {{ preferencesStore.language === 'en-US' ? 'Export Manual' : '导出手册' }}
            </el-button>
            <el-button @click="exportPilotConfirmationTemplate">
              {{ preferencesStore.language === 'en-US' ? 'Export Confirmation' : '导出确认模板' }}
            </el-button>
            <el-button @click="copyPendingGateMatrix">
              {{ preferencesStore.language === 'en-US' ? 'Copy Pending Gates' : '复制未完成门槛' }}
            </el-button>
            <el-button @click="exportPendingGateMatrix">
              {{ preferencesStore.language === 'en-US' ? 'Export Pending Gates' : '导出未完成门槛' }}
            </el-button>
            <el-button @click="exportCutoverConfigSnapshot">
              {{ preferencesStore.language === 'en-US' ? 'Export Config' : '导出配置' }}
            </el-button>
            <el-button @click="copyCutoverConfigSnapshot">
              {{ preferencesStore.language === 'en-US' ? 'Copy Config' : '复制配置' }}
            </el-button>
            <el-button @click="copyChainContactMatrix">
              {{ preferencesStore.language === 'en-US' ? 'Copy Chain Contacts' : '复制链路联系人' }}
            </el-button>
            <el-button @click="exportChainContactMatrix">
              {{ preferencesStore.language === 'en-US' ? 'Export Chain Contacts' : '导出链路联系人' }}
            </el-button>
            <el-button @click="exportPilotExceptionList">
              {{ preferencesStore.language === 'en-US' ? 'Export Exceptions' : '导出异常清单' }}
            </el-button>
          </div>
          <CompactNoticeBar
            v-else
            :message="preferencesStore.language === 'en-US'
              ? 'Secondary export, copy, guardrail, and rollback packages stay collapsed until operators explicitly need them.'
              : '次级导出、复制、Guardrail 和回退打包动作默认先收起，只有明确需要时再展开。'"
          />
          <div class="pilot-metric-groups">
            <section class="pilot-metric-group">
              <div class="pilot-metric-group__header">
                <strong>{{ preferencesStore.language === 'en-US' ? 'Core Cutover Posture' : '核心切换态势' }}</strong>
                <p>{{ preferencesStore.language === 'en-US' ? 'Keep launch posture, pending gates, and readiness in one compact block.' : '把启用范围、未完成门槛和就绪度收敛到一块，避免首页一上来就信息过载。' }}</p>
              </div>
              <div class="pilot-metrics">
                <div
                  v-for="item in dashboardCoreMetrics"
                  :key="item.key"
                  class="pilot-metric"
                  :class="{ warning: item.tone === 'warning' }"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </section>
            <section class="pilot-metric-group governance">
              <div class="pilot-metric-group__header">
                <strong>{{ preferencesStore.language === 'en-US' ? 'Governance Objects' : '治理对象' }}</strong>
                <p>{{ preferencesStore.language === 'en-US' ? 'Track role desk SLA, finance packs, and close task pressure without mixing them into the primary launch posture.' : '责任台 SLA、财务结果包和关账任务单独成组，避免和首批放行指标混在一起。' }}</p>
              </div>
              <div class="pilot-metrics">
                <div
                  v-for="item in dashboardGovernanceMetrics"
                  :key="item.key"
                  class="pilot-metric"
                  :class="{ warning: item.tone === 'warning' }"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </section>
          </div>
          <div class="pilot-remote-strip">
            <div>
              <div class="pilot-kicker">{{ preferencesStore.language === 'en-US' ? 'Shared Snapshot' : '共享快照' }}</div>
              <p>{{ dashboardRemoteStatus }}</p>
              <p v-if="dashboardRemoteDirty" class="remote-dirty-note">
                {{ preferencesStore.language === 'en-US' ? 'There are unsaved cutover changes on this desktop.' : '当前桌面存在尚未保存到共享快照的切换变更。' }}
              </p>
            </div>
            <div class="hero-actions compact">
              <el-button :loading="cutoverRemoteStore.remoteLoading" @click="loadCutoverConfigFromServer">
                {{ preferencesStore.language === 'en-US' ? 'Load Server Snapshot' : '载入服务端快照' }}
              </el-button>
              <el-button type="primary" :plain="!dashboardRemoteDirty" :loading="cutoverRemoteStore.remoteSaving" @click="saveCutoverConfigToServer">
                {{ preferencesStore.language === 'en-US' ? 'Save To Server' : '保存到服务端' }}
              </el-button>
            </div>
          </div>
        </article>

        <article class="pilot-panel mb-card">
          <div class="panel-title">{{ preferencesStore.language === 'en-US' ? 'Pilot Chains' : '试点链路' }}</div>
          <CompactNoticeBar
            inline
            :message="hiddenDashboardChainCount
              ? (preferencesStore.language === 'en-US'
                ? `Showing ${visibleDashboardChainRows.length} highest-pressure chains first. ${hiddenDashboardChainCount} more chains stay collapsed so the dashboard keeps its scanning speed.`
                : `默认先展示压力最高的 ${visibleDashboardChainRows.length} 条链路，另外 ${hiddenDashboardChainCount} 条先收起，避免首页链路说明刷满。`)
              : (preferencesStore.language === 'en-US'
                ? 'All pilot chains are currently visible.'
                : '当前试点链路已全部展开。')"
          >
            <template #actions>
              <el-button
                v-if="prioritizedDashboardChainRows.length > compactDashboardChainLimit"
                link
                type="primary"
                @click="showAllDashboardChains = !showAllDashboardChains"
              >
                {{ showAllDashboardChains
                  ? (preferencesStore.language === 'en-US' ? 'Collapse Chains' : '收起链路')
                  : (preferencesStore.language === 'en-US' ? 'Show All Chains' : '展开全部链路') }}
              </el-button>
            </template>
          </CompactNoticeBar>
          <div class="pilot-list">
            <div v-for="chain in visibleDashboardChainRows" :key="chain.key" class="pilot-row">
              <div>
                <strong>{{ preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel }}</strong>
                <p>{{ chain.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / ') }}</p>
                <p>
                  {{ preferencesStore.language === 'en-US' ? 'Owner' : '负责人' }}:
                  {{ chain.contacts.owner }} ·
                  {{ preferencesStore.language === 'en-US' ? 'Fallback' : '回退' }}:
                  {{ chain.contacts.fallbackOwner }}
                </p>
                <p>
                  {{ preferencesStore.language === 'en-US' ? 'Rehearsal' : '演练' }}:
                  {{ chain.contacts.rehearsalOwner }}
                </p>
                <p>
                  {{ preferencesStore.language === 'en-US' ? 'Confirmation' : '确认' }}:
                  {{ chain.contacts.pilotConfirmOwner }}
                </p>
                <p>
                  {{ preferencesStore.language === 'en-US' ? 'Reviewer' : '复核人' }}:
                  {{ chain.closeRoleSnapshot.reviewer }} ·
                  {{ preferencesStore.language === 'en-US' ? 'Finance' : '财务' }}:
                  {{ chain.closeRoleSnapshot.financeOwner }}
                </p>
                <p>
                  {{ preferencesStore.language === 'en-US' ? 'Acceptance Gates' : '放行门槛' }}:
                  {{ chain.readyCount }}/6 · {{ chain.gateSummary.label }}
                </p>
                <p>
                  {{ preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环' }}:
                  {{ chain.closedLoopSummary.label }}
                </p>
                <p>
                  {{ preferencesStore.language === 'en-US' ? 'Close Snapshot' : '关账快照' }}:
                  {{ chain.closeSummary.label }}
                </p>
                <p>
                  {{ preferencesStore.language === 'en-US' ? 'Close Checklist' : '关账清单' }}:
                  {{ summarizeCloseChecklist(chain.closeChecklist, preferencesStore.language === 'en-US') }}
                </p>
                <p>
                  {{ preferencesStore.language === 'en-US' ? 'Settlement Closure' : '结算闭环' }}:
                  {{ chain.settlementSummary.statusLabel }}
                </p>
                <p v-if="chain.financeCockpitSummary.enabled">
                  {{ preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱' }}:
                  {{ chain.financeCockpitSummary.label }}
                </p>
                <div v-if="chain.pendingLabels.length" class="pilot-pending-list">
                  <span v-for="label in chain.pendingLabels" :key="`${chain.key}-${label}`">{{ label }}</span>
                </div>
                <div class="pilot-pressure-list">
                  <span :class="`tone-${chain.closedLoopSummary.tone}`">
                    {{ preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环' }} · {{ chain.closedLoopSummary.label }}
                  </span>
                  <span :class="`tone-${resolveSettlementTone(chain.settlementSummary)}`">
                    {{ preferencesStore.language === 'en-US' ? 'Settlement' : '结算' }} · {{ chain.settlementSummary.statusLabel }}
                  </span>
                  <span :class="`tone-${resolveFinancialTraceTone(chain.financialTraceSummary)}`">
                    {{ preferencesStore.language === 'en-US' ? 'Trace' : '追溯' }} · {{ chain.financialTraceSummary.statusLabel }}
                  </span>
                  <span v-if="chain.financeCockpitSummary.enabled" :class="`tone-${resolveFinanceCockpitTone(chain.financeCockpitSummary)}`">
                    {{ preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱' }} · {{ chain.financeCockpitSummary.label }}
                  </span>
                  <span :class="`tone-${resolveRoleDeskTone(chain.roleDeskSummary)}`">
                    {{ preferencesStore.language === 'en-US' ? 'Role Desk' : '责任台' }} · {{ chain.roleDeskSummary.label }}
                  </span>
                </div>
                <div v-if="chain.reminderBadges.length" class="pilot-pressure-list">
                  <span
                    v-for="badge in chain.reminderBadges"
                    :key="`${chain.key}-${badge.key}`"
                    :class="`tone-${badge.tone}`"
                  >
                    {{ badge.label }} · {{ badge.count }}
                  </span>
                </div>
                <p v-if="chain.blockerLabels.length" class="pilot-pressure-note">
                  {{ preferencesStore.language === 'en-US' ? 'Suggested blockers' : '建议阻塞项' }}:
                  {{ chain.blockerLabels.join(' / ') }}
                </p>
                <p class="pilot-pressure-note">
                  {{
                    [
                      chain.closedLoopSummary.label,
                      chain.closedLoopSummary.missingLabels.length
                        ? `${preferencesStore.language === 'en-US' ? 'Missing' : '缺少'}: ${chain.closedLoopSummary.missingLabels.join(' / ')}`
                        : null,
                      chain.closedLoopSummary.staleLabels.length
                        ? `${preferencesStore.language === 'en-US' ? 'Stale' : '过期'}: ${chain.closedLoopSummary.staleLabels.join(' / ')}`
                        : null,
                    ].filter(Boolean).join(' · ')
                  }}
                </p>
                <p class="pilot-pressure-note">
                  {{ describeSettlementSummary(chain.settlementSummary) }}
                </p>
                <p class="pilot-pressure-note">
                  {{ describeFinancialTraceSummary(chain.financialTraceSummary) }}
                </p>
                <p v-if="chain.financeCockpitSummary.enabled" class="pilot-pressure-note">
                  {{ describeFinanceCockpitSummary(chain.financeCockpitSummary) }}
                </p>
                <p class="pilot-pressure-note">
                  {{ describeRoleDeskSummary(chain.roleDeskSummary) }}
                </p>
                <p class="pilot-pressure-note">
                  {{ chain.closeSummary.lines.join(' · ') }}
                </p>
                <p class="pilot-pressure-note">
                  {{ chain.closeChecklist.map((item) => `${item.label}: ${item.description}`).join(' · ') }}
                </p>
                <p
                  v-for="line in chain.closeActivityLines"
                  :key="`${chain.key}-${line}`"
                  class="pilot-pressure-note"
                >
                  {{ line }}
                </p>
              </div>
              <div class="pilot-row-actions">
                <el-tag :type="chain.closeSummary.tone" effect="plain">
                  {{ chain.enabled
                    ? `${preferencesStore.language === 'en-US' ? 'Enabled' : '已启用'} · ${chain.closeSummary.label}`
                    : (preferencesStore.language === 'en-US' ? 'Disabled' : '已关闭') }}
                </el-tag>
                <el-button size="small" :disabled="!chain.enabled" @click="openChainWorkbench(chain)">
                  {{ preferencesStore.language === 'en-US' ? 'Rehearsal' : '演练' }}
                </el-button>
                <el-button size="small" :disabled="!chain.enabled" @click="openChainWorkbench(chain, 'ops-close')">
                  {{ preferencesStore.language === 'en-US' ? 'Close Desk' : '关账台' }}
                </el-button>
                <el-button size="small" @click="openCutoverSettings(undefined, chain.key, 'handoff')">
                  {{ preferencesStore.language === 'en-US' ? 'Handoff' : '交接' }}
                </el-button>
                <el-button size="small" @click="openCutoverSettings(undefined, chain.key, 'gates')">
                  {{ preferencesStore.language === 'en-US' ? 'Gates' : '门槛' }}
                </el-button>
                <el-button size="small" @click="openCutoverSettings(undefined, chain.key, 'close')">
                  {{ preferencesStore.language === 'en-US' ? 'Close Summary' : '关账总览' }}
                </el-button>
                <el-button size="small" @click="openCutoverSettings(undefined, chain.key, 'ops')">
                  {{ preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环' }}
                </el-button>
                <el-button size="small" :disabled="!chain.topRisk?.recordId && !chain.topRiskQuery" @click="openChainTopRisk(chain)">
                  {{ preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险' }}
                </el-button>
                <el-button size="small" :disabled="!chain.financialTraceSummary.topRiskRecordId" @click="openChainTraceDocuments(chain)">
                  {{ preferencesStore.language === 'en-US' ? 'Documents' : '文档' }}
                </el-button>
                <el-button size="small" :disabled="!chain.financialTraceSummary.topRiskRecordId" @click="openChainTraceTimeline(chain)">
                  {{ preferencesStore.language === 'en-US' ? 'Timeline' : '时间轴' }}
                </el-button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="module-section">
        <h3 class="section-title">{{ preferencesStore.language === 'en-US' ? 'First-Wave Modules' : '首批试点模块' }}</h3>
        <div class="pilot-module-grid">
          <button
            v-for="item in firstWaveModules"
            :key="item.moduleKey"
            type="button"
            class="pilot-module-card mb-card"
            :class="{ disabled: !item.enabled }"
            @click="item.enabled && item.route ? router.push(item.route) : openCutoverSettings(item.moduleKey)"
          >
            <div class="pilot-module-header">
              <strong>{{ item.title }}</strong>
              <span class="pilot-badge" :class="{ off: !item.enabled }">
                {{ item.enabled ? (preferencesStore.language === 'en-US' ? 'Pilot' : '试点') : (preferencesStore.language === 'en-US' ? 'Off' : '已关闭') }}
              </span>
            </div>
            <p>
              {{ item.enabled
                ? (preferencesStore.language === 'en-US' ? 'Open the active pilot workbench directly.' : '直接进入当前启用中的试点工作台。')
                : (preferencesStore.language === 'en-US' ? 'This module is rolled back. Open cutover settings to restore it.' : '该模块当前处于回退状态，去切换设置恢复。') }}
            </p>
            <div class="module-stage-strip">
              <span>{{ preferencesStore.language === 'en-US' ? 'Chain' : '链路' }}: {{ item.chainLabel || '-' }}</span>
              <span>{{ preferencesStore.language === 'en-US' ? 'Stages' : '阶段' }}: {{ item.stageCount }}</span>
            </div>
            <div class="module-gate-strip">
              <span
                v-for="chain in item.chains"
                :key="`${item.moduleKey}-${chain.key}`"
                :class="`tone-${chain.summary.tone}`"
              >
                {{ chain.label }} · {{ chain.summary.label }}
              </span>
            </div>
            <div class="module-evidence-strip">
              <span>
                {{ preferencesStore.language === 'en-US' ? 'Required Evidence' : '必备证据' }} ·
                {{ item.evidence.requiredCount }}
              </span>
              <span>
                {{ preferencesStore.language === 'en-US' ? 'Recommended Upload' : '推荐上传' }} ·
                {{ item.evidence.recommendedLabel }}
              </span>
            </div>
            <p class="module-timeline-hint">{{ item.evidence.timelineHint }}</p>
          </button>
        </div>
      </section>

      <section class="module-section">
        <h3 class="section-title">{{ preferencesStore.language === 'en-US' ? 'Operator Handoff Desks' : '操作交接台' }}</h3>
        <div v-if="pilotReminderLoading" class="ops-loading mb-card">
          {{ preferencesStore.language === 'en-US' ? 'Loading module pressure...' : '正在加载模块压力...' }}
        </div>
        <div v-else>
          <CompactNoticeBar
            inline
            :message="showDashboardModuleOps
              ? (preferencesStore.language === 'en-US'
                ? 'Module handoff desks are expanded. Collapse them when you return to chain-level scanning.'
                : '模块交接台已展开，回到链路扫描时可以再次收起。')
              : (preferencesStore.language === 'en-US'
                ? `Operator handoff desks are collapsed by default. ${dashboardModuleOpsSummary.blocked} desks still carry blockers, ${dashboardModuleOpsSummary.critical} are critical, and ${dashboardModuleOpsSummary.warning} remain warning-level.`
                : `操作交接台默认收起。当前仍有 ${dashboardModuleOpsSummary.blocked} 个台面带阻塞，${dashboardModuleOpsSummary.critical} 个为严重，${dashboardModuleOpsSummary.warning} 个为警告。`)"
          >
            <template #actions>
              <el-button link type="primary" @click="showDashboardModuleOps = !showDashboardModuleOps">
                {{ showDashboardModuleOps
                  ? (preferencesStore.language === 'en-US' ? 'Collapse Handoff Desks' : '收起交接台')
                  : (preferencesStore.language === 'en-US' ? 'Expand Handoff Desks' : '展开交接台') }}
              </el-button>
            </template>
          </CompactNoticeBar>
          <div v-if="showDashboardModuleOps" class="ops-module-grid">
            <article
              v-for="row in moduleOpsRows"
              :key="row.moduleKey"
              class="ops-module-card mb-card"
              :class="{ disabled: !row.enabled }"
            >
              <div class="ops-module-head">
                <div>
                  <strong>{{ row.title }}</strong>
                  <p>{{ row.enabled
                    ? (preferencesStore.language === 'en-US' ? 'Pilot workbench ready for handoff and rollback drill.' : '试点工作台已可用于交接和回退演练。')
                    : (preferencesStore.language === 'en-US' ? 'Module is rolled back. Restore before operating.' : '模块已回退，操作前需要先恢复。') }}</p>
                </div>
                <span class="ops-risk-pill" :class="{ critical: row.critical, warning: !row.critical && row.warning }">
                  {{ row.critical ? row.critical : row.warning ? row.warning : row.reminders }}
                </span>
              </div>
              <div class="ops-module-meta">
                <span>{{ preferencesStore.language === 'en-US' ? 'Reminders' : '提醒' }} {{ row.reminders }}</span>
                <span>{{ preferencesStore.language === 'en-US' ? 'Critical' : '严重' }} {{ row.critical }}</span>
                <span>{{ preferencesStore.language === 'en-US' ? 'Warning' : '警告' }} {{ row.warning }}</span>
              </div>
              <div v-if="row.reminderBadges.length" class="ops-reminder-badges">
                <span
                  v-for="badge in row.reminderBadges"
                  :key="`${row.moduleKey}-${badge.key}`"
                  :class="`tone-${badge.tone}`"
                >
                  {{ badge.label }} · {{ badge.count }}
                </span>
              </div>
              <div class="ops-owner-chips">
                <span v-for="chain in row.chainContacts" :key="chain.key">
                  {{ chain.label }} · {{ preferencesStore.language === 'en-US' ? 'Owner' : '负责人' }}: {{ chain.contacts.owner }} · {{ preferencesStore.language === 'en-US' ? 'Confirm' : '确认' }}: {{ chain.contacts.pilotConfirmOwner }}
                </span>
              </div>
            <div class="ops-gate-summary">
              <span
                v-for="summary in row.gateSummaries"
                :key="`${row.moduleKey}-${summary.label}`"
                :class="`tone-${summary.tone}`"
              >
                {{ summary.label }} · {{ summary.readyCount }}/{{ summary.totalCount }}
              </span>
              <span :class="`tone-${row.closeSummary.tone}`">
                {{ preferencesStore.language === 'en-US' ? 'Close' : '关账' }} · {{ row.closeSummary.label }}
              </span>
              <span :class="`tone-${resolveSettlementTone(row.settlementSummary)}`">
                {{ preferencesStore.language === 'en-US' ? 'Settlement' : '结算' }} · {{ row.settlementSummary.statusLabel }}
              </span>
              <span :class="`tone-${resolveFinancialTraceTone(row.financialTraceSummary)}`">
                {{ preferencesStore.language === 'en-US' ? 'Trace' : '追溯' }} · {{ row.financialTraceSummary.statusLabel }}
              </span>
              <span v-if="row.financeCockpitSummary.enabled" :class="`tone-${resolveFinanceCockpitTone(row.financeCockpitSummary)}`">
                {{ preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱' }} · {{ row.financeCockpitSummary.label }}
              </span>
              <span :class="`tone-${resolveRoleDeskTone(row.roleDeskSummary)}`">
                {{ preferencesStore.language === 'en-US' ? 'Role Desk' : '责任台' }} · {{ row.roleDeskSummary.label }}
              </span>
            </div>
            <div class="ops-evidence-strip">
              <span>
                {{ preferencesStore.language === 'en-US' ? 'Required Evidence' : '必备证据' }} ·
                {{ row.evidence.requiredLabels.join(' / ') || '-' }}
              </span>
              <span>
                {{ preferencesStore.language === 'en-US' ? 'Recommended Upload' : '推荐上传' }} ·
                {{ row.evidence.recommendedLabel }}
              </span>
            </div>
            <p class="ops-timeline-hint">{{ row.evidence.timelineHint }}</p>
            <p class="ops-blocker-note">
              {{ describeSettlementSummary(row.settlementSummary) }}
            </p>
            <p class="ops-blocker-note">
              {{ describeFinancialTraceSummary(row.financialTraceSummary) }}
            </p>
            <p v-if="row.financeCockpitSummary.enabled" class="ops-blocker-note">
              {{ describeFinanceCockpitSummary(row.financeCockpitSummary) }}
            </p>
            <p class="ops-blocker-note">
              {{ describeRoleDeskSummary(row.roleDeskSummary) }}
            </p>
            <p class="ops-blocker-note">
              {{ row.closeSummary.lines.join(' · ') }}
            </p>
            <p class="ops-blocker-note">
              {{ preferencesStore.language === 'en-US' ? 'Checklist' : '清单' }}:
              {{ row.closeChecklistLabel }}
            </p>
            <p
              v-for="line in row.closeActivityLines"
              :key="`${row.moduleKey}-${line}`"
              class="ops-blocker-note"
            >
              {{ line }}
            </p>
            <p v-if="row.blockerLabels.length" class="ops-blocker-note">
              {{ preferencesStore.language === 'en-US' ? 'Suggested blockers' : '建议阻塞项' }}:
              {{ row.blockerLabels.join(' / ') }}
            </p>
            <div class="ops-module-actions">
              <el-button size="small" :disabled="!row.enabled" @click="openModuleSection(row.moduleKey, 'ops-handbook')">
                {{ preferencesStore.language === 'en-US' ? 'Handbook' : '手册' }}
              </el-button>
              <el-button size="small" :disabled="!row.enabled" @click="openModuleSection(row.moduleKey, 'ops-rehearsal')">
                {{ preferencesStore.language === 'en-US' ? 'Rehearsal' : '演练' }}
              </el-button>
              <el-button size="small" :disabled="!row.enabled" @click="openModuleSection(row.moduleKey, 'ops-close')">
                {{ preferencesStore.language === 'en-US' ? 'Close Desk' : '关账台' }}
              </el-button>
              <el-button size="small" :disabled="!row.enabled || !row.financeCockpitSummary.enabled" @click="openModuleSection(row.moduleKey, 'ops-settlement')">
                {{ preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱' }}
              </el-button>
              <el-button size="small" type="primary" :disabled="!row.enabled || (!row.topRisk?.recordId && !row.topRiskQuery)" @click="openModuleTopRisk(row)">
                {{ preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险' }}
              </el-button>
              <el-button size="small" @click="openCutoverSettings(row.moduleKey, row.chainContacts[0]?.key, 'close')">
                {{ preferencesStore.language === 'en-US' ? 'Close Summary' : '关账总览' }}
              </el-button>
              <el-button size="small" @click="openCutoverSettings(row.moduleKey, row.chainContacts[0]?.key, 'handoff')">
                {{ preferencesStore.language === 'en-US' ? 'Contacts' : '联系人' }}
              </el-button>
            </div>
          </article>
        </div>
        </div>
      </section>

      <section class="pilot-summary-grid launchpad-section">
        <article class="pilot-panel mb-card">
          <div class="panel-title">{{ preferencesStore.language === 'en-US' ? 'Pilot Launchpad' : '试点启动台' }}</div>
          <div class="launchpad-list">
            <div v-for="item in pilotLaunchpadItems" :key="item.moduleKey" class="launchpad-row">
              <div class="launchpad-copy">
                <strong>{{ item.title }}</strong>
                <p>
                  {{
                    item.latest
                      ? (preferencesStore.language === 'en-US'
                          ? `Latest: ${item.latest.label}`
                          : `最近记录：${item.latest.label}`)
                      : (preferencesStore.language === 'en-US'
                          ? 'No recent record yet. Start a fresh pilot record from here.'
                          : '当前还没有最近记录，可以直接从这里开始新的试点记录。')
                  }}
                </p>
              </div>
              <div class="launchpad-actions">
                <el-button
                  size="small"
                  :disabled="!item.enabled"
                  @click="openPilotModule(item.moduleKey, true)"
                >
                  {{ preferencesStore.language === 'en-US' ? 'New' : '新建' }}
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  :disabled="!item.enabled || !item.latest"
                  @click="reopenRecent(item.moduleKey)"
                >
                  {{ preferencesStore.language === 'en-US' ? 'Reopen Recent' : '重开最近对象' }}
                </el-button>
                <el-button
                  v-if="!item.enabled"
                  size="small"
                  type="warning"
                  @click="openCutoverSettings(item.moduleKey)"
                >
                  {{ preferencesStore.language === 'en-US' ? 'Restore' : '恢复' }}
                </el-button>
              </div>
            </div>
          </div>
        </article>

        <article class="pilot-panel mb-card">
          <div class="panel-title">{{ preferencesStore.language === 'en-US' ? 'Pilot Readiness' : '试点准备度' }}</div>
          <div class="readiness-list">
            <div v-for="item in readinessItems" :key="item.label" class="readiness-row">
              <div class="readiness-head">
                <strong>{{ item.label }}</strong>
                <span>{{ item.value }}</span>
              </div>
              <p>{{ item.description }}</p>
            </div>
          </div>
          <div class="panel-subtitle">
            {{ preferencesStore.language === 'en-US' ? 'Evidence Discipline' : '证据纪律' }}
          </div>
          <div class="readiness-list">
            <div class="readiness-row evidence-summary-row">
              <div class="readiness-head">
                <strong>{{ preferencesStore.language === 'en-US' ? 'Required Slots' : '必备槽位' }}</strong>
                <span>{{ evidenceTotals.required }}</span>
              </div>
              <p>
                {{ preferencesStore.language === 'en-US'
                  ? `Across ${evidenceTotals.total} first-wave modules, required files and timeline evidence should be prepared before cutover expands.`
                  : `首批 ${evidenceTotals.total} 个模块共定义 ${evidenceTotals.required} 个必备证据槽位，扩大切换前要提前备齐。` }}
              </p>
            </div>
            <div
              v-for="row in evidenceGuideRows"
              :key="`evidence-${row.moduleKey}`"
              class="readiness-row evidence-summary-row"
            >
              <div class="readiness-head">
                <strong>{{ row.title }}</strong>
                <span>{{ preferencesStore.language === 'en-US' ? `Req ${row.requiredCount}` : `必备 ${row.requiredCount}` }}</span>
              </div>
              <p>{{ preferencesStore.language === 'en-US' ? 'Required' : '必备' }}: {{ row.requiredLabels.join(' / ') || '-' }}</p>
              <p>{{ preferencesStore.language === 'en-US' ? 'Recommended Upload' : '推荐上传' }}: {{ row.recommendedLabel }}</p>
              <p>{{ row.timelineHint }}</p>
            </div>
          </div>
        </article>
      </section>

      <section class="pilot-summary-grid">
        <PilotReviewQueuePanel
          :title="preferencesStore.language === 'en-US' ? 'First-Wave Review Queue' : '首批审核队列'"
          :description="preferencesStore.language === 'en-US'
            ? 'Open the highest-risk pilot records directly from the dashboard.'
            : '直接从首页打开当前风险最高的首批试点记录。'"
          :module-keys="['resPartner', 'saleOrder', 'purchaseOrder', 'accountInvoice', 'stockPicking']"
          :limit="8"
        />

        <PilotRiskStatsPanel
          :title="preferencesStore.language === 'en-US' ? 'Pilot Risk Density' : '试点风险密度'"
          :description="preferencesStore.language === 'en-US'
            ? 'See which pilot chain currently carries the highest review pressure.'
            : '看清当前哪条试点链路承受的审核压力最高。'"
          :rows="pilotRiskRows"
        />
      </section>

      <section class="pilot-summary-grid">
        <article class="pilot-panel mb-card">
          <div class="panel-title">{{ preferencesStore.language === 'en-US' ? 'Governance Desks' : '治理工作台' }}</div>
          <p class="governance-section-copy">
            {{ preferencesStore.language === 'en-US'
              ? 'Batch review, role desk, and finance close desks stay collapsed on the dashboard by default. Operators expand them only when they need to intervene, otherwise they work from chain risk and review queue first.'
              : '批处理、责任台和财务关账台默认不在首页整块展开。只有需要介入治理时再展开，平时先看链路风险和审核队列。' }}
          </p>
          <SummaryCardGrid class="dashboard-governance-summary-grid" :items="dashboardGovernanceDeskCards" />
          <div class="launchpad-actions governance-toggle-actions">
            <el-button size="small" @click="openCutoverSettings(undefined, undefined, 'ops')">
              {{ preferencesStore.language === 'en-US' ? 'Open Governance Settings' : '打开治理设置' }}
            </el-button>
            <el-button size="small" type="primary" @click="showDashboardGovernanceDesks = !showDashboardGovernanceDesks">
              {{ showDashboardGovernanceDesks
                ? (preferencesStore.language === 'en-US' ? 'Collapse Governance Desks' : '收起治理工作台')
                : (preferencesStore.language === 'en-US' ? 'Expand Governance Desks' : '展开治理工作台') }}
            </el-button>
          </div>
        </article>
      </section>

      <section v-if="showDashboardGovernanceDesks" class="pilot-summary-grid">
        <PilotBatchActionPanel
          :title="preferencesStore.language === 'en-US' ? 'Pilot Batch Desk' : '试点批处理台'"
          :description="preferencesStore.language === 'en-US'
            ? 'Run chain-level exception exports and rollback reviews directly from the dashboard.'
            : '直接从首页执行链路级异常导出和回退核对。'"
          :rows="pilotRiskRows"
        />
      </section>

      <section v-if="showDashboardGovernanceDesks" class="pilot-summary-grid">
        <RoleDeskQueuePanel
          :title="preferencesStore.language === 'en-US' ? 'Role Desk Queue' : '责任待办台'"
          :description="preferencesStore.language === 'en-US'
            ? 'Review grouped owner, reviewer, finance, sign-off, and fallback queues from the dashboard.'
            : '直接在首页按负责人、复核人、财务、签收和回退角色查看聚合待办。'"
          :rows="dashboardRoleDeskPanelRows"
          :english="preferencesStore.language === 'en-US'"
        />

        <FinanceCloseBatchPanel
          :title="preferencesStore.language === 'en-US' ? 'Finance Close Batch Desk' : '财务关账批量台'"
          :description="preferencesStore.language === 'en-US'
            ? 'Open close, settlement, finance cockpit, and reconcile entry points without leaving the dashboard.'
            : '不离开首页，直接打开关账、结算、财务驾驶舱和对账入口。'"
          :rows="dashboardFinanceBatchRows"
          :english="preferencesStore.language === 'en-US'"
        />
      </section>

      <div v-for="section in groupedModules" :key="section.key" class="module-section">
        <h3 class="section-title">{{ section.label }}</h3>
        <div class="module-grid">
          <router-link 
            v-for="m in section.modules" 
            :key="m.key" 
            :to="m.route" 
            class="module-card mb-card"
          >
            <div class="card-icon"><el-icon><Collection /></el-icon></div>
            <div class="card-info">
              <div class="m-name">{{ moduleTitle(m.key) }}</div>
              <div class="m-desc">{{ moduleDescription(m.key) }}</div>
            </div>
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.mb-workspace { min-height: 100vh; background: var(--app-surface); color: var(--app-text); }

.mb-header { padding: 40px 48px; background: transparent; border-bottom: 1px solid var(--app-border); }
.mb-breadcrumb { font-size: 12px; color: var(--app-text-secondary); font-weight: 600; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px; }

.title-row { display: flex; justify-content: space-between; align-items: flex-end; }
.mb-page-title { font-size: 32px; font-weight: 700; margin: 0; color: var(--app-text); letter-spacing: -0.5px; }

.header-actions { display: flex; gap: 12px; }
.mb-chip { padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: 600; background: var(--app-panel); color: var(--app-text); border: 1px solid var(--app-border); box-shadow: var(--app-card-shadow); }
.mb-chip.secondary { background: transparent; color: var(--app-text-secondary); border: 1px solid transparent; box-shadow: none; }

.mb-subtitle { font-size: 14px; color: var(--app-text-secondary); margin-top: 12px; font-weight: 400; }

.mb-content { padding: 48px; max-width: 1440px; margin: 0 auto; }
.pilot-summary-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr); gap: 24px; margin-bottom: 48px; }
.pilot-hero,
.pilot-panel,
.pilot-module-card { background: var(--app-panel); border-radius: 16px; border: 1px solid var(--app-border); box-shadow: var(--app-card-shadow); }
.pilot-hero,
.pilot-panel { padding: 24px; }
.pilot-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.hero-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.hero-actions-secondary { margin-top: 14px; justify-content: flex-start; }
.pilot-kicker { font-size: 11px; font-weight: 700; color: var(--app-primary); text-transform: uppercase; letter-spacing: 0.08em; }
.pilot-header h3 { margin: 10px 0 8px; font-size: 24px; }
.pilot-header p { margin: 0; color: var(--app-text-secondary); font-size: 13px; line-height: 1.6; }
.pilot-metric-groups { margin-top: 20px; display: grid; gap: 16px; }
.pilot-metric-group { padding: 18px; border-radius: 16px; background: var(--app-muted-bg); border: 1px solid var(--app-border); }
.pilot-metric-group.governance { background: color-mix(in srgb, var(--app-primary) 5%, var(--app-muted-bg)); }
.pilot-metric-group__header strong { display: block; color: var(--app-text); font-size: 14px; }
.pilot-metric-group__header p { margin: 8px 0 0; color: var(--app-text-secondary); font-size: 12px; line-height: 1.5; }
.pilot-metrics { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.pilot-metric { padding: 16px 18px; border-radius: 14px; background: color-mix(in srgb, var(--app-primary) 7%, transparent); }
.pilot-metric.warning { background: rgba(245, 158, 11, 0.12); }
.pilot-metric span { display: block; color: var(--app-text-secondary); font-size: 12px; }
.pilot-metric strong { display: block; margin-top: 8px; font-size: 22px; color: var(--app-text); }
.pilot-remote-strip {
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid var(--app-border);
  background: var(--app-muted-bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.pilot-remote-strip p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.remote-dirty-note {
  color: #d97706;
  font-weight: 600;
}
.hero-actions.compact {
  justify-content: flex-end;
  align-items: center;
}
.pilot-list { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }
.pilot-row { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; padding: 14px 16px; border-radius: 14px; background: var(--app-muted-bg); }
.pilot-row strong { color: var(--app-text); }
.pilot-row p { margin: 8px 0 0; color: var(--app-text-secondary); font-size: 12px; line-height: 1.5; }
.pilot-pending-list,
.pilot-pressure-list,
.module-gate-strip,
.ops-gate-summary,
.ops-reminder-badges {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pilot-pending-list span,
.pilot-pressure-list span,
.module-gate-strip span,
.ops-gate-summary span,
.ops-reminder-badges span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
  font-size: 11px;
  font-weight: 700;
}
.module-gate-strip span.tone-success,
.ops-gate-summary span.tone-success {
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
}
.module-gate-strip span.tone-danger,
.ops-gate-summary span.tone-danger {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}
.pilot-pressure-list span.tone-success,
.ops-reminder-badges span.tone-success {
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
}
.pilot-pressure-list span.tone-danger,
.ops-reminder-badges span.tone-danger {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}
.pilot-pressure-note,
.ops-blocker-note {
  margin: 10px 0 0;
  color: #d97706;
  font-size: 12px;
  line-height: 1.5;
}
.pilot-row-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.launchpad-section { margin-bottom: 48px; }
.governance-section-copy {
  margin: 12px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.dashboard-governance-summary-grid {
  margin-top: 16px;
}
.governance-toggle-actions {
  margin-top: 16px;
}
.pilot-module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; margin-bottom: 48px; }
.pilot-module-card { padding: 18px 20px; text-align: left; cursor: pointer; }
.pilot-module-card.disabled { opacity: 0.72; }
.pilot-module-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pilot-module-header strong { color: var(--app-text); font-size: 15px; }
.pilot-badge { padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; background: color-mix(in srgb, var(--app-primary) 10%, transparent); color: var(--app-primary); text-transform: uppercase; }
.pilot-badge.off { background: rgba(148, 163, 184, 0.14); color: var(--app-text-secondary); }
.pilot-module-card p { margin: 12px 0 0; color: var(--app-text-secondary); font-size: 12px; line-height: 1.5; }
.module-stage-strip {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}
.module-stage-strip span {
  color: var(--app-text-secondary);
  font-size: 11px;
  line-height: 1.45;
}
.module-evidence-strip,
.ops-evidence-strip {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.module-evidence-strip span,
.ops-evidence-strip span {
  padding: 5px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  color: var(--app-primary);
  font-size: 11px;
  font-weight: 700;
}
.module-timeline-hint,
.ops-timeline-hint {
  margin: 12px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.ops-loading { padding: 20px; color: var(--app-text-secondary); font-size: 13px; }
.ops-module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; margin-bottom: 48px; }
.ops-module-card { padding: 18px 20px; background: var(--app-panel); border-radius: 16px; border: 1px solid var(--app-border); box-shadow: var(--app-card-shadow); }
.ops-module-card.disabled { opacity: 0.72; }
.ops-module-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.ops-module-head strong { color: var(--app-text); font-size: 15px; }
.ops-module-head p { margin: 8px 0 0; color: var(--app-text-secondary); font-size: 12px; line-height: 1.5; }
.ops-risk-pill { min-width: 34px; height: 34px; padding: 0 10px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; color: var(--app-primary); background: color-mix(in srgb, var(--app-primary) 10%, transparent); font-size: 12px; font-weight: 800; }
.ops-risk-pill.warning { color: #d97706; background: rgba(245, 158, 11, 0.14); }
.ops-risk-pill.critical { color: #dc2626; background: rgba(239, 68, 68, 0.14); }
.ops-module-meta { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; color: var(--app-text-secondary); font-size: 11px; }
.ops-module-meta span { padding: 4px 8px; border-radius: 999px; background: var(--app-muted-bg); }
.ops-owner-chips { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.ops-owner-chips span {
  padding: 5px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  color: var(--app-primary);
  font-size: 11px;
  font-weight: 700;
}
.ops-module-actions { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.launchpad-list,
.readiness-list { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }
.launchpad-row,
.readiness-row { padding: 14px 16px; border-radius: 14px; background: var(--app-muted-bg); }
.launchpad-row { display: flex; justify-content: space-between; gap: 18px; align-items: center; }
.launchpad-copy strong,
.readiness-head strong { color: var(--app-text); }
.launchpad-copy p,
.readiness-row p { margin: 8px 0 0; color: var(--app-text-secondary); font-size: 12px; line-height: 1.5; }
.launchpad-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.readiness-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.readiness-head span { font-size: 11px; font-weight: 700; color: var(--app-primary); text-transform: uppercase; }
.panel-subtitle {
  margin-top: 20px;
  font-size: 12px;
  font-weight: 700;
  color: var(--app-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.evidence-summary-row p + p {
  margin-top: 6px;
}
.module-section { margin-bottom: 56px; }
.section-title { font-size: 13px; font-weight: 600; color: var(--app-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid var(--app-border); }
.module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }

.module-card { display: flex; align-items: center; padding: 24px; text-decoration: none; color: inherit; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); background: var(--app-panel); border-radius: 16px; border: 1px solid var(--app-border); box-shadow: var(--app-card-shadow); }
.module-card:hover { transform: translateY(-4px); border-color: var(--app-border-strong); }
.card-icon { width: 44px; height: 44px; background: color-mix(in srgb, var(--app-primary) 10%, transparent); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--app-primary); font-size: 20px; transition: background 0.3s; }
.module-card:hover .card-icon { background: color-mix(in srgb, var(--app-primary) 16%, transparent); }
.card-info { margin-left: 20px; }
.m-name { font-size: 15px; font-weight: 600; color: var(--app-text); }
.m-desc { font-size: 12px; color: var(--app-text-secondary); margin-top: 6px; line-height: 1.4; }

@media (max-width: 1080px) {
  .pilot-summary-grid { grid-template-columns: 1fr; }
  .pilot-header { flex-direction: column; }
  .pilot-remote-strip { flex-direction: column; align-items: stretch; }
  .pilot-row-actions { align-items: flex-start; }
  .launchpad-row { flex-direction: column; align-items: stretch; }
  .ops-module-actions,
  .launchpad-actions { justify-content: flex-start; }
}
</style>
