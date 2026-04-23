<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchFinancialTraceCockpit, type FinancialTraceCockpit } from '@/api/financial-trace'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import { visibleModuleManifests, type ModuleKey } from '@/config/module-manifest'
import { findSidebarSectionByModuleKey } from '@/config/sidebar-schema'
import { moduleConfigMap } from '@/config/modules'
import { executeEntityAction } from '@/api/modules'
import { useAuthStore } from '@/stores/auth'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import { useCutoverRemoteStore } from '@/stores/cutover-remote'
import { useCutoverStore } from '@/stores/cutover'
import { usePilotReviewStore } from '@/stores/pilot-review'
import { usePreferencesStore } from '@/stores/preferences'
import { useCommandCenterStore } from '@/stores/command-center'
import { SHORTCUT_EVENT_MAP } from '@/stores/shortcuts'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { formatDateTime } from '@/utils/format'
import {
  buildCutoverConfigSnapshot,
  resolveChainRouteName,
  resolveCutoverSettingsQuery,
  resolveDefaultChainContacts,
  resolveDefaultChainGateState,
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
  supportsPaymentLinkageModule,
  supportsQuantImpactModule,
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
  buildSharedChainGatePacket,
  buildSharedChainRunbookContent,
  buildSharedCutoverBlockerPacket,
  buildSharedCutoverControlPacket,
  buildSharedPendingGateMatrix,
  buildSharedPilotUserManualPack,
  type CutoverContactMatrixRow,
  type CutoverPacketChain,
  type CutoverPacketModule,
  type CutoverPendingGateRow,
} from '@/utils/cutover-packets'
import {
  buildFinancialTraceBundleFilename,
  buildFinancialTracePacketRefLabel,
} from '@/utils/financial-trace-packets'
import { downloadCsv, downloadText } from '@/utils/export'
import { buildCutoverClosedLoopSummary } from '@/utils/cutover-ops'
import { buildModuleFinancialTraceSummary } from '@/utils/financial-trace'
import { buildChainSettlementSummary, buildModuleSettlementSummary } from '@/utils/first-wave-settlement'
import { buildReminderFamilyBlockers, compareReminderSeverity, pickTopReminder, resolveReminderSection } from '@/utils/reminders'
import { listSysScriptPresets } from '@/utils/sys-script-presets'
import {
  buildCutoverContactRows,
  buildCutoverControlModules,
  buildCutoverPacketChains,
  buildCutoverPacketModules,
  buildCutoverPendingGateRows,
} from '@/utils/cutover-control'
import {
  buildChainCutoverFinancialTraceState,
  buildCutoverFinancialTraceState,
  supportsCutoverFinancialTraceModule,
  type CutoverFinancialTraceState,
} from '@/utils/cutover-financial-trace'
import {
  buildSharedGuardrailRulesPacket,
  buildSharedRollbackDrillPacket,
} from '@/utils/cutover-protection'
import { buildModuleWorkbenchRouteQuery } from '@/utils/module-navigation'

interface CommandItem {
  id: string
  title: string
  subtitle: string
  icon: string
  badge: string
  disabled?: boolean
  action: () => Promise<void> | void
}

interface CommandSection {
  key: string
  title: string
  items: CommandItem[]
}

const visible = ref(false)
const runningItemId = ref('')
const search = ref('')
const router = useRouter()
const authStore = useAuthStore()
const cutoverOpsStore = useCutoverOpsStore()
const preferencesStore = usePreferencesStore()
const commandCenterStore = useCommandCenterStore()
const cutoverRemoteStore = useCutoverRemoteStore()
const cutoverStore = useCutoverStore()
const pilotReviewStore = usePilotReviewStore()
const { moduleTitle, t } = useI18n()
const isEnglish = computed(() => preferencesStore.language === 'en-US')
const pilotReminderItems = ref<ReminderRecord[]>([])
const moduleFinancialTraceCockpitMap = ref<Partial<Record<ModuleKey, FinancialTraceCockpit>>>({})
const commandRemoteDirty = computed(() =>
  cutoverRemoteStore.isSnapshotDirty(buildCommandCutoverSnapshot()),
)

function buildCommandCutoverSnapshot() {
  const firstWaveModules = cutoverStore.firstWaveModules.map((moduleKey) => ({
    moduleKey,
    title: moduleTitle(moduleKey),
    enabled: cutoverStore.isModuleEnabled(moduleKey),
    chains: cutoverStore
      .chainsForModule(moduleKey)
      .map((chain) => (isEnglish.value ? chain.enLabel : chain.zhLabel))
      .join(' / '),
    overridden: cutoverStore.moduleOverrides[moduleKey] !== undefined,
  }))
  return buildCutoverConfigSnapshot({
    locale: preferencesStore.language,
    chainStates: cutoverStore.chainStates,
    moduleOverrides: cutoverStore.moduleOverrides,
    chainContacts: cutoverStore.chainContacts,
    chainGateStates: cutoverStore.chainGateStates,
    firstWaveModules,
    reviewedCount: pilotReviewStore.reviewedCount,
    snoozedCount: pilotReviewStore.snoozedCount,
    operations: cutoverOpsStore.snapshotData(),
  })
}

function remoteSnapshotSubtitle() {
  if (commandRemoteDirty.value) {
    return isEnglish.value
      ? 'The current desktop cutover state differs from the shared server baseline. Save or reload before handoff.'
      : '当前桌面切换状态与共享服务端基线不一致，交接前请先保存或重新载入。'
  }
  if (cutoverRemoteStore.remoteUpdatedAt) {
    return isEnglish.value
      ? `Load or save the shared server snapshot. Last update: ${cutoverRemoteStore.remoteUpdatedAt}`
      : `载入或保存共享服务端快照。最近更新时间：${cutoverRemoteStore.remoteUpdatedAt}`
  }
  return isEnglish.value
    ? 'Load or save the shared server snapshot used across pilot desktops'
    : '载入或保存多台试点桌面共享的服务端切换快照'
}

function buildCommandModuleFinancialTraceState(moduleKey: ModuleKey): CutoverFinancialTraceState {
  const reminders = pilotReminderItems.value
    .filter((item) => item.moduleKey === moduleKey)
    .map((item) => ({
      type: item.type,
      severity: item.severity,
    }))
  const summary = buildModuleFinancialTraceSummary({
    moduleKey,
    isEnglish: isEnglish.value,
    reminders,
  })
  return buildCutoverFinancialTraceState({
    moduleKey,
    moduleLabel: moduleTitle(moduleKey),
    isEnglish: isEnglish.value,
    summary,
    cockpit: moduleFinancialTraceCockpitMap.value[moduleKey] || null,
  })
}

function buildCommandChainFinancialTraceState(moduleKeys: ModuleKey[]) {
  return buildChainCutoverFinancialTraceState({
    isEnglish: isEnglish.value,
    moduleStates: moduleKeys
      .map((moduleKey) => ({
        moduleKey,
        moduleLabel: moduleTitle(moduleKey),
        state: buildCommandModuleFinancialTraceState(moduleKey),
      }))
      .filter((item) => item.state.expectedCount > 0 || item.state.recordRefs.length > 0),
  })
}

function buildCommandModuleFinancialTracePacketRefs(
  moduleKey: ModuleKey,
  state = buildCommandModuleFinancialTraceState(moduleKey),
) {
  if (!supportsCutoverFinancialTraceModule(moduleKey) || !state.topRiskRecordId) return []
  const date = new Date().toISOString().slice(0, 10)
  const refs = [
    buildFinancialTracePacketRefLabel({
      english: isEnglish.value,
      moduleKey,
      moduleLabel: moduleTitle(moduleKey),
      recordId: state.topRiskRecordId,
      recordRef: state.topRiskRecordRef,
      date,
    }),
  ]
  if (moduleFinancialTraceCockpitMap.value[moduleKey]?.records.length) {
    refs.push(
      `${moduleTitle(moduleKey)} · ${isEnglish.value ? 'bundle' : '证据包'} -> ${buildFinancialTraceBundleFilename({
        scope: moduleKey,
        date,
      })}`,
    )
  }
  return refs
}

function buildCommandChainFinancialTracePacketRefs(moduleKeys: ModuleKey[]) {
  return moduleKeys
    .flatMap((moduleKey) =>
      buildCommandModuleFinancialTracePacketRefs(moduleKey, buildCommandModuleFinancialTraceState(moduleKey)),
    )
    .slice(0, 4)
}

function buildModuleTraceQuery(moduleKey: ModuleKey, section = 'traceability') {
  const state = buildCommandModuleFinancialTraceState(moduleKey)
  if (!state.topRiskModuleKey || !state.topRiskRecordId) return null
  return {
    routeName: state.topRiskModuleKey,
    query: {
      detailId: String(state.topRiskRecordId),
      section,
      relatedTo: state.topRiskModuleKey,
    },
    state,
  }
}

function buildChainTraceQuery(moduleKeys: ModuleKey[], section = 'traceability') {
  const state = buildCommandChainFinancialTraceState(moduleKeys)
  if (!state.topRiskModuleKey || !state.topRiskRecordId) return null
  return {
    routeName: state.topRiskModuleKey,
    query: {
      detailId: String(state.topRiskRecordId),
      section,
      relatedTo: state.topRiskModuleKey,
    },
    state,
  }
}

function buildCommandChainFinanceCockpitSummary(chainKey: 'masterData' | 'sales' | 'purchase', moduleKeys: ModuleKey[]) {
  const reminders = pilotReminderItems.value.filter((item) => moduleKeys.includes(item.moduleKey as ModuleKey))
  const settlementSummary = buildChainSettlementSummary({
    moduleKeys,
    isEnglish: isEnglish.value,
    reminders: reminders.map((item) => ({
      moduleKey: item.moduleKey as ModuleKey,
      type: item.type,
      severity: item.severity,
    })),
  })
  const financialTraceSummary = buildCommandChainFinancialTraceState(moduleKeys)
  return buildChainFinanceCockpitSummary({
    chainKey,
    isEnglish: isEnglish.value,
    reminders,
    settlementSummary,
    financialTraceSummary,
    blockerLabels: buildReminderFamilyBlockers(reminders, isEnglish.value),
  })
}

function buildCommandModuleFinanceCockpitSummary(moduleKey: ModuleKey) {
  const reminders = pilotReminderItems.value.filter((item) => item.moduleKey === moduleKey)
  const settlementSummary = buildModuleSettlementSummary({
    moduleKey,
    isEnglish: isEnglish.value,
    reminders,
  })
  const financialTraceSummary = buildCommandModuleFinancialTraceState(moduleKey)
  return buildModuleFinanceCockpitSummary({
    moduleKey,
    isEnglish: isEnglish.value,
    reminders,
    settlementSummary,
    financialTraceSummary,
    blockerLabels: buildReminderFamilyBlockers(reminders, isEnglish.value),
  })
}

function buildCommandChainRoleDeskSummary(chainKey: 'masterData' | 'sales' | 'purchase', moduleKeys: ModuleKey[]) {
  const contacts = cutoverStore.chainContactFor(chainKey, resolveDefaultChainContacts(chainKey, isEnglish.value))
  const reminders = pilotReminderItems.value.filter((item) => moduleKeys.includes(item.moduleKey as ModuleKey))
  const gateState = cutoverStore.chainGateStateFor(chainKey, resolveDefaultChainGateState())
  const gatePendingCount = [
    gateState.smokeReady,
    gateState.workbenchReady,
    gateState.rollbackReady,
    gateState.traceabilityReady,
    gateState.manualReady,
    gateState.pilotConfirmed,
  ].filter((item) => !item).length
  const latestDrill = cutoverOpsStore.latestRollbackDrill(chainKey)
  const latestSignoff = cutoverOpsStore.latestPilotSignoff(chainKey)
  const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', chainKey)
  const closedLoopSummary = buildCutoverClosedLoopSummary({
    isEnglish: isEnglish.value,
    latestDrill,
    latestSignoff,
    latestExceptionExport,
  })
  const settlementSummary = buildChainSettlementSummary({
    moduleKeys,
    isEnglish: isEnglish.value,
    reminders: reminders.map((item) => ({
      moduleKey: item.moduleKey as ModuleKey,
      type: item.type,
      severity: item.severity,
    })),
  })
  const financialTraceSummary = buildCommandChainFinancialTraceState(moduleKeys)
  const financeCockpitSummary = buildCommandChainFinanceCockpitSummary(chainKey, moduleKeys)
  const closeChecklist = buildChainCloseChecklist({
    chainKey,
    isEnglish: isEnglish.value,
    gatePendingCount,
    settlementIssueCount: settlementSummary.missingCount + settlementSummary.warningCount,
    financialTraceIssueCount: financialTraceSummary.missingCount + financialTraceSummary.warningCount,
    closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
    paymentLinkageIssueCount: countPaymentLinkageIssues(reminders),
    blockerLabels: buildReminderFamilyBlockers(reminders, isEnglish.value),
  })
  return buildRoleDeskSummary({
    isEnglish: isEnglish.value,
    roleSnapshot: buildCloseRoleSnapshot({
      contacts,
      isEnglish: isEnglish.value,
      chainKey,
    }),
    closeChecklist,
    closeLabel: summarizeCloseChecklist(closeChecklist, isEnglish.value),
    financeCockpitSummary,
  })
}

function buildCommandModuleRoleDeskSummary(moduleKey: ModuleKey) {
  const primaryChain = cutoverStore.chainsForModule(moduleKey)[0]
  const reminders = pilotReminderItems.value.filter((item) => item.moduleKey === moduleKey)
  const settlementSummary = buildModuleSettlementSummary({
    moduleKey,
    isEnglish: isEnglish.value,
    reminders,
  })
  const financialTraceSummary = buildCommandModuleFinancialTraceState(moduleKey)
  const financeCockpitSummary = buildCommandModuleFinanceCockpitSummary(moduleKey)
  const gatePendingCount = cutoverStore
    .chainsForModule(moduleKey)
    .reduce((sum, chain) => {
      const state = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
      return sum + [
        state.smokeReady,
        state.workbenchReady,
        state.rollbackReady,
        state.traceabilityReady,
        state.manualReady,
        state.pilotConfirmed,
      ].filter((item) => !item).length
    }, 0)
  const latestDrill = cutoverStore.chainsForModule(moduleKey)
    .map((chain) => cutoverOpsStore.latestRollbackDrill(chain.key))
    .filter(Boolean)
    .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null
  const latestSignoff = cutoverStore.chainsForModule(moduleKey)
    .map((chain) => cutoverOpsStore.latestPilotSignoff(chain.key))
    .filter(Boolean)
    .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null
  const latestExceptionExport = cutoverStore.chainsForModule(moduleKey)
    .map((chain) => cutoverOpsStore.latestExceptionExport('chain', chain.key))
    .filter(Boolean)
    .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null
  const closedLoopSummary = buildCutoverClosedLoopSummary({
    isEnglish: isEnglish.value,
    latestDrill,
    latestSignoff,
    latestExceptionExport,
  })
  const paymentLinkageSummary = buildPaymentLinkageGovernanceSummary({
    moduleKey,
    isEnglish: isEnglish.value,
    reminders,
    settlementSummary,
    financialTraceSummary,
  })
  const quantImpactSummary = buildQuantImpactGovernanceSummary({
    moduleKey,
    isEnglish: isEnglish.value,
    reminders,
    settlementSummary,
    financialTraceSummary,
    pendingGateCount: gatePendingCount,
    blockerLabels: buildReminderFamilyBlockers(reminders, isEnglish.value),
  })
  const closeChecklist = buildModuleCloseChecklist({
    moduleKey,
    isEnglish: isEnglish.value,
    gatePendingCount,
    settlementIssueCount: settlementSummary.missingCount + settlementSummary.warningCount,
    financialTraceIssueCount: financialTraceSummary.missingCount + financialTraceSummary.warningCount,
    closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
    paymentLinkageIssueCount: paymentLinkageSummary.issueCount,
    quantImpactIssueCount: quantImpactSummary.issueCount,
    blockerLabels: buildReminderFamilyBlockers(reminders, isEnglish.value),
  })
  return buildRoleDeskSummary({
    isEnglish: isEnglish.value,
    roleSnapshot: primaryChain
      ? buildCloseRoleSnapshot({
          contacts: cutoverStore.chainContactFor(primaryChain.key, resolveDefaultChainContacts(primaryChain.key, isEnglish.value)),
          isEnglish: isEnglish.value,
          moduleKey,
          chainKey: primaryChain.key,
        })
      : null,
    closeChecklist,
    closeLabel: summarizeCloseChecklist(closeChecklist, isEnglish.value),
    financeCockpitSummary,
  })
}

function commandPacketChains(): CutoverPacketChain[] {
  return buildCutoverPacketChains({
    isEnglish: isEnglish.value,
    chains: cutoverStore.chainRows.map((chain) => {
      const contacts = cutoverStore.chainContactFor(chain.key, resolveDefaultChainContacts(chain.key, isEnglish.value))
      const gateState = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
      const reminders = pilotReminderItems.value.filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey))
      const financialTrace = buildCommandChainFinancialTraceState(chain.moduleKeys)
      const packetRefs = buildCommandChainFinancialTracePacketRefs(chain.moduleKeys)
      const latestDrill = cutoverOpsStore.latestRollbackDrill(chain.key)
      const latestSignoff = cutoverOpsStore.latestPilotSignoff(chain.key)
      const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', chain.key)
      const closedLoopSummary = buildCutoverClosedLoopSummary({
        isEnglish: isEnglish.value,
        latestDrill,
        latestSignoff,
        latestExceptionExport,
      })
      const gatePendingCount = [
        gateState.smokeReady,
        gateState.workbenchReady,
        gateState.rollbackReady,
        gateState.traceabilityReady,
        gateState.manualReady,
        gateState.pilotConfirmed,
      ].filter((item) => !item).length
      const settlementSummary = buildChainSettlementSummary({
        moduleKeys: chain.moduleKeys,
        isEnglish: isEnglish.value,
        reminders: reminders.map((item) => ({
          moduleKey: item.moduleKey as ModuleKey,
          type: item.type,
          severity: item.severity,
        })),
      })
      const closeChecklist = buildChainCloseChecklist({
        chainKey: chain.key,
        isEnglish: isEnglish.value,
        gatePendingCount,
        settlementIssueCount: settlementSummary.missingLabels.length + settlementSummary.warningLabels.length,
        financialTraceIssueCount: financialTrace.missingLabels.length + financialTrace.warningLabels.length,
        closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
        paymentLinkageIssueCount: countPaymentLinkageIssues(reminders),
      })
      return {
        chainKey: chain.key,
        label: isEnglish.value ? chain.enLabel : chain.zhLabel,
        enabled: chain.enabled,
        moduleKeys: chain.moduleKeys,
        contacts,
        gateState,
        closedLoopSummary,
        reminders,
        financialTrace: {
          statusLabel: financialTrace.statusLabel,
          missingLabels: financialTrace.missingLabels,
          warningLabels: financialTrace.warningLabels,
          lines: financialTrace.lines,
          recordRefs: financialTrace.recordRefs,
          packetRefs,
        },
        topRiskLabel: financialTrace.topRiskRefs[0],
        closeChecklistLines: closeChecklist.map((item) =>
          `- [${item.ready ? (isEnglish.value ? 'Ready' : '已就绪') : (isEnglish.value ? 'Pending' : '待处理')}] ${item.label}: ${item.description}`,
        ),
        closeActivityLines: buildCloseRecentActivityLines({
          isEnglish: isEnglish.value,
          closeLabel: buildCutoverCloseSummary({
            isEnglish: isEnglish.value,
            gatePendingCount,
            settlementSummary,
            financialTraceSummary: financialTrace,
            closedLoopSummary,
            paymentLinkageIssueCount: countPaymentLinkageIssues(reminders),
          }).label,
          latestDrill,
          latestSignoff,
          latestExceptionExport,
          formatDateTime,
        }),
      }
    }),
    moduleTitle,
    reminderDetailLimit: 8,
  })
}

function commandPacketModules(): CutoverPacketModule[] {
  return buildCutoverPacketModules({
    isEnglish: isEnglish.value,
    modules: cutoverStore.firstWaveModules.map((moduleKey) => {
      const financialTrace = buildCommandModuleFinancialTraceState(moduleKey)
      const packetRefs = buildCommandModuleFinancialTracePacketRefs(moduleKey, financialTrace)
      const blockerLabels = buildReminderFamilyBlockers(
        pilotReminderItems.value.filter((item) => item.moduleKey === moduleKey),
        isEnglish.value,
      )
      const pendingGateCount = cutoverStore
        .chainsForModule(moduleKey)
        .reduce((sum, chain) => {
          const state = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
          return sum + [
            state.smokeReady,
            state.workbenchReady,
            state.rollbackReady,
            state.traceabilityReady,
            state.manualReady,
            state.pilotConfirmed,
          ].filter((item) => !item).length
        }, 0)
      return {
        moduleKey,
        title: moduleTitle(moduleKey),
        enabled: cutoverStore.isModuleEnabled(moduleKey),
        reminders: pilotReminderItems.value.filter((item) => item.moduleKey === moduleKey),
        pendingGateCount,
        blockerLabels,
        financialTrace: {
          statusLabel: financialTrace.statusLabel,
          missingLabels: financialTrace.missingLabels,
          warningLabels: financialTrace.warningLabels,
          lines: financialTrace.lines,
          recordRefs: financialTrace.recordRefs,
          packetRefs,
        },
        topRiskLabel: financialTrace.topRiskRefs[0],
      }
    }),
  })
}

function commandControlModules() {
  return buildCutoverControlModules({
    isEnglish: isEnglish.value,
    modules: cutoverStore.firstWaveModules.map((moduleKey) => {
      const financialTrace = buildCommandModuleFinancialTraceState(moduleKey)
      const packetRefs = buildCommandModuleFinancialTracePacketRefs(moduleKey, financialTrace)
      const blockerLabels = buildReminderFamilyBlockers(
        pilotReminderItems.value.filter((item) => item.moduleKey === moduleKey),
        isEnglish.value,
      )
      const pendingGateCount = cutoverStore
        .chainsForModule(moduleKey)
        .reduce((sum, chain) => {
          const state = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
          return sum + [
            state.smokeReady,
            state.workbenchReady,
            state.rollbackReady,
            state.traceabilityReady,
            state.manualReady,
            state.pilotConfirmed,
          ].filter((item) => !item).length
        }, 0)
      return {
        moduleKey,
        title: moduleTitle(moduleKey),
        enabled: cutoverStore.isModuleEnabled(moduleKey),
        reminders: pilotReminderItems.value.filter((item) => item.moduleKey === moduleKey),
        pendingGateCount,
        blockerLabels,
        financialTrace: {
          statusLabel: financialTrace.statusLabel,
          missingLabels: financialTrace.missingLabels,
          warningLabels: financialTrace.warningLabels,
          lines: financialTrace.lines,
          recordRefs: financialTrace.recordRefs,
          packetRefs,
        },
        topRiskLabel: financialTrace.topRiskRefs[0],
      }
    }),
  })
}

function commandContactMatrixRows(): CutoverContactMatrixRow[] {
  return buildCutoverContactRows(commandPacketChains())
}

function commandPendingGateRows(): CutoverPendingGateRow[] {
  return buildCutoverPendingGateRows(commandPacketChains())
}

function describeSettlementSummary(summary: {
  statusLabel: string
  missingLabels: string[]
  warningLabels: string[]
}) {
  return [
    summary.statusLabel,
    summary.missingLabels.length
      ? `${isEnglish.value ? 'Missing' : '缺失'}: ${summary.missingLabels.join(' / ')}`
      : null,
    summary.warningLabels.length
      ? `${isEnglish.value ? 'Pending' : '待推进'}: ${summary.warningLabels.join(' / ')}`
      : null,
  ].filter(Boolean).join(' · ')
}

function describeFinancialTraceSummary(summary: {
  statusLabel: string
  missingLabels: string[]
  warningLabels: string[]
}) {
  return [
    summary.statusLabel,
    summary.missingLabels.length
      ? `${isEnglish.value ? 'Missing' : '缺失'}: ${summary.missingLabels.join(' / ')}`
      : null,
    summary.warningLabels.length
      ? `${isEnglish.value ? 'Pending' : '待推进'}: ${summary.warningLabels.join(' / ')}`
      : null,
  ].filter(Boolean).join(' · ')
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

function commandFinanceOverviewSubtitle() {
  const chains = commandPacketChains().filter((item) => item.financeCockpitLabel)
  const modules = commandControlModules().filter((item) => item.financeCockpitLabel)
  const readyChains = chains.filter((item) => item.financeCockpitLabel === (isEnglish.value ? 'Ready' : '就绪')).length
  const readyModules = modules.filter((item) => item.financeCockpitLabel === (isEnglish.value ? 'Ready' : '就绪')).length
  return isEnglish.value
    ? `Chains ${readyChains}/${chains.length} ready · Modules ${readyModules}/${modules.length} ready`
    : `链路 ${readyChains}/${chains.length} 就绪 · 模块 ${readyModules}/${modules.length} 就绪`
}

function commandRoleDeskOverviewSubtitle() {
  const readyChains = cutoverStore.chainRows.filter((chain) =>
    buildCommandChainRoleDeskSummary(chain.key, chain.moduleKeys).issueCount === 0,
  ).length
  const readyModules = cutoverStore.firstWaveModules.filter((moduleKey) =>
    buildCommandModuleRoleDeskSummary(moduleKey).issueCount === 0,
  ).length
  return isEnglish.value
    ? `Chains ${readyChains}/${cutoverStore.chainRows.length} ready · Modules ${readyModules}/${cutoverStore.firstWaveModules.length} ready`
    : `链路 ${readyChains}/${cutoverStore.chainRows.length} 就绪 · 模块 ${readyModules}/${cutoverStore.firstWaveModules.length} 就绪`
}

function buildCommandRoleDeskQueuePacket() {
  return buildRoleDeskQueuePacket({
    english: isEnglish.value,
    generatedAt: formatDateTime(new Date().toISOString()),
    title: isEnglish.value ? 'NEKO_ERP Command Center Role Desk Queue' : 'NEKO_ERP 命令中心责任台待办包',
    rows: [
      ...cutoverStore.chainRows.map((chain) => {
        const contacts = cutoverStore.chainContactFor(chain.key, resolveDefaultChainContacts(chain.key, isEnglish.value))
        const roleDeskSummary = buildCommandChainRoleDeskSummary(chain.key, chain.moduleKeys)
        const financeCockpitSummary = buildCommandChainFinanceCockpitSummary(chain.key, chain.moduleKeys)
        const latestDrill = cutoverOpsStore.latestRollbackDrill(chain.key)
        const latestSignoff = cutoverOpsStore.latestPilotSignoff(chain.key)
        const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', chain.key)
        return {
          label: isEnglish.value ? chain.enLabel : chain.zhLabel,
          scopeLabel: isEnglish.value ? 'Chain' : '链路',
          roleDeskLabel: roleDeskSummary.label,
          closeLabel: summarizeCloseChecklist(
            buildChainCloseChecklist({
              chainKey: chain.key,
              isEnglish: isEnglish.value,
              gatePendingCount: [
                ...(() => {
                  const state = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
                  return [
                    state.smokeReady,
                    state.workbenchReady,
                    state.rollbackReady,
                    state.traceabilityReady,
                    state.manualReady,
                    state.pilotConfirmed,
                  ]
                })(),
              ].filter((item) => !item).length,
              settlementIssueCount: buildChainSettlementSummary({
                moduleKeys: chain.moduleKeys,
                isEnglish: isEnglish.value,
                reminders: pilotReminderItems.value
                  .filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey))
                  .map((item) => ({
                    moduleKey: item.moduleKey as ModuleKey,
                    type: item.type,
                    severity: item.severity,
                  })),
              }).missingCount
                + buildChainSettlementSummary({
                  moduleKeys: chain.moduleKeys,
                  isEnglish: isEnglish.value,
                  reminders: pilotReminderItems.value
                    .filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey))
                    .map((item) => ({
                      moduleKey: item.moduleKey as ModuleKey,
                      type: item.type,
                      severity: item.severity,
                    })),
                }).warningCount,
              financialTraceIssueCount: buildCommandChainFinancialTraceState(chain.moduleKeys).missingCount + buildCommandChainFinancialTraceState(chain.moduleKeys).warningCount,
              closedLoopIssueCount: buildCutoverClosedLoopSummary({
                isEnglish: isEnglish.value,
                latestDrill,
                latestSignoff,
                latestExceptionExport,
              }).missingLabels.length + buildCutoverClosedLoopSummary({
                isEnglish: isEnglish.value,
                latestDrill,
                latestSignoff,
                latestExceptionExport,
              }).staleLabels.length,
              paymentLinkageIssueCount: countPaymentLinkageIssues(
                pilotReminderItems.value.filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey)),
              ),
              blockerLabels: buildReminderFamilyBlockers(
                pilotReminderItems.value.filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey)),
                isEnglish.value,
              ),
            }),
            isEnglish.value,
          ),
          owner: contacts.owner,
          reviewer: buildCloseRoleSnapshot({ contacts, isEnglish: isEnglish.value, chainKey: chain.key }).reviewer,
          signoffOwner: buildCloseRoleSnapshot({ contacts, isEnglish: isEnglish.value, chainKey: chain.key }).signoffOwner,
          fallbackOwner: contacts.fallbackOwner,
          financeOwner: buildCloseRoleSnapshot({ contacts, isEnglish: isEnglish.value, chainKey: chain.key }).financeOwner,
          companyLabel: buildCloseRoleSnapshot({ contacts, isEnglish: isEnglish.value, chainKey: chain.key }).companyLabel,
          missingRoles: roleDeskSummary.missingRoles,
          checklistBlockers: roleDeskSummary.checklistBlockers,
          blockerLabels: buildReminderFamilyBlockers(
            pilotReminderItems.value.filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey)),
            isEnglish.value,
          ),
          financeLines: financeCockpitSummary.enabled ? financeCockpitSummary.lines : [],
          recentActivityLines: buildCloseRecentActivityLines({
            isEnglish: isEnglish.value,
            closeLabel: roleDeskSummary.label,
            latestDrill,
            latestSignoff,
            latestExceptionExport,
            formatDateTime,
          }),
        }
      }),
      ...Array.from(new Set<ModuleKey>([...cutoverStore.firstWaveModules, 'accountMove'])).map((moduleKey) => {
        const roleDeskSummary = buildCommandModuleRoleDeskSummary(moduleKey)
        const financeCockpitSummary = buildCommandModuleFinanceCockpitSummary(moduleKey)
        return {
          label: moduleTitle(moduleKey),
          scopeLabel: isEnglish.value ? 'Module' : '模块',
          roleDeskLabel: roleDeskSummary.label,
          closeLabel: roleDeskSummary.label,
          owner: undefined,
          reviewer: undefined,
          signoffOwner: undefined,
          fallbackOwner: undefined,
          financeOwner: undefined,
          companyLabel: undefined,
          missingRoles: roleDeskSummary.missingRoles,
          checklistBlockers: roleDeskSummary.checklistBlockers,
          blockerLabels: buildReminderFamilyBlockers(
            pilotReminderItems.value.filter((item) => item.moduleKey === moduleKey),
            isEnglish.value,
          ),
          financeLines: financeCockpitSummary.enabled ? financeCockpitSummary.lines : [],
          recentActivityLines: [],
        }
      }),
    ],
  })
}

function buildCommandFinanceCloseBatchPacket() {
  return buildFinanceCloseBatchPacket({
    english: isEnglish.value,
    generatedAt: formatDateTime(new Date().toISOString()),
    title: isEnglish.value ? 'NEKO_ERP Command Center Finance Close Batch' : 'NEKO_ERP 命令中心财务关账批处理包',
    rows: [
      ...cutoverStore.chainRows
        .map((chain) => {
          const financeCockpitSummary = buildCommandChainFinanceCockpitSummary(chain.key, chain.moduleKeys)
          if (!financeCockpitSummary.enabled) return null
          const reminders = pilotReminderItems.value.filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey))
          const settlementSummary = buildChainSettlementSummary({
            moduleKeys: chain.moduleKeys,
            isEnglish: isEnglish.value,
            reminders: reminders.map((item) => ({
              moduleKey: item.moduleKey as ModuleKey,
              type: item.type,
              severity: item.severity,
            })),
          })
          const financialTraceSummary = buildCommandChainFinancialTraceState(chain.moduleKeys)
          const roleDeskSummary = buildCommandChainRoleDeskSummary(chain.key, chain.moduleKeys)
          const latestDrill = cutoverOpsStore.latestRollbackDrill(chain.key)
          const latestSignoff = cutoverOpsStore.latestPilotSignoff(chain.key)
          const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', chain.key)
          return {
            label: isEnglish.value ? chain.enLabel : chain.zhLabel,
            scopeLabel: isEnglish.value ? 'Chain' : '链路',
            closeLabel: roleDeskSummary.label,
            settlementLabel: settlementSummary.statusLabel,
            financialTraceLabel: financialTraceSummary.statusLabel,
            financeCockpitLabel: financeCockpitSummary.label,
            roleDeskLabel: roleDeskSummary.label,
            topRiskLabel: financialTraceSummary.topRiskRefs[0],
            blockerLabels: buildReminderFamilyBlockers(reminders, isEnglish.value),
            financeLines: financeCockpitSummary.lines,
            roleLines: roleDeskSummary.lines,
            recentActivityLines: buildCloseRecentActivityLines({
              isEnglish: isEnglish.value,
              closeLabel: roleDeskSummary.label,
              latestDrill,
              latestSignoff,
              latestExceptionExport,
              formatDateTime,
            }),
          }
        })
        .filter(Boolean),
      ...Array.from(new Set<ModuleKey>([...cutoverStore.firstWaveModules, 'accountMove']))
        .map((moduleKey) => {
          const financeCockpitSummary = buildCommandModuleFinanceCockpitSummary(moduleKey)
          if (!financeCockpitSummary.enabled) return null
          const reminders = pilotReminderItems.value.filter((item) => item.moduleKey === moduleKey)
          const settlementSummary = buildModuleSettlementSummary({
            moduleKey,
            isEnglish: isEnglish.value,
            reminders,
          })
          const financialTraceSummary = buildCommandModuleFinancialTraceState(moduleKey)
          const roleDeskSummary = buildCommandModuleRoleDeskSummary(moduleKey)
          return {
            label: moduleTitle(moduleKey),
            scopeLabel: isEnglish.value ? 'Module' : '模块',
            closeLabel: roleDeskSummary.label,
            settlementLabel: settlementSummary.statusLabel,
            financialTraceLabel: financialTraceSummary.statusLabel,
            financeCockpitLabel: financeCockpitSummary.label,
            roleDeskLabel: roleDeskSummary.label,
            topRiskLabel: financialTraceSummary.topRiskRefs[0],
            blockerLabels: buildReminderFamilyBlockers(reminders, isEnglish.value),
            financeLines: financeCockpitSummary.lines,
            roleLines: roleDeskSummary.lines,
            recentActivityLines: [],
          }
        })
        .filter(Boolean),
    ] as any[],
  })
}

function buildCommandHandoffPacket() {
  return buildSharedCutoverControlPacket({
    english: isEnglish.value,
    generatedAt: new Date().toISOString(),
    title: isEnglish.value ? 'NEKO_ERP Command Center Handoff Packet' : 'NEKO_ERP 命令中心交接包',
    reviewedCount: pilotReviewStore.reviewedCount,
    snoozedCount: pilotReviewStore.snoozedCount,
    chains: commandPacketChains(),
    modules: commandControlModules(),
  })
}

function buildCommandRollbackDrillPacket() {
  return buildSharedRollbackDrillPacket({
    english: isEnglish.value,
    generatedAt: new Date().toISOString(),
    title: isEnglish.value ? 'NEKO_ERP Command Center Rollback Drill Packet' : 'NEKO_ERP 命令中心回退演练包',
    chains: commandPacketChains(),
    modules: commandControlModules(),
  })
}

function buildCommandGuardrailRulesPacket() {
  return buildSharedGuardrailRulesPacket({
    english: isEnglish.value,
    generatedAt: new Date().toISOString(),
    title: isEnglish.value ? 'NEKO_ERP Command Center Guardrail Rules' : 'NEKO_ERP 命令中心 Guardrail 规则',
    presets: listSysScriptPresets(),
  })
}

function openModuleWorkbench(moduleKey: ModuleKey, rawQuery?: Record<string, string | undefined>) {
  return router.push({
    name: moduleKey,
    query: buildModuleWorkbenchRouteQuery({
      targetRouteName: moduleKey,
      rawQuery,
    }),
  })
}

const moduleItems = computed<CommandItem[]>(() =>
  visibleModuleManifests
    .filter((item) => cutoverStore.isModuleEnabled(item.key))
    .map((item) => ({
    id: `module:${item.key}`,
    title: moduleTitle(item.key),
    subtitle: (() => {
      const section = findSidebarSectionByModuleKey(item.key)
      if (!section) return item.group
      return preferencesStore.language === 'zh-CN' ? section.zhLabel : section.enLabel
    })(),
    icon: 'Collection',
    badge: isEnglish.value ? 'Module' : '模块',
    action: async () => {
      await openModuleWorkbench(item.key)
      visible.value = false
    },
    })),
)

const createItems = computed<CommandItem[]>(() => {
  const targets: ModuleKey[] = [
    'saleOrder',
    'purchaseOrder',
    'accountInvoice',
    'accountPayment',
    'resPartner',
    'resCompany',
    'productTemplate',
    'productProduct',
    'productCategory',
    'productPricelist',
  ]
  return targets.map((moduleKey) => ({
    id: `create:${moduleKey}`,
    title: isEnglish.value ? `Create ${moduleTitle(moduleKey)}` : `新建${moduleTitle(moduleKey)}`,
    subtitle:
      !cutoverStore.isModuleEnabled(moduleKey)
        ? isEnglish.value
          ? 'This module is disabled by the cutover switch'
          : '该模块已被切换开关关闭'
        : moduleKey === 'saleOrder'
        ? isEnglish.value
          ? 'Open a fresh draft sales order in the current Electron workspace'
          : '在当前 Electron 工作区打开一张新的销售订单草稿'
        : moduleKey === 'purchaseOrder'
          ? isEnglish.value
            ? 'Open a fresh draft purchase order in the current Electron workspace'
            : '在当前 Electron 工作区打开一张新的采购订单草稿'
          : moduleKey === 'accountInvoice'
            ? isEnglish.value
              ? 'Open a fresh draft invoice in the current Electron workspace'
              : '在当前 Electron 工作区打开一张新的发票草稿'
            : moduleKey === 'accountPayment'
              ? isEnglish.value
                ? 'Open a fresh draft payment in the current Electron workspace'
                : '在当前 Electron 工作区打开一张新的付款草稿'
          : moduleKey === 'resPartner'
            ? isEnglish.value
              ? 'Open a fresh draft partner record in the current Electron workspace'
              : '在当前 Electron 工作区打开一个新的伙伴档案草稿'
            : moduleKey === 'resCompany'
              ? isEnglish.value
                ? 'Open a fresh draft company master record in the current Electron workspace'
                : '在当前 Electron 工作区打开一个新的公司主档草稿'
              : moduleKey === 'productTemplate'
                ? isEnglish.value
                  ? 'Open a fresh draft product template in the current Electron workspace'
                  : '在当前 Electron 工作区打开一个新的产品模板草稿'
                : moduleKey === 'productProduct'
                  ? isEnglish.value
                    ? 'Open a fresh draft product variant in the current Electron workspace'
                    : '在当前 Electron 工作区打开一个新的产品变体草稿'
                  : moduleKey === 'productCategory'
                    ? isEnglish.value
                      ? 'Open a fresh draft product category in the current Electron workspace'
                      : '在当前 Electron 工作区打开一个新的产品分类草稿'
                    : isEnglish.value
                      ? 'Open a fresh draft pricelist in the current Electron workspace'
                      : '在当前 Electron 工作区打开一个新的价目表草稿',
    icon: 'Plus',
    badge: isEnglish.value ? 'Create' : '新建',
    disabled: !cutoverStore.isModuleEnabled(moduleKey),
    action: async () => {
      if (!cutoverStore.isModuleEnabled(moduleKey)) {
        await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
        visible.value = false
        return
      }
      await openModuleWorkbench(moduleKey, { create: '1' })
      visible.value = false
    },
  }))
})

const recentItems = computed<CommandItem[]>(() =>
  commandCenterStore.recentRecords.map((item) => ({
    id: `recent:${item.moduleKey}:${item.id}`,
    title: item.label,
    subtitle: `${moduleTitle(item.moduleKey)} · ${item.subtitle || (isEnglish.value ? 'Recent object' : '最近对象')}`,
    icon: 'Clock',
    badge: isEnglish.value ? 'Recent' : '最近',
    disabled: !cutoverStore.isModuleEnabled(item.moduleKey),
    action: async () => {
      if (!cutoverStore.isModuleEnabled(item.moduleKey)) {
        await router.push({ name: 'settings', query: { tab: 'cutover', module: item.moduleKey } })
        visible.value = false
        return
      }
      await openModuleWorkbench(item.moduleKey, { detailId: String(item.id) })
      visible.value = false
    },
  })),
)

const sysScriptPresetItems = computed<CommandItem[]>(() =>
  listSysScriptPresets().map((preset) => ({
    id: `script-preset:${preset.key}`,
    title: isEnglish.value ? preset.titleEn : preset.titleZh,
    subtitle: `${preset.model} · ${preset.eventName} · ${isEnglish.value ? preset.descriptionEn : preset.descriptionZh}`,
    icon: 'MagicStick',
    badge: isEnglish.value ? 'Preset' : '模板',
    action: async () => {
      await router.push({
        name: 'sysScript',
        query: {
          create: '1',
          preset: preset.key,
        },
      })
      visible.value = false
    },
  })),
)

const timelineDeskItems = computed<CommandItem[]>(() => {
  const targets: ModuleKey[] = cutoverStore.firstWaveModules
  return targets.map((moduleKey) => {
    const latest = commandCenterStore.latestRecordFor(moduleKey)
    return {
      id: `timeline:${moduleKey}`,
      title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Timeline` : `打开${moduleTitle(moduleKey)}时间轴`,
      subtitle: latest
        ? `${moduleTitle(moduleKey)} · ${latest.label}`
        : isEnglish.value
          ? `Open a ${moduleTitle(moduleKey)} record first, then return here for timeline work`
          : `请先打开一个${moduleTitle(moduleKey)}记录，再回到这里处理时间轴`,
      icon: 'ChatLineSquare',
      badge: isEnglish.value ? 'Timeline' : '时间轴',
      disabled: !latest || !cutoverStore.isModuleEnabled(moduleKey),
      action: async () => {
        if (!cutoverStore.isModuleEnabled(moduleKey)) {
          await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
          visible.value = false
          return
        }
        if (!latest) {
          ElMessage.warning(isEnglish.value ? 'No recent record available for timeline work' : '当前没有可用于处理时间轴的最近记录')
          return
        }
        await openModuleWorkbench(moduleKey, {
          detailId: String(latest.id),
          section: 'timeline',
        })
        visible.value = false
      },
    }
  })
})

const actionItems = computed<CommandItem[]>(() => {
  const definitions: Array<{
    moduleKey: ModuleKey
    actionKey: string
    titleZh: string
    titleEn: string
    icon: string
  }> = [
    { moduleKey: 'saleOrder', actionKey: 'action_confirm', titleZh: '确认最近销售订单', titleEn: 'Confirm Latest Sales Order', icon: 'Check' },
    { moduleKey: 'purchaseOrder', actionKey: 'action_create_bill', titleZh: '为最近采购单创建账单', titleEn: 'Create Bill For Latest Purchase Order', icon: 'Document' },
    { moduleKey: 'accountInvoice', actionKey: 'register_payment', titleZh: '为最近发票登记付款', titleEn: 'Register Payment For Latest Invoice', icon: 'Money' },
    { moduleKey: 'accountPayment', actionKey: 'action_post', titleZh: '过账最近付款', titleEn: 'Post Latest Payment', icon: 'Coin' },
  ]

  return definitions.map((definition) => {
    const latest = commandCenterStore.latestRecordFor(definition.moduleKey)
    return {
      id: `action:${definition.moduleKey}:${definition.actionKey}`,
      title: isEnglish.value ? definition.titleEn : definition.titleZh,
      subtitle: latest
        ? `${moduleTitle(definition.moduleKey)} · ${latest.label}`
        : isEnglish.value
          ? `Open a ${moduleTitle(definition.moduleKey)} record first, then rerun this shortcut`
          : `请先打开一个${moduleTitle(definition.moduleKey)}记录，再执行这个快捷动作`,
      icon: definition.icon,
      badge: isEnglish.value ? 'Action' : '动作',
      disabled: !latest || !cutoverStore.isModuleEnabled(definition.moduleKey),
      action: async () => {
        if (!cutoverStore.isModuleEnabled(definition.moduleKey)) {
          ElMessage.warning(isEnglish.value ? 'This module is disabled by the cutover switch' : '该模块已被切换开关关闭')
          return
        }
        if (!latest) {
          ElMessage.warning(isEnglish.value ? 'No recent record available for this action' : '当前没有可用于执行动作的最近记录')
          return
        }
        // Quick actions always target the most recently opened object so the
        // palette can stay stateless and still execute real business flows.
        try {
          await executeEntityAction(moduleConfigMap[definition.moduleKey].apiBase, latest.id, definition.actionKey)
          ElMessage.success(isEnglish.value ? 'Action executed' : '动作已执行')
          commandCenterStore.rememberRecord(latest)
          await router.push({
            name: definition.moduleKey,
            query: {
              detailId: String(latest.id),
            },
          })
          visible.value = false
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[CommandPalette] quick action failed', error)
          }
        }
      },
    }
  })
})

const reviewItems = computed<CommandItem[]>(() => {
  const chainRows = cutoverStore.chainRows
  return chainRows.map((chain) => {
    const item = pilotReminderItems.value
      .filter((candidate) => chain.moduleKeys.includes(candidate.moduleKey as ModuleKey))
    const topRisk = pickTopReminder(item)
    const traceTarget = buildChainTraceQuery(chain.moduleKeys)
    return {
      id: `review:${chain.key}`,
      title: isEnglish.value
        ? `Review ${chain.enLabel}`
        : `处理${chain.zhLabel}`,
      subtitle: traceTarget?.state.topRiskRefs[0] || (topRisk
        ? `${moduleTitle(topRisk.moduleKey as ModuleKey)} · ${topRisk.title}`
        : isEnglish.value
          ? 'No open reminder in this pilot scope'
          : '当前试点范围没有未处理提醒'),
      icon: 'Warning',
      badge: isEnglish.value ? 'Review' : '审核',
      disabled: !traceTarget?.query?.detailId && !topRisk?.recordId,
      action: async () => {
        if (traceTarget) {
          await router.push({
            name: traceTarget.routeName,
            query: traceTarget.query,
          })
          visible.value = false
          return
        }
        if (!topRisk?.recordId) return
        await router.push({
          name: topRisk.moduleKey,
          query: {
            detailId: String(topRisk.recordId),
            section: resolveReminderSection(topRisk),
            relatedTo: topRisk.moduleKey,
          },
        })
        visible.value = false
      },
    }
  })
})

const chainOpsItems = computed<CommandItem[]>(() =>
  cutoverStore.chainRows.flatMap((chain) => {
    const routeName = resolveChainRouteName(chain.key)
    const contacts = cutoverStore.chainContactFor(chain.key, resolveDefaultChainContacts(chain.key, isEnglish.value))
    const gates = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
    const reminders = pilotReminderItems.value.filter((item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey))
    const latestDrill = cutoverOpsStore.latestRollbackDrill(chain.key)
    const latestSignoff = cutoverOpsStore.latestPilotSignoff(chain.key)
    const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', chain.key)
    const closedLoopSummary = buildCutoverClosedLoopSummary({
      isEnglish: isEnglish.value,
      latestDrill,
      latestSignoff,
      latestExceptionExport,
    })
    const settlementSummary = buildChainSettlementSummary({
      moduleKeys: chain.moduleKeys,
      isEnglish: isEnglish.value,
      reminders: reminders.map((item) => ({
        moduleKey: item.moduleKey as ModuleKey,
        type: item.type,
        severity: item.severity,
      })),
    })
    const financialTraceSummary = buildCommandChainFinancialTraceState(chain.moduleKeys)
    const financeCockpitSummary = buildCommandChainFinanceCockpitSummary(chain.key, chain.moduleKeys)
    const roleDeskSummary = buildCommandChainRoleDeskSummary(chain.key, chain.moduleKeys)
    const gateReadyCount = [
      gates.smokeReady,
      gates.workbenchReady,
      gates.rollbackReady,
      gates.traceabilityReady,
      gates.manualReady,
      gates.pilotConfirmed,
    ].filter(Boolean).length
    const closeSummary = buildCutoverCloseSummary({
      isEnglish: isEnglish.value,
      gatePendingCount: 6 - gateReadyCount,
      settlementSummary,
      financialTraceSummary,
      closedLoopSummary,
      paymentLinkageIssueCount: countPaymentLinkageIssues(reminders),
    })
    const closeChecklistLabel = summarizeCloseChecklist(
      buildChainCloseChecklist({
        chainKey: chain.key,
        isEnglish: isEnglish.value,
        gatePendingCount: 6 - gateReadyCount,
        settlementIssueCount: settlementSummary.missingCount + settlementSummary.warningCount,
        financialTraceIssueCount: financialTraceSummary.missingCount + financialTraceSummary.warningCount,
        closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
        paymentLinkageIssueCount: countPaymentLinkageIssues(reminders),
      }),
      isEnglish.value,
    )
    const traceabilityTarget = buildChainTraceQuery(chain.moduleKeys, 'traceability')
    const documentsTarget = buildChainTraceQuery(chain.moduleKeys, 'documents')
    const timelineTarget = buildChainTraceQuery(chain.moduleKeys, 'timeline')
    return [
      {
        id: `chain:${chain.key}:rehearsal`,
        title: isEnglish.value ? `Open ${chain.enLabel} Rehearsal` : `打开${chain.zhLabel}演练`,
        subtitle: `${contacts.rehearsalOwner} · ${closedLoopSummary.label} · ${settlementSummary.statusLabel}`,
        icon: 'Promotion',
        badge: isEnglish.value ? 'Chain' : '链路',
        disabled: !chain.enabled,
        action: async () => {
          await router.push({ name: routeName, query: { section: 'ops-rehearsal' } })
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:close`,
        title: isEnglish.value ? `Open ${chain.enLabel} Close Desk` : `打开${chain.zhLabel}关账台`,
        subtitle: `${closeSummary.label} · ${financeCockpitSummary.label} · ${closeChecklistLabel} · ${contacts.owner}`,
        icon: 'Briefcase',
        badge: isEnglish.value ? 'Close' : '关账',
        action: async () => {
          if (chain.enabled) {
            await router.push({ name: routeName, query: { section: 'ops-close' } })
          } else {
            await router.push({
              name: 'settings',
              query: resolveCutoverSettingsQuery({ chainKey: chain.key, section: 'roleDesk' }),
            })
          }
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:role-desk`,
        title: isEnglish.value ? `Open ${chain.enLabel} Role Desk` : `打开${chain.zhLabel}责任台`,
        subtitle: describeRoleDeskSummary(roleDeskSummary),
        icon: 'UserFilled',
        badge: isEnglish.value ? 'Role' : '责任',
        action: async () => {
          if (chain.enabled) {
            await router.push({ name: routeName, query: { section: 'ops-close' } })
          } else {
            await router.push({
              name: 'settings',
              query: resolveCutoverSettingsQuery({ chainKey: chain.key, section: 'financeBatch' }),
            })
          }
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:finance-cockpit`,
        title: isEnglish.value ? `Open ${chain.enLabel} Finance Cockpit` : `打开${chain.zhLabel}财务驾驶舱`,
        subtitle: describeFinanceCockpitSummary(financeCockpitSummary),
        icon: 'Monitor',
        badge: isEnglish.value ? 'Finance' : '财务',
        action: async () => {
          if (chain.enabled) {
            await router.push({ name: routeName, query: { section: 'ops-close' } })
          } else {
            await router.push({
              name: 'settings',
              query: resolveCutoverSettingsQuery({ chainKey: chain.key, section: 'close' }),
            })
          }
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:closed-loop`,
        title: isEnglish.value ? `Open ${chain.enLabel} Closed Loop Desk` : `打开${chain.zhLabel}闭环台`,
        subtitle: [
          closedLoopSummary.label,
          closedLoopSummary.missingLabels.length ? closedLoopSummary.missingLabels.join(' / ') : null,
        ].filter(Boolean).join(' · '),
        icon: 'Management',
        badge: isEnglish.value ? 'Closed Loop' : '闭环',
        action: async () => {
          await router.push({
            name: 'settings',
            query: resolveCutoverSettingsQuery({ chainKey: chain.key, section: 'ops' }),
          })
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:settlement`,
        title: isEnglish.value ? `Open ${chain.enLabel} Settlement Review` : `打开${chain.zhLabel}结算审查`,
        subtitle: `${describeSettlementSummary(settlementSummary)} · ${financeCockpitSummary.label}`,
        icon: 'Coin',
        badge: isEnglish.value ? 'Settlement' : '结算',
        action: async () => {
          if (chain.enabled) {
            await router.push({ name: routeName, query: { section: 'ops-settlement' } })
          } else {
            await router.push({
              name: 'settings',
              query: resolveCutoverSettingsQuery({ chainKey: chain.key, section: 'gates' }),
            })
          }
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:financial-trace`,
        title: isEnglish.value ? `Open ${chain.enLabel} Financial Trace Desk` : `打开${chain.zhLabel}财务追溯台`,
        subtitle: `${describeFinancialTraceSummary(financialTraceSummary)} · ${financeCockpitSummary.label}`,
        icon: 'DataAnalysis',
        badge: isEnglish.value ? 'Trace' : '追溯',
        action: async () => {
          if (traceabilityTarget) {
            await router.push({
              name: traceabilityTarget.routeName,
              query: traceabilityTarget.query,
            })
          } else if (chain.enabled) {
            await router.push({ name: routeName, query: { section: 'ops-financial-trace' } })
          } else {
            await router.push({
              name: 'settings',
              query: resolveCutoverSettingsQuery({ chainKey: chain.key, section: 'gates' }),
            })
          }
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:trace-documents`,
        title: isEnglish.value ? `Open ${chain.enLabel} Trace Documents` : `打开${chain.zhLabel}追溯文档`,
        subtitle: documentsTarget?.state.topRiskRefs[0]
          || (isEnglish.value ? 'Open the top-risk document desk for this chain' : '打开该链路 top-risk 的文档工作台'),
        icon: 'Files',
        badge: isEnglish.value ? 'Trace' : '追溯',
        disabled: !documentsTarget,
        action: async () => {
          if (!documentsTarget) return
          await router.push({
            name: documentsTarget.routeName,
            query: documentsTarget.query,
          })
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:trace-timeline`,
        title: isEnglish.value ? `Open ${chain.enLabel} Trace Timeline` : `打开${chain.zhLabel}追溯时间轴`,
        subtitle: timelineTarget?.state.topRiskRefs[0]
          || (isEnglish.value ? 'Open the Monica-style timeline for this chain top-risk record' : '打开该链路 top-risk 记录的 Monica 风格时间轴'),
        icon: 'Clock',
        badge: isEnglish.value ? 'Trace' : '追溯',
        disabled: !timelineTarget,
        action: async () => {
          if (!timelineTarget) return
          await router.push({
            name: timelineTarget.routeName,
            query: timelineTarget.query,
          })
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:runbook`,
        title: isEnglish.value ? `Export ${chain.enLabel} Runbook` : `导出${chain.zhLabel}手册`,
        subtitle: `${contacts.owner} · ${contacts.fallbackOwner} · ${closedLoopSummary.label} · ${settlementSummary.statusLabel}`,
        icon: 'DocumentCopy',
        badge: isEnglish.value ? 'Chain' : '链路',
        action: () => {
          const title = isEnglish.value ? chain.enLabel : chain.zhLabel
          downloadText(
            `neko_erp_${chain.key}_command_runbook_${new Date().toISOString().slice(0, 10)}.md`,
            buildSharedChainRunbookContent({
              english: isEnglish.value,
              generatedAt: new Date().toISOString(),
              mode: 'handbook',
              chain: {
                label: title,
                enabled: chain.enabled,
                modulesLabel: chain.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / '),
                readyLabel: `${gateReadyCount}/6`,
                summaryLabel: gateReadyCount === 6 ? (isEnglish.value ? 'Accepted' : '已放行') : (isEnglish.value ? 'Needs Review' : '待核对'),
                pendingLabels: [
                  !gates.smokeReady ? (isEnglish.value ? 'Smoke' : 'Smoke') : null,
                  !gates.workbenchReady ? (isEnglish.value ? 'Workbench' : '工作台') : null,
                  !gates.rollbackReady ? (isEnglish.value ? 'Rollback' : '回退') : null,
                  !gates.traceabilityReady ? (isEnglish.value ? 'Traceability' : '追溯') : null,
                  !gates.manualReady ? (isEnglish.value ? 'Manual' : '手册') : null,
                  !gates.pilotConfirmed ? (isEnglish.value ? 'Pilot Confirmed' : '试点确认') : null,
                ].filter(Boolean) as string[],
                blockerLabels: [],
                financialTraceLabel: financialTraceSummary.statusLabel,
                financialTraceMissingLabels: financialTraceSummary.missingLabels,
                financialTraceWarningLabels: financialTraceSummary.warningLabels,
                financialTraceLines: financialTraceSummary.lines,
                financialTraceRecordRefs: financialTraceSummary.recordRefs,
                financialTracePacketRefs: buildCommandChainFinancialTracePacketRefs(chain.moduleKeys),
                topRiskLabel: financialTraceSummary.topRiskRefs[0] || '-',
                owner: contacts.owner,
                fallbackOwner: contacts.fallbackOwner,
                rehearsalOwner: contacts.rehearsalOwner,
                pilotConfirmOwner: contacts.pilotConfirmOwner,
                reviewerOwner: contacts.reviewerOwner,
                financeOwner: contacts.financeOwner,
              },
            }),
            'text/markdown;charset=utf-8',
          )
          ElMessage.success(isEnglish.value ? 'Chain runbook exported' : '链路手册已导出')
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:handoff`,
        title: isEnglish.value ? `Edit ${chain.enLabel} Handoff Contacts` : `编辑${chain.zhLabel}交接联系人`,
        subtitle: `${contacts.owner} · ${contacts.fallbackOwner} · ${contacts.rehearsalOwner}`,
        icon: 'UserFilled',
        badge: isEnglish.value ? 'Chain' : '链路',
        action: async () => {
          await router.push({
            name: 'settings',
            query: resolveCutoverSettingsQuery({ chainKey: chain.key, section: 'handoff' }),
          })
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:gates`,
        title: isEnglish.value ? `Open ${chain.enLabel} Acceptance Gates` : `打开${chain.zhLabel}放行门槛`,
        subtitle: `${gateReadyCount}/6 · ${closeSummary.label} · ${settlementSummary.statusLabel}`,
        icon: 'Finished',
        badge: isEnglish.value ? 'Gate' : '门槛',
        action: async () => {
          await router.push({
            name: 'settings',
            query: resolveCutoverSettingsQuery({ chainKey: chain.key, section: 'gates' }),
          })
          visible.value = false
        },
      },
      {
        id: `chain:${chain.key}:gate-export`,
        title: isEnglish.value ? `Export ${chain.enLabel} Gate Packet` : `导出${chain.zhLabel}门槛包`,
        subtitle: `${gateReadyCount}/6 · ${closedLoopSummary.label} · ${settlementSummary.statusLabel} · ${gates.note || (isEnglish.value ? 'No gate note' : '暂无门槛备注')}`,
        icon: 'Checked',
        badge: isEnglish.value ? 'Gate' : '门槛',
        action: () => {
          const packetChain = commandPacketChains().find((item) => item.label === (isEnglish.value ? chain.enLabel : chain.zhLabel))
          if (!packetChain) return
          downloadText(
            `neko_erp_${chain.key}_gate_packet_${new Date().toISOString().slice(0, 10)}.md`,
            buildSharedChainGatePacket({
              english: isEnglish.value,
              generatedAt: new Date().toISOString(),
              chain: packetChain,
              checks: [
                { label: isEnglish.value ? 'Smoke Green' : 'Smoke 通过', ready: gates.smokeReady },
                { label: isEnglish.value ? 'Workbench Ready' : '工作台就绪', ready: gates.workbenchReady },
                { label: isEnglish.value ? 'Rollback Ready' : '回退入口就绪', ready: gates.rollbackReady },
                { label: isEnglish.value ? 'Traceability Ready' : '追溯就绪', ready: gates.traceabilityReady },
                { label: isEnglish.value ? 'Manual Ready' : '用户手册就绪', ready: gates.manualReady },
                { label: isEnglish.value ? 'Pilot Confirmed' : '试点确认', ready: gates.pilotConfirmed },
              ],
            }),
            'text/markdown;charset=utf-8',
          )
          ElMessage.success(isEnglish.value ? 'Gate packet exported' : '门槛包已导出')
          visible.value = false
        },
      },
    ]
  }),
)

const moduleOpsItems = computed<CommandItem[]>(() =>
  Array.from(new Set<ModuleKey>([...cutoverStore.firstWaveModules, 'accountMove'])).flatMap((moduleKey) => {
    const supportsSettlementCockpit = ['accountInvoice', 'accountPayment', 'accountMove'].includes(moduleKey)
    const supportsPaymentLinkage = supportsPaymentLinkageModule(moduleKey)
    const supportsExecutionFeedback = moduleKey === 'stockPicking'
    const supportsQuantImpact = supportsQuantImpactModule(moduleKey)
    const reminders = pilotReminderItems.value.filter((item) => item.moduleKey === moduleKey)
    const topRisk = pickTopReminder(reminders)
    const financialTraceState = buildCommandModuleFinancialTraceState(moduleKey)
    const traceTarget = buildModuleTraceQuery(moduleKey, 'traceability')
    const documentsTarget = buildModuleTraceQuery(moduleKey, 'documents')
    const timelineTarget = buildModuleTraceQuery(moduleKey, 'timeline')
    const settlementSummary = buildModuleSettlementSummary({
      moduleKey,
      isEnglish: isEnglish.value,
      reminders,
    })
    const closedLoopSummary = buildAggregateClosedLoopSummary({
      isEnglish: isEnglish.value,
      summaries: cutoverStore
        .chainsForModule(moduleKey)
        .map((chain) => {
          const latestDrill = cutoverOpsStore.latestRollbackDrill(chain.key)
          const latestSignoff = cutoverOpsStore.latestPilotSignoff(chain.key)
          const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', chain.key)
          return buildCutoverClosedLoopSummary({
            isEnglish: isEnglish.value,
            latestDrill,
            latestSignoff,
            latestExceptionExport,
          })
        }),
    })
    const gatePendingCount = cutoverStore
      .chainsForModule(moduleKey)
      .reduce((sum, chain) => {
        const state = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
        return sum + [
          state.smokeReady,
          state.workbenchReady,
          state.rollbackReady,
          state.traceabilityReady,
          state.manualReady,
          state.pilotConfirmed,
        ].filter((item) => !item).length
      }, 0)
    const blockerLabels = buildReminderFamilyBlockers(reminders, isEnglish.value)
    const paymentLinkageSummary = buildPaymentLinkageGovernanceSummary({
      moduleKey,
      isEnglish: isEnglish.value,
      reminders,
      settlementSummary,
      financialTraceSummary: financialTraceState,
    })
    const quantImpactSummary = buildQuantImpactGovernanceSummary({
      moduleKey,
      isEnglish: isEnglish.value,
      reminders,
      settlementSummary,
      financialTraceSummary: financialTraceState,
      pendingGateCount: gatePendingCount,
      blockerLabels,
    })
    const financeCockpitSummary = buildCommandModuleFinanceCockpitSummary(moduleKey)
    const roleDeskSummary = buildCommandModuleRoleDeskSummary(moduleKey)
    const closeSummary = buildCutoverCloseSummary({
      isEnglish: isEnglish.value,
      gatePendingCount,
      settlementSummary,
      financialTraceSummary: financialTraceState,
      closedLoopSummary,
      paymentLinkageIssueCount: paymentLinkageSummary.issueCount,
      quantImpactIssueCount: quantImpactSummary.issueCount,
      blockerLabels,
    })
    const closeChecklistLabel = summarizeCloseChecklist(
      buildModuleCloseChecklist({
        moduleKey,
        isEnglish: isEnglish.value,
        gatePendingCount,
        settlementIssueCount: settlementSummary.missingCount + settlementSummary.warningCount,
        financialTraceIssueCount: financialTraceState.missingCount + financialTraceState.warningCount,
        closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
        paymentLinkageIssueCount: paymentLinkageSummary.issueCount,
        quantImpactIssueCount: quantImpactSummary.issueCount,
        blockerLabels,
      }),
      isEnglish.value,
    )

    return [
      {
        id: `ops:${moduleKey}:close`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Close Desk` : `打开${moduleTitle(moduleKey)}关账台`,
        subtitle: `${closeSummary.label} · ${financeCockpitSummary.label} · ${closeChecklistLabel}`,
        icon: 'Briefcase',
        badge: isEnglish.value ? 'Close' : '关账',
        disabled: !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: resolveCutoverSettingsQuery({ moduleKey, section: 'roleDesk' }) })
            visible.value = false
            return
          }
          await openModuleWorkbench(moduleKey, { section: 'ops-close' })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:role-desk`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Role Desk` : `打开${moduleTitle(moduleKey)}责任台`,
        subtitle: describeRoleDeskSummary(roleDeskSummary),
        icon: 'UserFilled',
        badge: isEnglish.value ? 'Role' : '责任',
        disabled: !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: resolveCutoverSettingsQuery({ moduleKey, section: 'close' }) })
            visible.value = false
            return
          }
          await openModuleWorkbench(moduleKey, { section: 'ops-close' })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:finance-cockpit`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Finance Cockpit` : `打开${moduleTitle(moduleKey)}财务驾驶舱`,
        subtitle: describeFinanceCockpitSummary(financeCockpitSummary),
        icon: 'Monitor',
        badge: isEnglish.value ? 'Finance' : '财务',
        disabled: !cutoverStore.isModuleEnabled(moduleKey) || !financeCockpitSummary.enabled,
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: resolveCutoverSettingsQuery({ moduleKey, section: 'financeBatch' }) })
            visible.value = false
            return
          }
          await openModuleWorkbench(moduleKey, {
            section: supportsSettlementCockpit ? 'ops-settlement' : 'ops-close',
          })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:guardrails`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Guardrail Desk` : `打开${moduleTitle(moduleKey)}规则台`,
        subtitle: isEnglish.value
          ? 'Jump to module-level server script presets, live rule links, and guardrail packet export'
          : '直接跳到模块级脚本预设、生效规则入口和 guardrail 包导出区',
        icon: 'Guide',
        badge: isEnglish.value ? 'Guardrail' : '规则',
        disabled: !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
            visible.value = false
            return
          }
          await openModuleWorkbench(moduleKey, { section: 'ops-guardrails' })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:evidence`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Evidence Desk` : `打开${moduleTitle(moduleKey)}证据台`,
        subtitle: isEnglish.value
          ? 'Jump to required uploads, recommended evidence, and document-oriented rollback discipline'
          : '直接跳到必备上传、推荐证据和面向文档的回退纪律区域',
        icon: 'Files',
        badge: isEnglish.value ? 'Evidence' : '证据',
        disabled: !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
            visible.value = false
            return
          }
          await openModuleWorkbench(moduleKey, { section: 'ops-evidence' })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:handbook`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Handbook Desk` : `打开${moduleTitle(moduleKey)}手册台`,
        subtitle: isEnglish.value
          ? 'Jump directly to the operator handbook handoff panel in the shared workbench'
          : '直接跳到共享工作台里的操作手册交接面板',
        icon: 'DocumentCopy',
        badge: isEnglish.value ? 'Ops' : '运维',
        disabled: !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
            visible.value = false
            return
          }
          await openModuleWorkbench(moduleKey, { section: 'ops-handbook' })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:rehearsal`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Rehearsal Desk` : `打开${moduleTitle(moduleKey)}演练台`,
        subtitle: isEnglish.value
          ? 'Jump directly to rollback drill metrics and cutover rehearsal actions'
          : '直接跳到回退演练指标和切换演练动作区',
        icon: 'MagicStick',
        badge: isEnglish.value ? 'Ops' : '运维',
        disabled: !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
            visible.value = false
            return
          }
          await openModuleWorkbench(moduleKey, { section: 'ops-rehearsal' })
          visible.value = false
        },
      },
      ...(supportsExecutionFeedback
        ? [{
            id: `ops:${moduleKey}:execution-feedback`,
            title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Execution Feedback` : `打开${moduleTitle(moduleKey)}执行反馈台`,
            subtitle: isEnglish.value
              ? 'Jump directly to transfer progress, move completion, and warehouse pressure feedback'
              : '直接跳到调拨进度、移动完成度和仓储压力反馈区域',
            icon: 'Operation',
            badge: isEnglish.value ? 'Execution' : '执行',
            disabled: !cutoverStore.isModuleEnabled(moduleKey),
            action: async () => {
              if (!cutoverStore.isModuleEnabled(moduleKey)) {
                await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
                visible.value = false
                return
              }
              await openModuleWorkbench(moduleKey, { section: 'ops-execution-feedback' })
              visible.value = false
            },
          }]
        : []),
      ...(supportsQuantImpact
        ? [{
            id: `ops:${moduleKey}:quant-impact`,
            title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Quant Impact Desk` : `打开${moduleTitle(moduleKey)}库存影响台`,
            subtitle: isEnglish.value
              ? 'Jump directly to quant-side impact, touched locations, and rollback-sensitive transfer review'
              : '直接跳到 quant 副作用、涉及库位和回退敏感调拨复核区',
            icon: 'DataBoard',
            badge: isEnglish.value ? 'Inventory' : '库存',
            disabled: !cutoverStore.isModuleEnabled(moduleKey),
            action: async () => {
              if (!cutoverStore.isModuleEnabled(moduleKey)) {
                await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
                visible.value = false
                return
              }
              await openModuleWorkbench(moduleKey, { section: 'ops-quant-impact' })
              visible.value = false
            },
          }]
        : []),
      {
        id: `ops:${moduleKey}:rollback`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Rollback Desk` : `打开${moduleTitle(moduleKey)}回退台`,
        subtitle: isEnglish.value
          ? 'Jump directly to rollback packet, evidence discipline, and module stop control'
          : '直接跳到回退包、证据纪律和模块停止控制区',
        icon: 'RefreshLeft',
        badge: isEnglish.value ? 'Rollback' : '回退',
        disabled: !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
            visible.value = false
            return
          }
          await openModuleWorkbench(moduleKey, { section: 'ops-rollback' })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:settlement`,
        title: isEnglish.value
          ? `Open ${moduleTitle(moduleKey)} ${supportsSettlementCockpit ? 'Settlement Cockpit' : 'Settlement Desk'}`
          : `打开${moduleTitle(moduleKey)}${supportsSettlementCockpit ? '结算驾驶舱' : '结算台'}`,
        subtitle: `${describeSettlementSummary(settlementSummary)} · ${financeCockpitSummary.label}`,
        icon: 'Coin',
        badge: isEnglish.value ? 'Settlement' : '结算',
        disabled: !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
            visible.value = false
            return
          }
          await openModuleWorkbench(moduleKey, { section: 'ops-settlement' })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:financial-trace`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Financial Trace Desk` : `打开${moduleTitle(moduleKey)}财务追溯台`,
        subtitle: `${describeFinancialTraceSummary(financialTraceState)} · ${financeCockpitSummary.label}`,
        icon: 'DataAnalysis',
        badge: isEnglish.value ? 'Trace' : '追溯',
        disabled: !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
            visible.value = false
            return
          }
          if (traceTarget) {
            await router.push({
              name: traceTarget.routeName,
              query: traceTarget.query,
            })
          } else {
            await openModuleWorkbench(moduleKey, { section: 'ops-financial-trace' })
          }
          visible.value = false
        },
      },
      ...(supportsSettlementCockpit
        ? [{
            id: `ops:${moduleKey}:settlement-cockpit`,
            title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Reconciliation Cockpit` : `打开${moduleTitle(moduleKey)}对账驾驶舱`,
            subtitle: `${financeCockpitSummary.label} · ${isEnglish.value
              ? 'Keep open items, payment linkage, and finance evidence in one shared cockpit'
              : '把未清项、付款链接和财务证据固定在同一块共享驾驶舱里'}`,
            icon: 'DataBoard',
            badge: isEnglish.value ? 'Settlement' : '结算',
            disabled: !cutoverStore.isModuleEnabled(moduleKey),
            action: async () => {
              if (!cutoverStore.isModuleEnabled(moduleKey)) {
                await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
                visible.value = false
                return
              }
              await openModuleWorkbench(moduleKey, { section: 'ops-settlement' })
              visible.value = false
            },
          }]
        : []),
      ...(supportsPaymentLinkage
        ? [{
            id: `ops:${moduleKey}:payment-linkage`,
            title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Payment Linkage Desk` : `打开${moduleTitle(moduleKey)}付款联动台`,
            subtitle: `${paymentLinkageSummary.label} · ${financeCockpitSummary.label}`,
            icon: 'Coin',
            badge: isEnglish.value ? 'Linkage' : '联动',
            disabled: !cutoverStore.isModuleEnabled(moduleKey),
            action: async () => {
              if (!cutoverStore.isModuleEnabled(moduleKey)) {
                await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
                visible.value = false
                return
              }
              await openModuleWorkbench(moduleKey, { section: 'ops-payment-linkage' })
              visible.value = false
            },
          }]
        : []),
      {
        id: `ops:${moduleKey}:trace-documents`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Trace Documents` : `打开${moduleTitle(moduleKey)}追溯文档`,
        subtitle: documentsTarget?.state.topRiskRefs[0]
          || (isEnglish.value ? 'Open the top-risk document desk for this module' : '打开该模块 top-risk 的文档工作台'),
        icon: 'Files',
        badge: isEnglish.value ? 'Trace' : '追溯',
        disabled: !cutoverStore.isModuleEnabled(moduleKey) || !documentsTarget,
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
            visible.value = false
            return
          }
          if (!documentsTarget) return
          await router.push({
            name: documentsTarget.routeName,
            query: documentsTarget.query,
          })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:trace-timeline`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Trace Timeline` : `打开${moduleTitle(moduleKey)}追溯时间轴`,
        subtitle: timelineTarget?.state.topRiskRefs[0]
          || (isEnglish.value ? 'Open the Monica-style timeline for this module top-risk record' : '打开该模块 top-risk 记录的 Monica 风格时间轴'),
        icon: 'Clock',
        badge: isEnglish.value ? 'Trace' : '追溯',
        disabled: !cutoverStore.isModuleEnabled(moduleKey) || !timelineTarget,
        action: async () => {
          if (!cutoverStore.isModuleEnabled(moduleKey)) {
            await router.push({ name: 'settings', query: { tab: 'cutover', module: moduleKey } })
            visible.value = false
            return
          }
          if (!timelineTarget) return
          await router.push({
            name: timelineTarget.routeName,
            query: timelineTarget.query,
          })
          visible.value = false
        },
      },
      {
        id: `ops:${moduleKey}:risk`,
        title: isEnglish.value ? `Open ${moduleTitle(moduleKey)} Top Risk` : `打开${moduleTitle(moduleKey)}最高风险`,
        subtitle: financialTraceState.topRiskRefs[0] || (topRisk
          ? `${moduleTitle(moduleKey)} · ${topRisk.title}`
          : isEnglish.value
            ? 'No unresolved reminder currently ranked as top risk in this module'
            : '当前模块还没有可作为最高风险的未处理提醒'),
        icon: 'Bell',
        badge: isEnglish.value ? 'Ops' : '运维',
        disabled: (!traceTarget && !topRisk?.recordId) || !cutoverStore.isModuleEnabled(moduleKey),
        action: async () => {
          if (traceTarget) {
            await router.push({
              name: traceTarget.routeName,
              query: traceTarget.query,
            })
            visible.value = false
            return
          }
          if (!topRisk?.recordId) return
          await router.push({
            name: moduleKey,
            query: {
              detailId: String(topRisk.recordId),
              section: resolveReminderSection(topRisk),
              relatedTo: topRisk.moduleKey,
            },
          })
          visible.value = false
        },
      },
    ]
  }),
)

const cutoverItems = computed<CommandItem[]>(() => [
  {
    id: 'cutover:dashboard',
    title: isEnglish.value ? 'Open Pilot Dashboard' : '打开试点首页',
    subtitle: isEnglish.value ? 'Review queues, risk density, and batch actions' : '查看审核队列、风险密度和批处理入口',
    icon: 'DataBoard',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: async () => {
      await router.push({ name: 'dashboard' })
      visible.value = false
    },
  },
  {
    id: 'cutover:server-load',
    title: isEnglish.value ? 'Load Server Snapshot' : '载入服务端快照',
    subtitle: remoteSnapshotSubtitle(),
    icon: 'Download',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: async () => {
      const result = await cutoverRemoteStore.loadRemoteSnapshot()
      if (!result.found) {
        ElMessage.warning(isEnglish.value ? 'No server snapshot yet' : '服务端还没有切换快照')
        return
      }
      ElMessage.success(isEnglish.value ? 'Server snapshot loaded' : '已载入服务端切换快照')
      visible.value = false
    },
  },
  {
    id: 'cutover:server-save',
    title: isEnglish.value ? 'Save Server Snapshot' : '保存服务端快照',
    subtitle: isEnglish.value
      ? 'Persist the current pilot switches, gates, and owners to the shared server baseline'
      : '把当前试点开关、门槛和负责人保存为共享服务端基线',
    icon: 'Upload',
    badge: isEnglish.value ? 'Cutover' : '切换',
    disabled: !commandRemoteDirty.value && cutoverRemoteStore.hasRemoteSnapshot,
    action: async () => {
      await cutoverRemoteStore.saveRemoteSnapshot(
        buildCommandCutoverSnapshot(),
        authStore.displayName || authStore.user?.username || 'command-palette',
      )
      ElMessage.success(isEnglish.value ? 'Server snapshot saved' : '服务端切换快照已保存')
      visible.value = false
    },
  },
  {
    id: 'cutover:settings',
    title: isEnglish.value ? 'Open Cutover Settings' : '打开切换设置',
    subtitle: isEnglish.value ? 'Review pilot scopes, toggles, and rollback controls' : '查看试点范围、开关和回退控制',
    icon: 'Setting',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: async () => {
      await router.push({ name: 'settings', query: { tab: 'cutover' } })
      visible.value = false
    },
  },
  {
    id: 'cutover:close-desk',
    title: isEnglish.value ? 'Open Role + Close Desk' : '打开责任与关账台',
    subtitle: isEnglish.value ? 'Review unified close blockers, owners, and cockpit readiness' : '统一核对关账阻塞项、责任人和驾驶台就绪度',
    icon: 'Briefcase',
    badge: isEnglish.value ? 'Close' : '关账',
    action: async () => {
      await router.push({ name: 'settings', query: resolveCutoverSettingsQuery({ section: 'roleDesk' }) })
      visible.value = false
    },
  },
  {
    id: 'cutover:role-desk',
    title: isEnglish.value ? 'Open Role Desk Overview' : '打开责任台总览',
    subtitle: commandRoleDeskOverviewSubtitle(),
    icon: 'UserFilled',
    badge: isEnglish.value ? 'Role' : '责任',
    action: async () => {
      await router.push({ name: 'settings', query: resolveCutoverSettingsQuery({ section: 'close' }) })
      visible.value = false
    },
  },
  {
    id: 'cutover:finance-batch',
    title: isEnglish.value ? 'Open Finance Close Batch Desk' : '打开财务关账批量台',
    subtitle: commandFinanceOverviewSubtitle(),
    icon: 'DataAnalysis',
    badge: isEnglish.value ? 'Finance' : '财务',
    action: async () => {
      await router.push({ name: 'settings', query: resolveCutoverSettingsQuery({ section: 'financeBatch' }) })
      visible.value = false
    },
  },
  {
    id: 'cutover:accounting-reconcile',
    title: isEnglish.value ? 'Open Accounting Reconciliation Cockpit' : '打开会计对账驾驶舱',
    subtitle: describeFinanceCockpitSummary(buildCommandModuleFinanceCockpitSummary('accountMove')),
    icon: 'DataBoard',
    badge: isEnglish.value ? 'Finance' : '财务',
    action: async () => {
      await openModuleWorkbench('accountMove', { section: 'ops-settlement' })
      visible.value = false
    },
  },
  {
    id: 'cutover:finance-cockpit',
    title: isEnglish.value ? 'Open Finance Cockpit Overview' : '打开财务驾驶舱总览',
    subtitle: commandFinanceOverviewSubtitle(),
    icon: 'Monitor',
    badge: isEnglish.value ? 'Finance' : '财务',
    action: async () => {
      await router.push({ name: 'dashboard' })
      visible.value = false
    },
  },
  {
    id: 'cutover:export-role-queue',
    title: isEnglish.value ? 'Export Role Desk Queue' : '导出责任台待办包',
    subtitle: commandRoleDeskOverviewSubtitle(),
    icon: 'Download',
    badge: isEnglish.value ? 'Role' : '责任',
    action: async () => {
      downloadText(
        `neko_erp_command_role_desk_queue_${new Date().toISOString().slice(0, 10)}.md`,
        buildCommandRoleDeskQueuePacket(),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Role desk queue exported' : '责任台待办包已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:export-finance-batch',
    title: isEnglish.value ? 'Export Finance Close Batch' : '导出财务关账批处理包',
    subtitle: commandFinanceOverviewSubtitle(),
    icon: 'Download',
    badge: isEnglish.value ? 'Finance' : '财务',
    action: async () => {
      downloadText(
        `neko_erp_command_finance_close_batch_${new Date().toISOString().slice(0, 10)}.md`,
        buildCommandFinanceCloseBatchPacket(),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Finance close batch exported' : '财务关账批处理包已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:import-settings',
    title: isEnglish.value ? 'Open Config Import Desk' : '打开配置导入台',
    subtitle: isEnglish.value ? 'Load or paste a cutover config snapshot and preview it before applying' : '载入或粘贴切换配置快照，预览后再应用',
    icon: 'UploadFilled',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: async () => {
      await router.push({ name: 'settings', query: resolveCutoverSettingsQuery({ section: 'import' }) })
      visible.value = false
    },
  },
  {
    id: 'cutover:export',
    title: isEnglish.value ? 'Export First-Wave Exceptions' : '导出首批异常清单',
    subtitle: isEnglish.value ? 'Export unresolved first-wave reminders to CSV' : '把未处理的首批提醒导出为 CSV',
    icon: 'Download',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: async () => {
      const firstWaveSet = new Set(cutoverStore.firstWaveModules)
      const rows = pilotReminderItems.value.filter((item) => firstWaveSet.has(item.moduleKey as ModuleKey))
      const filename = `neko_erp_command_center_exceptions_${new Date().toISOString().slice(0, 10)}.csv`
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
        scopeType: 'global',
        scopeKey: 'firstWave',
        scopeLabel: isEnglish.value ? 'First-Wave Pilot' : '首批试点',
        filename,
        rowCount: rows.length,
        exportedBy: authStore.displayName || authStore.user?.username || 'command-palette',
      })
      ElMessage.success(isEnglish.value ? 'Exception list exported' : '异常清单已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:config',
    title: isEnglish.value ? 'Export Cutover Config Snapshot' : '导出切换配置快照',
    subtitle: isEnglish.value ? 'Save chain switches, module overrides, owners, and local review counters' : '保存链路开关、模块覆盖、负责人和本地审核计数',
    icon: 'FolderChecked',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: () => {
      downloadText(
        `neko_erp_command_cutover_config_${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(buildCommandCutoverSnapshot(), null, 2),
        'application/json;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Cutover config exported' : '切换配置已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:packet',
    title: isEnglish.value ? 'Export Handoff Packet' : '导出交接包',
    subtitle: isEnglish.value ? 'Export chain contacts, review pressure, and top-risk notes into one markdown packet' : '把链路联系人、审核压力和最高风险备注导出成一份 markdown 交接包',
    icon: 'Tickets',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: () => {
      downloadText(
        `neko_erp_command_handoff_packet_${new Date().toISOString().slice(0, 10)}.md`,
        buildCommandHandoffPacket(),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Handoff packet exported' : '交接包已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:packet-copy',
    title: isEnglish.value ? 'Copy Handoff Packet' : '复制交接包',
    subtitle: isEnglish.value ? 'Copy the current control packet to clipboard for chat handoff' : '把当前控制包复制到剪贴板，用于聊天交接',
    icon: 'CopyDocument',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: async () => {
      if (!navigator.clipboard) return
      await navigator.clipboard.writeText(buildCommandHandoffPacket())
      ElMessage.success(isEnglish.value ? 'Handoff packet copied' : '交接包已复制')
      visible.value = false
    },
  },
  {
    id: 'cutover:rollback-drill',
    title: isEnglish.value ? 'Export Rollback Drill Packet' : '导出回退演练包',
    subtitle: isEnglish.value ? 'Export chain rollback steps, fallback owners, and module switch snapshot' : '导出链路回退步骤、回退负责人和模块开关快照',
    icon: 'RefreshLeft',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: () => {
      downloadText(
        `neko_erp_command_rollback_drill_${new Date().toISOString().slice(0, 10)}.md`,
        buildCommandRollbackDrillPacket(),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Rollback drill packet exported' : '回退演练包已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:rollback-drill-copy',
    title: isEnglish.value ? 'Copy Rollback Drill Packet' : '复制回退演练包',
    subtitle: isEnglish.value ? 'Copy rollback drill packet to clipboard for chat handoff' : '把回退演练包复制到剪贴板，用于聊天交接',
    icon: 'CopyDocument',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: async () => {
      if (!navigator.clipboard) return
      await navigator.clipboard.writeText(buildCommandRollbackDrillPacket())
      ElMessage.success(isEnglish.value ? 'Rollback drill packet copied' : '回退演练包已复制')
      visible.value = false
    },
  },
  {
    id: 'cutover:guardrail-rules',
    title: isEnglish.value ? 'Export Guardrail Rules' : '导出 Guardrail 规则',
    subtitle: isEnglish.value ? 'Export the first-wave server script preset catalog and review checklist' : '导出首批服务端脚本预设目录和核对清单',
    icon: 'Document',
    badge: isEnglish.value ? 'Guardrail' : '规则',
    action: () => {
      downloadText(
        `neko_erp_command_guardrail_rules_${new Date().toISOString().slice(0, 10)}.md`,
        buildCommandGuardrailRulesPacket(),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Guardrail rules exported' : 'Guardrail 规则已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:guardrail-rules-copy',
    title: isEnglish.value ? 'Copy Guardrail Rules' : '复制 Guardrail 规则',
    subtitle: isEnglish.value ? 'Copy guardrail rules to clipboard for review' : '把 guardrail 规则复制到剪贴板用于评审',
    icon: 'CopyDocument',
    badge: isEnglish.value ? 'Guardrail' : '规则',
    action: async () => {
      if (!navigator.clipboard) return
      await navigator.clipboard.writeText(buildCommandGuardrailRulesPacket())
      ElMessage.success(isEnglish.value ? 'Guardrail rules copied' : 'Guardrail 规则已复制')
      visible.value = false
    },
  },
  {
    id: 'cutover:blockers',
    title: isEnglish.value ? 'Export Blocker Packet' : '导出阻塞包',
    subtitle: isEnglish.value ? 'Export first-wave blocker summary for all pilot chains' : '导出所有试点链路的首批阻塞摘要',
    icon: 'WarnTriangleFilled',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: () => {
      const chains = commandPacketChains()
      downloadText(
        `neko_erp_command_blocker_packet_${new Date().toISOString().slice(0, 10)}.md`,
        buildSharedCutoverBlockerPacket({
          english: isEnglish.value,
          generatedAt: new Date().toISOString(),
          title: isEnglish.value ? 'NEKO_ERP Command Center Blocker Packet' : 'NEKO_ERP 命令中心阻塞包',
          summary: {
            readyChains: chains.filter((chain) => chain.readyLabel === '6/6' && (chain.critical ?? 0) === 0 && !chain.blockerLabels.length).length,
            totalChains: chains.length,
            criticalChains: chains.filter((chain) => (chain.critical ?? 0) > 0).length,
            warningChains: chains.filter((chain) => (chain.warning ?? 0) > 0 || chain.blockerLabels.length > 0).length,
            pendingGates: chains.reduce((sum, chain) => sum + chain.pendingLabels.length, 0),
            openReminders: chains.reduce((sum, chain) => sum + (chain.reminderCount ?? 0), 0),
          },
          chains,
        }),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Blocker packet exported' : '阻塞包已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:acceptance',
    title: isEnglish.value ? 'Export Acceptance Packet' : '导出放行包',
    subtitle: isEnglish.value ? 'Export first-wave acceptance summary for pilot chains' : '导出试点链路的首批放行摘要',
    icon: 'SuccessFilled',
    badge: isEnglish.value ? 'Gate' : '门槛',
    action: () => {
      downloadText(
        `neko_erp_command_acceptance_packet_${new Date().toISOString().slice(0, 10)}.md`,
        buildSharedAcceptancePacket({
          english: isEnglish.value,
          generatedAt: new Date().toISOString(),
          chains: commandPacketChains(),
        }),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Acceptance packet exported' : '放行包已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:manual',
    title: isEnglish.value ? 'Export Pilot Manual' : '导出试点手册',
    subtitle: isEnglish.value ? 'Export first-wave operator manual with evidence rules and rollback steps' : '导出包含证据纪律和回退步骤的首批操作手册',
    icon: 'Reading',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: () => {
      downloadText(
        `neko_erp_command_user_manual_${new Date().toISOString().slice(0, 10)}.md`,
        buildSharedPilotUserManualPack({
          english: isEnglish.value,
          generatedAt: new Date().toISOString(),
          chains: commandPacketChains(),
          modules: commandPacketModules(),
        }),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'User manual exported' : '用户手册已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:confirmation',
    title: isEnglish.value ? 'Export Pilot Confirmation Template' : '导出试点确认模板',
    subtitle: isEnglish.value ? 'Export go/no-go template with chain ownership and pending gates' : '导出带链路责任和未完成门槛的放行确认模板',
    icon: 'EditPen',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: () => {
      const chains = commandPacketChains()
      downloadText(
        `neko_erp_command_pilot_confirmation_${new Date().toISOString().slice(0, 10)}.md`,
        buildPilotConfirmationTemplate({
          english: isEnglish.value,
          generatedAt: new Date().toISOString(),
          summary: {
            readyChains: chains.filter((chain) => chain.readyLabel === '6/6').length,
            totalChains: chains.length,
            criticalChains: chains.filter((chain) => (chain.critical ?? 0) > 0).length,
            warningChains: chains.filter((chain) => (chain.warning ?? 0) > 0 || chain.blockerLabels.length > 0).length,
            pendingGates: chains.reduce((sum, chain) => sum + chain.pendingLabels.length, 0),
            openReminders: chains.reduce((sum, chain) => sum + (chain.reminderCount ?? 0), 0),
          },
          chains,
        }),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Pilot confirmation exported' : '试点确认模板已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:contacts',
    title: isEnglish.value ? 'Copy Chain Contact Matrix' : '复制链路联系人矩阵',
    subtitle: isEnglish.value ? 'Copy owners, fallback owners, and rehearsal owners for all pilot chains' : '复制所有试点链路的负责人、回退负责人和演练负责人',
    icon: 'CopyDocument',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: async () => {
      if (!navigator.clipboard) return
      await navigator.clipboard.writeText(
        buildSharedChainContactMatrix({
          english: isEnglish.value,
          rows: commandContactMatrixRows(),
        }),
      )
      ElMessage.success(isEnglish.value ? 'Chain contacts copied' : '链路联系人已复制')
      visible.value = false
    },
  },
  {
    id: 'cutover:contacts-export',
    title: isEnglish.value ? 'Export Chain Contact Matrix' : '导出链路联系人矩阵',
    subtitle: isEnglish.value ? 'Export all pilot chain owners and fallback contacts as markdown' : '把所有试点链路负责人和回退联系人导出为 markdown',
    icon: 'Document',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: () => {
      downloadText(
        `neko_erp_command_chain_contact_matrix_${new Date().toISOString().slice(0, 10)}.md`,
        buildSharedChainContactMatrix({
          english: isEnglish.value,
          generatedAt: new Date().toISOString(),
          rows: commandContactMatrixRows(),
        }),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Chain contact matrix exported' : '链路联系人矩阵已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:gates-pending',
    title: isEnglish.value ? 'Copy Pending Acceptance Gates' : '复制未完成放行门槛',
    subtitle: isEnglish.value ? 'Copy all unfinished gate checks for first-wave chains' : '复制首批链路所有未完成放行项',
    icon: 'List',
    badge: isEnglish.value ? 'Gate' : '门槛',
    action: async () => {
      if (!navigator.clipboard) return
      await navigator.clipboard.writeText(
        buildSharedPendingGateMatrix({
          english: isEnglish.value,
          rows: commandPendingGateRows(),
        }),
      )
      ElMessage.success(isEnglish.value ? 'Pending gates copied' : '未完成门槛已复制')
      visible.value = false
    },
  },
  {
    id: 'cutover:gates-pending-export',
    title: isEnglish.value ? 'Export Pending Acceptance Gates' : '导出未完成放行门槛',
    subtitle: isEnglish.value ? 'Export unfinished first-wave acceptance checks as markdown' : '把首批未完成放行项导出为 markdown',
    icon: 'DocumentChecked',
    badge: isEnglish.value ? 'Gate' : '门槛',
    action: () => {
      downloadText(
        `neko_erp_command_pending_gates_${new Date().toISOString().slice(0, 10)}.md`,
        buildSharedPendingGateMatrix({
          english: isEnglish.value,
          generatedAt: new Date().toISOString(),
          rows: commandPendingGateRows(),
        }),
        'text/markdown;charset=utf-8',
      )
      ElMessage.success(isEnglish.value ? 'Pending gate matrix exported' : '未完成门槛矩阵已导出')
      visible.value = false
    },
  },
  {
    id: 'cutover:clear-review',
    title: isEnglish.value ? 'Clear Local Review State' : '清空本地审核状态',
    subtitle: isEnglish.value ? 'Reset reviewed and snoozed reminder state on this Electron client' : '重置当前 Electron 客户端上的已核对与稍后处理状态',
    icon: 'RefreshLeft',
    badge: isEnglish.value ? 'Cutover' : '切换',
    action: () => {
      pilotReviewStore.clearReviewState()
      ElMessage.success(isEnglish.value ? 'Local review state cleared' : '本地审核状态已清空')
      visible.value = false
    },
  },
])

const sections = computed<CommandSection[]>(() => [
  {
    key: 'script-presets',
    title: isEnglish.value ? 'Server Script Presets' : '服务端脚本模板',
    items: sysScriptPresetItems.value,
  },
  {
    key: 'timeline-desks',
    title: isEnglish.value ? 'Timeline Desks' : '时间轴工作台',
    items: timelineDeskItems.value,
  },
  {
    key: 'review',
    title: isEnglish.value ? 'Pilot Review' : '试点审核',
    items: reviewItems.value,
  },
  {
    key: 'cutover',
    title: isEnglish.value ? 'Cutover Controls' : '切换控制',
    items: cutoverItems.value,
  },
  {
    key: 'chain-ops',
    title: isEnglish.value ? 'Chain Ops' : '链路运维',
    items: chainOpsItems.value,
  },
  {
    key: 'module-ops',
    title: isEnglish.value ? 'Module Ops Desks' : '模块运维台',
    items: moduleOpsItems.value,
  },
  {
    key: 'recent',
    title: isEnglish.value ? 'Recent Objects' : '最近对象',
    items: recentItems.value,
  },
  {
    key: 'actions',
    title: isEnglish.value ? 'Quick Actions' : '快捷动作',
    items: actionItems.value,
  },
  {
    key: 'create',
    title: isEnglish.value ? 'Quick Create' : '快捷新建',
    items: createItems.value,
  },
  {
    key: 'modules',
    title: isEnglish.value ? 'Modules' : '模块',
    items: moduleItems.value,
  },
])

const filteredSections = computed<CommandSection[]>(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) {
    return sections.value.filter((section) => section.items.length)
  }
  return sections.value
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        [item.title, item.subtitle, item.badge].some((part) => part.toLowerCase().includes(query)),
      ),
    }))
    .filter((section) => section.items.length)
})

async function executeItem(item: CommandItem) {
  if (item.disabled || runningItemId.value) return
  runningItemId.value = item.id
  try {
    await item.action()
  } finally {
    runningItemId.value = ''
  }
}

async function loadPilotReminders() {
  const [rows, cockpitResults] = await Promise.all([
    fetchReminders({ limit: 80 }),
    Promise.allSettled(
      cutoverStore.firstWaveModules
        .filter((moduleKey) => supportsCutoverFinancialTraceModule(moduleKey))
        .map(async (moduleKey) => ({
          moduleKey,
          cockpit: await fetchFinancialTraceCockpit(moduleKey, 8),
        })),
    ),
  ])
  pilotReminderItems.value = rows
    .filter((item) => !pilotReviewStore.isHidden(item))
    .sort(compareReminderSeverity)
  moduleFinancialTraceCockpitMap.value = cockpitResults.reduce<Partial<Record<ModuleKey, FinancialTraceCockpit>>>((summary, item) => {
    if (item.status === 'fulfilled') {
      summary[item.value.moduleKey] = item.value.cockpit
    }
    return summary
  }, {})
}

function handlePaletteToggle() {
  visible.value = !visible.value
  if (visible.value) {
    search.value = ''
    void loadPilotReminders()
    if (!cutoverRemoteStore.hasRemoteSnapshot && !cutoverRemoteStore.remoteLoading) {
      void cutoverRemoteStore.loadRemoteSnapshot()
    }
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value) {
    visible.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener(SHORTCUT_EVENT_MAP.openCommandPalette, handlePaletteToggle as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener(SHORTCUT_EVENT_MAP.openCommandPalette, handlePaletteToggle as EventListener)
})
</script>

<template>
  <transition name="fade">
    <div v-if="visible" class="command-overlay" @click.self="visible = false">
      <div class="command-palette modern-card">
        <header class="palette-header">
          <el-icon class="search-icon"><Search /></el-icon>
          <input
            v-model="search"
            :placeholder="t('app.commandPlaceholder')"
            class="palette-input"
            autofocus
          />
          <div class="palette-kbd">ESC</div>
        </header>

        <div class="palette-body">
          <section v-for="section in filteredSections" :key="section.key" class="palette-section">
            <div class="section-title">{{ section.title }}</div>
            <div
              v-for="item in section.items"
              :key="item.id"
              class="palette-item"
              :class="{ disabled: item.disabled, running: runningItemId === item.id }"
              @click="executeItem(item)"
            >
              <div class="item-icon-box">
                <el-icon><component :is="item.icon" /></el-icon>
              </div>
              <div class="item-info">
                <div class="item-header">
                  <span class="item-title">{{ item.title }}</span>
                  <span class="item-badge">{{ item.badge }}</span>
                </div>
                <span class="item-subtitle">{{ item.subtitle }}</span>
              </div>
              <div class="item-shortcut">
                {{ runningItemId === item.id ? (isEnglish ? 'Running' : '执行中') : t('app.commandJump') }}
              </div>
            </div>
          </section>
          <div v-if="!filteredSections.length" class="empty-state">{{ t('app.commandEmpty') }}</div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.command-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding-top: 10vh;
}

.command-palette {
  width: min(760px, calc(100vw - 32px));
  background: var(--app-panel);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 72vh;
}

.palette-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--app-border);
}

.search-icon {
  font-size: 18px;
  color: var(--app-text-secondary);
}

.palette-input {
  flex: 1;
  border: none;
  outline: none;
  margin-left: 12px;
  font-size: 16px;
  font-family: inherit;
  color: var(--app-text);
  background: transparent;
}

.palette-kbd {
  font-size: 10px;
  font-weight: 800;
  background: var(--app-muted-bg);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--app-text-secondary);
}

.palette-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.palette-section + .palette-section {
  margin-top: 14px;
}

.section-title {
  padding: 4px 8px 8px;
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.palette-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.palette-item:hover {
  background: var(--app-hover);
}

.palette-item.disabled {
  opacity: 0.55;
}

.palette-item.running {
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
}

.item-icon-box {
  width: 32px;
  height: 32px;
  background: var(--app-muted-bg);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-primary);
}

.item-info {
  flex: 1;
  margin-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
}

.item-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--app-muted-bg);
  color: var(--app-text-secondary);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.item-subtitle {
  font-size: 11px;
  color: var(--app-text-secondary);
  line-height: 1.5;
}

.item-shortcut {
  font-size: 10px;
  color: var(--app-text-secondary);
  text-transform: uppercase;
  font-weight: 800;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--app-text-secondary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
