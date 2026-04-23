import type { ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import type { ChainAcceptanceState, ChainContacts, PilotChainKey } from '@/stores/cutover'
import { buildModuleEvidenceExpectation } from '@/utils/first-wave-evidence'
import { buildChainFinancialTraceSummary, buildModuleFinancialTraceSummary } from '@/utils/financial-trace'
import { buildChainSettlementSummary, buildModuleSettlementSummary } from '@/utils/first-wave-settlement'
import { summarizeFirstWaveGateState } from '@/utils/first-wave-playbook'
import {
  buildReminderFamilyBadges,
  buildReminderFamilyBlockers,
  pickTopReminder,
} from '@/utils/reminders'
import {
  buildPaymentLinkageGovernanceSummary,
  buildQuantImpactGovernanceSummary,
} from '@/utils/cutover-governance'
import { buildCloseRoleSnapshot } from '@/utils/cutover-close-cockpit'
import {
  buildChainFinanceCockpitSummary,
  buildModuleFinanceCockpitSummary,
} from '@/utils/cutover-finance-cockpit'
import type {
  CutoverContactMatrixRow,
  CutoverControlModuleRow,
  CutoverPacketChain,
  CutoverPacketModule,
  CutoverPendingGateRow,
} from '@/utils/cutover-packets'

export interface CutoverChainSource {
  chainKey?: PilotChainKey
  label: string
  enabled: boolean
  moduleKeys: ModuleKey[]
  contacts: ChainContacts
  gateState: ChainAcceptanceState
  closedLoopSummary?: {
    label: string
    missingLabels: string[]
    staleLabels: string[]
  }
  reminders: ReminderRecord[]
  financialTrace?: {
    statusLabel: string
    missingLabels: string[]
    warningLabels: string[]
    lines: string[]
    recordRefs?: string[]
    packetRefs?: string[]
  }
  topRiskLabel?: string
  closeChecklistLines?: string[]
  closeActivityLines?: string[]
}

export interface CutoverModuleSource {
  moduleKey: ModuleKey
  title: string
  enabled: boolean
  reminders: ReminderRecord[]
  pendingGateCount?: number
  blockerLabels?: string[]
  financialTrace?: {
    statusLabel: string
    missingLabels: string[]
    warningLabels: string[]
    lines: string[]
    recordRefs?: string[]
    packetRefs?: string[]
  }
  topRiskLabel?: string
}

type CutoverFinancialTraceSource = {
  statusLabel: string
  missingLabels: string[]
  warningLabels: string[]
  lines: string[]
  recordRefs?: string[]
  packetRefs?: string[]
}

export function buildCutoverPacketChains(input: {
  isEnglish: boolean
  chains: CutoverChainSource[]
  moduleTitle: (moduleKey: ModuleKey) => string
  reminderDetailLimit?: number
}): CutoverPacketChain[] {
  const reminderDetailLimit = input.reminderDetailLimit ?? 8
  return input.chains.map((chain) => {
    const gateSummary = summarizeFirstWaveGateState(chain.gateState, input.isEnglish)
    const reminderBadges = buildReminderFamilyBadges(chain.reminders, input.isEnglish)
    const topRisk = pickTopReminder(chain.reminders)
    const evidenceModules = chain.moduleKeys.map((moduleKey) => {
      const expectation = buildModuleEvidenceExpectation(moduleKey, input.isEnglish)
      return {
        moduleKey,
        title: input.moduleTitle(moduleKey),
        expectation,
      }
    })
    const settlementSummary = buildChainSettlementSummary({
      moduleKeys: chain.moduleKeys,
      isEnglish: input.isEnglish,
      reminders: chain.reminders.map((item) => ({
        moduleKey: item.moduleKey as ModuleKey,
        type: item.type,
        severity: item.severity,
      })),
    })
    const financialTraceSummary: CutoverFinancialTraceSource = chain.financialTrace || buildChainFinancialTraceSummary({
      moduleKeys: chain.moduleKeys,
      isEnglish: input.isEnglish,
      reminders: chain.reminders.map((item) => ({
        moduleKey: item.moduleKey as ModuleKey,
        type: item.type,
        severity: item.severity,
      })),
    })
    const financeCockpitSummary = buildChainFinanceCockpitSummary({
      chainKey: chain.chainKey,
      isEnglish: input.isEnglish,
      reminders: chain.reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels: buildReminderFamilyBlockers(chain.reminders, input.isEnglish),
    })
    const closeRoleSnapshot = buildCloseRoleSnapshot({
      contacts: chain.contacts,
      isEnglish: input.isEnglish,
      chainKey: chain.chainKey,
    })
    return {
      label: chain.label,
      enabled: chain.enabled,
      modulesLabel: chain.moduleKeys.map((moduleKey) => input.moduleTitle(moduleKey)).join(' / '),
      readyLabel: `${gateSummary.readyCount}/${gateSummary.totalCount}`,
      summaryLabel: gateSummary.label,
      closedLoopLabel: chain.closedLoopSummary?.label,
      closedLoopMissingLabels: chain.closedLoopSummary?.missingLabels,
      closedLoopStaleLabels: chain.closedLoopSummary?.staleLabels,
      settlementLabel: settlementSummary.statusLabel,
      settlementMissingLabels: settlementSummary.missingLabels,
      settlementWarningLabels: settlementSummary.warningLabels,
      settlementLines: settlementSummary.lines,
      financialTraceLabel: financialTraceSummary.statusLabel,
      financialTraceMissingLabels: financialTraceSummary.missingLabels,
      financialTraceWarningLabels: financialTraceSummary.warningLabels,
      financialTraceLines: financialTraceSummary.lines,
      financialTraceRecordRefs: financialTraceSummary.recordRefs,
      financialTracePacketRefs: financialTraceSummary.packetRefs,
      pendingLabels: gateSummary.pendingLabels,
      requiredEvidenceCount: evidenceModules.reduce((sum, item) => sum + item.expectation.requiredCount, 0),
      critical: chain.reminders.filter((item) => item.severity === 'critical').length,
      warning: chain.reminders.filter((item) => item.severity === 'warning').length,
      reminderCount: chain.reminders.length,
      reminderFamilies: reminderBadges.map((item) => `${item.label} ${item.count}`),
      blockerLabels: buildReminderFamilyBlockers(chain.reminders, input.isEnglish),
      topRiskLabel: chain.topRiskLabel || (topRisk
        ? `${input.moduleTitle(topRisk.moduleKey as ModuleKey)} #${topRisk.recordId ?? '-'} ${topRisk.title}`
        : '-'),
      owner: chain.contacts.owner,
      fallbackOwner: chain.contacts.fallbackOwner,
      rehearsalOwner: chain.contacts.rehearsalOwner,
      pilotConfirmOwner: chain.contacts.pilotConfirmOwner,
      reviewerOwner: closeRoleSnapshot.reviewer,
      financeOwner: closeRoleSnapshot.financeOwner,
      gateNote: chain.gateState.note || '-',
      evidenceLines: evidenceModules.map((item) =>
        `${item.title}: ${item.expectation.requiredLabels.join(', ') || '-'} · ${input.isEnglish ? 'Recommended' : '推荐'} ${item.expectation.recommendedLabel}`,
      ),
      financeCockpitLabel: financeCockpitSummary.enabled ? financeCockpitSummary.label : undefined,
      financeCockpitLines: financeCockpitSummary.enabled ? financeCockpitSummary.lines : undefined,
      closeChecklistLines: chain.closeChecklistLines,
      closeActivityLines: chain.closeActivityLines,
      reminderDetails: chain.reminders
        .slice(0, reminderDetailLimit)
        .map((item) =>
          `- [${item.severity}] ${input.moduleTitle(item.moduleKey as ModuleKey)} #${item.recordId ?? '-'} ${item.title}: ${item.content}`,
        ),
    }
  })
}

export function buildCutoverPacketModules(input: {
  isEnglish: boolean
  modules: CutoverModuleSource[]
}): CutoverPacketModule[] {
  return input.modules.map((module) => {
    const evidence = buildModuleEvidenceExpectation(module.moduleKey, input.isEnglish)
    const settlementSummary = buildModuleSettlementSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
    })
    const financialTraceSummary: CutoverFinancialTraceSource = module.financialTrace || buildModuleFinancialTraceSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
    })
    const paymentLinkageSummary = buildPaymentLinkageGovernanceSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
      settlementSummary,
      financialTraceSummary,
    })
    const quantImpactSummary = buildQuantImpactGovernanceSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
      settlementSummary,
      financialTraceSummary,
      pendingGateCount: module.pendingGateCount,
      blockerLabels: module.blockerLabels || buildReminderFamilyBlockers(module.reminders, input.isEnglish),
    })
    const financeCockpitSummary = buildModuleFinanceCockpitSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels: module.blockerLabels || buildReminderFamilyBlockers(module.reminders, input.isEnglish),
    })
    return {
      title: module.title,
      requiredLabels: evidence.requiredLabels,
      recommendedLabel: evidence.recommendedLabel,
      timelineHint: evidence.timelineHint,
      openRisks: module.reminders.length,
      settlementLabel: settlementSummary.statusLabel,
      settlementMissingLabels: settlementSummary.missingLabels,
      settlementWarningLabels: settlementSummary.warningLabels,
      settlementLines: settlementSummary.lines,
      financialTraceLabel: financialTraceSummary.statusLabel,
      financialTraceMissingLabels: financialTraceSummary.missingLabels,
      financialTraceWarningLabels: financialTraceSummary.warningLabels,
      financialTraceLines: financialTraceSummary.lines,
      financialTraceRecordRefs: financialTraceSummary.recordRefs,
      financialTracePacketRefs: financialTraceSummary.packetRefs,
      financeCockpitLabel: financeCockpitSummary.enabled ? financeCockpitSummary.label : undefined,
      financeCockpitLines: financeCockpitSummary.enabled ? financeCockpitSummary.lines : undefined,
      paymentLinkageLines: paymentLinkageSummary.enabled ? paymentLinkageSummary.lines : undefined,
      quantImpactLines: quantImpactSummary.enabled ? quantImpactSummary.lines : undefined,
    }
  })
}

export function buildCutoverControlModules(input: {
  isEnglish: boolean
  modules: CutoverModuleSource[]
}): CutoverControlModuleRow[] {
  return input.modules.map((module) => {
    const evidence = buildModuleEvidenceExpectation(module.moduleKey, input.isEnglish)
    const settlementSummary = buildModuleSettlementSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
    })
    const financialTraceSummary: CutoverFinancialTraceSource = module.financialTrace || buildModuleFinancialTraceSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
    })
    const reminderBadges = buildReminderFamilyBadges(module.reminders, input.isEnglish)
    const blockerLabels = buildReminderFamilyBlockers(module.reminders, input.isEnglish)
    const topRisk = pickTopReminder(module.reminders)
    const paymentLinkageSummary = buildPaymentLinkageGovernanceSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
      settlementSummary,
      financialTraceSummary,
    })
    const quantImpactSummary = buildQuantImpactGovernanceSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
      settlementSummary,
      financialTraceSummary,
      pendingGateCount: module.pendingGateCount,
      blockerLabels: module.blockerLabels || blockerLabels,
    })
    const financeCockpitSummary = buildModuleFinanceCockpitSummary({
      moduleKey: module.moduleKey,
      isEnglish: input.isEnglish,
      reminders: module.reminders,
      settlementSummary,
      financialTraceSummary,
      blockerLabels: module.blockerLabels || blockerLabels,
    })
    return {
      title: module.title,
      enabled: module.enabled,
      reminders: module.reminders.length,
      critical: module.reminders.filter((item) => item.severity === 'critical').length,
      warning: module.reminders.filter((item) => item.severity === 'warning').length,
      topRiskLabel: module.topRiskLabel || (topRisk ? `${topRisk.title} (#${topRisk.recordId ?? '-'})` : '-'),
      reminderFamilies: reminderBadges.map((item) => `${item.label} ${item.count}`),
      blockerLabels,
      requiredLabels: evidence.requiredLabels,
      recommendedLabel: evidence.recommendedLabel,
      timelineHint: evidence.timelineHint,
      settlementLabel: settlementSummary.statusLabel,
      settlementMissingLabels: settlementSummary.missingLabels,
      settlementWarningLabels: settlementSummary.warningLabels,
      settlementLines: settlementSummary.lines,
      financialTraceLabel: financialTraceSummary.statusLabel,
      financialTraceMissingLabels: financialTraceSummary.missingLabels,
      financialTraceWarningLabels: financialTraceSummary.warningLabels,
      financialTraceLines: financialTraceSummary.lines,
      financialTraceRecordRefs: financialTraceSummary.recordRefs,
      financialTracePacketRefs: financialTraceSummary.packetRefs,
      financeCockpitLabel: financeCockpitSummary.enabled ? financeCockpitSummary.label : undefined,
      financeCockpitLines: financeCockpitSummary.enabled ? financeCockpitSummary.lines : undefined,
      paymentLinkageLines: paymentLinkageSummary.enabled ? paymentLinkageSummary.lines : undefined,
      quantImpactLines: quantImpactSummary.enabled ? quantImpactSummary.lines : undefined,
    }
  })
}

export function buildCutoverContactRows(chains: CutoverPacketChain[]): CutoverContactMatrixRow[] {
  return chains.map((chain) => ({
    label: chain.label,
    modulesLabel: chain.modulesLabel,
    owner: chain.owner,
    fallbackOwner: chain.fallbackOwner,
    rehearsalOwner: chain.rehearsalOwner,
    pilotConfirmOwner: chain.pilotConfirmOwner,
    reviewerOwner: chain.reviewerOwner,
    financeOwner: chain.financeOwner,
    statusLabel: chain.summaryLabel,
  }))
}

export function buildCutoverPendingGateRows(chains: CutoverPacketChain[]): CutoverPendingGateRow[] {
  return chains.map((chain) => ({
    label: chain.label,
    readyLabel: chain.readyLabel,
    pendingLabels: chain.pendingLabels,
    blockerLabels: chain.blockerLabels,
    owner: chain.owner,
    gateNote: chain.gateNote,
  }))
}
