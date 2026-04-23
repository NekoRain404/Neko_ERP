<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus/es/components/message/index'
import CompactNoticeBar from '@/components/CompactNoticeBar.vue'
import SummaryCardGrid from '@/components/SummaryCardGrid.vue'
import { fetchFinancialTraceCockpit, fetchFinancialTraceDetail, type FinancialTraceCockpit } from '@/api/financial-trace'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import { useConnectionStore } from '@/stores/connection'
import { useCutoverRemoteStore } from '@/stores/cutover-remote'
import { useCutoverStore, type ChainAcceptanceState, type ChainContacts, type PilotChainKey } from '@/stores/cutover'
import { usePilotReviewStore } from '@/stores/pilot-review'
import { usePreferencesStore } from '@/stores/preferences'
import { formatShortcutBinding, useShortcutStore } from '@/stores/shortcuts'
import { useI18n } from '@/i18n'
import { downloadCsv, downloadText } from '@/utils/export'
import { formatDateTime } from '@/utils/format'
import {
  buildCutoverConfigSnapshot,
  parseCutoverConfigSnapshot,
  resolveDefaultChainGateState,
  resolveChainRouteName,
  resolveCutoverSettingsQuery,
  resolveDefaultChainContacts,
  summarizeCutoverConfigSnapshot,
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
  buildSharedChainContactMatrix,
  buildSharedChainRunbookContent,
  buildSharedChainGatePacket,
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
import {
  buildReminderFamilyBadges,
  buildReminderFamilyBlockers,
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
import { listSysScriptPresets } from '@/utils/sys-script-presets'
import {
  buildSharedGuardrailRulesPacket,
  buildSharedRollbackDrillPacket,
} from '@/utils/cutover-protection'
import { buildModuleDetailRouteTarget, buildModuleRouteTarget } from '@/utils/module-navigation'
import type { SummaryCardItem } from '@/types/summary-cards'

const FinanceCloseBatchPanel = defineAsyncComponent(() => import('@/components/FinanceCloseBatchPanel.vue'))
const PilotBatchActionPanel = defineAsyncComponent(() => import('@/components/PilotBatchActionPanel.vue'))
const PilotRiskStatsPanel = defineAsyncComponent(() => import('@/components/PilotRiskStatsPanel.vue'))
const RoleDeskQueuePanel = defineAsyncComponent(() => import('@/components/RoleDeskQueuePanel.vue'))

const appStore = useAppStore()
const authStore = useAuthStore()
const cutoverOpsStore = useCutoverOpsStore()
const connectionStore = useConnectionStore()
const cutoverRemoteStore = useCutoverRemoteStore()
const cutoverStore = useCutoverStore()
const pilotReviewStore = usePilotReviewStore()
const preferencesStore = usePreferencesStore()
const shortcutStore = useShortcutStore()
const route = useRoute()
const router = useRouter()
const { moduleTitle, t } = useI18n()

const activeTab = ref(resolveTab(route.query.tab))
const savingConnection = ref(false)
const testingConnection = ref(false)
const refreshingCurrentUser = ref(false)
const changingPassword = ref(false)
const capturingShortcutKey = ref<string | null>(null)
const gpuStatus = ref<any | null>(null)
const runtimeSettings = ref<{ hardwareAcceleration: boolean }>({ hardwareAcceleration: true })
const runtimeSettingsSaved = ref<{ hardwareAcceleration: boolean }>({ hardwareAcceleration: true })
const runtimeSettingsApplied = ref<{ hardwareAcceleration: boolean }>({ hardwareAcceleration: true })
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const cutoverReminderItems = ref<ReminderRecord[]>([])
const cutoverReminderLoading = ref(false)
const cutoverTraceBundleBusy = ref(false)
const moduleFinancialTraceCockpitMap = ref<Partial<Record<ModuleKey, FinancialTraceCockpit>>>({})
const chainContactDrafts = ref<Record<string, ChainContacts>>({})
const cutoverConfigDraft = ref('')
const cutoverConfigFileName = ref('')
const cutoverConfigFileInput = ref<HTMLInputElement | null>(null)
const lastCutoverBackup = ref('')
const chainGateDrafts = ref<Record<string, ChainAcceptanceState>>({})
const cutoverSectionRefs: Partial<Record<'handoff' | 'import' | 'gates' | 'close' | 'roleDesk' | 'financeBatch' | 'ops', HTMLElement | null>> = {}
const cutoverChainCardRefs: Partial<Record<PilotChainKey, HTMLElement | null>> = {}
type GovernancePanelKey = 'roleDesk' | 'financeBatch' | 'riskStats' | 'batchReview' | 'closedLoopRows'
type GovernanceDeskCard = SummaryCardItem & {
  section: 'roleDesk' | 'financeBatch' | 'ops'
  panelKey: GovernancePanelKey
}
const expandedGovernancePanels = ref<Record<GovernancePanelKey, boolean>>({
  roleDesk: true,
  financeBatch: true,
  riskStats: false,
  batchReview: false,
  closedLoopRows: false,
})
const shouldBuildCutoverRiskRows = computed(() =>
  expandedGovernancePanels.value.riskStats || expandedGovernancePanels.value.batchReview,
)
const CUTOVER_IMPORT_BACKUP_KEY = 'neko_erp_cutover_import_backup'
const blockedModule = computed(() => {
  const moduleKey = String(route.query.module || '')
  return moduleKey ? moduleTitle(moduleKey as any) : ''
})
const blockedFrom = computed(() => String(route.query.blockedFrom || ''))
const focusedChainKey = computed(() => {
  const value = String(route.query.chain || '')
  return ['masterData', 'sales', 'purchase'].includes(value) ? (value as PilotChainKey) : null
})

const theme = computed({
  get: () => preferencesStore.themePreference,
  set: (value) => preferencesStore.setThemePreference(value as any),
})

const language = computed({
  get: () => preferencesStore.language,
  set: (value) => preferencesStore.setLanguage(value as any),
})

const density = computed({
  get: () => preferencesStore.density,
  set: (value) => preferencesStore.setDensity(value as any),
})

const fontScale = computed({
  get: () => preferencesStore.fontScale,
  set: (value) => preferencesStore.setFontScale(Number(value)),
})

const animations = computed({
  get: () => preferencesStore.animations,
  set: (value) => preferencesStore.setAnimations(Boolean(value)),
})

const notifications = computed({
  get: () => preferencesStore.notifications,
  set: (value) => preferencesStore.setNotifications(Boolean(value)),
})

const sound = computed({
  get: () => preferencesStore.sound,
  set: (value) => preferencesStore.setSound(Boolean(value)),
})

const dailySummary = computed({
  get: () => preferencesStore.dailySummary,
  set: (value) => preferencesStore.setDailySummary(Boolean(value)),
})

const customTheme = computed(() => preferencesStore.customTheme)
const pilotChainRows = computed(() => cutoverStore.chainRows)
const chainHandoffRows = computed(() =>
  pilotChainRows.value.map((chain) => {
    const reminders = cutoverReminderItems.value.filter(
      (item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey) && !pilotReviewStore.isHidden(item),
    )
    const critical = reminders.filter((item) => item.severity === 'critical').length
    const warning = reminders.filter((item) => item.severity === 'warning').length
    const topRisk = pickTopReminder(reminders)
    const contacts = cutoverStore.chainContactFor(
      chain.key,
      resolveDefaultChainContacts(chain.key, preferencesStore.language === 'en-US'),
    )
    const evidenceModules = chain.moduleKeys.map((moduleKey) => ({
      moduleKey,
      title: moduleTitle(moduleKey),
      expectation: buildModuleEvidenceExpectation(moduleKey, preferencesStore.language === 'en-US'),
    }))
    const reminderFamilies = summarizeReminderFamilies(reminders)
    const settlementSummary = buildChainSettlementSummary({
      moduleKeys: chain.moduleKeys,
      isEnglish: preferencesStore.language === 'en-US',
      reminders: reminders.map((item) => ({
        moduleKey: item.moduleKey as ModuleKey,
        type: item.type,
        severity: item.severity,
      })),
    })
    const financialTraceSummary = buildSettingsChainFinancialTraceState(chain.moduleKeys)
    const blockerLabels = buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US')
    const financeCockpitSummary = buildChainFinanceCockpitSummary({
      chainKey: chain.key,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels,
    })
    const closeRoleSnapshot = buildCloseRoleSnapshot({
      contacts,
      isEnglish: preferencesStore.language === 'en-US',
      chainKey: chain.key,
    })
    const closeChecklist = buildChainCloseChecklist({
      chainKey: chain.key,
      isEnglish: preferencesStore.language === 'en-US',
      gatePendingCount: 0,
      settlementIssueCount: settlementSummary.missingCount + settlementSummary.warningCount,
      financialTraceIssueCount: financialTraceSummary.missingCount + financialTraceSummary.warningCount,
      closedLoopIssueCount: 0,
      paymentLinkageIssueCount: countPaymentLinkageIssues(reminders),
      blockerLabels,
    })
    const topRiskLink = buildFinancialTraceDetailQuery(financialTraceSummary) || (
      topRisk?.recordId
        ? buildModuleDetailRouteTarget({
            targetModuleKey: topRisk.moduleKey as ModuleKey,
            recordId: topRisk.recordId,
            section: resolveReminderSection(topRisk),
            sourceModuleKey: resolveChainRouteName(chain.key),
            chainKey: chain.key,
          })
        : null
    )
    return {
      ...chain,
      label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
      modulesLabel: chain.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / '),
      routeName: resolveChainRouteName(chain.key),
      owner: contacts.owner,
      fallbackOwner: contacts.fallbackOwner,
      rehearsalOwner: contacts.rehearsalOwner,
      pilotConfirmOwner: contacts.pilotConfirmOwner,
      reviewerOwner: contacts.reviewerOwner,
      financeOwner: contacts.financeOwner,
      closeRoleSnapshot,
      roleDeskSummary: buildRoleDeskSummary({
        isEnglish: preferencesStore.language === 'en-US',
        roleSnapshot: closeRoleSnapshot,
        closeChecklist,
        closeLabel: settlementSummary.statusLabel,
        financeCockpitSummary,
      }),
      statusLabel: resolveChainStatus(chain.enabled, critical, warning),
      statusTone: !chain.enabled ? 'info' : critical ? 'danger' : warning ? 'warning' : 'success',
      reminders: reminders.length,
      critical,
      warning,
      reminderFamilies,
      reminderBadges: buildReminderFamilyBadges(reminders, preferencesStore.language === 'en-US'),
      blockerLabels,
      financeCockpitSummary,
      topRisk,
      topRiskRouteName: topRiskLink?.name,
      topRiskQuery: topRiskLink?.query,
      topRiskLabel: financialTraceSummary.topRiskRefs[0] || (topRisk?.relatedRef ?? topRisk?.title ?? '-'),
      evidenceModules,
      requiredEvidenceCount: evidenceModules.reduce((sum, item) => sum + item.expectation.requiredCount, 0),
      settlementSummary,
      financialTraceSummary,
    }
  }),
)
const firstWaveModuleRows = computed(() =>
  cutoverStore.firstWaveModules.map((moduleKey) => {
    const stageCards = buildFirstWaveModuleStageCards(moduleKey, preferencesStore.language === 'en-US')
    const evidence = buildModuleEvidenceExpectation(moduleKey, preferencesStore.language === 'en-US')
    const chainSummaries = cutoverStore.chainsForModule(moduleKey).map((chain) => {
      const state = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
      return {
        key: chain.key,
        label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
        summary: summarizeFirstWaveGateState(state, preferencesStore.language === 'en-US'),
      }
    })
    return {
      moduleKey,
      title: moduleTitle(moduleKey),
      enabled: cutoverStore.isModuleEnabled(moduleKey),
      chains: chainSummaries.map((chain) => chain.label).join(' / '),
      overridden: cutoverStore.moduleOverrides[moduleKey] !== undefined,
      stageCards,
      chainSummaries,
      evidence,
      stageCount: stageCards.find((item) => item.key === 'stages')?.value ?? '-',
    }
  }),
)

const settingsModuleFinancialTraceStateMap = computed(() => {
  const states: Partial<Record<ModuleKey, CutoverFinancialTraceState>> = {}
  firstWaveModuleRows.value.forEach((row) => {
    const reminders = cutoverReminderItems.value.filter(
      (item) => item.moduleKey === row.moduleKey && !pilotReviewStore.isHidden(item),
    )
    const summary = buildCutoverFinancialTraceState({
      moduleKey: row.moduleKey,
      moduleLabel: row.title,
      isEnglish: preferencesStore.language === 'en-US',
      summary: buildModuleFinancialTraceSummary({
        moduleKey: row.moduleKey,
        isEnglish: preferencesStore.language === 'en-US',
        reminders,
      }),
      cockpit: moduleFinancialTraceCockpitMap.value[row.moduleKey] || null,
    })
    states[row.moduleKey] = summary
  })
  return states
})

function resolveSettingsModuleFinancialTraceState(moduleKey: ModuleKey) {
  return settingsModuleFinancialTraceStateMap.value[moduleKey] || buildCutoverFinancialTraceState({
    moduleKey,
    moduleLabel: moduleTitle(moduleKey),
    isEnglish: preferencesStore.language === 'en-US',
    summary: buildModuleFinancialTraceSummary({
      moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders: [],
    }),
    cockpit: null,
  })
}

function buildSettingsChainFinancialTraceState(moduleKeys: ModuleKey[]) {
  return buildChainCutoverFinancialTraceState({
    isEnglish: preferencesStore.language === 'en-US',
    moduleStates: moduleKeys.map((moduleKey) => ({
      moduleKey,
      moduleLabel: moduleTitle(moduleKey),
      state: resolveSettingsModuleFinancialTraceState(moduleKey),
    })),
  })
}
const cutoverRiskScopeCount = computed(() => pilotChainRows.value.length + firstWaveModuleRows.value.length)
const cutoverRiskRows = computed(() => {
  if (!shouldBuildCutoverRiskRows.value) return []
  return [
    ...pilotChainRows.value.map((chain) => ({
      key: `chain-${chain.key}`,
      label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
      description: chain.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / '),
      moduleKeys: chain.moduleKeys,
      routeName: chain.key === 'sales' ? 'saleOrder' : chain.key === 'purchase' ? 'purchaseOrder' : 'resPartner',
      buttonLabel: preferencesStore.language === 'en-US' ? 'Open Chain' : '打开链路',
    })),
    ...firstWaveModuleRows.value.map((row) => ({
      key: `module-${row.moduleKey}`,
      label: row.title,
      description: row.chains,
      moduleKeys: [row.moduleKey],
      routeName: row.moduleKey,
      buttonLabel: preferencesStore.language === 'en-US' ? 'Open Module' : '打开模块',
    })),
  ]
})

const envRows = computed(() => [
  { label: t('settings.desktopShell'), value: 'Electron 35.2.1' },
  { label: t('settings.frontend'), value: 'Vue 3.5 + TypeScript + Element Plus' },
  { label: t('settings.backend'), value: 'Spring Boot 3.2.4 + MyBatis-Plus + Flyway' },
  { label: t('settings.database'), value: 'PostgreSQL' },
])

const gpuRows = computed(() => {
  if (!gpuStatus.value) return []
  return [
    {
      label: preferencesStore.language === 'en-US' ? 'Hardware Acceleration' : '硬件加速',
      value: gpuStatus.value.hardwareAcceleration ? (preferencesStore.language === 'en-US' ? 'Enabled' : '已启用') : (preferencesStore.language === 'en-US' ? 'Disabled' : '已禁用'),
    },
    {
      label: 'GPU Rasterization',
      value: gpuStatus.value.gpuRasterization ? 'On' : 'Off',
    },
    {
      label: 'Zero Copy',
      value: gpuStatus.value.zeroCopy ? 'On' : 'Off',
    },
    {
      label: 'GPU Compositing',
      value: gpuStatus.value.featureStatus?.gpu_compositing || '-',
    },
  ]
})
const shortcutRows = computed(() =>
  shortcutStore.rows.map((row) => ({
    ...row,
    title: preferencesStore.language === 'en-US' ? row.enLabel : row.zhLabel,
    description: preferencesStore.language === 'en-US' ? row.enDesc : row.zhDesc,
  })),
)
const runtimeSettingsDirty = computed(
  () => runtimeSettings.value.hardwareAcceleration !== runtimeSettingsSaved.value.hardwareAcceleration,
)
const hardwareAccelerationPending = computed(
  () => runtimeSettingsSaved.value.hardwareAcceleration !== runtimeSettingsApplied.value.hardwareAcceleration,
)
const chainGateRows = computed(() =>
  pilotChainRows.value.map((chain) => {
    const state = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
    const reminders = cutoverReminderItems.value.filter(
      (item) => chain.moduleKeys.includes(item.moduleKey as ModuleKey) && !pilotReviewStore.isHidden(item),
    )
    const topRisk = pickTopReminder(reminders)
    const critical = reminders.filter((item) => item.severity === 'critical').length
    const warning = reminders.filter((item) => item.severity === 'warning').length
    const evidenceModules = chain.moduleKeys.map((moduleKey) => ({
      moduleKey,
      title: moduleTitle(moduleKey),
      expectation: buildModuleEvidenceExpectation(moduleKey, preferencesStore.language === 'en-US'),
    }))
    const latestDrill = cutoverOpsStore.latestRollbackDrill(chain.key)
    const latestSignoff = cutoverOpsStore.latestPilotSignoff(chain.key)
    const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', chain.key)
    const settlementSummary = buildChainSettlementSummary({
      moduleKeys: chain.moduleKeys,
      isEnglish: preferencesStore.language === 'en-US',
      reminders: reminders.map((item) => ({
        moduleKey: item.moduleKey as ModuleKey,
        type: item.type,
        severity: item.severity,
      })),
    })
    const financialTraceSummary = buildSettingsChainFinancialTraceState(chain.moduleKeys)
    const blockerLabels = buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US')
    const financeCockpitSummary = buildChainFinanceCockpitSummary({
      chainKey: chain.key,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels,
    })
    const topRiskLink = buildFinancialTraceDetailQuery(financialTraceSummary) || (
      topRisk?.recordId
        ? buildModuleDetailRouteTarget({
            targetModuleKey: topRisk.moduleKey as ModuleKey,
            recordId: topRisk.recordId,
            section: resolveReminderSection(topRisk),
            sourceModuleKey: resolveChainRouteName(chain.key),
            chainKey: chain.key,
          })
        : null
    )
    const checks = [
      state.smokeReady,
      state.workbenchReady,
      state.rollbackReady,
      state.traceabilityReady,
      state.manualReady,
      state.pilotConfirmed,
    ]
    const readyCount = checks.filter(Boolean).length
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
      gatePendingCount: checks.length - readyCount,
      settlementIssueCount: settlementSummary.missingCount + settlementSummary.warningCount,
      financialTraceIssueCount: financialTraceSummary.missingCount + financialTraceSummary.warningCount,
      closedLoopIssueCount: buildCutoverClosedLoopSummary({
        isEnglish: preferencesStore.language === 'en-US',
        latestDrill,
        latestSignoff,
        latestExceptionExport,
      }).missingLabels.length + buildCutoverClosedLoopSummary({
        isEnglish: preferencesStore.language === 'en-US',
        latestDrill,
        latestSignoff,
        latestExceptionExport,
      }).staleLabels.length,
      paymentLinkageIssueCount: countPaymentLinkageIssues(reminders),
      blockerLabels,
    })
    const closedLoopSummary = buildCutoverClosedLoopSummary({
      isEnglish: preferencesStore.language === 'en-US',
      latestDrill,
      latestSignoff,
      latestExceptionExport,
    })
    return {
      ...chain,
      label: preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel,
      modulesLabel: chain.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / '),
      routeName: resolveChainRouteName(chain.key),
      state,
      summary: summarizeFirstWaveGateState(state, preferencesStore.language === 'en-US'),
      readyCount,
      pendingCount: checks.length - readyCount,
      readyLabel: `${readyCount}/${checks.length}`,
      reminders,
      reminderCount: reminders.length,
      critical,
      warning,
      topRisk,
      topRiskRouteName: topRiskLink?.name,
      topRiskQuery: topRiskLink?.query,
      topRiskLabel: financialTraceSummary.topRiskRefs[0] || (topRisk?.relatedRef ?? topRisk?.title ?? '-'),
      evidenceModules,
      requiredEvidenceCount: evidenceModules.reduce((sum, item) => sum + item.expectation.requiredCount, 0),
      reminderFamilies: summarizeReminderFamilies(reminders),
      reminderBadges: buildReminderFamilyBadges(reminders, preferencesStore.language === 'en-US'),
      blockerLabels,
      financeCockpitSummary,
      closeRoleSnapshot,
      closeChecklist,
      roleDeskSummary: buildRoleDeskSummary({
        isEnglish: preferencesStore.language === 'en-US',
        roleSnapshot: closeRoleSnapshot,
        closeChecklist,
        closeLabel: summarizeFirstWaveGateState(state, preferencesStore.language === 'en-US').label,
        financeCockpitSummary,
      }),
      settlementSummary,
      financialTraceSummary,
      latestDrill,
      latestSignoff,
      latestExceptionExport,
      closedLoopSummary,
    }
  }),
)
const importedCutoverSnapshot = computed(() => {
  if (!cutoverConfigDraft.value.trim()) return null
  try {
    return parseCutoverConfigSnapshot(cutoverConfigDraft.value)
  } catch {
    return null
  }
})
const importedCutoverSummary = computed(() =>
  importedCutoverSnapshot.value
    ? summarizeCutoverConfigSnapshot(importedCutoverSnapshot.value, preferencesStore.language === 'en-US')
    : [],
)
const cutoverConfigDraftError = computed(() => {
  if (!cutoverConfigDraft.value.trim()) return ''
  try {
    parseCutoverConfigSnapshot(cutoverConfigDraft.value)
    return ''
  } catch (error: any) {
    return error?.message || (preferencesStore.language === 'en-US' ? 'Invalid config JSON' : '配置 JSON 无效')
  }
})
const hasLastCutoverBackup = computed(() => Boolean(lastCutoverBackup.value.trim()))
const cutoverRemoteDirty = computed(() =>
  cutoverRemoteStore.isSnapshotDirty(buildCurrentCutoverConfigSnapshot()),
)
const cutoverRemoteStatus = computed(() => {
  if (cutoverRemoteStore.remoteLoading) {
    return preferencesStore.language === 'en-US' ? 'Loading server snapshot...' : '正在加载服务端快照...'
  }
  if (cutoverRemoteStore.remoteSaving) {
    return preferencesStore.language === 'en-US' ? 'Saving server snapshot...' : '正在保存服务端快照...'
  }
  if (cutoverRemoteDirty.value) {
    return preferencesStore.language === 'en-US'
      ? 'Local cutover changes are ahead of the shared server snapshot. Save when this pilot baseline is ready.'
      : '当前本地切换配置已领先于共享服务端快照，试点基线确认后请及时保存。'
  }
  if (cutoverRemoteStore.remoteUpdatedAt) {
    const base = preferencesStore.language === 'en-US' ? 'Server snapshot updated' : '服务端快照最近更新于'
    const by = cutoverRemoteStore.remoteUpdatedBy
      ? `${preferencesStore.language === 'en-US' ? ' by ' : '，更新人：'}${cutoverRemoteStore.remoteUpdatedBy}`
      : ''
    return `${base} ${formatDateTime(cutoverRemoteStore.remoteUpdatedAt)}${by}`
  }
  return preferencesStore.language === 'en-US'
    ? 'No server cutover snapshot yet. Save the current pilot scope when it is ready to share.'
    : '服务端还没有切换快照，准备好共享当前试点范围后可保存到服务端。'
})
const gatePressureSummary = computed(() => {
  const rows = chainGateRows.value
  return {
    readyChains: chainOpsRows.value.filter((row) => row.closeSummary.ready).length,
    criticalChains: rows.filter((row) => row.critical > 0).length,
    warningChains: rows.filter((row) => row.warning > 0 || row.blockerLabels.length > 0).length,
    reminderCount: rows.reduce((sum, row) => sum + row.reminderCount, 0),
    pendingGates: rows.reduce((sum, row) => sum + row.pendingCount, 0),
    totalChains: rows.length,
    financeScopedChains: rows.filter((row) => row.financeCockpitSummary.enabled).length,
    settlementReadyChains: rows.filter((row) => !row.settlementSummary.missingCount && !row.settlementSummary.warningCount).length,
    financeReadyChains: rows.filter((row) => row.financeCockpitSummary.enabled && row.financeCockpitSummary.issueCount === 0).length,
    roleReadyChains: rows.filter((row) => row.roleDeskSummary.issueCount === 0).length,
    financialTraceReadyChains: rows.filter((row) => !row.financialTraceSummary.missingCount && !row.financialTraceSummary.warningCount).length,
    closeBlockers: chainOpsRows.value.reduce((sum, row) => sum + row.closeSummary.blockerCount, 0),
  }
})
const chainOpsRows = computed(() =>
  chainGateRows.value.map((row) => {
    const latestDrill = cutoverOpsStore.latestRollbackDrill(row.key)
    const latestSignoff = cutoverOpsStore.latestPilotSignoff(row.key)
    const latestExceptionExport = cutoverOpsStore.latestExceptionExport('chain', row.key)
    const handoffRow = chainHandoffRows.value.find((item) => item.key === row.key)
    const closedLoopSummary = buildCutoverClosedLoopSummary({
      isEnglish: preferencesStore.language === 'en-US',
      latestDrill,
      latestSignoff,
      latestExceptionExport,
    })
    return {
      ...row,
      owner: handoffRow?.owner || '-',
      fallbackOwner: handoffRow?.fallbackOwner || '-',
      rehearsalOwner: handoffRow?.rehearsalOwner || '-',
      pilotConfirmOwner: handoffRow?.pilotConfirmOwner || '-',
      reviewerOwner: handoffRow?.reviewerOwner || '-',
      financeOwner: handoffRow?.financeOwner || '-',
      closeRoleSnapshot: buildCloseRoleSnapshot({
        contacts: {
          owner: handoffRow?.owner || '-',
          fallbackOwner: handoffRow?.fallbackOwner || '-',
          rehearsalOwner: handoffRow?.rehearsalOwner || '-',
          pilotConfirmOwner: handoffRow?.pilotConfirmOwner || '-',
          reviewerOwner: handoffRow?.reviewerOwner || '-',
          financeOwner: handoffRow?.financeOwner || '-',
        },
        isEnglish: preferencesStore.language === 'en-US',
        chainKey: row.key,
      }),
      latestDrill,
      latestSignoff,
      latestExceptionExport,
      exceptionExportCount: cutoverOpsStore.exceptionExportCountFor('chain', row.key),
      closedLoopSummary,
      closeChecklist: buildChainCloseChecklist({
        chainKey: row.key,
        isEnglish: preferencesStore.language === 'en-US',
        gatePendingCount: row.pendingCount,
        settlementIssueCount: row.settlementSummary.missingCount + row.settlementSummary.warningCount,
        financialTraceIssueCount: row.financialTraceSummary.missingCount + row.financialTraceSummary.warningCount,
        closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
        paymentLinkageIssueCount: countPaymentLinkageIssues(row.reminders),
        blockerLabels: row.blockerLabels,
      }),
      closeActivityLines: buildCloseRecentActivityLines({
        isEnglish: preferencesStore.language === 'en-US',
        closeLabel: row.summary.label,
        latestDrill,
        latestSignoff,
        latestExceptionExport,
        formatDateTime,
      }),
      closeSummary: buildCutoverCloseSummary({
        isEnglish: preferencesStore.language === 'en-US',
        gatePendingCount: row.pendingCount,
        settlementSummary: row.settlementSummary,
        financialTraceSummary: row.financialTraceSummary,
        closedLoopSummary,
        paymentLinkageIssueCount: countPaymentLinkageIssues(row.reminders),
        blockerLabels: row.blockerLabels,
      }),
      roleDeskSummary: buildRoleDeskSummary({
        isEnglish: preferencesStore.language === 'en-US',
        roleSnapshot: buildCloseRoleSnapshot({
          contacts: {
            owner: handoffRow?.owner || '-',
            fallbackOwner: handoffRow?.fallbackOwner || '-',
            rehearsalOwner: handoffRow?.rehearsalOwner || '-',
            pilotConfirmOwner: handoffRow?.pilotConfirmOwner || '-',
            reviewerOwner: handoffRow?.reviewerOwner || '-',
            financeOwner: handoffRow?.financeOwner || '-',
          },
          isEnglish: preferencesStore.language === 'en-US',
          chainKey: row.key,
        }),
        closeChecklist: buildChainCloseChecklist({
          chainKey: row.key,
          isEnglish: preferencesStore.language === 'en-US',
          gatePendingCount: row.pendingCount,
          settlementIssueCount: row.settlementSummary.missingCount + row.settlementSummary.warningCount,
          financialTraceIssueCount: row.financialTraceSummary.missingCount + row.financialTraceSummary.warningCount,
          closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
          paymentLinkageIssueCount: countPaymentLinkageIssues(row.reminders),
          blockerLabels: row.blockerLabels,
        }),
        closeLabel: summarizeFirstWaveGateState(row.state, preferencesStore.language === 'en-US').label,
        financeCockpitSummary: row.financeCockpitSummary,
      }),
    }
  }),
)
const moduleCloseRows = computed(() =>
  firstWaveModuleRows.value.map((row) => {
    const reminders = cutoverReminderItems.value.filter(
      (item) => item.moduleKey === row.moduleKey && !pilotReviewStore.isHidden(item),
    )
    const relatedChains = chainOpsRows.value.filter((item) => item.moduleKeys.includes(row.moduleKey))
    const settlementSummary = buildModuleSettlementSummary({
      moduleKey: row.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders: reminders.map((item) => ({
        type: item.type,
        severity: item.severity,
      })),
    })
    const financialTraceSummary = resolveSettingsModuleFinancialTraceState(row.moduleKey)
    const closedLoopSummary = buildAggregateClosedLoopSummary({
      isEnglish: preferencesStore.language === 'en-US',
      summaries: relatedChains.map((item) => item.closedLoopSummary),
    })
    const blockerLabels = buildReminderFamilyBlockers(reminders, preferencesStore.language === 'en-US')
    const paymentLinkageSummary = buildPaymentLinkageGovernanceSummary({
      moduleKey: row.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
    })
    const quantImpactSummary = buildQuantImpactGovernanceSummary({
      moduleKey: row.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
      pendingGateCount: relatedChains.reduce((sum, item) => sum + item.pendingCount, 0),
      blockerLabels,
    })
    const financeCockpitSummary = buildModuleFinanceCockpitSummary({
      moduleKey: row.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels,
    })
    const latestDrill = relatedChains
      .map((item) => item.latestDrill)
      .filter(Boolean)
      .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null
    const latestSignoff = relatedChains
      .map((item) => item.latestSignoff)
      .filter(Boolean)
      .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null
    const latestExceptionExport = relatedChains
      .map((item) => item.latestExceptionExport)
      .filter(Boolean)
      .sort((left, right) => String(right?.createdAt || '').localeCompare(String(left?.createdAt || '')))[0] || null
    const primaryRoleSnapshot = relatedChains[0]?.closeRoleSnapshot || null
    const closeChecklist = buildModuleCloseChecklist({
      moduleKey: row.moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      gatePendingCount: relatedChains.reduce((sum, item) => sum + item.pendingCount, 0),
      settlementIssueCount: settlementSummary.missingCount + settlementSummary.warningCount,
      financialTraceIssueCount: financialTraceSummary.missingCount + financialTraceSummary.warningCount,
      closedLoopIssueCount: closedLoopSummary.missingLabels.length + closedLoopSummary.staleLabels.length,
      paymentLinkageIssueCount: paymentLinkageSummary.issueCount,
      quantImpactIssueCount: quantImpactSummary.issueCount,
      blockerLabels,
    })
    return {
      ...row,
      reminderCount: reminders.length,
      closeSummary: buildCutoverCloseSummary({
        isEnglish: preferencesStore.language === 'en-US',
        gatePendingCount: relatedChains.reduce((sum, item) => sum + item.pendingCount, 0),
        settlementSummary,
        financialTraceSummary,
        closedLoopSummary,
        paymentLinkageIssueCount: paymentLinkageSummary.issueCount,
        quantImpactIssueCount: quantImpactSummary.issueCount,
        blockerLabels,
      }),
      settlementSummary,
      financeCockpitSummary,
      financialTraceSummary,
      closedLoopSummary,
      blockerLabels,
      topRiskLabel: financialTraceSummary.topRiskRefs[0],
      closeChecklist,
      closeChecklistLabel: summarizeCloseChecklist(
        closeChecklist,
        preferencesStore.language === 'en-US',
      ),
      closeActivityLines: buildCloseRecentActivityLines({
        isEnglish: preferencesStore.language === 'en-US',
        closeLabel: closedLoopSummary.label,
        latestDrill,
        latestSignoff,
        latestExceptionExport,
        formatDateTime,
      }),
      closeRoleSnapshot: primaryRoleSnapshot,
      roleDeskSummary: buildRoleDeskSummary({
        isEnglish: preferencesStore.language === 'en-US',
        roleSnapshot: primaryRoleSnapshot,
        closeChecklist,
        closeLabel: closedLoopSummary.label,
        financeCockpitSummary,
      }),
      chainLabels: relatedChains.map((item) => item.label).join(' / '),
    }
  }),
)
const closeDeskSummary = computed(() => ({
  readyChains: chainOpsRows.value.filter((row) => row.closeSummary.ready).length,
  blockerCount: chainOpsRows.value.reduce((sum, row) => sum + row.closeSummary.blockerCount, 0),
  readyModules: moduleCloseRows.value.filter((row) => row.closeSummary.ready).length,
  roleReadyChains: chainOpsRows.value.filter((row) => row.roleDeskSummary.issueCount === 0).length,
  roleReadyModules: moduleCloseRows.value.filter((row) => row.roleDeskSummary.issueCount === 0).length,
  financeScopedModules: moduleCloseRows.value.filter((row) => row.financeCockpitSummary.enabled).length,
  financeReadyModules: moduleCloseRows.value.filter((row) => row.financeCockpitSummary.enabled && row.financeCockpitSummary.issueCount === 0).length,
  blockedModules: moduleCloseRows.value.filter((row) => !row.closeSummary.ready).length,
}))
const cutoverOpsSummary = computed(() => ({
  drills: cutoverOpsStore.rollbackDrillCount,
  blockedDrills: cutoverOpsStore.rollbackDrills.filter((item) => item.status === 'blocked').length,
  goSignoffs: cutoverOpsStore.pilotSignoffs.filter((item) => item.decision === 'go').length,
  exceptionExports: cutoverOpsStore.exceptionExportCount,
  closedLoopChains: chainOpsRows.value.filter((row) => row.closedLoopSummary.ready).length,
  settlementReadyChains: chainOpsRows.value.filter((row) => !row.settlementSummary.missingCount && !row.settlementSummary.warningCount).length,
  financeScopedChains: chainOpsRows.value.filter((row) => row.financeCockpitSummary.enabled).length,
  financeReadyChains: chainOpsRows.value.filter((row) => row.financeCockpitSummary.enabled && row.financeCockpitSummary.issueCount === 0).length,
  roleReadyChains: chainOpsRows.value.filter((row) => row.roleDeskSummary.issueCount === 0).length,
  financialTraceReadyChains: chainOpsRows.value.filter((row) => !row.financialTraceSummary.missingCount && !row.financialTraceSummary.warningCount).length,
  overdueRoleTasks: Number(cutoverOpsStore.roleDeskSummary.slaCounts.overdue || 0),
  riskRoleTasks: Number(cutoverOpsStore.roleDeskSummary.slaCounts.risk || 0),
  financeResultPacks: cutoverOpsStore.financeResultPackSummary.totalCount,
  closeTasks: cutoverOpsStore.closeTaskSummary.totalCount,
  blockedCloseTasks: Number(cutoverOpsStore.closeTaskSummary.statusCounts.blocked || 0),
}))
const cutoverOpsPrimaryCards = computed(() => [
  {
    key: 'drills',
    label: preferencesStore.language === 'en-US' ? 'Recorded Drills' : '已记录演练',
    value: String(cutoverOpsSummary.value.drills),
    description: preferencesStore.language === 'en-US'
      ? 'Includes both passed and blocked rollback drills.'
      : '包含通过和阻塞两类回退演练记录。',
    tone: 'default',
  },
  {
    key: 'blocked-drills',
    label: preferencesStore.language === 'en-US' ? 'Blocked Drills' : '阻塞演练',
    value: String(cutoverOpsSummary.value.blockedDrills),
    description: preferencesStore.language === 'en-US'
      ? 'Use this to keep rollback readiness honest before widening the pilot.'
      : '用它判断扩大试点前的回退就绪是否真实。',
    tone: cutoverOpsSummary.value.blockedDrills > 0 ? 'warning' : 'default',
  },
  {
    key: 'go-signoffs',
    label: preferencesStore.language === 'en-US' ? 'Go Sign-offs' : '放行签收',
    value: String(cutoverOpsSummary.value.goSignoffs),
    description: preferencesStore.language === 'en-US'
      ? 'Latest go decisions recorded by pilot confirmation owners.'
      : '由试点确认负责人记录的放行决策。',
    tone: 'default',
  },
  {
    key: 'closed-loop',
    label: preferencesStore.language === 'en-US' ? 'Closed-Loop Chains' : '闭环链路',
    value: `${cutoverOpsSummary.value.closedLoopChains}/${chainOpsRows.value.length}`,
    description: preferencesStore.language === 'en-US'
      ? 'Chains that already carry drill, sign-off, and exception export evidence.'
      : '已经同时具备演练、签收和异常导出证据的链路。',
    tone: 'default',
  },
  {
    key: 'settlement-ready',
    label: preferencesStore.language === 'en-US' ? 'Settlement-Ready Chains' : '结算就绪链路',
    value: `${cutoverOpsSummary.value.settlementReadyChains}/${chainOpsRows.value.length}`,
    description: preferencesStore.language === 'en-US'
      ? 'Chains whose settlement continuity is already ready for broader pilot traffic.'
      : '结算连续性已经适合进一步扩大试点流量的链路。',
    tone: 'default',
  },
  {
    key: 'finance-ready',
    label: preferencesStore.language === 'en-US' ? 'Finance-Ready Chains' : '财务驾驶舱就绪链路',
    value: `${cutoverOpsSummary.value.financeReadyChains}/${cutoverOpsSummary.value.financeScopedChains}`,
    description: preferencesStore.language === 'en-US'
      ? 'Chains whose finance cockpit is already stable enough for broader pilot traffic.'
      : '财务驾驶舱已经稳定到可以承接更多试点流量的链路。',
    tone: 'default',
  },
  {
    key: 'trace-ready',
    label: preferencesStore.language === 'en-US' ? 'Trace-Ready Chains' : '追溯就绪链路',
    value: `${cutoverOpsSummary.value.financialTraceReadyChains}/${chainOpsRows.value.length}`,
    description: preferencesStore.language === 'en-US'
      ? 'Chains whose source and finance trace continuity is already ready for broader pilot traffic.'
      : '来源和财务追溯连续性已经适合进一步扩大试点流量的链路。',
    tone: 'default',
  },
])
const cutoverOpsGovernanceCards = computed(() => [
  {
    key: 'role-overdue',
    label: preferencesStore.language === 'en-US' ? 'Overdue Role Tasks' : '超时责任任务',
    value: String(cutoverOpsSummary.value.overdueRoleTasks),
    description: preferencesStore.language === 'en-US'
      ? 'Role desk tasks that already crossed their SLA deadline.'
      : '已经超过 SLA 截止时间的责任台任务。',
    tone: cutoverOpsSummary.value.overdueRoleTasks > 0 ? 'warning' : 'default',
  },
  {
    key: 'role-risk',
    label: preferencesStore.language === 'en-US' ? 'Risk Role Tasks' : '风险责任任务',
    value: String(cutoverOpsSummary.value.riskRoleTasks),
    description: preferencesStore.language === 'en-US'
      ? 'Role desk tasks that are close to breaching their SLA.'
      : '即将触碰 SLA 风险线的责任台任务。',
    tone: cutoverOpsSummary.value.riskRoleTasks > 0 ? 'warning' : 'default',
  },
  {
    key: 'finance-packs',
    label: preferencesStore.language === 'en-US' ? 'Finance Result Packs' : '财务结果包',
    value: String(cutoverOpsSummary.value.financeResultPacks),
    description: preferencesStore.language === 'en-US'
      ? 'Archived finance review packets generated from the batch review desk.'
      : '从财务批量台归档下来的结果包数量。',
    tone: 'default',
  },
  {
    key: 'close-tasks',
    label: preferencesStore.language === 'en-US' ? 'Close Tasks' : '关账任务',
    value: String(cutoverOpsSummary.value.closeTasks),
    description: preferencesStore.language === 'en-US'
      ? 'Structured close tasks tracked across account move close surfaces.'
      : '在会计关账面统一跟踪的结构化关账任务。',
    tone: 'default',
  },
  {
    key: 'blocked-close-tasks',
    label: preferencesStore.language === 'en-US' ? 'Blocked Close Tasks' : '阻塞关账任务',
    value: String(cutoverOpsSummary.value.blockedCloseTasks),
    description: preferencesStore.language === 'en-US'
      ? 'Close tasks that currently stop finance operators from moving forward.'
      : '当前阻断财务推进的关账任务数量。',
    tone: cutoverOpsSummary.value.blockedCloseTasks > 0 ? 'warning' : 'default',
  },
])
const cutoverGovernanceDeskCards = computed<GovernanceDeskCard[]>(() => [
  {
    panelKey: 'roleDesk',
    key: 'roleDesk' as const,
    label: preferencesStore.language === 'en-US' ? 'Role Desk Queue' : '责任待办台',
    value: String(cutoverOpsStore.roleDeskSummary.totalCount),
    description: preferencesStore.language === 'en-US'
      ? 'Grouped owner, reviewer, finance, sign-off, and fallback tasks.'
      : '聚合负责人、复核、财务、签收和回退角色的责任任务。',
    section: 'roleDesk' as const,
  },
  {
    panelKey: 'financeBatch',
    key: 'financeBatch' as const,
    label: preferencesStore.language === 'en-US' ? 'Finance Close Batch' : '财务关账批量台',
    value: String(cutoverOpsStore.financeBatchSummary.totalCount),
    description: preferencesStore.language === 'en-US'
      ? 'Close, settlement, trace, and reconcile review rows.'
      : '关账、结算、追溯和对账复核条目。',
    section: 'financeBatch' as const,
  },
  {
    panelKey: 'riskStats',
    key: 'riskStats' as const,
    label: preferencesStore.language === 'en-US' ? 'Risk Density' : '风险密度',
    value: String(cutoverReminderItems.value.length),
    description: preferencesStore.language === 'en-US'
      ? 'Current reminder volume across cutover chains and modules.'
      : '当前切换链路和模块上的提醒总量。',
    section: 'ops' as const,
  },
  {
    panelKey: 'batchReview',
    key: 'batchReview' as const,
    label: preferencesStore.language === 'en-US' ? 'Batch Review Desk' : '批处理核对台',
    value: String(cutoverRiskScopeCount.value),
    description: preferencesStore.language === 'en-US'
      ? 'Available scopes for exception export and rollback review.'
      : '可用于异常导出和回退核对的范围数量。',
    section: 'ops' as const,
  },
  {
    panelKey: 'closedLoopRows',
    key: 'closedLoopRows' as const,
    label: preferencesStore.language === 'en-US' ? 'Rollback Closed Loop' : '回退闭环台',
    value: `${cutoverOpsSummary.value.closedLoopChains}/${chainOpsRows.value.length}`,
    description: preferencesStore.language === 'en-US'
      ? 'Chains carrying drill, sign-off, and export evidence.'
      : '已经具备演练、签收和导出证据的链路。',
    section: 'ops' as const,
  },
])
// Settings keeps multiple governance desks collapsed by default, so only build
// the detailed queue payload when the corresponding desk is actually open.
const settingsRoleDeskPanelRows = computed(() => {
  if (!expandedGovernancePanels.value.roleDesk) return []
  return [
    ...chainOpsRows.value.map((row) => ({
      key: row.key,
      scopeType: 'chain' as const,
      label: row.label,
      scopeLabel: row.modulesLabel,
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
    ...moduleCloseRows.value.map((row) => ({
      key: row.moduleKey,
      scopeType: 'module' as const,
      label: row.title,
      scopeLabel: row.chainLabels || row.chains,
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
const settingsFinanceBatchRows = computed(() => {
  if (!expandedGovernancePanels.value.financeBatch) return []
  const rows: any[] = chainOpsRows.value
    .filter((row) => row.financeCockpitSummary.enabled)
    .map((row) => ({
      key: row.key,
      scopeType: 'chain' as const,
      label: row.label,
      scopeLabel: row.modulesLabel,
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
    const reminders = cutoverReminderItems.value.filter(
      (item) => item.moduleKey === moduleKey && !pilotReviewStore.isHidden(item),
    )
    const settlementSummary = buildModuleSettlementSummary({
      moduleKey,
      isEnglish: preferencesStore.language === 'en-US',
      reminders,
    })
    const financialTraceSummary = resolveSettingsModuleFinancialTraceState(moduleKey)
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

watch(
  () => route.query.tab,
  (value) => {
    activeTab.value = resolveTab(value)
  },
)

watch(activeTab, async (value) => {
  if (route.query.tab === value) return
  await router.replace({ query: { ...route.query, tab: value } })
  if (value === 'cutover') {
    void refreshCutoverReminders()
    void focusCutoverTarget()
  }
})

watch(
  chainHandoffRows,
  () => {
    syncChainContactDrafts()
    syncChainGateDrafts()
  },
  { immediate: true },
)

watch(
  () => [activeTab.value, route.query.chain, route.query.section],
  () => {
    if (activeTab.value === 'cutover') {
      void focusCutoverTarget()
    }
  },
)

async function saveConnectionSettings() {
  savingConnection.value = true
  try {
    connectionStore.setServerUrl(connectionStore.serverUrl)
    connectionStore.setProxyEnabled(connectionStore.proxyEnabled)
    connectionStore.setProxyRules(connectionStore.proxyRules)
    connectionStore.setProxyBypassRules(connectionStore.proxyBypassRules)
    connectionStore.setRememberUsername(connectionStore.rememberUsername)
    await connectionStore.applyProxySettings()
    ElMessage.success(t('app.saveSuccess'))
  } catch (error: any) {
    ElMessage.error(error?.message || t('app.requestFailed'))
  } finally {
    savingConnection.value = false
  }
}

async function testConnectionSettings() {
  testingConnection.value = true
  try {
    connectionStore.setServerUrl(connectionStore.serverUrl)
    await connectionStore.testConnection()
    ElMessage.success(t('app.backendOnline'))
  } catch (error: any) {
    ElMessage.error(error?.message || t('app.requestFailed'))
  } finally {
    testingConnection.value = false
  }
}

async function logoutSession() {
  authStore.logout()
  ElMessage.success(t('app.logoutSuccess'))
  await router.replace({ name: 'login' })
}

function resetPasswordForm() {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

async function refreshCurrentSession(silent = false) {
  refreshingCurrentUser.value = true
  try {
    await authStore.refreshCurrentUser()
    if (!silent) {
      ElMessage.success(preferencesStore.language === 'en-US' ? 'Session refreshed' : '当前账户信息已刷新')
    }
  } catch (error: any) {
    const message = error?.message || (preferencesStore.language === 'en-US' ? 'Failed to refresh session' : '刷新当前账户失败')
    if (String(message).includes('会话') || String(message).toLowerCase().includes('session')) {
      authStore.logout()
      await router.replace({ name: 'login' })
      return
    }
    ElMessage.error(message)
  } finally {
    refreshingCurrentUser.value = false
  }
}

async function submitPasswordChange() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    ElMessage.warning(preferencesStore.language === 'en-US' ? 'Please complete the password form' : '请完整填写密码表单')
    return
  }
  changingPassword.value = true
  try {
    await authStore.changeCurrentPassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    })
    resetPasswordForm()
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Password updated' : '当前账户密码已更新')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to update password' : '修改密码失败'))
  } finally {
    changingPassword.value = false
  }
}

function setCutoverChain(chainKey: 'masterData' | 'sales' | 'purchase', enabled: boolean) {
  cutoverStore.setChainEnabled(chainKey, enabled)
  ElMessage.success(t('app.saveSuccess'))
}

function setModuleCutover(moduleKey: any, enabled: boolean) {
  cutoverStore.setModuleEnabled(moduleKey, enabled)
  ElMessage.success(t('app.saveSuccess'))
}

function clearModuleCutover(moduleKey: any) {
  cutoverStore.clearModuleOverride(moduleKey)
  ElMessage.success(t('app.saveSuccess'))
}

function rollbackCurrentBlockedModule() {
  const moduleKey = String(route.query.module || '')
  if (!moduleKey) return
  cutoverStore.rollbackModule(moduleKey as any)
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Rollback entry prepared' : '已准备回退入口')
}

async function openBlockedSource() {
  if (!blockedFrom.value) return
  await router.replace(blockedFrom.value)
}

function restorePilotDefaults() {
  cutoverStore.restorePilotDefaults()
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Pilot defaults restored' : '已恢复试点默认配置')
}

function clearPilotReviewState() {
  pilotReviewStore.clearReviewState()
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Pilot review state cleared' : '试点审核状态已清空')
}

function openCutoverDashboard() {
  void router.push({ name: 'dashboard' })
}

function resolveChainStatus(enabled: boolean, critical: number, warning: number) {
  if (!enabled) {
    return preferencesStore.language === 'en-US' ? 'Rolled Back' : '已回退'
  }
  if (critical) {
    return preferencesStore.language === 'en-US' ? 'Blocked' : '阻塞'
  }
  if (warning) {
    return preferencesStore.language === 'en-US' ? 'Needs Review' : '需核对'
  }
  return preferencesStore.language === 'en-US' ? 'Ready' : '就绪'
}

function resolveActingUser() {
  return authStore.displayName || authStore.user?.username || 'desktop-client'
}

function resolveRollbackDrillLabel(status?: string | null) {
  if (status === 'passed') {
    return preferencesStore.language === 'en-US' ? 'Passed' : '已通过'
  }
  if (status === 'blocked') {
    return preferencesStore.language === 'en-US' ? 'Blocked' : '被阻塞'
  }
  return preferencesStore.language === 'en-US' ? 'Not Recorded' : '未记录'
}

function resolvePilotSignoffLabel(decision?: string | null) {
  if (decision === 'go') {
    return preferencesStore.language === 'en-US' ? 'Go' : '放行'
  }
  if (decision === 'rollback') {
    return preferencesStore.language === 'en-US' ? 'Rollback' : '回退'
  }
  if (decision === 'hold') {
    return preferencesStore.language === 'en-US' ? 'Hold' : '暂缓'
  }
  return preferencesStore.language === 'en-US' ? 'Not Recorded' : '未记录'
}

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

function buildFinancialTraceDetailQuery(state?: CutoverFinancialTraceState | null) {
  if (!state?.topRiskModuleKey || !state.topRiskRecordId) return null
  return buildModuleDetailRouteTarget({
    targetModuleKey: state.topRiskModuleKey,
    recordId: state.topRiskRecordId,
    section: 'traceability',
  })
}

function buildSettingsModuleFinancialTracePacketRefs(moduleKey: ModuleKey, state: CutoverFinancialTraceState) {
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

function buildSettingsChainFinancialTracePacketRefs(moduleKeys: ModuleKey[]) {
  return moduleKeys
    .flatMap((moduleKey) =>
      buildSettingsModuleFinancialTracePacketRefs(moduleKey, resolveSettingsModuleFinancialTraceState(moduleKey)),
    )
    .slice(0, 4)
}

function buildChainOpsNote(row: any) {
  const draft = chainGateDrafts.value[row.key] ?? row.state
  return [
    `${preferencesStore.language === 'en-US' ? 'Gate Status' : '门槛状态'}: ${row.readyLabel} · ${row.summary.label}`,
    `${preferencesStore.language === 'en-US' ? 'Close Snapshot' : '关账快照'}: ${row.closeSummary?.label || '-'}`,
    `${preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环状态'}: ${describeClosedLoopSummary(row.closedLoopSummary)}`,
    `${preferencesStore.language === 'en-US' ? 'Settlement Closure' : '结算闭环'}: ${describeSettlementSummary(row.settlementSummary)}`,
    `${preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱'}: ${describeFinanceCockpitSummary(row.financeCockpitSummary)}`,
    `${preferencesStore.language === 'en-US' ? 'Financial Trace' : '财务追溯'}: ${describeFinancialTraceSummary(row.financialTraceSummary)}`,
    `${preferencesStore.language === 'en-US' ? 'Pending Gates' : '未完成门槛'}: ${row.summary.pendingLabels.join(', ') || '-'}`,
    `${preferencesStore.language === 'en-US' ? 'Suggested Blockers' : '建议阻塞项'}: ${row.blockerLabels.join(', ') || '-'}`,
    `${preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险'}: ${row.topRiskLabel || '-'}`,
    `${preferencesStore.language === 'en-US' ? 'Gate Note' : '门槛备注'}: ${draft.note || '-'}`,
  ].join('\n')
}

function openChainWorkbench(row: { key?: PilotChainKey; routeName: string }, section: 'ops-rehearsal' | 'ops-close' = 'ops-rehearsal') {
  void router.push(buildModuleRouteTarget({
    targetModuleKey: row.routeName as ModuleKey,
    rawQuery: { section },
    chainKey: row.key,
  }))
}

function openModuleCloseDesk(moduleKey: ModuleKey) {
  void router.push(buildModuleRouteTarget({
    targetModuleKey: moduleKey,
    rawQuery: { section: 'ops-close' },
  }))
}

function openCloseDesk(chainKey?: PilotChainKey | null) {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({
      chainKey: chainKey || undefined,
      section: 'close',
    }),
  })
}

function openClosedLoopDesk(chainKey?: PilotChainKey | null) {
  void router.push({
    name: 'settings',
    query: resolveCutoverSettingsQuery({
      chainKey: chainKey || undefined,
      section: 'ops',
    }),
  })
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
  key: PilotChainKey
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
  key: PilotChainKey
  financialTraceSummary: CutoverFinancialTraceState
}) {
  const target = buildChainTraceQuery(row, 'documents')
  if (!target) return
  void router.push(target)
}

function openChainTraceTimeline(row: {
  key: PilotChainKey
  financialTraceSummary: CutoverFinancialTraceState
}) {
  const target = buildChainTraceQuery(row, 'timeline')
  if (!target) return
  void router.push(target)
}

function buildChainRunbookContent(row: any, mode: 'handbook' | 'rollback') {
  const chain = settingsPacketChains().find((item) => item.label === row.label)
  if (!chain) return ''
  return buildSharedChainRunbookContent({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    chain,
    mode,
  })
}

function registerCutoverSection(section: 'handoff' | 'import' | 'gates' | 'close' | 'roleDesk' | 'financeBatch' | 'ops', el: unknown) {
  cutoverSectionRefs[section] = el instanceof HTMLElement ? el : null
}

function registerChainCard(chainKey: PilotChainKey, el: unknown) {
  cutoverChainCardRefs[chainKey] = el instanceof HTMLElement ? el : null
}

async function focusCutoverTarget() {
  await nextTick()
  const section = route.query.section === 'import'
    ? 'import'
    : route.query.section === 'gates'
      ? 'gates'
      : route.query.section === 'close'
        ? 'close'
      : route.query.section === 'roleDesk'
        ? 'roleDesk'
      : route.query.section === 'financeBatch'
        ? 'financeBatch'
      : route.query.section === 'ops'
        ? 'ops'
      : 'handoff'
  // Deep links from dashboard and command palette must land on the exact
  // chain handoff card so operators do not lose context during rollback.
  if (focusedChainKey.value && section === 'handoff') {
    cutoverChainCardRefs[focusedChainKey.value]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    return
  }
  cutoverSectionRefs[section]?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

async function focusCutoverTargetBySection(section: 'handoff' | 'import' | 'gates' | 'close' | 'roleDesk' | 'financeBatch' | 'ops') {
  await router.replace({
    query: {
      ...route.query,
      tab: 'cutover',
      section,
    },
  })
  await focusCutoverTarget()
}

function toggleGovernancePanel(panel: GovernancePanelKey) {
  expandedGovernancePanels.value[panel] = !expandedGovernancePanels.value[panel]
}

function governancePanelExpanded(panel: GovernancePanelKey) {
  return expandedGovernancePanels.value[panel]
}

function focusGovernanceDeskCard(item: SummaryCardItem) {
  return focusCutoverTargetBySection((item as GovernanceDeskCard).section)
}

function toggleGovernanceDeskCard(item: SummaryCardItem) {
  toggleGovernancePanel((item as GovernanceDeskCard).panelKey)
}

function governanceDeskCardExpanded(item: SummaryCardItem) {
  return governancePanelExpanded((item as GovernanceDeskCard).panelKey)
}

function exportChainRunbook(row: any, mode: 'handbook' | 'rollback') {
  downloadText(
    `neko_erp_${row.key}_${mode}_${new Date().toISOString().slice(0, 10)}.md`,
    buildChainRunbookContent(row, mode),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(
    mode === 'rollback'
      ? (preferencesStore.language === 'en-US' ? 'Rollback drill exported' : '回退演练已导出')
      : (preferencesStore.language === 'en-US' ? 'Operator handbook exported' : '操作手册已导出'),
  )
}

function exportAllChainRunbooks() {
  const content = chainHandoffRows.value
    .flatMap((row) => [
      buildChainRunbookContent(row, 'handbook'),
      '',
      '---',
      '',
      buildChainRunbookContent(row, 'rollback'),
    ])
    .join('\n\n---\n\n')
  downloadText(
    `neko_erp_first_wave_chain_runbooks_${new Date().toISOString().slice(0, 10)}.md`,
    content,
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Chain runbooks exported' : '链路手册已导出')
}

function buildCurrentCutoverConfigSnapshot() {
  return buildCutoverConfigSnapshot({
    locale: preferencesStore.language,
    chainStates: cutoverStore.chainStates,
    moduleOverrides: cutoverStore.moduleOverrides,
    chainContacts: cutoverStore.chainContacts,
    chainGateStates: cutoverStore.chainGateStates,
    firstWaveModules: firstWaveModuleRows.value.map((row) => ({
      moduleKey: row.moduleKey,
      title: row.title,
      enabled: row.enabled,
      chains: row.chains,
      overridden: row.overridden,
    })),
    reviewedCount: pilotReviewStore.reviewedCount,
    snoozedCount: pilotReviewStore.snoozedCount,
    operations: cutoverOpsStore.snapshotData(),
  })
}

function applyCutoverSnapshot(snapshot: any) {
  cutoverRemoteStore.applySnapshot(snapshot)
  syncChainContactDrafts()
  syncChainGateDrafts()
  void refreshCutoverReminders()
}

function exportCutoverConfigSnapshot() {
  downloadText(
    `neko_erp_cutover_config_${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(buildCurrentCutoverConfigSnapshot(), null, 2),
    'application/json;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Cutover config exported' : '切换配置已导出')
}

async function copyCutoverConfigSnapshot() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(JSON.stringify(buildCurrentCutoverConfigSnapshot(), null, 2))
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Cutover config copied' : '切换配置已复制')
}

function importCutoverConfigSnapshot() {
  if (!cutoverConfigDraft.value.trim()) {
    ElMessage.warning(preferencesStore.language === 'en-US' ? 'Paste a cutover config JSON first' : '请先粘贴切换配置 JSON')
    return
  }
  try {
    const snapshot = parseCutoverConfigSnapshot(cutoverConfigDraft.value)
    persistCutoverImportBackup()
    applyCutoverSnapshot(snapshot)
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Cutover config imported and refreshed' : '切换配置已导入并刷新')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Invalid config JSON' : '配置 JSON 无效'))
  }
}

function persistCutoverImportBackup() {
  lastCutoverBackup.value = JSON.stringify(buildCurrentCutoverConfigSnapshot(), null, 2)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUTOVER_IMPORT_BACKUP_KEY, lastCutoverBackup.value)
  }
}

function restoreLastCutoverBackup() {
  if (!lastCutoverBackup.value.trim()) {
    ElMessage.warning(preferencesStore.language === 'en-US' ? 'No backup available yet' : '当前还没有可恢复的备份')
    return
  }
  try {
    const snapshot = parseCutoverConfigSnapshot(lastCutoverBackup.value)
    applyCutoverSnapshot(snapshot)
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Last backup restored' : '最近备份已恢复')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Backup is invalid' : '备份内容无效'))
  }
}

function exportLastCutoverBackup() {
  if (!lastCutoverBackup.value.trim()) {
    ElMessage.warning(preferencesStore.language === 'en-US' ? 'No backup available yet' : '当前还没有可导出的备份')
    return
  }
  downloadText(
    `neko_erp_cutover_backup_${new Date().toISOString().slice(0, 10)}.json`,
    lastCutoverBackup.value,
    'application/json;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Backup exported' : '备份已导出')
}

function openCutoverConfigFilePicker() {
  cutoverConfigFileInput.value?.click()
}

async function handleCutoverConfigFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  cutoverConfigDraft.value = await file.text()
  cutoverConfigFileName.value = file.name
  input.value = ''
  await focusCutoverTarget()
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Config file loaded' : '配置文件已载入')
}

function clearCutoverConfigDraft() {
  cutoverConfigDraft.value = ''
  cutoverConfigFileName.value = ''
}

async function loadCutoverConfigFromServer(showMessage = false) {
  try {
    const result = await cutoverRemoteStore.loadRemoteSnapshot()
    if (!result.found) {
      if (showMessage) {
        ElMessage.warning(preferencesStore.language === 'en-US' ? 'No server snapshot yet' : '服务端还没有切换快照')
      }
      return
    }
    applyCutoverSnapshot(result.remote?.configData)
    if (showMessage) {
      ElMessage.success(preferencesStore.language === 'en-US' ? 'Server snapshot loaded' : '已载入服务端切换快照')
    }
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to load server snapshot' : '载入服务端快照失败'))
  }
}

async function saveCutoverConfigToServer(showMessage = false) {
  try {
    await cutoverRemoteStore.saveRemoteSnapshot(
      buildCurrentCutoverConfigSnapshot(),
      authStore.displayName || authStore.user?.username || 'desktop-client',
    )
    if (showMessage) {
      ElMessage.success(preferencesStore.language === 'en-US' ? 'Server snapshot saved' : '服务端切换快照已保存')
    }
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to save server snapshot' : '保存服务端切换快照失败'))
  }
}

function syncChainContactDrafts() {
  chainContactDrafts.value = Object.fromEntries(
    chainHandoffRows.value.map((row) => [
      row.key,
      {
        owner: row.owner,
        fallbackOwner: row.fallbackOwner,
        rehearsalOwner: row.rehearsalOwner,
        pilotConfirmOwner: row.pilotConfirmOwner,
        reviewerOwner: row.reviewerOwner,
        financeOwner: row.financeOwner,
      },
    ]),
  )
}

function syncChainGateDrafts() {
  chainGateDrafts.value = Object.fromEntries(
    chainGateRows.value.map((row) => [
      row.key,
      { ...row.state },
    ]),
  )
}

function saveChainGateState(chainKey: PilotChainKey) {
  const draft = chainGateDrafts.value[chainKey]
  if (!draft) return
  cutoverStore.setChainGateState(chainKey, { ...draft })
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Acceptance gates saved' : '放行门槛已保存')
  const row = chainOpsRows.value.find((item) => item.key === chainKey)
  const requiredChecks = [
    draft.smokeReady,
    draft.workbenchReady,
    draft.rollbackReady,
    draft.traceabilityReady,
    draft.manualReady,
    draft.pilotConfirmed,
  ]
  if (row && requiredChecks.every(Boolean) && !row.closedLoopSummary.ready) {
    ElMessage.warning(
      preferencesStore.language === 'en-US'
        ? `Acceptance is checked, but the closed loop is still incomplete: ${describeClosedLoopSummary(row.closedLoopSummary)}`
        : `放行项虽然已勾选，但闭环仍不完整：${describeClosedLoopSummary(row.closedLoopSummary)}`,
    )
  }
  if (row && requiredChecks.every(Boolean) && (row.settlementSummary.missingCount || row.settlementSummary.warningCount)) {
    ElMessage.warning(
      preferencesStore.language === 'en-US'
        ? `Acceptance is checked, but settlement closure is still incomplete: ${describeSettlementSummary(row.settlementSummary)}`
        : `放行项虽然已勾选，但结算闭环仍不完整：${describeSettlementSummary(row.settlementSummary)}`,
    )
  }
}

function resetChainGateState(chainKey: PilotChainKey) {
  cutoverStore.clearChainGateState(chainKey)
  syncChainGateDrafts()
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Acceptance gates reset' : '放行门槛已重置')
}

function settingsPacketChains(): CutoverPacketChain[] {
  return buildCutoverPacketChains({
    isEnglish: preferencesStore.language === 'en-US',
    chains: chainGateRows.value.map((row) => {
      const handoffRow = chainHandoffRows.value.find((item) => item.key === row.key)
      const closeRow = chainOpsRows.value.find((item) => item.key === row.key)
      return {
        chainKey: row.key,
        label: row.label,
        enabled: row.enabled,
        moduleKeys: row.moduleKeys,
        contacts: {
          owner: handoffRow?.owner ?? '-',
          fallbackOwner: handoffRow?.fallbackOwner ?? '-',
          rehearsalOwner: handoffRow?.rehearsalOwner ?? '-',
          pilotConfirmOwner: handoffRow?.pilotConfirmOwner ?? '-',
          reviewerOwner: handoffRow?.reviewerOwner ?? '-',
          financeOwner: handoffRow?.financeOwner ?? '-',
        },
        gateState: chainGateDrafts.value[row.key] ?? row.state,
        closedLoopSummary: row.closedLoopSummary,
        reminders: row.reminders,
        financialTrace: {
          statusLabel: row.financialTraceSummary.statusLabel,
          missingLabels: row.financialTraceSummary.missingLabels,
          warningLabels: row.financialTraceSummary.warningLabels,
          lines: row.financialTraceSummary.lines,
          recordRefs: row.financialTraceSummary.recordRefs,
          packetRefs: buildSettingsChainFinancialTracePacketRefs(row.moduleKeys),
        },
        topRiskLabel: row.topRiskLabel,
        closeChecklistLines: closeRow?.closeChecklist.map((item) =>
          `- [${item.ready ? (preferencesStore.language === 'en-US' ? 'Ready' : '已就绪') : (preferencesStore.language === 'en-US' ? 'Pending' : '待处理')}] ${item.label}: ${item.description}`,
        ),
        closeActivityLines: closeRow?.closeActivityLines,
      }
    }),
    moduleTitle,
    reminderDetailLimit: 12,
  })
}

function settingsPacketModules(): CutoverPacketModule[] {
  return buildCutoverPacketModules({
    isEnglish: preferencesStore.language === 'en-US',
    modules: firstWaveModuleRows.value.map((row) => ({
      moduleKey: row.moduleKey,
      title: row.title,
      enabled: row.enabled,
      reminders: cutoverReminderItems.value.filter(
        (item) => item.moduleKey === row.moduleKey && !pilotReviewStore.isHidden(item),
      ),
      pendingGateCount: moduleCloseRows.value.find((item) => item.moduleKey === row.moduleKey)?.closeSummary.gatePendingCount,
      blockerLabels: moduleCloseRows.value.find((item) => item.moduleKey === row.moduleKey)?.blockerLabels,
      financialTrace: {
        statusLabel: resolveSettingsModuleFinancialTraceState(row.moduleKey).statusLabel,
        missingLabels: resolveSettingsModuleFinancialTraceState(row.moduleKey).missingLabels,
        warningLabels: resolveSettingsModuleFinancialTraceState(row.moduleKey).warningLabels,
        lines: resolveSettingsModuleFinancialTraceState(row.moduleKey).lines,
        recordRefs: resolveSettingsModuleFinancialTraceState(row.moduleKey).recordRefs,
        packetRefs: buildSettingsModuleFinancialTracePacketRefs(
          row.moduleKey,
          resolveSettingsModuleFinancialTraceState(row.moduleKey),
        ),
      },
      topRiskLabel: resolveSettingsModuleFinancialTraceState(row.moduleKey).topRiskRefs[0],
    })),
  })
}

function settingsControlModules() {
  return buildCutoverControlModules({
    isEnglish: preferencesStore.language === 'en-US',
    modules: firstWaveModuleRows.value.map((row) => ({
      moduleKey: row.moduleKey,
      title: row.title,
      enabled: row.enabled,
      reminders: cutoverReminderItems.value.filter(
        (item) => item.moduleKey === row.moduleKey && !pilotReviewStore.isHidden(item),
      ),
      pendingGateCount: moduleCloseRows.value.find((item) => item.moduleKey === row.moduleKey)?.closeSummary.gatePendingCount,
      blockerLabels: moduleCloseRows.value.find((item) => item.moduleKey === row.moduleKey)?.blockerLabels,
      financialTrace: {
        statusLabel: resolveSettingsModuleFinancialTraceState(row.moduleKey).statusLabel,
        missingLabels: resolveSettingsModuleFinancialTraceState(row.moduleKey).missingLabels,
        warningLabels: resolveSettingsModuleFinancialTraceState(row.moduleKey).warningLabels,
        lines: resolveSettingsModuleFinancialTraceState(row.moduleKey).lines,
        recordRefs: resolveSettingsModuleFinancialTraceState(row.moduleKey).recordRefs,
        packetRefs: buildSettingsModuleFinancialTracePacketRefs(
          row.moduleKey,
          resolveSettingsModuleFinancialTraceState(row.moduleKey),
        ),
      },
      topRiskLabel: resolveSettingsModuleFinancialTraceState(row.moduleKey).topRiskRefs[0],
    })),
  })
}

function settingsContactMatrixRows(): CutoverContactMatrixRow[] {
  return buildCutoverContactRows(settingsPacketChains())
}

function settingsPendingGateRows(): CutoverPendingGateRow[] {
  return buildCutoverPendingGateRows(settingsPacketChains())
}

function buildChainGatePacket(row: any) {
  const draft = chainGateDrafts.value[row.key] ?? row.state
  const chain = settingsPacketChains().find((item) => item.label === row.label)
  if (!chain) return ''
  return buildSharedChainGatePacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    chain,
    checks: [
      { label: preferencesStore.language === 'en-US' ? 'Smoke Green' : 'Smoke 通过', ready: draft.smokeReady },
      { label: preferencesStore.language === 'en-US' ? 'Workbench Ready' : '工作台就绪', ready: draft.workbenchReady },
      { label: preferencesStore.language === 'en-US' ? 'Rollback Ready' : '回退入口就绪', ready: draft.rollbackReady },
      { label: preferencesStore.language === 'en-US' ? 'Traceability Ready' : '追溯就绪', ready: draft.traceabilityReady },
      { label: preferencesStore.language === 'en-US' ? 'Manual Ready' : '用户手册就绪', ready: draft.manualReady },
      { label: preferencesStore.language === 'en-US' ? 'Pilot Confirmed' : '试点确认', ready: draft.pilotConfirmed },
    ],
  })
}

function exportChainGatePacket(row: any) {
  downloadText(
    `neko_erp_${row.key}_acceptance_gate_${new Date().toISOString().slice(0, 10)}.md`,
    buildChainGatePacket(row),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Acceptance packet exported' : '放行门槛包已导出')
}

function exportAllChainGatePackets() {
  downloadText(
    `neko_erp_first_wave_acceptance_gates_${new Date().toISOString().slice(0, 10)}.md`,
    chainGateRows.value.map((row) => buildChainGatePacket(row)).join('\n\n---\n\n'),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Acceptance gate packets exported' : '放行门槛包已导出')
}

function buildCutoverBlockerPacket() {
  return buildSharedCutoverBlockerPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    summary: {
      readyChains: gatePressureSummary.value.readyChains,
      totalChains: gatePressureSummary.value.totalChains,
      criticalChains: gatePressureSummary.value.criticalChains,
      warningChains: gatePressureSummary.value.warningChains,
      pendingGates: gatePressureSummary.value.pendingGates,
      openReminders: gatePressureSummary.value.reminderCount,
    },
    chains: settingsPacketChains(),
  })
}

function exportCutoverBlockerPacket() {
  downloadText(
    `neko_erp_first_wave_blockers_${new Date().toISOString().slice(0, 10)}.md`,
    buildCutoverBlockerPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Blocker packet exported' : '阻塞包已导出')
}

function buildCutoverControlPacket() {
  return buildSharedCutoverControlPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Settings Control Packet' : 'NEKO_ERP 设置控制包',
    reviewedCount: pilotReviewStore.reviewedCount,
    snoozedCount: pilotReviewStore.snoozedCount,
    chains: settingsPacketChains(),
    modules: settingsControlModules(),
  })
}

function buildRollbackDrillPacket() {
  return buildSharedRollbackDrillPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Settings Rollback Drill Packet' : 'NEKO_ERP 设置回退演练包',
    chains: settingsPacketChains(),
    modules: settingsControlModules(),
  })
}

function exportRollbackDrillPacket() {
  downloadText(
    `neko_erp_first_wave_rollback_drill_${new Date().toISOString().slice(0, 10)}.md`,
    buildRollbackDrillPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Rollback drill packet exported' : '回退演练包已导出')
}

async function copyRollbackDrillPacket() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildRollbackDrillPacket())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Rollback drill packet copied' : '回退演练包已复制')
}

function buildGuardrailRulesPacket() {
  return buildSharedGuardrailRulesPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Settings Guardrail Rules' : 'NEKO_ERP 设置 Guardrail 规则',
    presets: listSysScriptPresets(),
  })
}

function exportGuardrailRulesPacket() {
  downloadText(
    `neko_erp_first_wave_guardrail_rules_${new Date().toISOString().slice(0, 10)}.md`,
    buildGuardrailRulesPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Guardrail rules exported' : 'Guardrail 规则已导出')
}

async function copyGuardrailRulesPacket() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildGuardrailRulesPacket())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Guardrail rules copied' : 'Guardrail 规则已复制')
}

function exportCutoverControlPacket() {
  downloadText(
    `neko_erp_first_wave_control_packet_${new Date().toISOString().slice(0, 10)}.md`,
    buildCutoverControlPacket(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Control packet exported' : '控制包已导出')
}

async function copyCutoverControlPacket() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildCutoverControlPacket())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Control packet copied' : '控制包已复制')
}

function buildRoleDeskQueuePacketContent() {
  return buildRoleDeskQueuePacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Settings Role Desk Queue' : 'NEKO_ERP 设置责任台待办包',
    rows: [
      ...chainOpsRows.value.map((row) => ({
        label: row.label,
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
      ...moduleCloseRows.value.map((row) => ({
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

function exportRoleDeskQueuePacket() {
  downloadText(
    `neko_erp_role_desk_queue_${new Date().toISOString().slice(0, 10)}.md`,
    buildRoleDeskQueuePacketContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Role desk queue exported' : '责任台待办包已导出')
}

async function copyRoleDeskQueuePacket() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildRoleDeskQueuePacketContent())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Role desk queue copied' : '责任台待办包已复制')
}

function buildFinanceCloseBatchPacketContent() {
  return buildFinanceCloseBatchPacket({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Settings Finance Close Batch' : 'NEKO_ERP 设置财务关账批处理包',
    rows: [
      ...chainOpsRows.value
        .filter((row) => row.financeCockpitSummary.enabled)
        .map((row) => ({
          label: row.label,
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
      ...moduleCloseRows.value
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

function exportFinanceCloseBatchPacket() {
  downloadText(
    `neko_erp_finance_close_batch_${new Date().toISOString().slice(0, 10)}.md`,
    buildFinanceCloseBatchPacketContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Finance close batch exported' : '财务关账批处理包已导出')
}

async function copyFinanceCloseBatchPacket() {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(buildFinanceCloseBatchPacketContent())
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Finance close batch copied' : '财务关账批处理包已复制')
}

function collectSettingsTraceBundleTargets() {
  const targets = new Map<string, { moduleKey: ModuleKey; recordId: number; recordRef?: string }>()
  firstWaveModuleRows.value.forEach((row) => {
    const state = resolveSettingsModuleFinancialTraceState(row.moduleKey)
    if (!supportsCutoverFinancialTraceModule(row.moduleKey) || !state.topRiskRecordId) return
    const key = `${row.moduleKey}:${state.topRiskRecordId}`
    if (!targets.has(key)) {
      targets.set(key, {
        moduleKey: row.moduleKey,
        recordId: state.topRiskRecordId,
        recordRef: state.topRiskRecordRef,
      })
    }
  })
  return Array.from(targets.values())
}

async function buildSettingsTraceBundleContent() {
  const targets = collectSettingsTraceBundleTargets()
  const generatedAt = formatDateTime(new Date().toISOString())
  if (!targets.length) {
    return buildFinancialTraceBundlePacket({
      english: preferencesStore.language === 'en-US',
      generatedAt,
      title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Settings Financial Trace Bundle' : 'NEKO_ERP 设置财务追溯证据包',
      moduleTitle,
      entries: [],
    })
  }

  const results = await Promise.allSettled(
    targets.map(async (target) => ({
      moduleKey: target.moduleKey,
      packetTitle: preferencesStore.language === 'en-US'
        ? `${moduleTitle(target.moduleKey)} Cutover Trace`
        : `${moduleTitle(target.moduleKey)} 切换追溯详情`,
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
    title: preferencesStore.language === 'en-US' ? 'NEKO_ERP Settings Financial Trace Bundle' : 'NEKO_ERP 设置财务追溯证据包',
    moduleTitle,
    entries,
    failedRefs,
  })
}

async function exportSettingsTraceBundle() {
  if (cutoverTraceBundleBusy.value) return
  cutoverTraceBundleBusy.value = true
  try {
    downloadText(
      buildFinancialTraceBundleFilename({
        scope: 'settings_cutover',
        date: new Date().toISOString().slice(0, 10),
      }),
      await buildSettingsTraceBundleContent(),
      'text/markdown;charset=utf-8',
    )
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Trace bundle exported' : '财务追溯证据包已导出')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to export trace bundle' : '导出财务追溯证据包失败'))
  } finally {
    cutoverTraceBundleBusy.value = false
  }
}

async function copySettingsTraceBundle() {
  if (cutoverTraceBundleBusy.value || !navigator.clipboard) return
  cutoverTraceBundleBusy.value = true
  try {
    await navigator.clipboard.writeText(await buildSettingsTraceBundleContent())
    ElMessage.success(preferencesStore.language === 'en-US' ? 'Trace bundle copied' : '财务追溯证据包已复制')
  } catch (error: any) {
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to copy trace bundle' : '复制财务追溯证据包失败'))
  } finally {
    cutoverTraceBundleBusy.value = false
  }
}

function exportChainContactMatrix() {
  downloadText(
    `neko_erp_chain_contact_matrix_${new Date().toISOString().slice(0, 10)}.md`,
    buildSharedChainContactMatrix({
      english: preferencesStore.language === 'en-US',
      generatedAt: formatDateTime(new Date().toISOString()),
      rows: settingsContactMatrixRows(),
    }),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Chain contact matrix exported' : '链路联系人矩阵已导出')
}

function exportPendingGateMatrix() {
  downloadText(
    `neko_erp_pending_gate_matrix_${new Date().toISOString().slice(0, 10)}.md`,
    buildSharedPendingGateMatrix({
      english: preferencesStore.language === 'en-US',
      generatedAt: formatDateTime(new Date().toISOString()),
      rows: settingsPendingGateRows(),
    }),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Pending gate matrix exported' : '未完成门槛矩阵已导出')
}

function buildSettingsPilotUserManualPack() {
  return buildSharedPilotUserManualPack({
    english: preferencesStore.language === 'en-US',
    generatedAt: formatDateTime(new Date().toISOString()),
    chains: settingsPacketChains(),
    modules: settingsPacketModules(),
  })
}

function exportPilotUserManualPack() {
  downloadText(
    `neko_erp_first_wave_user_manual_${new Date().toISOString().slice(0, 10)}.md`,
    buildSettingsPilotUserManualPack(),
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
      summary: {
        readyChains: gatePressureSummary.value.readyChains,
        totalChains: gatePressureSummary.value.totalChains,
        criticalChains: gatePressureSummary.value.criticalChains,
        warningChains: gatePressureSummary.value.warningChains,
        pendingGates: gatePressureSummary.value.pendingGates,
        openReminders: gatePressureSummary.value.reminderCount,
      },
      chains: settingsPacketChains(),
    }),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Pilot confirmation exported' : '试点确认模板已导出')
}

async function copyChainGateBlockers(row: any) {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText([
    `${row.label}`,
    `${preferencesStore.language === 'en-US' ? 'Gate Status' : '门槛状态'}: ${row.readyLabel} · ${row.summary.label}`,
    `${preferencesStore.language === 'en-US' ? 'Pending Gates' : '未完成门槛'}: ${row.summary.pendingLabels.join(', ') || '-'}`,
    `${preferencesStore.language === 'en-US' ? 'Suggested Blockers' : '建议阻塞项'}: ${row.blockerLabels.join(', ') || '-'}`,
    `${preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险'}: ${row.topRiskLabel || '-'}`,
  ].join('\n'))
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Gate blockers copied' : '门槛阻塞项已复制')
}

function autoFillChainGateNote(row: any) {
  const draft = chainGateDrafts.value[row.key] ?? row.state
  chainGateDrafts.value[row.key] = {
    ...draft,
    note: [
      `${preferencesStore.language === 'en-US' ? 'Gate status' : '门槛状态'}: ${row.readyLabel} · ${row.summary.label}`,
      `${preferencesStore.language === 'en-US' ? 'Closed loop' : '闭环状态'}: ${describeClosedLoopSummary(row.closedLoopSummary)}`,
      `${preferencesStore.language === 'en-US' ? 'Pending gates' : '未完成门槛'}: ${row.summary.pendingLabels.join(', ') || '-'}`,
      `${preferencesStore.language === 'en-US' ? 'Suggested blockers' : '建议阻塞项'}: ${row.blockerLabels.join(', ') || '-'}`,
      `${preferencesStore.language === 'en-US' ? 'Top risk' : '最高风险'}: ${row.topRiskLabel || '-'}`,
      `${preferencesStore.language === 'en-US' ? 'Reminder families' : '提醒家族'}: ${row.reminderBadges.map((item: any) => `${item.label} ${item.count}`).join(', ') || '-'}`,
    ].join('\n'),
  }
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Gate note drafted' : '门槛备注已生成')
}

function saveChainContacts(chainKey: 'masterData' | 'sales' | 'purchase') {
  const draft = chainContactDrafts.value[chainKey]
  if (!draft) return
  cutoverStore.setChainContacts(chainKey, draft)
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Chain contacts saved' : '链路联系人已保存')
}

function resetChainContacts(chainKey: 'masterData' | 'sales' | 'purchase') {
  cutoverStore.clearChainContacts(chainKey)
  syncChainContactDrafts()
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Chain contacts reset' : '链路联系人已重置')
}

function recordRollbackDrill(row: any, status: 'passed' | 'blocked') {
  cutoverOpsStore.addRollbackDrill({
    chainKey: row.key,
    status,
    owner: row.rehearsalOwner || resolveActingUser(),
    note: buildChainOpsNote(row),
    blockerSummary: row.blockerLabels.join(' / '),
    evidenceSummary: row.evidenceModules.map((item: any) => `${item.title}: ${item.expectation.recommendedLabel}`).join(' / '),
  })
  ElMessage.success(
    status === 'passed'
      ? (preferencesStore.language === 'en-US' ? 'Rollback drill recorded as passed' : '已记录回退演练通过')
      : (preferencesStore.language === 'en-US' ? 'Rollback drill recorded as blocked' : '已记录回退演练阻塞'),
  )
}

function recordPilotSignoff(row: any, decision: 'go' | 'hold' | 'rollback') {
  cutoverOpsStore.addPilotSignoff({
    chainKey: row.key,
    decision,
    owner: row.pilotConfirmOwner || resolveActingUser(),
    note: buildChainOpsNote(row),
  })
  ElMessage.success(
    decision === 'go'
      ? (preferencesStore.language === 'en-US' ? 'Pilot go-signoff recorded' : '已记录试点放行')
      : decision === 'rollback'
        ? (preferencesStore.language === 'en-US' ? 'Pilot rollback decision recorded' : '已记录试点回退决定')
        : (preferencesStore.language === 'en-US' ? 'Pilot hold decision recorded' : '已记录试点暂缓决定'),
  )
}

function exportChainExceptions(row: any) {
  const rows = cutoverReminderItems.value.filter(
    (item) => row.moduleKeys.includes(item.moduleKey as ModuleKey) && !pilotReviewStore.isHidden(item),
  )
  const filename = `neko_erp_${row.key}_cutover_exceptions_${new Date().toISOString().slice(0, 10)}.csv`
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
    scopeType: 'chain',
    scopeKey: row.key,
    scopeLabel: row.label,
    filename,
    rowCount: rows.length,
    exportedBy: resolveActingUser(),
  })
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Chain exception list exported' : '链路异常清单已导出')
}

async function exportCutoverExceptions() {
  const firstWaveSet = new Set(cutoverStore.firstWaveModules)
  const rows = (await fetchReminders({ limit: 50 })).filter((item) => firstWaveSet.has(item.moduleKey as any))
  const filename = `neko_erp_cutover_exceptions_${new Date().toISOString().slice(0, 10)}.csv`
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
    exportedBy: resolveActingUser(),
  })
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Cutover exception list exported' : '切换异常清单已导出')
}

function exportCutoverOpsLedger() {
  const content = [
    `# ${preferencesStore.language === 'en-US' ? 'NEKO_ERP Cutover Closed-Loop Ledger' : 'NEKO_ERP 切换闭环台账'}`,
    '',
    `${preferencesStore.language === 'en-US' ? 'Generated At' : '生成时间'}: ${formatDateTime(new Date().toISOString())}`,
    `${preferencesStore.language === 'en-US' ? 'Rollback Drills' : '回退演练'}: ${cutoverOpsStore.rollbackDrillCount}`,
    `${preferencesStore.language === 'en-US' ? 'Pilot Sign-offs' : '试点签收'}: ${cutoverOpsStore.pilotSignoffCount}`,
    `${preferencesStore.language === 'en-US' ? 'Exception Exports' : '异常导出'}: ${cutoverOpsStore.exceptionExportCount}`,
    `${preferencesStore.language === 'en-US' ? 'Role Desk Tasks' : '责任台任务'}: ${cutoverOpsStore.roleDeskTaskCount}`,
    `${preferencesStore.language === 'en-US' ? 'Finance Batch Reviews' : '财务批量复核'}: ${cutoverOpsStore.financeBatchReviewCount}`,
    '',
    ...chainOpsRows.value.map((row) => [
      `## ${row.label}`,
      `${preferencesStore.language === 'en-US' ? 'Latest Drill' : '最近演练'}: ${row.latestDrill ? `${resolveRollbackDrillLabel(row.latestDrill.status)} · ${row.latestDrill.owner} · ${formatDateTime(row.latestDrill.createdAt)}` : '-'}`,
      `${preferencesStore.language === 'en-US' ? 'Latest Sign-off' : '最近签收'}: ${row.latestSignoff ? `${resolvePilotSignoffLabel(row.latestSignoff.decision)} · ${row.latestSignoff.owner} · ${formatDateTime(row.latestSignoff.createdAt)}` : '-'}`,
      `${preferencesStore.language === 'en-US' ? 'Latest Exception Export' : '最近异常导出'}: ${row.latestExceptionExport ? `${row.latestExceptionExport.filename} · ${row.latestExceptionExport.rowCount}` : '-'}`,
      `${preferencesStore.language === 'en-US' ? 'Current Blockers' : '当前阻塞项'}: ${row.blockerLabels.join(' / ') || '-'}`,
      `${preferencesStore.language === 'en-US' ? 'Gate Note' : '门槛备注'}: ${(chainGateDrafts.value[row.key] ?? row.state).note || '-'}`,
    ].join('\n')),
  ].join('\n\n')
  downloadText(
    `neko_erp_cutover_closed_loop_${new Date().toISOString().slice(0, 10)}.md`,
    content,
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Closed-loop ledger exported' : '闭环台账已导出')
}

async function refreshCutoverReminders() {
  cutoverReminderLoading.value = true
  try {
    const cockpitModules = Array.from(
      new Set(firstWaveModuleRows.value.map((row) => row.moduleKey).filter(supportsCutoverFinancialTraceModule)),
    )
    const [reminders, cockpitEntries] = await Promise.all([
      fetchReminders({ limit: 160 }),
      Promise.all(cockpitModules.map(async (moduleKey) => {
        try {
          return [moduleKey, await fetchFinancialTraceCockpit(moduleKey, 8)] as const
        } catch {
          return [moduleKey, null] as const
        }
      })),
    ])
    cutoverReminderItems.value = reminders
    moduleFinancialTraceCockpitMap.value = Object.fromEntries(
      cockpitEntries.filter((entry): entry is [ModuleKey, FinancialTraceCockpit] => Boolean(entry[1])),
    ) as Partial<Record<ModuleKey, FinancialTraceCockpit>>
  } catch (error: any) {
    cutoverReminderItems.value = []
    moduleFinancialTraceCockpitMap.value = {}
    ElMessage.error(error?.message || (preferencesStore.language === 'en-US' ? 'Failed to load cutover reminders' : '加载切换提醒失败'))
  } finally {
    cutoverReminderLoading.value = false
  }
}

function startShortcutCapture(actionKey: string) {
  capturingShortcutKey.value = actionKey
}

function stopShortcutCapture() {
  capturingShortcutKey.value = null
}

function captureShortcut(actionKey: any, event: KeyboardEvent) {
  event.preventDefault()
  event.stopPropagation()
  const binding = formatShortcutBinding(event)
  if (!binding) return
  shortcutStore.setBinding(actionKey, binding)
  capturingShortcutKey.value = null
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Shortcut updated' : '快捷键已更新')
}

function resetShortcutBinding(actionKey: any) {
  shortcutStore.resetBinding(actionKey)
  if (capturingShortcutKey.value === actionKey) {
    capturingShortcutKey.value = null
  }
  ElMessage.success(t('app.saveSuccess'))
}

function resetAllShortcutBindings() {
  shortcutStore.resetAllBindings()
  capturingShortcutKey.value = null
  ElMessage.success(t('app.saveSuccess'))
}

async function saveRuntimeSettings() {
  if (!window.erpDesktop?.setRuntimeSettings) return
  runtimeSettings.value = await window.erpDesktop.setRuntimeSettings(runtimeSettings.value)
  runtimeSettingsSaved.value = { ...runtimeSettings.value }
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Saved. Restart required to apply GPU changes.' : '已保存，GPU 相关更改需要重启软件后生效。')
}

async function restartDesktopApp() {
  ElMessage.success(preferencesStore.language === 'en-US' ? 'Restarting application...' : '正在重启应用...')
  await window.erpDesktop?.restartApp()
}

function resolveTab(value: unknown) {
  const tab = String(value || 'general')
  if (['general', 'appearance', 'connection', 'notifications', 'shortcuts', 'cutover', 'advanced'].includes(tab)) {
    return tab
  }
  return 'general'
}

onMounted(async () => {
  void refreshCurrentSession(true)
  void refreshCutoverReminders()
  syncChainContactDrafts()
  syncChainGateDrafts()
  if (typeof window !== 'undefined') {
    lastCutoverBackup.value = window.localStorage.getItem(CUTOVER_IMPORT_BACKUP_KEY) || ''
  }
  void loadCutoverConfigFromServer(false)
  if (activeTab.value === 'cutover') {
    void focusCutoverTarget()
  }
  if (!window.erpDesktop?.getGpuStatus) return
  gpuStatus.value = await window.erpDesktop.getGpuStatus()
  runtimeSettingsApplied.value = {
    hardwareAcceleration: gpuStatus.value.hardwareAcceleration,
  }
  if (window.erpDesktop.getRuntimeSettings) {
    runtimeSettings.value = await window.erpDesktop.getRuntimeSettings()
    runtimeSettingsSaved.value = { ...runtimeSettings.value }
  }
})
</script>

<template>
  <div class="settings-workspace">
    <header class="settings-header">
      <div class="header-main">
        <nav class="breadcrumb">{{ t('settings.breadcrumb') }}</nav>
        <h1 class="page-title">{{ t('settings.title') }}</h1>
        <p class="subtitle">{{ t('settings.subtitle') }}</p>
      </div>
    </header>

    <main class="settings-content">
      <div class="settings-layout">
        <aside class="settings-nav">
          <div class="nav-item" :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">
            <el-icon><Setting /></el-icon>
            {{ t('settings.general') }}
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'appearance' }" @click="activeTab = 'appearance'">
            <el-icon><Brush /></el-icon>
            {{ t('settings.appearance') }}
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'connection' }" @click="activeTab = 'connection'">
            <el-icon><Connection /></el-icon>
            {{ t('settings.connection') }}
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'notifications' }" @click="activeTab = 'notifications'">
            <el-icon><Bell /></el-icon>
            {{ t('settings.notifications') }}
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'shortcuts' }" @click="activeTab = 'shortcuts'">
            <el-icon><Operation /></el-icon>
            {{ preferencesStore.language === 'en-US' ? 'Shortcuts' : '快捷键' }}
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'cutover' }" @click="activeTab = 'cutover'">
            <el-icon><Tickets /></el-icon>
            {{ preferencesStore.language === 'en-US' ? 'Cutover' : '切换' }}
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'advanced' }" @click="activeTab = 'advanced'">
            <el-icon><Monitor /></el-icon>
            {{ t('settings.advanced') }}
          </div>
        </aside>

        <div class="settings-panel">
          <transition name="fade" mode="out-in">
            <section v-if="activeTab === 'general'" class="setting-group" key="general">
              <h2 class="group-title">{{ t('settings.generalTitle') }}</h2>

              <div class="setting-card">
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.languageName') }}</div>
                    <div class="setting-desc">{{ t('settings.languageDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-select v-model="language" style="width: 180px">
                      <el-option :label="`${t('app.languageChinese')} (zh-CN)`" value="zh-CN" />
                      <el-option :label="`${t('app.languageEnglish')} (en-US)`" value="en-US" />
                    </el-select>
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.timezoneName') }}</div>
                    <div class="setting-desc">{{ t('settings.timezoneDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-select model-value="Asia/Shanghai" style="width: 180px" disabled>
                      <el-option :label="t('settings.timezoneValue')" value="Asia/Shanghai" />
                    </el-select>
                  </div>
                </div>
              </div>

              <h2 class="group-title secondary-title">{{ t('settings.navigationTitle') }}</h2>
              <div class="setting-card">
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.pinGroupName') }}</div>
                    <div class="setting-desc">{{ t('settings.pinGroupDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-switch :model-value="appStore.pinActiveGroup" @update:model-value="appStore.setPinActiveGroup" />
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.memoryName') }}</div>
                    <div class="setting-desc">{{ t('settings.memoryDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-tag type="primary" effect="plain">{{ t('settings.enabled') }}</el-tag>
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.multiOpenName') }}</div>
                    <div class="setting-desc">{{ t('settings.multiOpenDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-tag type="success" effect="plain">{{ t('settings.enabled') }}</el-tag>
                  </div>
                </div>
              </div>
            </section>

            <section v-else-if="activeTab === 'appearance'" class="setting-group" key="appearance">
              <h2 class="group-title">{{ t('settings.appearanceTitle') }}</h2>
              <div class="setting-card">
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.themeName') }}</div>
                    <div class="setting-desc">{{ t('settings.themeDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-radio-group v-model="theme" class="modern-radio">
                      <el-radio-button label="system">{{ t('app.themeSystem') }}</el-radio-button>
                      <el-radio-button label="light">{{ t('app.themeLight') }}</el-radio-button>
                      <el-radio-button label="dark">{{ t('app.themeDark') }}</el-radio-button>
                      <el-radio-button label="eye">{{ t('app.themeEye') }}</el-radio-button>
                      <el-radio-button label="custom">{{ t('app.themeCustom') }}</el-radio-button>
                    </el-radio-group>
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.fontScaleName') }}</div>
                    <div class="setting-desc">{{ t('settings.fontScaleDesc') }}</div>
                  </div>
                  <div class="setting-action slider-action">
                    <el-slider v-model="fontScale" :min="85" :max="130" :step="1" show-input input-size="small" />
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.densityName') }}</div>
                    <div class="setting-desc">{{ t('settings.densityDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-radio-group v-model="density" class="modern-radio">
                      <el-radio-button label="compact">{{ t('app.densityCompact') }}</el-radio-button>
                      <el-radio-button label="comfortable">{{ t('app.densityComfortable') }}</el-radio-button>
                    </el-radio-group>
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.animationsName') }}</div>
                    <div class="setting-desc">{{ t('settings.animationsDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-switch v-model="animations" />
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.systemThemeLabel') }}</div>
                    <div class="setting-desc">{{ preferencesStore.systemColorScheme === 'dark' ? t('settings.dark') : t('settings.light') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-tag effect="plain">{{ preferencesStore.systemColorScheme }}</el-tag>
                  </div>
                </div>
                <template v-if="theme === 'custom'">
                  <div class="setting-divider"></div>
                  <div class="setting-row custom-theme-row">
                    <div class="setting-info">
                      <div class="setting-name">{{ t('settings.customThemeName') }}</div>
                      <div class="setting-desc">{{ t('settings.customThemeDesc') }}</div>
                    </div>
                    <div class="theme-grid">
                      <label class="theme-swatch">
                        <span>{{ t('settings.themeColorBackground') }}</span>
                        <input :value="customTheme.background" type="color" @input="preferencesStore.setCustomThemePatch({ background: ($event.target as HTMLInputElement).value })" />
                      </label>
                      <label class="theme-swatch">
                        <span>{{ t('settings.themeColorSurface') }}</span>
                        <input :value="customTheme.surface" type="color" @input="preferencesStore.setCustomThemePatch({ surface: ($event.target as HTMLInputElement).value })" />
                      </label>
                      <label class="theme-swatch">
                        <span>{{ t('settings.themeColorSidebar') }}</span>
                        <input :value="customTheme.sidebar" type="color" @input="preferencesStore.setCustomThemePatch({ sidebar: ($event.target as HTMLInputElement).value })" />
                      </label>
                      <label class="theme-swatch">
                        <span>{{ t('settings.themeColorPrimary') }}</span>
                        <input :value="customTheme.primary" type="color" @input="preferencesStore.setCustomThemePatch({ primary: ($event.target as HTMLInputElement).value })" />
                      </label>
                      <label class="theme-swatch">
                        <span>{{ t('settings.themeColorText') }}</span>
                        <input :value="customTheme.text" type="color" @input="preferencesStore.setCustomThemePatch({ text: ($event.target as HTMLInputElement).value })" />
                      </label>
                      <label class="theme-swatch">
                        <span>{{ t('settings.themeColorMuted') }}</span>
                        <input :value="customTheme.mutedText" type="color" @input="preferencesStore.setCustomThemePatch({ mutedText: ($event.target as HTMLInputElement).value })" />
                      </label>
                    </div>
                    <div class="theme-actions">
                      <el-button @click="preferencesStore.resetCustomTheme()">{{ t('settings.resetTheme') }}</el-button>
                    </div>
                  </div>
                </template>
              </div>
            </section>

            <section v-else-if="activeTab === 'connection'" class="setting-group" key="connection">
              <h2 class="group-title">{{ t('settings.connectionTitle') }}</h2>
              <p class="group-intro">{{ t('settings.connectionDesc') }}</p>

              <div class="setting-card">
                <div class="setting-row align-start">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.serverAddressName') }}</div>
                    <div class="setting-desc">{{ t('settings.serverAddressDesc') }}</div>
                  </div>
                  <div class="setting-action wide-action">
                    <el-input v-model="connectionStore.serverUrl" />
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.proxyName') }}</div>
                    <div class="setting-desc">{{ t('settings.proxyDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-switch v-model="connectionStore.proxyEnabled" />
                  </div>
                </div>
                <template v-if="connectionStore.proxyEnabled">
                  <div class="setting-divider"></div>
                  <div class="setting-row align-start">
                    <div class="setting-info">
                      <div class="setting-name">{{ t('settings.proxyAddressName') }}</div>
                      <div class="setting-desc">{{ t('settings.proxyAddressDesc') }}</div>
                    </div>
                    <div class="setting-action wide-action">
                      <el-input v-model="connectionStore.proxyRules" />
                    </div>
                  </div>
                  <div class="setting-divider"></div>
                  <div class="setting-row align-start">
                    <div class="setting-info">
                      <div class="setting-name">{{ t('settings.bypassName') }}</div>
                      <div class="setting-desc">{{ t('settings.bypassDesc') }}</div>
                    </div>
                    <div class="setting-action wide-action">
                      <el-input v-model="connectionStore.proxyBypassRules" />
                    </div>
                  </div>
                </template>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.rememberUsernameName') }}</div>
                    <div class="setting-desc">{{ t('settings.rememberUsernameDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-switch v-model="connectionStore.rememberUsername" />
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row align-start">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.connectionStatusName') }}</div>
                    <div class="setting-desc">{{ t('settings.connectionStatusDesc') }}</div>
                  </div>
                  <div class="setting-action action-stack">
                    <div class="resolved-url">{{ connectionStore.resolvedApiBaseUrl }}</div>
                    <div class="inline-actions">
                      <el-button :loading="savingConnection" @click="saveConnectionSettings">
                        {{ t('settings.saveConnection') }}
                      </el-button>
                      <el-button type="primary" :loading="testingConnection" @click="testConnectionSettings">
                        {{ t('settings.testConnection') }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <h2 class="group-title secondary-title">{{ t('settings.sessionTitle') }}</h2>
              <p class="group-intro">{{ t('settings.sessionDesc') }}</p>
              <div class="setting-card">
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.connectedUserName') }}</div>
                    <div class="setting-desc">{{ t('settings.connectedUserDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-tag type="primary" effect="plain">{{ authStore.displayName }}</el-tag>
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.connectedTo') }}</div>
                    <div class="setting-desc">{{ t('settings.serverAddressDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-tag effect="plain">{{ connectionStore.resolvedApiBaseUrl }}</el-tag>
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.sessionMode') }}</div>
                    <div class="setting-desc">{{ t('settings.sessionDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-tag type="success" effect="plain">{{ t('settings.sessionModeValue') }}</el-tag>
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.logoutName') }}</div>
                    <div class="setting-desc">{{ t('settings.logoutDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-button type="danger" plain @click="logoutSession">{{ t('app.logout') }}</el-button>
                  </div>
                </div>
              </div>

              <div class="setting-card">
                <div class="setting-row align-start">
                  <div class="setting-info">
                    <div class="setting-name">
                      {{ preferencesStore.language === 'en-US' ? 'Account Security' : '账户安全' }}
                    </div>
                    <div class="setting-desc">
                      {{ preferencesStore.language === 'en-US'
                        ? 'Review the current account and update the desktop session password without leaving settings.'
                        : '直接在设置页查看当前账户，并完成当前桌面会话密码更新。' }}
                    </div>
                  </div>
                  <div class="setting-action action-stack wide-action session-security-actions">
                    <div class="session-user-meta">
                      <el-tag effect="plain">{{ authStore.user?.username || '-' }}</el-tag>
                      <el-tag v-if="authStore.user?.status === 1" type="success" effect="plain">
                        {{ preferencesStore.language === 'en-US' ? 'Enabled' : '已启用' }}
                      </el-tag>
                      <el-tag v-else-if="authStore.user?.status === 0" type="warning" effect="plain">
                        {{ preferencesStore.language === 'en-US' ? 'Disabled' : '已停用' }}
                      </el-tag>
                    </div>
                    <div class="inline-actions">
                      <el-button :loading="refreshingCurrentUser" @click="refreshCurrentSession()">
                        {{ preferencesStore.language === 'en-US' ? 'Refresh Account' : '刷新当前账户' }}
                      </el-button>
                    </div>
                    <div class="session-form-grid">
                      <el-input
                        v-model="passwordForm.oldPassword"
                        type="password"
                        show-password
                        :placeholder="preferencesStore.language === 'en-US' ? 'Current password' : '当前密码'"
                      />
                      <el-input
                        v-model="passwordForm.newPassword"
                        type="password"
                        show-password
                        :placeholder="preferencesStore.language === 'en-US' ? 'New password (6+ chars)' : '新密码（至少 6 位）'"
                      />
                      <el-input
                        v-model="passwordForm.confirmPassword"
                        type="password"
                        show-password
                        :placeholder="preferencesStore.language === 'en-US' ? 'Confirm new password' : '确认新密码'"
                        @keyup.enter="submitPasswordChange"
                      />
                    </div>
                    <p class="session-security-hint">
                      {{ preferencesStore.language === 'en-US'
                        ? 'Existing user passwords are now stored as BCrypt hashes. Leaving a password blank in the user form will keep the current password unchanged.'
                        : '现有用户密码会按 BCrypt 哈希存储。系统用户表单中把密码留空时，会保留旧密码，不再被空值覆盖。' }}
                    </p>
                    <div class="inline-actions">
                      <el-button @click="resetPasswordForm">
                        {{ preferencesStore.language === 'en-US' ? 'Reset' : '清空表单' }}
                      </el-button>
                      <el-button type="primary" :loading="changingPassword" @click="submitPasswordChange">
                        {{ preferencesStore.language === 'en-US' ? 'Update Password' : '更新当前密码' }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section v-else-if="activeTab === 'notifications'" class="setting-group" key="notifications">
              <h2 class="group-title">{{ t('settings.notificationsTitle') }}</h2>
              <div class="setting-card">
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.desktopNotificationName') }}</div>
                    <div class="setting-desc">{{ t('settings.desktopNotificationDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-switch v-model="notifications" />
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.soundName') }}</div>
                    <div class="setting-desc">{{ t('settings.soundDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-switch v-model="sound" />
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ t('settings.dailySummaryName') }}</div>
                    <div class="setting-desc">{{ t('settings.dailySummaryDesc') }}</div>
                  </div>
                  <div class="setting-action">
                    <el-switch v-model="dailySummary" />
                  </div>
                </div>
              </div>
            </section>

            <section v-else-if="activeTab === 'shortcuts'" class="setting-group" key="shortcuts">
              <h2 class="group-title">{{ preferencesStore.language === 'en-US' ? 'Keyboard Shortcuts' : '键盘快捷键' }}</h2>
              <p class="group-intro">
                {{ preferencesStore.language === 'en-US'
                  ? 'Ctrl bindings also work with Command on macOS. Shortcut changes apply immediately.'
                  : '使用 Ctrl 的绑定在 macOS 上会自动兼容 Command。快捷键改动会立即生效。' }}
              </p>
              <div class="setting-card">
                <div v-for="(row, index) in shortcutRows" :key="row.key">
                  <div class="setting-row align-start">
                    <div class="setting-info">
                      <div class="setting-name">{{ row.title }}</div>
                      <div class="setting-desc">{{ row.description }}</div>
                    </div>
                    <div class="setting-action action-stack">
                      <button
                        type="button"
                        class="shortcut-capture"
                        :class="{ capturing: capturingShortcutKey === row.key }"
                        @click="startShortcutCapture(row.key)"
                        @blur="capturingShortcutKey === row.key ? stopShortcutCapture() : undefined"
                        @keydown="(event: KeyboardEvent) => captureShortcut(row.key, event)"
                      >
                        {{ capturingShortcutKey === row.key
                          ? (preferencesStore.language === 'en-US' ? 'Press shortcut now...' : '请直接按下快捷键...')
                          : row.binding }}
                      </button>
                      <div class="inline-actions">
                        <el-button
                          v-if="capturingShortcutKey === row.key"
                          size="small"
                          @mousedown.prevent
                          @click="stopShortcutCapture"
                        >
                          {{ preferencesStore.language === 'en-US' ? 'Cancel' : '取消' }}
                        </el-button>
                        <el-button size="small" @click="resetShortcutBinding(row.key)">
                          {{ preferencesStore.language === 'en-US' ? 'Reset' : '重置' }}
                        </el-button>
                      </div>
                    </div>
                  </div>
                  <div v-if="index < shortcutRows.length - 1" class="setting-divider"></div>
                </div>
              </div>

              <div class="cutover-actions">
                <el-button @click="resetAllShortcutBindings">
                  {{ preferencesStore.language === 'en-US' ? 'Reset All Shortcuts' : '恢复全部默认快捷键' }}
                </el-button>
              </div>
            </section>

            <section v-else-if="activeTab === 'cutover'" class="setting-group" key="cutover">
              <h2 class="group-title">{{ preferencesStore.language === 'en-US' ? 'Cutover Controls' : '切换控制' }}</h2>
              <p class="group-intro">
                {{ preferencesStore.language === 'en-US'
                  ? 'Use these switches to control first-wave pilot scope and prepare rollback entry points without touching support modules.'
                  : '用这些开关控制首批试点范围，并准备回退入口，不去误伤支撑模块。' }}
              </p>

              <div v-if="blockedModule" class="setting-card blocked-card">
                <div class="setting-row align-start">
                  <div class="setting-info">
                    <div class="setting-name">
                      {{ preferencesStore.language === 'en-US' ? 'Blocked Module' : '被拦截模块' }}
                    </div>
                    <div class="setting-desc">
                      {{ preferencesStore.language === 'en-US'
                        ? `${blockedModule} is currently disabled by the cutover switch.`
                        : `${blockedModule} 当前已被切换开关关闭。` }}
                    </div>
                  </div>
                  <div class="setting-action action-stack">
                    <div class="inline-actions">
                      <el-button @click="rollbackCurrentBlockedModule">
                        {{ preferencesStore.language === 'en-US' ? 'Keep Rolled Back' : '保持回退状态' }}
                      </el-button>
                      <el-button type="primary" @click="setModuleCutover(route.query.module as any, true)">
                        {{ preferencesStore.language === 'en-US' ? 'Enable Module' : '启用模块' }}
                      </el-button>
                      <el-button v-if="blockedFrom" @click="openBlockedSource">
                        {{ preferencesStore.language === 'en-US' ? 'Retry Route' : '重试路由' }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <h2 class="group-title secondary-title">{{ preferencesStore.language === 'en-US' ? 'Pilot Chains' : '试点链路' }}</h2>
              <div class="setting-card">
                <div v-for="(chain, index) in pilotChainRows" :key="chain.key">
                  <div class="setting-row">
                    <div class="setting-info">
                      <div class="setting-name">{{ preferencesStore.language === 'en-US' ? chain.enLabel : chain.zhLabel }}</div>
                      <div class="setting-desc">{{ chain.moduleKeys.map((moduleKey) => moduleTitle(moduleKey)).join(' / ') }}</div>
                    </div>
                    <div class="setting-action">
                      <el-switch :model-value="chain.enabled" @update:model-value="(value: string | number | boolean) => setCutoverChain(chain.key, Boolean(value))" />
                    </div>
                  </div>
                  <div v-if="index < pilotChainRows.length - 1" class="setting-divider"></div>
                </div>
              </div>

              <h2
                :ref="(el) => registerCutoverSection('handoff', el)"
                class="group-title secondary-title"
              >
                {{ preferencesStore.language === 'en-US' ? 'Chain Handoff Desk' : '链路交接台' }}
              </h2>
              <p class="group-intro">
                {{ preferencesStore.language === 'en-US'
                  ? 'Each first-wave chain now carries explicit owner, fallback, rehearsal, reviewer, finance, and pilot confirmation roles together with exportable runbooks.'
                  : '每条首批链路现在都显式维护负责人、回退负责人、演练负责人、复核人、财务责任人和试点确认负责人，并可直接导出交接手册。' }}
              </p>
              <div v-if="cutoverReminderLoading" class="setting-card handoff-loading">
                {{ preferencesStore.language === 'en-US' ? 'Loading chain pressure...' : '正在加载链路压力...' }}
              </div>
              <div v-else class="chain-handoff-grid">
                <article
                  v-for="row in chainHandoffRows"
                  :key="row.key"
                  :ref="(el) => registerChainCard(row.key, el)"
                  class="chain-handoff-card"
                  :class="{ disabled: !row.enabled, focused: focusedChainKey === row.key }"
                >
                  <div class="chain-handoff-head">
                    <div>
                      <strong>{{ row.label }}</strong>
                      <p>{{ row.modulesLabel }}</p>
                    </div>
                    <el-tag :type="row.statusTone" effect="plain">{{ row.statusLabel }}</el-tag>
                  </div>
                  <div class="chain-owner-grid">
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Owner' : '负责人' }}</span>
                      <strong>{{ row.owner }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Fallback' : '回退负责人' }}</span>
                      <strong>{{ row.fallbackOwner }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Rehearsal' : '演练负责人' }}</span>
                      <strong>{{ row.rehearsalOwner }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Confirmation' : '试点确认负责人' }}</span>
                      <strong>{{ row.pilotConfirmOwner }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Reviewer' : '复核人' }}</span>
                      <strong>{{ row.closeRoleSnapshot.reviewer }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Finance' : '财务责任人' }}</span>
                      <strong>{{ row.closeRoleSnapshot.financeOwner }}</strong>
                    </div>
                  </div>
                  <div class="chain-contact-editor">
                    <el-input
                      v-model="chainContactDrafts[row.key].owner"
                      :placeholder="preferencesStore.language === 'en-US' ? 'Chain owner' : '链路负责人'"
                    />
                    <el-input
                      v-model="chainContactDrafts[row.key].fallbackOwner"
                      :placeholder="preferencesStore.language === 'en-US' ? 'Fallback owner' : '回退负责人'"
                    />
                    <el-input
                      v-model="chainContactDrafts[row.key].rehearsalOwner"
                      :placeholder="preferencesStore.language === 'en-US' ? 'Rehearsal owner' : '演练负责人'"
                    />
                    <el-input
                      v-model="chainContactDrafts[row.key].pilotConfirmOwner"
                      :placeholder="preferencesStore.language === 'en-US' ? 'Pilot confirmation owner' : '试点确认负责人'"
                    />
                    <el-input
                      v-model="chainContactDrafts[row.key].reviewerOwner"
                      :placeholder="preferencesStore.language === 'en-US' ? 'Reviewer owner' : '复核人'"
                    />
                    <el-input
                      v-model="chainContactDrafts[row.key].financeOwner"
                      :placeholder="preferencesStore.language === 'en-US' ? 'Finance owner' : '财务责任人'"
                    />
                  </div>
                  <div class="chain-risk-grid">
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Reminders' : '提醒' }}</span>
                      <strong>{{ row.reminders }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Critical' : '严重' }}</span>
                      <strong>{{ row.critical }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Warning' : '警告' }}</span>
                      <strong>{{ row.warning }}</strong>
                    </div>
                  </div>
                  <div v-if="row.reminderBadges.length" class="chain-reminder-badges">
                    <span
                      v-for="badge in row.reminderBadges"
                      :key="`${row.key}-${badge.key}`"
                      :class="`tone-${badge.tone}`"
                    >
                      {{ badge.label }} · {{ badge.count }}
                    </span>
                  </div>
                  <div class="chain-gate-mini">
                    <span>{{ preferencesStore.language === 'en-US' ? 'Gate Summary' : '门槛摘要' }}</span>
                    <strong>{{ chainGateRows.find((item) => item.key === row.key)?.summary.label }}</strong>
                    <p>
                      {{ preferencesStore.language === 'en-US' ? 'Ready checks' : '通过项' }}:
                      {{ chainGateRows.find((item) => item.key === row.key)?.readyLabel }}
                    </p>
                  </div>
                  <div class="chain-gate-mini">
                    <span>{{ preferencesStore.language === 'en-US' ? 'Settlement Closure' : '结算闭环' }}</span>
                    <strong>{{ row.settlementSummary.statusLabel }}</strong>
                    <p>{{ describeSettlementSummary(row.settlementSummary) }}</p>
                  </div>
                  <div v-if="row.financeCockpitSummary.enabled" class="chain-gate-mini">
                    <span>{{ preferencesStore.language === 'en-US' ? 'Finance Cockpit' : '财务驾驶舱' }}</span>
                    <strong>{{ row.financeCockpitSummary.label }}</strong>
                    <p>{{ describeFinanceCockpitSummary(row.financeCockpitSummary) }}</p>
                  </div>
                  <div class="chain-gate-mini">
                    <span>{{ preferencesStore.language === 'en-US' ? 'Role Desk' : '责任台' }}</span>
                    <strong>{{ row.roleDeskSummary.label }}</strong>
                    <p>{{ describeRoleDeskSummary(row.roleDeskSummary) }}</p>
                  </div>
                  <div class="chain-gate-mini">
                    <span>{{ preferencesStore.language === 'en-US' ? 'Financial Trace' : '财务追溯' }}</span>
                    <strong>{{ row.financialTraceSummary.statusLabel }}</strong>
                    <p>{{ describeFinancialTraceSummary(row.financialTraceSummary) }}</p>
                  </div>
                  <div class="chain-evidence-mini">
                    <span>{{ preferencesStore.language === 'en-US' ? 'Evidence Discipline' : '证据纪律' }}</span>
                    <strong>
                      {{ preferencesStore.language === 'en-US' ? 'Required Slots' : '必备槽位' }}:
                      {{ row.requiredEvidenceCount }}
                    </strong>
                    <div class="chain-evidence-tags">
                      <span v-for="item in row.evidenceModules" :key="`${row.key}-${item.moduleKey}`">
                        {{ item.title }} · {{ item.expectation.recommendedLabel }}
                      </span>
                    </div>
                    <p>{{ row.evidenceModules.map((item) => item.expectation.timelineHint).join(' / ') }}</p>
                  </div>
                  <p v-if="row.blockerLabels.length" class="chain-blocker-note">
                    {{ preferencesStore.language === 'en-US' ? 'Suggested blockers' : '建议阻塞项' }}:
                    {{ row.blockerLabels.join(' / ') }}
                  </p>
                  <p class="chain-top-risk">
                    {{ row.topRiskLabel
                      ? `${preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险'}: ${row.topRiskLabel}`
                      : (preferencesStore.language === 'en-US' ? 'No unresolved top-risk record in this chain.' : '当前链路没有未处理最高风险记录。') }}
                  </p>
                  <div class="chain-actions">
                    <el-button size="small" @click="saveChainContacts(row.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Save Contacts' : '保存联系人' }}
                    </el-button>
                    <el-button size="small" @click="resetChainContacts(row.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Reset Contacts' : '重置联系人' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.enabled" @click="openChainWorkbench(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Open Rehearsal' : '打开演练' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.enabled" @click="openChainWorkbench(row, 'ops-close')">
                      {{ preferencesStore.language === 'en-US' ? 'Open Close Desk' : '打开关账台' }}
                    </el-button>
                    <el-button size="small" @click="openCloseDesk(row.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Close Summary' : '关账总览' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.topRisk?.recordId && !row.topRiskQuery" @click="openChainTopRisk(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.financialTraceSummary.topRiskRecordId" @click="openChainTraceDocuments(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Documents' : '文档' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.financialTraceSummary.topRiskRecordId" @click="openChainTraceTimeline(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Timeline' : '时间轴' }}
                    </el-button>
                    <el-button size="small" @click="exportChainRunbook(row, 'handbook')">
                      {{ preferencesStore.language === 'en-US' ? 'Export Handbook' : '导出手册' }}
                    </el-button>
                    <el-button size="small" type="warning" @click="exportChainRunbook(row, 'rollback')">
                      {{ preferencesStore.language === 'en-US' ? 'Export Rollback' : '导出回退' }}
                    </el-button>
                    <el-button
                      size="small"
                      :type="row.enabled ? 'danger' : 'primary'"
                      @click="setCutoverChain(row.key, !row.enabled)"
                    >
                      {{ row.enabled
                        ? (preferencesStore.language === 'en-US' ? 'Rollback Chain' : '回退链路')
                        : (preferencesStore.language === 'en-US' ? 'Restore Chain' : '恢复链路') }}
                    </el-button>
                  </div>
                </article>
              </div>

              <h2
                :ref="(el) => registerCutoverSection('gates', el)"
                class="group-title secondary-title"
              >
                {{ preferencesStore.language === 'en-US' ? 'Acceptance Gate Desk' : '放行门槛台' }}
              </h2>
              <p class="group-intro">
                {{ preferencesStore.language === 'en-US'
                  ? 'Track which first-wave chains are truly ready to cut over, not just enabled.'
                  : '记录哪些首批链路已经真正满足切换门槛，而不只是开关已启用。' }}
              </p>
              <div class="gate-pressure-summary">
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Ready Chains' : '就绪链路' }}</span>
                  <strong>{{ gatePressureSummary.readyChains }}/{{ gatePressureSummary.totalChains }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'All gates checked and no blocker family remains.' : '门槛全勾选且没有阻塞类提醒。' }}</p>
                </article>
                <article class="gate-pressure-card danger">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Critical Chains' : '严重链路' }}</span>
                  <strong>{{ gatePressureSummary.criticalChains }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Chains containing at least one critical reminder.' : '至少有一条严重提醒的链路。' }}</p>
                </article>
                <article class="gate-pressure-card warning">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Pending Gates' : '未完成门槛' }}</span>
                  <strong>{{ gatePressureSummary.pendingGates }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Manual acceptance checks still not confirmed.' : '仍未人工确认的放行检查项。' }}</p>
                </article>
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Open Reminders' : '未处理提醒' }}</span>
                  <strong>{{ gatePressureSummary.reminderCount }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Context, evidence, and collection blockers in scope.' : '当前范围内的上下文、证据和收付款阻塞。' }}</p>
                </article>
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Settlement Ready' : '结算就绪' }}</span>
                  <strong>{{ gatePressureSummary.settlementReadyChains }}/{{ gatePressureSummary.totalChains }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Chains whose payment and accounting settlement continuity is already closed.' : '付款与会计结算连续性已经闭合的链路。' }}</p>
                </article>
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Finance Cockpit Ready' : '财务驾驶舱就绪' }}</span>
                  <strong>{{ gatePressureSummary.financeReadyChains }}/{{ gatePressureSummary.financeScopedChains }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Chains whose finance close cockpit already has no open blocker signal.' : '财务关账驾驶舱已经没有开放阻塞信号的链路。' }}</p>
                </article>
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Role Desk Ready' : '责任台就绪' }}</span>
                  <strong>{{ gatePressureSummary.roleReadyChains }}/{{ gatePressureSummary.totalChains }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Chains whose responsibility lane and close checklist are already stable.' : '责任链和关账清单已经稳定的链路。' }}</p>
                </article>
                <article class="gate-pressure-card warning">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Close Blockers' : '关账阻塞项' }}</span>
                  <strong>{{ gatePressureSummary.closeBlockers }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Unified blockers across gates, settlement, trace, and closed-loop evidence.' : '统一统计门槛、结算、追溯与闭环证据的阻塞项。' }}</p>
                </article>
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Trace Ready' : '追溯就绪' }}</span>
                  <strong>{{ gatePressureSummary.financialTraceReadyChains }}/{{ gatePressureSummary.totalChains }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Chains whose source, journal, and finance evidence continuity is already closed.' : '来源、凭证和财务证据连续性已经闭合的链路。' }}</p>
                </article>
              </div>
              <div class="chain-handoff-grid">
                <article
                  v-for="row in chainGateRows"
                  :key="`gate-${row.key}`"
                  class="chain-handoff-card gate-card"
                >
                  <div class="chain-handoff-head">
                    <div>
                      <strong>{{ row.label }}</strong>
                      <p>{{ row.modulesLabel }}</p>
                    </div>
                    <el-tag :type="row.pendingCount ? 'warning' : 'success'" effect="plain">
                      {{ row.readyLabel }} · {{ row.summary.label }}
                    </el-tag>
                  </div>
                  <div v-if="row.summary.pendingLabels.length" class="pending-gate-list">
                    <span v-for="label in row.summary.pendingLabels" :key="`${row.key}-${label}`">{{ label }}</span>
                  </div>
                  <div v-if="row.reminderBadges.length" class="pending-gate-list gate-pressure-list">
                    <span
                      v-for="badge in row.reminderBadges"
                      :key="`${row.key}-badge-${badge.key}`"
                      :class="`tone-${badge.tone}`"
                    >
                      {{ badge.label }} · {{ badge.count }}
                    </span>
                  </div>
                  <div class="chain-risk-grid">
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Reminders' : '提醒' }}</span>
                      <strong>{{ row.reminderCount }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Critical' : '严重' }}</span>
                      <strong>{{ row.critical }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Evidence Slots' : '证据槽位' }}</span>
                      <strong>{{ row.requiredEvidenceCount }}</strong>
                    </div>
                  </div>
                  <div class="pending-gate-list gate-pressure-list">
                    <span :class="`tone-${row.closedLoopSummary.tone}`">
                      {{ preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环' }} · {{ row.closedLoopSummary.label }}
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
                  <p v-if="row.blockerLabels.length" class="gate-blocker-note">
                    {{ preferencesStore.language === 'en-US' ? 'Suggested blockers' : '建议阻塞项' }}:
                    {{ row.blockerLabels.join(' / ') }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ describeClosedLoopSummary(row.closedLoopSummary) }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ describeSettlementSummary(row.settlementSummary) }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ describeFinancialTraceSummary(row.financialTraceSummary) }}
                  </p>
                  <p v-if="row.financeCockpitSummary.enabled" class="gate-blocker-note">
                    {{ describeFinanceCockpitSummary(row.financeCockpitSummary) }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ describeRoleDeskSummary(row.roleDeskSummary) }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ row.topRiskLabel
                      ? `${preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险'}: ${row.topRiskLabel}`
                      : (preferencesStore.language === 'en-US' ? 'No top-risk reminder in this gate.' : '当前门槛没有最高风险提醒。') }}
                  </p>
                  <div class="gate-check-grid">
                    <el-checkbox v-model="chainGateDrafts[row.key].smokeReady">
                      {{ preferencesStore.language === 'en-US' ? 'Smoke Green' : 'Smoke 通过' }}
                    </el-checkbox>
                    <el-checkbox v-model="chainGateDrafts[row.key].workbenchReady">
                      {{ preferencesStore.language === 'en-US' ? 'Workbench Ready' : '工作台就绪' }}
                    </el-checkbox>
                    <el-checkbox v-model="chainGateDrafts[row.key].rollbackReady">
                      {{ preferencesStore.language === 'en-US' ? 'Rollback Ready' : '回退入口就绪' }}
                    </el-checkbox>
                    <el-checkbox v-model="chainGateDrafts[row.key].traceabilityReady">
                      {{ preferencesStore.language === 'en-US' ? 'Traceability Ready' : '追溯就绪' }}
                    </el-checkbox>
                    <el-checkbox v-model="chainGateDrafts[row.key].manualReady">
                      {{ preferencesStore.language === 'en-US' ? 'Manual Ready' : '用户手册就绪' }}
                    </el-checkbox>
                    <el-checkbox v-model="chainGateDrafts[row.key].pilotConfirmed">
                      {{ preferencesStore.language === 'en-US' ? 'Pilot Confirmed' : '试点确认' }}
                    </el-checkbox>
                  </div>
                  <el-input
                    v-model="chainGateDrafts[row.key].note"
                    type="textarea"
                    :rows="4"
                    class="wide-action"
                    :placeholder="preferencesStore.language === 'en-US' ? 'Gate note, blocker, owner confirmation...' : '记录门槛备注、阻塞项、负责人确认等...'"
                  />
                  <div class="chain-actions">
                    <el-button size="small" @click="saveChainGateState(row.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Save Gates' : '保存门槛' }}
                    </el-button>
                    <el-button size="small" @click="resetChainGateState(row.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Reset Gates' : '重置门槛' }}
                    </el-button>
                    <el-button size="small" @click="exportChainGatePacket(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Export Packet' : '导出门槛包' }}
                    </el-button>
                    <el-button size="small" @click="autoFillChainGateNote(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Draft Note' : '生成备注' }}
                    </el-button>
                    <el-button size="small" @click="copyChainGateBlockers(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Copy Blockers' : '复制阻塞项' }}
                    </el-button>
                    <el-button size="small" @click="openCloseDesk(row.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Close Desk' : '关账台' }}
                    </el-button>
                    <el-button size="small" @click="openClosedLoopDesk(row.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Closed Loop Desk' : '闭环台' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.topRisk?.recordId && !row.topRiskQuery" @click="openChainTopRisk(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.financialTraceSummary.topRiskRecordId" @click="openChainTraceDocuments(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Documents' : '文档' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.financialTraceSummary.topRiskRecordId" @click="openChainTraceTimeline(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Timeline' : '时间轴' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.enabled" @click="openChainWorkbench(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Open Rehearsal' : '打开演练' }}
                    </el-button>
                  </div>
                </article>
              </div>

              <h2
                :ref="(el) => registerCutoverSection('close', el)"
                class="group-title secondary-title"
              >
                {{ preferencesStore.language === 'en-US' ? 'Role + Close Desk' : '责任与关账台' }}
              </h2>
              <p class="group-intro">
                {{ preferencesStore.language === 'en-US'
                  ? 'Merge owners, gates, settlement, financial trace, and closed-loop evidence into one close cockpit before wider pilot cutover.'
                  : '把负责人、门槛、结算、财务追溯和闭环证据合并到一个关账驾驶台，再决定是否扩大试点切换。' }}
              </p>
              <div class="gate-pressure-summary">
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Close-Ready Chains' : '关账就绪链路' }}</span>
                  <strong>{{ closeDeskSummary.readyChains }}/{{ chainOpsRows.length }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Chains already ready across gates, settlement, trace, and close evidence.' : '门槛、结算、追溯和闭环证据都已齐备的链路。' }}</p>
                </article>
                <article class="gate-pressure-card warning">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Close Blockers' : '关账阻塞项' }}</span>
                  <strong>{{ closeDeskSummary.blockerCount }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Use this count as the single blocker number before widening pilot traffic.' : '扩大试点流量前，优先看这个统一阻塞数量。' }}</p>
                </article>
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Close-Ready Modules' : '关账就绪模块' }}</span>
                  <strong>{{ closeDeskSummary.readyModules }}/{{ moduleCloseRows.length }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Modules whose close cockpit no longer depends on scattered manual follow-up.' : '不再依赖零散人工补记的模块关账工作台。' }}</p>
                </article>
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Finance-Ready Modules' : '财务驾驶舱就绪模块' }}</span>
                  <strong>{{ closeDeskSummary.financeReadyModules }}/{{ closeDeskSummary.financeScopedModules }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Modules whose finance cockpit is already stable enough for broader close traffic.' : '财务驾驶舱已经稳定到可以承接更多关账流量的模块。' }}</p>
                </article>
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Role-Ready Chains' : '责任就绪链路' }}</span>
                  <strong>{{ closeDeskSummary.roleReadyChains }}/{{ chainOpsRows.length }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Chains whose owner, fallback, reviewer, and sign-off lanes are already coherent.' : '负责人、回退、复核和签收链已经连贯的链路。' }}</p>
                </article>
                <article class="gate-pressure-card">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Role-Ready Modules' : '责任就绪模块' }}</span>
                  <strong>{{ closeDeskSummary.roleReadyModules }}/{{ moduleCloseRows.length }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Modules whose role desk no longer depends on scattered manual handoff notes.' : '不再依赖零散人工交接备注的模块责任台。' }}</p>
                </article>
                <article class="gate-pressure-card danger">
                  <span>{{ preferencesStore.language === 'en-US' ? 'Blocked Modules' : '阻塞模块' }}</span>
                  <strong>{{ closeDeskSummary.blockedModules }}</strong>
                  <p>{{ preferencesStore.language === 'en-US' ? 'Modules still carrying blocker density high enough to delay expansion.' : '仍然带着较高阻塞密度、不宜扩围的模块。' }}</p>
                </article>
              </div>
              <div class="chain-handoff-grid">
                <article
                  v-for="row in chainOpsRows"
                  :key="`close-${row.key}`"
                  class="chain-handoff-card ops-card"
                >
                  <div class="chain-handoff-head">
                    <div>
                      <strong>{{ row.label }}</strong>
                      <p>{{ row.modulesLabel }}</p>
                    </div>
                    <el-tag :type="row.closeSummary.tone" effect="plain">
                      {{ row.closeSummary.label }}
                    </el-tag>
                  </div>
                  <div class="chain-owner-grid">
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Owner' : '负责人' }}</span>
                      <strong>{{ row.owner }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Fallback' : '回退负责人' }}</span>
                      <strong>{{ row.fallbackOwner }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Rehearsal' : '演练负责人' }}</span>
                      <strong>{{ row.rehearsalOwner }}</strong>
                    </div>
                    <div>
                      <span>{{ preferencesStore.language === 'en-US' ? 'Confirmation' : '试点确认负责人' }}</span>
                      <strong>{{ row.pilotConfirmOwner }}</strong>
                    </div>
                  </div>
                  <div class="pending-gate-list gate-pressure-list">
                    <span :class="`tone-${row.closeSummary.tone}`">
                      {{ preferencesStore.language === 'en-US' ? 'Close' : '关账' }} · {{ row.closeSummary.label }}
                    </span>
                    <span :class="`tone-${row.closedLoopSummary.tone}`">
                      {{ preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环' }} · {{ row.closedLoopSummary.label }}
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
                  <p class="gate-blocker-note">{{ row.closeSummary.lines.join(' · ') }}</p>
                  <p class="gate-blocker-note">
                    {{ preferencesStore.language === 'en-US' ? 'Checklist' : '关账清单' }}:
                    {{ summarizeCloseChecklist(row.closeChecklist, preferencesStore.language === 'en-US') }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ row.closeChecklist.map((item) => `${item.label}: ${item.description}`).join(' · ') }}
                  </p>
                  <p class="gate-blocker-note">{{ describeClosedLoopSummary(row.closedLoopSummary) }}</p>
                  <p class="gate-blocker-note">{{ describeSettlementSummary(row.settlementSummary) }}</p>
                  <p v-if="row.financeCockpitSummary.enabled" class="gate-blocker-note">{{ describeFinanceCockpitSummary(row.financeCockpitSummary) }}</p>
                  <p class="gate-blocker-note">{{ describeRoleDeskSummary(row.roleDeskSummary) }}</p>
                  <p class="gate-blocker-note">{{ describeFinancialTraceSummary(row.financialTraceSummary) }}</p>
                  <p
                    v-for="line in row.closeActivityLines"
                    :key="`${row.key}-${line}`"
                    class="gate-blocker-note"
                  >
                    {{ line }}
                  </p>
                  <p v-if="row.blockerLabels.length" class="gate-blocker-note">
                    {{ preferencesStore.language === 'en-US' ? 'Suggested blockers' : '建议阻塞项' }}:
                    {{ row.blockerLabels.join(' / ') }}
                  </p>
                  <div class="chain-actions">
                    <el-button size="small" :disabled="!row.enabled" @click="openChainWorkbench(row, 'ops-close')">
                      {{ preferencesStore.language === 'en-US' ? 'Open Close Desk' : '打开关账台' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.enabled" @click="openChainWorkbench(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Open Rehearsal' : '打开演练' }}
                    </el-button>
                    <el-button size="small" @click="openClosedLoopDesk(row.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Closed Loop Desk' : '闭环台' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.topRisk?.recordId && !row.topRiskQuery" @click="openChainTopRisk(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Top Risk' : '最高风险' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.financialTraceSummary.topRiskRecordId" @click="openChainTraceDocuments(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Documents' : '文档' }}
                    </el-button>
                    <el-button size="small" :disabled="!row.financialTraceSummary.topRiskRecordId" @click="openChainTraceTimeline(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Timeline' : '时间轴' }}
                    </el-button>
                  </div>
                </article>
              </div>
              <div class="chain-handoff-grid">
                <article
                  v-for="row in moduleCloseRows"
                  :key="`module-close-${row.moduleKey}`"
                  class="chain-handoff-card gate-card"
                >
                  <div class="chain-handoff-head">
                    <div>
                      <strong>{{ row.title }}</strong>
                      <p>{{ row.chainLabels || row.chains }}</p>
                    </div>
                    <el-tag :type="row.closeSummary.tone" effect="plain">
                      {{ row.closeSummary.label }}
                    </el-tag>
                  </div>
                  <div class="pending-gate-list gate-pressure-list">
                    <span :class="`tone-${row.closeSummary.tone}`">
                      {{ preferencesStore.language === 'en-US' ? 'Close' : '关账' }} · {{ row.closeSummary.label }}
                    </span>
                    <span :class="`tone-${row.closedLoopSummary.tone}`">
                      {{ preferencesStore.language === 'en-US' ? 'Closed Loop' : '闭环' }} · {{ row.closedLoopSummary.label }}
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
                  <p class="gate-blocker-note">{{ row.closeSummary.lines.join(' · ') }}</p>
                  <p class="gate-blocker-note">
                    {{ preferencesStore.language === 'en-US' ? 'Checklist' : '关账清单' }}:
                    {{ row.closeChecklistLabel }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ row.closeChecklist.map((item) => `${item.label}: ${item.description}`).join(' · ') }}
                  </p>
                  <p class="gate-blocker-note">{{ describeSettlementSummary(row.settlementSummary) }}</p>
                  <p v-if="row.financeCockpitSummary.enabled" class="gate-blocker-note">{{ describeFinanceCockpitSummary(row.financeCockpitSummary) }}</p>
                  <p class="gate-blocker-note">{{ describeRoleDeskSummary(row.roleDeskSummary) }}</p>
                  <p class="gate-blocker-note">{{ describeFinancialTraceSummary(row.financialTraceSummary) }}</p>
                  <p v-if="row.closeRoleSnapshot" class="gate-blocker-note">
                    {{ preferencesStore.language === 'en-US'
                      ? `Reviewer ${row.closeRoleSnapshot.reviewer} · Finance ${row.closeRoleSnapshot.financeOwner} · Company ${row.closeRoleSnapshot.companyLabel}`
                      : `复核 ${row.closeRoleSnapshot.reviewer} · 财务 ${row.closeRoleSnapshot.financeOwner} · 公司 ${row.closeRoleSnapshot.companyLabel}` }}
                  </p>
                  <p
                    v-for="line in row.closeActivityLines"
                    :key="`${row.moduleKey}-${line}`"
                    class="gate-blocker-note"
                  >
                    {{ line }}
                  </p>
                  <p v-if="row.blockerLabels.length" class="gate-blocker-note">
                    {{ preferencesStore.language === 'en-US' ? 'Suggested blockers' : '建议阻塞项' }}:
                    {{ row.blockerLabels.join(' / ') }}
                  </p>
                  <div class="chain-actions">
                    <el-button size="small" :disabled="!row.enabled" @click="openModuleCloseDesk(row.moduleKey)">
                      {{ preferencesStore.language === 'en-US' ? 'Open Close Desk' : '打开关账台' }}
                    </el-button>
                    <el-button size="small" @click="openCloseDesk(row.chainSummaries[0]?.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Chain Close' : '链路关账' }}
                    </el-button>
                    <el-button size="small" @click="openClosedLoopDesk(row.chainSummaries[0]?.key)">
                      {{ preferencesStore.language === 'en-US' ? 'Closed Loop Desk' : '闭环台' }}
                    </el-button>
                  </div>
                </article>
              </div>

              <SummaryCardGrid class="governance-summary-grid" :items="cutoverGovernanceDeskCards">
                <template #actions="{ item }">
                  <el-button size="small" @click="focusGovernanceDeskCard(item)">
                    {{ preferencesStore.language === 'en-US' ? 'Go To Section' : '定位分区' }}
                  </el-button>
                  <el-button size="small" type="primary" @click="toggleGovernanceDeskCard(item)">
                    {{ governanceDeskCardExpanded(item)
                      ? (preferencesStore.language === 'en-US' ? 'Collapse' : '收起')
                      : (preferencesStore.language === 'en-US' ? 'Expand' : '展开') }}
                  </el-button>
                </template>
              </SummaryCardGrid>

              <h2
                :ref="(el) => registerCutoverSection('roleDesk', el)"
                class="group-title secondary-title"
              >
                {{ preferencesStore.language === 'en-US' ? 'Role Desk Queue' : '责任待办台' }}
              </h2>
              <p class="group-intro">
                {{ preferencesStore.language === 'en-US'
                  ? 'Group role ownership by owner, reviewer, finance, sign-off, and fallback lanes so close accountability becomes actionable instead of staying inside exports.'
                  : '按负责人、复核、财务、签收和回退链路聚合责任待办，让关账责任从导出包里的文本变成可直接点击的操作台。' }}
              </p>
              <CompactNoticeBar
                v-if="!governancePanelExpanded('roleDesk')"
                :message="preferencesStore.language === 'en-US'
                  ? 'Role desk queue is collapsed by default once the summary card is visible. Expand only when operators need to claim, assign, or block grouped ownership lanes.'
                  : '责任待办台在摘要卡可见后默认收起，只有需要认领、指派或阻塞责任链时再展开。'"
              />
              <RoleDeskQueuePanel
                v-else
                :title="preferencesStore.language === 'en-US' ? 'Cutover Role Desk Queue' : '切换责任待办台'"
                :description="preferencesStore.language === 'en-US'
                  ? 'Use one desk to inspect grouped ownership lanes, then jump to handoff, close, and document review.'
                  : '在一个台面里查看聚合责任链，并直接跳到交接、关账和文档复核入口。'"
                :rows="settingsRoleDeskPanelRows"
                :english="preferencesStore.language === 'en-US'"
              />

              <h2
                :ref="(el) => registerCutoverSection('financeBatch', el)"
                class="group-title secondary-title"
              >
                {{ preferencesStore.language === 'en-US' ? 'Finance Close Batch Desk' : '财务关账批量台' }}
              </h2>
              <p class="group-intro">
                {{ preferencesStore.language === 'en-US'
                  ? 'Keep finance close, settlement, trace, and reconcile actions on one governance surface before pilot traffic expands.'
                  : '在扩大试点流量前，把财务关账、结算、追溯和对账动作固定在同一治理台面里。' }}
              </p>
              <CompactNoticeBar
                v-if="!governancePanelExpanded('financeBatch')"
                :message="preferencesStore.language === 'en-US'
                  ? 'Finance close batch desk is collapsed until operators need close review, settlement, or reconcile actions.'
                  : '财务关账批量台默认收起，只有需要关账复核、结算或对账时再展开。'"
              />
              <FinanceCloseBatchPanel
                v-else
                :title="preferencesStore.language === 'en-US' ? 'Cutover Finance Close Batch' : '切换财务关账批量台'"
                :description="preferencesStore.language === 'en-US'
                  ? 'Open close desks, settlement desks, finance cockpits, and reconcile lanes without leaving settings.'
                  : '不离开设置页，直接打开关账台、结算台、财务驾驶舱和对账链路。'"
                :rows="settingsFinanceBatchRows"
                :english="preferencesStore.language === 'en-US'"
              />

              <h2 class="group-title secondary-title">{{ preferencesStore.language === 'en-US' ? 'Risk Density' : '风险密度' }}</h2>
              <CompactNoticeBar
                v-if="!governancePanelExpanded('riskStats')"
                :message="preferencesStore.language === 'en-US'
                  ? 'Risk density panel stays collapsed by default because operators only need it when re-evaluating pilot scope.'
                  : '风险密度面板默认收起，因为只有在重新评估试点范围时才需要完整展开。'"
              />
              <PilotRiskStatsPanel
                v-else
                :title="preferencesStore.language === 'en-US' ? 'Cutover Risk Stats' : '切换风险统计'"
                :description="preferencesStore.language === 'en-US'
                  ? 'Review chain-level and module-level reminder density before changing pilot scope.'
                  : '在调整试点范围前，先核对链路级和模块级的提醒密度。'"
                :rows="cutoverRiskRows"
              />

              <h2 class="group-title secondary-title">{{ preferencesStore.language === 'en-US' ? 'Batch Review Desk' : '批处理核对台' }}</h2>
              <CompactNoticeBar
                v-if="!governancePanelExpanded('batchReview')"
                :message="preferencesStore.language === 'en-US'
                  ? 'Batch review desk is collapsed until operators need exception exports, rollback review bundles, or scope-level trace packets.'
                  : '批处理核对台默认收起，只有需要异常导出、回退核对包或范围级追溯包时再展开。'"
              />
              <PilotBatchActionPanel
                v-else
                :title="preferencesStore.language === 'en-US' ? 'Cutover Batch Actions' : '切换批处理'"
                :description="preferencesStore.language === 'en-US'
                  ? 'Export scope exceptions, jump to top-risk records, and prepare rollback reviews before changing pilot scope.'
                  : '在调整试点范围前，直接导出范围异常、跳到最高风险记录并准备回退核对。'"
                :rows="cutoverRiskRows"
              />

              <h2
                :ref="(el) => registerCutoverSection('ops', el)"
                class="group-title secondary-title"
              >
                {{ preferencesStore.language === 'en-US' ? 'Rollback Closed Loop' : '回退闭环台' }}
              </h2>
              <p class="group-intro">
                {{ preferencesStore.language === 'en-US'
                  ? 'Record the latest rollback drill, pilot sign-off, and exception export per chain so cutover evidence is not reduced to plain toggles.'
                  : '按链路记录最近一次回退演练、试点签收和异常导出，避免切换证据只剩开关和备注。' }}
              </p>
              <div class="ops-summary-groups">
                <section class="ops-summary-group">
                  <div class="ops-summary-group__header">
                    <strong>{{ preferencesStore.language === 'en-US' ? 'Closed-Loop Posture' : '闭环态势' }}</strong>
                    <p>{{ preferencesStore.language === 'en-US' ? 'Keep rollback drill, sign-off, and chain-readiness metrics together so the settings page reads like an operations console instead of a spreadsheet.' : '把回退演练、签收和链路就绪度放到一组，避免设置页像没有层级的表格。' }}</p>
                  </div>
                  <div class="gate-pressure-summary">
                    <article
                      v-for="item in cutoverOpsPrimaryCards"
                      :key="item.key"
                      class="gate-pressure-card"
                      :class="{ warning: item.tone === 'warning' }"
                    >
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                      <p>{{ item.description }}</p>
                    </article>
                  </div>
                </section>
                <section class="ops-summary-group governance">
                  <div class="ops-summary-group__header">
                    <strong>{{ preferencesStore.language === 'en-US' ? 'Governance Pressure' : '治理压力' }}</strong>
                    <p>{{ preferencesStore.language === 'en-US' ? 'Separate SLA pressure and finance close objects from rollback posture so operators can scan responsibility issues without losing the cutover picture.' : '把 SLA 压力和财务关账对象从回退闭环里拆出来，方便单独扫责任问题。' }}</p>
                  </div>
                  <div class="gate-pressure-summary">
                    <article
                      v-for="item in cutoverOpsGovernanceCards"
                      :key="item.key"
                      class="gate-pressure-card"
                      :class="{ warning: item.tone === 'warning' }"
                    >
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                      <p>{{ item.description }}</p>
                    </article>
                  </div>
                </section>
              </div>
              <CompactNoticeBar
                inline
                :message="governancePanelExpanded('closedLoopRows')
                  ? (preferencesStore.language === 'en-US'
                    ? 'Rollback closed-loop rows are expanded. Collapse them once the current drill, sign-off, and exception export review is complete.'
                    : '回退闭环链路明细已展开，当前演练、签收和异常导出核对完成后可以再次收起。')
                  : (preferencesStore.language === 'en-US'
                    ? 'Rollback closed-loop rows are collapsed by default. Operators expand them only when they need to record drill, sign-off, or export evidence on a specific chain.'
                    : '回退闭环链路明细默认收起，只有需要记录演练、签收或导出某条链路证据时再展开。')"
              >
                <template #actions>
                  <el-button link type="primary" @click="toggleGovernancePanel('closedLoopRows')">
                    {{ governancePanelExpanded('closedLoopRows')
                      ? (preferencesStore.language === 'en-US' ? 'Collapse Closed-Loop Rows' : '收起闭环明细')
                      : (preferencesStore.language === 'en-US' ? 'Expand Closed-Loop Rows' : '展开闭环明细') }}
                  </el-button>
                </template>
              </CompactNoticeBar>
              <div v-if="governancePanelExpanded('closedLoopRows')" class="chain-handoff-grid">
                <article
                  v-for="row in chainOpsRows"
                  :key="`ops-${row.key}`"
                  class="chain-handoff-card ops-card"
                >
                  <div class="chain-handoff-head">
                    <div>
                      <strong>{{ row.label }}</strong>
                      <p>{{ row.modulesLabel }}</p>
                    </div>
                    <el-tag :type="row.closedLoopSummary.tone" effect="plain">
                      {{ row.closedLoopSummary.label }}
                    </el-tag>
                  </div>
                  <div class="ops-record-grid">
                    <div class="ops-record-card">
                      <span>{{ preferencesStore.language === 'en-US' ? 'Latest Drill' : '最近演练' }}</span>
                      <strong>{{ resolveRollbackDrillLabel(row.latestDrill?.status) }}</strong>
                      <p>
                        {{ row.latestDrill
                          ? `${row.latestDrill.owner || row.rehearsalOwner} · ${formatDateTime(row.latestDrill.createdAt)}`
                          : (preferencesStore.language === 'en-US' ? 'No rollback drill recorded yet.' : '还没有回退演练记录。') }}
                      </p>
                    </div>
                    <div class="ops-record-card">
                      <span>{{ preferencesStore.language === 'en-US' ? 'Latest Sign-off' : '最近签收' }}</span>
                      <strong>{{ resolvePilotSignoffLabel(row.latestSignoff?.decision) }}</strong>
                      <p>
                        {{ row.latestSignoff
                          ? `${row.latestSignoff.owner || row.pilotConfirmOwner} · ${formatDateTime(row.latestSignoff.createdAt)}`
                          : (preferencesStore.language === 'en-US' ? 'No pilot sign-off recorded yet.' : '还没有试点签收记录。') }}
                      </p>
                    </div>
                    <div class="ops-record-card">
                      <span>{{ preferencesStore.language === 'en-US' ? 'Exception Exports' : '异常导出' }}</span>
                      <strong>{{ row.exceptionExportCount }}</strong>
                      <p>
                        {{ row.latestExceptionExport
                          ? `${row.latestExceptionExport.filename} · ${row.latestExceptionExport.rowCount}`
                          : (preferencesStore.language === 'en-US' ? 'No chain exception export recorded yet.' : '还没有链路异常导出记录。') }}
                      </p>
                    </div>
                  </div>
                  <p class="gate-blocker-note">
                    {{ describeClosedLoopSummary(row.closedLoopSummary) }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ describeSettlementSummary(row.settlementSummary) }}
                  </p>
                  <p v-if="row.financeCockpitSummary.enabled" class="gate-blocker-note">
                    {{ describeFinanceCockpitSummary(row.financeCockpitSummary) }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ describeFinancialTraceSummary(row.financialTraceSummary) }}
                  </p>
                  <p class="gate-blocker-note">
                    {{ preferencesStore.language === 'en-US' ? 'Current blockers' : '当前阻塞项' }}:
                    {{ row.blockerLabels.join(' / ') || '-' }}
                  </p>
                  <div class="chain-actions">
                    <el-button size="small" type="success" @click="recordRollbackDrill(row, 'passed')">
                      {{ preferencesStore.language === 'en-US' ? 'Record Drill Pass' : '记录演练通过' }}
                    </el-button>
                    <el-button size="small" type="warning" @click="recordRollbackDrill(row, 'blocked')">
                      {{ preferencesStore.language === 'en-US' ? 'Record Drill Block' : '记录演练阻塞' }}
                    </el-button>
                    <el-button size="small" type="primary" @click="recordPilotSignoff(row, 'go')">
                      {{ preferencesStore.language === 'en-US' ? 'Record Go Sign-off' : '记录放行签收' }}
                    </el-button>
                    <el-button size="small" @click="recordPilotSignoff(row, 'hold')">
                      {{ preferencesStore.language === 'en-US' ? 'Record Hold' : '记录暂缓' }}
                    </el-button>
                    <el-button size="small" type="danger" @click="recordPilotSignoff(row, 'rollback')">
                      {{ preferencesStore.language === 'en-US' ? 'Record Rollback' : '记录回退决定' }}
                    </el-button>
                    <el-button size="small" @click="exportChainExceptions(row)">
                      {{ preferencesStore.language === 'en-US' ? 'Export Chain Exceptions' : '导出链路异常' }}
                    </el-button>
                  </div>
                </article>
              </div>
              <div class="cutover-actions">
                <el-button @click="exportCutoverOpsLedger">
                  {{ preferencesStore.language === 'en-US' ? 'Export Closed-Loop Ledger' : '导出闭环台账' }}
                </el-button>
              </div>

              <h2 class="group-title secondary-title">{{ preferencesStore.language === 'en-US' ? 'Local Review State' : '本地审核状态' }}</h2>
              <div class="setting-card">
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ preferencesStore.language === 'en-US' ? 'Triaged Reminders' : '已处理提醒' }}</div>
                    <div class="setting-desc">
                      {{ preferencesStore.language === 'en-US'
                        ? 'Reviewed reminders, role desk tasks, and finance batch reviews are stored locally in this Electron client and travel with the shared cutover snapshot.'
                        : '已核对提醒、责任台任务和财务批量复核记录都会保存在当前 Electron 客户端本地，并随共享切换快照一起流转。' }}
                    </div>
                  </div>
                  <div class="setting-action action-stack">
                    <div class="inline-actions">
                      <el-tag effect="plain">{{ preferencesStore.language === 'en-US' ? 'Reviewed' : '已核对' }} {{ pilotReviewStore.reviewedCount }}</el-tag>
                      <el-tag effect="plain" type="warning">{{ preferencesStore.language === 'en-US' ? 'Snoozed' : '稍后处理' }} {{ pilotReviewStore.snoozedCount }}</el-tag>
                      <el-tag effect="plain" type="success">{{ preferencesStore.language === 'en-US' ? 'Role Tasks' : '责任任务' }} {{ cutoverOpsStore.roleDeskTaskCount }}</el-tag>
                      <el-tag effect="plain" type="info">{{ preferencesStore.language === 'en-US' ? 'Finance Reviews' : '财务复核' }} {{ cutoverOpsStore.financeBatchReviewCount }}</el-tag>
                    </div>
                    <el-button size="small" @click="clearPilotReviewState">
                      {{ preferencesStore.language === 'en-US' ? 'Clear Local Review State' : '清空本地审核状态' }}
                    </el-button>
                  </div>
                </div>
              </div>

              <h2 class="group-title secondary-title">{{ preferencesStore.language === 'en-US' ? 'Module Overrides' : '模块覆盖' }}</h2>
              <div class="setting-card">
                <div v-for="(row, index) in firstWaveModuleRows" :key="row.moduleKey">
                  <div class="setting-row">
                    <div class="setting-info">
                      <div class="setting-name">{{ row.title }}</div>
                      <div class="setting-desc">{{ row.chains }}</div>
                      <div class="module-override-meta">
                        <span>{{ preferencesStore.language === 'en-US' ? 'Stages' : '阶段' }}: {{ row.stageCount }}</span>
                        <span>{{ preferencesStore.language === 'en-US' ? 'Required Evidence' : '必备证据' }}: {{ row.evidence.requiredLabels.join(' / ') || '-' }}</span>
                        <span>{{ preferencesStore.language === 'en-US' ? 'Recommended Upload' : '推荐上传' }}: {{ row.evidence.recommendedLabel }}</span>
                        <span
                          v-for="chain in row.chainSummaries"
                          :key="`${row.moduleKey}-${chain.key}`"
                          :class="`tone-${chain.summary.tone}`"
                        >
                          {{ chain.label }} · {{ chain.summary.label }}
                        </span>
                      </div>
                      <div class="module-evidence-hint">{{ row.evidence.timelineHint }}</div>
                    </div>
                    <div class="setting-action action-stack">
                      <el-tag :type="row.enabled ? 'success' : 'info'" effect="plain">
                        {{ row.enabled ? (preferencesStore.language === 'en-US' ? 'Enabled' : '已启用') : (preferencesStore.language === 'en-US' ? 'Disabled' : '已关闭') }}
                      </el-tag>
                      <div class="inline-actions">
                        <el-button size="small" @click="setModuleCutover(row.moduleKey, !row.enabled)">
                          {{ row.enabled ? (preferencesStore.language === 'en-US' ? 'Disable' : '关闭') : (preferencesStore.language === 'en-US' ? 'Enable' : '启用') }}
                        </el-button>
                        <el-button v-if="row.overridden" size="small" @click="clearModuleCutover(row.moduleKey)">
                          {{ preferencesStore.language === 'en-US' ? 'Use Chain Default' : '恢复链路默认' }}
                        </el-button>
                      </div>
                    </div>
                  </div>
                  <div v-if="index < firstWaveModuleRows.length - 1" class="setting-divider"></div>
                </div>
              </div>

              <h2
                :ref="(el) => registerCutoverSection('import', el)"
                class="group-title secondary-title"
              >
                {{ preferencesStore.language === 'en-US' ? 'Config Snapshot Import' : '配置快照导入' }}
              </h2>
              <div class="setting-card">
                <div class="setting-row align-start">
                  <div class="setting-info">
                    <div class="setting-name">{{ preferencesStore.language === 'en-US' ? 'Paste Cutover JSON' : '粘贴切换 JSON' }}</div>
                    <div class="setting-desc">
                      {{ preferencesStore.language === 'en-US'
                        ? 'Restore chain switches, module overrides, and owner contacts from a previously exported cutover config snapshot.'
                        : '从之前导出的切换配置快照恢复链路开关、模块覆盖和负责人联系人。' }}
                    </div>
                  </div>
                  <div class="setting-action action-stack">
                    <input
                      ref="cutoverConfigFileInput"
                      type="file"
                      class="hidden-file-input"
                      accept=".json,application/json,text/plain"
                      @change="handleCutoverConfigFileChange"
                    />
                    <el-input
                      v-model="cutoverConfigDraft"
                      type="textarea"
                      :rows="6"
                      class="wide-action"
                      :placeholder="preferencesStore.language === 'en-US' ? 'Paste exported JSON here' : '在这里粘贴导出的 JSON'"
                    />
                    <div v-if="cutoverConfigFileName" class="import-file-label">
                      {{ preferencesStore.language === 'en-US' ? 'Loaded File' : '已载入文件' }}: {{ cutoverConfigFileName }}
                    </div>
                    <div v-if="cutoverConfigDraftError" class="import-error">
                      {{ cutoverConfigDraftError }}
                    </div>
                    <div v-else-if="importedCutoverSummary.length" class="import-summary-grid">
                      <article v-for="item in importedCutoverSummary" :key="item.label" class="import-summary-card">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.value }}</strong>
                        <p>{{ item.description }}</p>
                      </article>
                    </div>
                    <div class="inline-actions">
                      <el-button @click="openCutoverConfigFilePicker">
                        {{ preferencesStore.language === 'en-US' ? 'Load File' : '载入文件' }}
                      </el-button>
                      <el-button @click="clearCutoverConfigDraft">
                        {{ preferencesStore.language === 'en-US' ? 'Clear Draft' : '清空草稿' }}
                      </el-button>
                      <el-button type="primary" :disabled="Boolean(cutoverConfigDraftError)" @click="importCutoverConfigSnapshot">
                        {{ preferencesStore.language === 'en-US' ? 'Import Config' : '导入配置' }}
                      </el-button>
                    </div>
                    <div class="inline-actions">
                      <el-button :disabled="!hasLastCutoverBackup" @click="restoreLastCutoverBackup">
                        {{ preferencesStore.language === 'en-US' ? 'Restore Last Backup' : '恢复最近备份' }}
                      </el-button>
                      <el-button :disabled="!hasLastCutoverBackup" @click="exportLastCutoverBackup">
                        {{ preferencesStore.language === 'en-US' ? 'Export Last Backup' : '导出最近备份' }}
                      </el-button>
                    </div>
                    <div class="import-file-label">
                      {{ cutoverRemoteStatus }}
                    </div>
                    <div v-if="cutoverRemoteDirty" class="import-error">
                      {{ preferencesStore.language === 'en-US' ? 'Unsaved shared-snapshot changes are present on this client.' : '当前客户端存在尚未写回共享快照的切换变更。' }}
                    </div>
                    <div class="inline-actions">
                      <el-button :loading="cutoverRemoteStore.remoteLoading" @click="loadCutoverConfigFromServer(true)">
                        {{ preferencesStore.language === 'en-US' ? 'Load Server Snapshot' : '载入服务端快照' }}
                      </el-button>
                      <el-button :type="cutoverRemoteDirty ? 'primary' : 'primary'" :plain="!cutoverRemoteDirty" :loading="cutoverRemoteStore.remoteSaving" @click="saveCutoverConfigToServer(true)">
                        {{ preferencesStore.language === 'en-US' ? 'Save To Server' : '保存到服务端' }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="cutover-actions">
                <el-button @click="exportCutoverExceptions">
                  {{ preferencesStore.language === 'en-US' ? 'Export Exception List' : '导出异常清单' }}
                </el-button>
                <el-button @click="exportAllChainRunbooks">
                  {{ preferencesStore.language === 'en-US' ? 'Export Chain Runbooks' : '导出链路手册' }}
                </el-button>
                <el-button @click="exportPilotUserManualPack">
                  {{ preferencesStore.language === 'en-US' ? 'Export User Manual' : '导出用户手册' }}
                </el-button>
                <el-button @click="exportPilotConfirmationTemplate">
                  {{ preferencesStore.language === 'en-US' ? 'Export Confirmation' : '导出确认模板' }}
                </el-button>
                <el-button @click="exportAllChainGatePackets">
                  {{ preferencesStore.language === 'en-US' ? 'Export Gate Packets' : '导出门槛包' }}
                </el-button>
                <el-button @click="exportCutoverBlockerPacket">
                  {{ preferencesStore.language === 'en-US' ? 'Export Blocker Packet' : '导出阻塞包' }}
                </el-button>
                <el-button @click="exportCutoverControlPacket">
                  {{ preferencesStore.language === 'en-US' ? 'Export Control Packet' : '导出控制包' }}
                </el-button>
                <el-button @click="focusCutoverTargetBySection('roleDesk')">
                  {{ preferencesStore.language === 'en-US' ? 'Open Role Desk' : '打开责任台' }}
                </el-button>
                <el-button @click="focusCutoverTargetBySection('financeBatch')">
                  {{ preferencesStore.language === 'en-US' ? 'Open Finance Batch' : '打开财务批量台' }}
                </el-button>
                <el-button @click="exportRoleDeskQueuePacket">
                  {{ preferencesStore.language === 'en-US' ? 'Export Role Queue' : '导出责任待办包' }}
                </el-button>
                <el-button @click="copyRoleDeskQueuePacket">
                  {{ preferencesStore.language === 'en-US' ? 'Copy Role Queue' : '复制责任待办包' }}
                </el-button>
                <el-button @click="exportFinanceCloseBatchPacket">
                  {{ preferencesStore.language === 'en-US' ? 'Export Finance Batch' : '导出财务关账批处理包' }}
                </el-button>
                <el-button @click="copyFinanceCloseBatchPacket">
                  {{ preferencesStore.language === 'en-US' ? 'Copy Finance Batch' : '复制财务关账批处理包' }}
                </el-button>
                <el-button @click="exportRollbackDrillPacket">
                  {{ preferencesStore.language === 'en-US' ? 'Export Rollback Drill' : '导出回退演练包' }}
                </el-button>
                <el-button @click="copyRollbackDrillPacket">
                  {{ preferencesStore.language === 'en-US' ? 'Copy Rollback Drill' : '复制回退演练包' }}
                </el-button>
                <el-button :loading="cutoverTraceBundleBusy" @click="exportSettingsTraceBundle">
                  {{ preferencesStore.language === 'en-US' ? 'Export Trace Bundle' : '导出追溯证据包' }}
                </el-button>
                <el-button :loading="cutoverTraceBundleBusy" @click="copySettingsTraceBundle">
                  {{ preferencesStore.language === 'en-US' ? 'Copy Trace Bundle' : '复制追溯证据包' }}
                </el-button>
                <el-button @click="exportGuardrailRulesPacket">
                  {{ preferencesStore.language === 'en-US' ? 'Export Guardrail Rules' : '导出 Guardrail 规则' }}
                </el-button>
                <el-button @click="copyGuardrailRulesPacket">
                  {{ preferencesStore.language === 'en-US' ? 'Copy Guardrail Rules' : '复制 Guardrail 规则' }}
                </el-button>
                <el-button @click="copyCutoverControlPacket">
                  {{ preferencesStore.language === 'en-US' ? 'Copy Control Packet' : '复制控制包' }}
                </el-button>
                <el-button @click="exportChainContactMatrix">
                  {{ preferencesStore.language === 'en-US' ? 'Export Contact Matrix' : '导出联系人矩阵' }}
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
                <el-button @click="openCutoverDashboard">
                  {{ preferencesStore.language === 'en-US' ? 'Open Review Dashboard' : '打开审核首页' }}
                </el-button>
                <el-button @click="restorePilotDefaults">
                  {{ preferencesStore.language === 'en-US' ? 'Restore Pilot Defaults' : '恢复试点默认配置' }}
                </el-button>
              </div>
            </section>

            <section v-else class="setting-group" key="advanced">
              <h2 class="group-title">{{ t('settings.advancedTitle') }}</h2>
              <div class="setting-card">
                <div v-for="row in envRows" :key="row.label" class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ row.label }}</div>
                    <div class="setting-desc">{{ row.value }}</div>
                  </div>
                  <div class="setting-action">
                    <el-tag effect="plain">{{ t('settings.running') }}</el-tag>
                  </div>
                </div>
              </div>

              <h2 class="group-title secondary-title">{{ preferencesStore.language === 'en-US' ? 'GPU Runtime' : 'GPU 运行状态' }}</h2>
              <div class="setting-card">
                <div v-for="row in gpuRows" :key="row.label" class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ row.label }}</div>
                    <div class="setting-desc">{{ row.value }}</div>
                  </div>
                  <div class="setting-action">
                    <el-tag effect="plain">{{ preferencesStore.language === 'en-US' ? 'Desktop' : '桌面端' }}</el-tag>
                  </div>
                </div>
              </div>

              <h2 class="group-title secondary-title">{{ preferencesStore.language === 'en-US' ? 'Desktop Runtime' : '桌面运行设置' }}</h2>
              <div class="setting-card">
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-name">{{ preferencesStore.language === 'en-US' ? 'Hardware Acceleration' : '硬件加速' }}</div>
                    <div class="setting-desc">
                      {{ preferencesStore.language === 'en-US'
                        ? 'Turn GPU acceleration on or off for the Electron shell. Restart the software after saving to apply the change.'
                        : '控制 Electron 壳层的 GPU 加速开关。保存后需要重启软件才会生效。' }}
                    </div>
                  </div>
                  <div class="setting-action">
                    <el-switch v-model="runtimeSettings.hardwareAcceleration" />
                  </div>
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row align-start">
                  <div class="setting-info">
                    <div class="setting-name">{{ preferencesStore.language === 'en-US' ? 'Restart Requirement' : '重启要求' }}</div>
                    <div class="setting-desc">
                      {{ hardwareAccelerationPending
                        ? (preferencesStore.language === 'en-US'
                            ? 'The saved hardware acceleration setting differs from the current running state. Restart the application to apply it.'
                            : '已保存的硬件加速设置和当前运行状态不同，需要重启应用后生效。')
                        : runtimeSettingsDirty
                          ? (preferencesStore.language === 'en-US'
                              ? 'The hardware acceleration draft has changed but is not saved yet.'
                              : '硬件加速草稿已变更，但还没有保存。')
                        : (preferencesStore.language === 'en-US'
                            ? 'Current runtime state already matches the saved hardware acceleration setting.'
                            : '当前运行状态已经与保存的硬件加速设置一致。') }}
                    </div>
                  </div>
                  <div class="setting-action action-stack">
                    <div class="inline-actions">
                      <el-button @click="saveRuntimeSettings">
                        {{ preferencesStore.language === 'en-US' ? 'Save Runtime Setting' : '保存运行设置' }}
                      </el-button>
                      <el-button type="warning" :disabled="!hardwareAccelerationPending" @click="restartDesktopApp">
                        {{ preferencesStore.language === 'en-US' ? 'Restart Application' : '重启应用' }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="status-grid">
                <div class="status-card">
                  <div class="status-label">{{ t('settings.brandLabel') }}</div>
                  <div class="status-value">{{ t('settings.brandValue') }}</div>
                  <div class="status-desc">{{ t('settings.brandDesc') }}</div>
                </div>
                <div class="status-card">
                  <div class="status-label">{{ t('settings.navLabel') }}</div>
                  <div class="status-value">{{ t('settings.navValue') }}</div>
                  <div class="status-desc">{{ t('settings.navDesc') }}</div>
                </div>
                <div class="status-card">
                  <div class="status-label">{{ t('settings.statusLabel') }}</div>
                  <div class="status-value">{{ t('settings.statusValue') }}</div>
                  <div class="status-desc">{{ t('settings.statusDesc') }}</div>
                </div>
                <div class="status-card">
                  <div class="status-label">{{ t('settings.systemLocaleLabel') }}</div>
                  <div class="status-value">{{ preferencesStore.systemLocale }}</div>
                  <div class="status-desc">{{ preferencesStore.systemLocale === 'zh-CN' ? t('app.languageChinese') : t('app.languageEnglish') }}</div>
                </div>
              </div>
            </section>
          </transition>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.settings-workspace { min-height: 100vh; background: var(--app-bg); display: flex; flex-direction: column; color: var(--app-text); }
.settings-header { padding: 40px 48px; border-bottom: 1px solid var(--app-border); }
.breadcrumb { font-size: 12px; color: var(--app-text-secondary); font-weight: 600; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px; }
.page-title { font-size: 32px; font-weight: 700; margin: 0; color: var(--app-text); letter-spacing: -0.5px; }
.subtitle { font-size: 14px; color: var(--app-text-secondary); margin-top: 12px; font-weight: 400; }

.settings-content { flex: 1; padding: 48px; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }
.settings-layout { display: flex; gap: 64px; align-items: flex-start; }

.settings-nav { width: 220px; display: flex; flex-direction: column; gap: 4px; }
.nav-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 16px;
  border-radius: 8px; cursor: pointer; color: var(--app-text); font-size: 14px; font-weight: 500;
  transition: all 0.2s ease;
}
.nav-item:hover { background: var(--app-hover); }
.nav-item.active { background: color-mix(in srgb, var(--app-primary) 10%, transparent); color: var(--app-primary); font-weight: 600; }

.settings-panel { flex: 1; min-width: 0; }
.setting-group { animation: fade-in 0.3s ease; }
.group-title { font-size: 20px; font-weight: 600; color: var(--app-text); margin: 0 0 24px; letter-spacing: -0.3px; }
.group-intro { margin: -10px 0 24px; color: var(--app-text-secondary); font-size: 13px; line-height: 1.6; }
.secondary-title { margin-top: 32px; }

.setting-card {
  background: var(--app-panel); border-radius: 12px; border: 1px solid var(--app-border);
  box-shadow: var(--app-card-shadow); overflow: hidden;
}

.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; gap: 24px; }
.setting-row.align-start { align-items: flex-start; }
.setting-info { display: flex; flex-direction: column; gap: 6px; }
.setting-name { font-size: 14px; font-weight: 600; color: var(--app-text); }
.setting-desc { font-size: 13px; color: var(--app-text-secondary); line-height: 1.4; max-width: 460px; }
.setting-divider { height: 1px; background: var(--app-border); margin: 0 32px; }
.slider-action { min-width: 320px; }
.custom-theme-row { align-items: flex-start; }
.theme-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 12px;
}
.theme-swatch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-muted-bg);
  color: var(--app-text);
  min-height: 52px;
  box-sizing: border-box;
}
.theme-swatch input {
  width: 44px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}
.theme-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
.wide-action { width: min(100%, 520px); }
.action-stack { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; min-width: min(100%, 520px); }
.inline-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.blocked-card { margin-bottom: 24px; }
.cutover-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
.handoff-loading { padding: 22px 28px; color: var(--app-text-secondary); font-size: 13px; }
.chain-handoff-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.chain-handoff-card {
  padding: 20px;
  border-radius: 14px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  box-shadow: var(--app-card-shadow);
}
.chain-handoff-card.disabled { opacity: 0.72; }
.chain-handoff-card.focused {
  border-color: color-mix(in srgb, var(--app-primary) 48%, var(--app-border));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--app-primary) 20%, transparent), var(--app-card-shadow);
}
.chain-handoff-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.chain-handoff-head strong { font-size: 15px; color: var(--app-text); }
.chain-handoff-head p,
.chain-top-risk { margin: 8px 0 0; color: var(--app-text-secondary); font-size: 12px; line-height: 1.5; }
.chain-owner-grid,
.chain-risk-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.chain-owner-grid div,
.chain-risk-grid div {
  padding: 12px;
  border-radius: 12px;
  background: var(--app-muted-bg);
  min-width: 0;
}
.chain-owner-grid span,
.chain-risk-grid span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 11px;
}
.chain-owner-grid strong,
.chain-risk-grid strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 13px;
  word-break: break-word;
}
.chain-reminder-badges {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chain-reminder-badges span {
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
.chain-reminder-badges span.tone-success,
.gate-pressure-list span.tone-success {
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
}
.chain-reminder-badges span.tone-danger,
.gate-pressure-list span.tone-danger {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}
.chain-gate-mini {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--app-primary) 7%, var(--app-panel));
}
.chain-gate-mini span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 11px;
}
.chain-gate-mini strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 15px;
}
.chain-gate-mini p {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
}
.chain-evidence-mini {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--app-primary) 5%, var(--app-panel));
  border: 1px solid color-mix(in srgb, var(--app-primary) 10%, transparent);
}
.chain-evidence-mini span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 11px;
}
.chain-evidence-mini strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 14px;
}
.chain-evidence-mini p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.chain-blocker-note,
.gate-blocker-note {
  margin: 12px 0 0;
  color: #d97706;
  font-size: 12px;
  line-height: 1.5;
}
.chain-evidence-tags {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chain-evidence-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
  font-size: 11px;
  font-weight: 700;
}
.chain-contact-editor {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.ops-record-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.ops-record-card {
  padding: 12px;
  border-radius: 12px;
  background: var(--app-muted-bg);
}
.ops-record-card span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 11px;
}
.ops-record-card strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 13px;
}
.ops-record-card p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}
.gate-card {
  gap: 14px;
}
.ops-summary-groups {
  display: grid;
  gap: 16px;
  margin-bottom: 18px;
}
.governance-summary-grid {
  margin: 18px 0;
}
.ops-summary-group {
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-muted-bg);
}
.ops-summary-group.governance {
  background: color-mix(in srgb, var(--app-primary) 5%, var(--app-muted-bg));
}
.ops-summary-group__header strong {
  display: block;
  color: var(--app-text);
  font-size: 14px;
}
.ops-summary-group__header p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.gate-pressure-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin: 14px 0 0;
}
.gate-pressure-card {
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--app-border);
  background: var(--app-panel);
  box-shadow: var(--app-card-shadow);
}
.gate-pressure-card span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.gate-pressure-card strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 22px;
}
.gate-pressure-card p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.gate-pressure-card.danger strong {
  color: #dc2626;
}
.gate-pressure-card.warning strong {
  color: #d97706;
}
.gate-check-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.gate-check-grid :deep(.el-checkbox) {
  margin-right: 0;
  min-height: 36px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--app-muted-bg);
}
.pending-gate-list,
.module-override-meta {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pending-gate-list span,
.module-override-meta span {
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
.pending-gate-list.gate-pressure-list span.tone-success {
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
}
.pending-gate-list.gate-pressure-list span.tone-danger {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}
.module-override-meta span:first-child {
  background: var(--app-muted-bg);
  color: var(--app-text-secondary);
}
.module-override-meta span.tone-success {
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
}
.module-override-meta span.tone-danger {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}
.module-evidence-hint {
  margin-top: 10px;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.chain-actions { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.hidden-file-input { display: none; }
.import-file-label {
  font-size: 12px;
  color: var(--app-text-secondary);
}
.import-error {
  width: min(100%, 520px);
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  font-size: 12px;
  line-height: 1.5;
}
.import-summary-grid {
  width: min(100%, 520px);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.import-summary-card {
  padding: 14px;
  border-radius: 14px;
  background: var(--app-muted-bg);
}
.import-summary-card span {
  display: block;
  color: var(--app-text-secondary);
  font-size: 11px;
}
.import-summary-card strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 18px;
}
.import-summary-card p {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.resolved-url {
  max-width: 520px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-muted-bg);
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}

.session-security-actions {
  align-items: flex-start;
}

.session-user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.session-form-grid {
  width: min(100%, 720px);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.session-security-hint {
  margin: 0;
  max-width: 720px;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.shortcut-capture {
  width: 220px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--app-border-strong);
  background: var(--app-muted-bg);
  color: var(--app-text);
  text-align: left;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.shortcut-capture:hover,
.shortcut-capture:focus-visible {
  border-color: var(--app-primary);
  outline: none;
}

.shortcut-capture.capturing {
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 10%, var(--app-muted-bg));
  color: var(--app-primary);
}

.modern-radio :deep(.el-radio-button__inner) {
  background: transparent; border: 1px solid var(--app-border-strong); border-radius: 6px !important;
  margin-right: 8px; font-weight: 500; box-shadow: none !important; color: var(--app-text);
}
.modern-radio :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: color-mix(in srgb, var(--app-primary) 8%, transparent); border-color: var(--app-primary); color: var(--app-primary);
}
.modern-radio :deep(.el-radio-button:first-child .el-radio-button__inner) { border-left: 1px solid var(--app-border-strong); }
.modern-radio :deep(.el-radio-button:last-child .el-radio-button__inner) { margin-right: 0; }

.status-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 24px; }
.status-card {
  background: var(--app-panel); border-radius: 12px; border: 1px solid var(--app-border);
  padding: 20px 22px; box-shadow: var(--app-card-shadow);
}
.status-label { font-size: 12px; color: var(--app-text-secondary); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; }
.status-value { font-size: 18px; font-weight: 700; color: var(--app-text); margin-top: 10px; }
.status-desc { font-size: 13px; color: var(--app-text-secondary); margin-top: 8px; line-height: 1.5; }

@keyframes fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(5px); }

@media (max-width: 1080px) {
  .settings-layout { flex-direction: column; gap: 24px; }
  .settings-nav { width: 100%; flex-direction: row; flex-wrap: wrap; }
  .status-grid { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .settings-content { padding: 24px; }
  .settings-header { padding: 28px 24px; }
  .setting-row { flex-direction: column; align-items: flex-start; }
  .setting-action { width: 100%; }
  .slider-action { min-width: 0; }
  .theme-grid { grid-template-columns: 1fr; }
  .theme-actions { justify-content: flex-start; }
  .wide-action,
  .action-stack { width: 100%; min-width: 0; align-items: flex-start; }
  .inline-actions,
  .cutover-actions,
  .chain-actions { justify-content: flex-start; }
  .chain-owner-grid,
  .chain-risk-grid,
  .ops-record-grid,
  .gate-check-grid,
  .import-summary-grid,
  .session-form-grid { grid-template-columns: 1fr; }
}
</style>
