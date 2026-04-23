import type { FinancialTraceCockpit } from '@/api/financial-trace'
import type { ReminderRecord } from '@/api/reminders'
import type { ModuleKey } from '@/config/module-manifest'
import {
  buildChainCutoverFinancialTraceState,
  buildCutoverFinancialTraceState,
  supportsCutoverFinancialTraceModule,
  type CutoverFinancialTraceState,
} from '@/utils/cutover-financial-trace'
import { buildModuleFinancialTraceSummary } from '@/utils/financial-trace'
import { buildFinancialTraceRecordRefLabel } from '@/utils/financial-trace-packets'

export interface ScopeTraceRecordTarget {
  moduleKey: ModuleKey
  recordId: number
  recordRef?: string | null
  label: string
}

export function buildScopeModuleFinancialTraceStateMap(input: {
  moduleKeys: ModuleKey[]
  reminders: ReminderRecord[]
  cockpitMap: Partial<Record<ModuleKey, FinancialTraceCockpit>>
  isEnglish: boolean
  moduleTitle: (moduleKey: ModuleKey) => string
}) {
  const uniqueModuleKeys = Array.from(new Set(input.moduleKeys))
  return uniqueModuleKeys.reduce<Partial<Record<ModuleKey, CutoverFinancialTraceState>>>((summary, moduleKey) => {
    const reminders = input.reminders
      .filter((item) => item.moduleKey === moduleKey)
      .map((item) => ({
        type: item.type,
        severity: item.severity,
      }))
    const baseSummary = buildModuleFinancialTraceSummary({
      moduleKey,
      isEnglish: input.isEnglish,
      reminders,
    })
    summary[moduleKey] = buildCutoverFinancialTraceState({
      moduleKey,
      moduleLabel: input.moduleTitle(moduleKey),
      isEnglish: input.isEnglish,
      summary: baseSummary,
      cockpit: input.cockpitMap[moduleKey] || null,
    })
    return summary
  }, {})
}

export function buildScopeFinancialTraceState(input: {
  moduleKeys: ModuleKey[]
  moduleStates: Partial<Record<ModuleKey, CutoverFinancialTraceState>>
  isEnglish: boolean
  moduleTitle: (moduleKey: ModuleKey) => string
}) {
  return buildChainCutoverFinancialTraceState({
    isEnglish: input.isEnglish,
    moduleStates: input.moduleKeys
      .map((moduleKey) => ({
        moduleKey,
        moduleLabel: input.moduleTitle(moduleKey),
        state: input.moduleStates[moduleKey],
      }))
      .filter((item): item is {
        moduleKey: ModuleKey
        moduleLabel: string
        state: CutoverFinancialTraceState
      } => Boolean(item.state))
      .filter((item) => item.state.expectedCount > 0 || item.state.recordRefs.length > 0),
  })
}

export function buildScopeFinancialTraceTarget(
  state?: CutoverFinancialTraceState | null,
  section = 'traceability',
) {
  if (!state?.topRiskModuleKey || !state.topRiskRecordId) return null
  return {
    routeName: state.topRiskModuleKey,
    query: {
      detailId: String(state.topRiskRecordId),
      section,
      relatedTo: state.topRiskModuleKey,
    },
  }
}

export function listScopeFinancialTraceModules(moduleKeys: ModuleKey[]) {
  return Array.from(new Set(moduleKeys.filter((moduleKey) => supportsCutoverFinancialTraceModule(moduleKey))))
}

export function resolveScopeTopTraceRecord(input: {
  state?: CutoverFinancialTraceState | null
  fallbackReminder?: ReminderRecord | null
  fallbackLabel?: string | null
  moduleTitle: (moduleKey: ModuleKey) => string
  english: boolean
}) {
  if (input.state?.topRiskModuleKey && input.state.topRiskRecordId) {
    return {
      moduleKey: input.state.topRiskModuleKey,
      recordId: input.state.topRiskRecordId,
      recordRef: input.state.topRiskRecordRef,
      label: input.state.topRiskRefs[0] || input.fallbackLabel || '-',
    } satisfies ScopeTraceRecordTarget
  }
  if (input.fallbackReminder?.moduleKey && input.fallbackReminder.recordId) {
    const moduleKey = input.fallbackReminder.moduleKey as ModuleKey
    return {
      moduleKey,
      recordId: Number(input.fallbackReminder.recordId),
      recordRef: input.fallbackReminder.relatedRef,
      label: input.fallbackLabel
        || buildFinancialTraceRecordRefLabel({
          english: input.english,
          moduleLabel: input.moduleTitle(moduleKey),
          recordId: Number(input.fallbackReminder.recordId),
          recordRef: input.fallbackReminder.relatedRef,
          status: input.fallbackReminder.severity === 'critical'
            ? 'missing'
            : input.fallbackReminder.severity === 'warning'
              ? 'warning'
              : 'ready',
        }),
    } satisfies ScopeTraceRecordTarget
  }
  return null
}

export function collectScopeTraceBundleTargets(input: {
  moduleKeys: ModuleKey[]
  cockpitMap: Partial<Record<ModuleKey, FinancialTraceCockpit>>
  moduleTitle: (moduleKey: ModuleKey) => string
  english: boolean
  limit?: number
}) {
  const supportedModules = listScopeFinancialTraceModules(input.moduleKeys)
  const limit = input.limit ?? 4
  const prioritizedByModule = supportedModules.map((moduleKey) => {
    const cockpit = input.cockpitMap[moduleKey]
    const records = cockpit?.records || []
    const prioritized = [
      ...records.filter((record) => record.status !== 'ready'),
      ...records.filter((record) => record.status === 'ready'),
    ]
    return {
      moduleKey,
      records: prioritized,
    }
  })
  const targets: ScopeTraceRecordTarget[] = []
  const seen = new Set<string>()

  prioritizedByModule.forEach((bucket) => {
    const top = bucket.records[0]
    if (!top) return
    const key = `${bucket.moduleKey}:${top.id}`
    if (seen.has(key)) return
    seen.add(key)
    targets.push({
      moduleKey: bucket.moduleKey,
      recordId: top.id,
      recordRef: top.ref,
      label: buildFinancialTraceRecordRefLabel({
        english: input.english,
        moduleLabel: input.moduleTitle(bucket.moduleKey),
        recordId: top.id,
        recordRef: top.ref,
        status: top.status,
      }),
    })
  })

  if (targets.length >= limit) {
    return targets.slice(0, limit)
  }

  prioritizedByModule.forEach((bucket) => {
    bucket.records.slice(1).forEach((record) => {
      if (targets.length >= limit) return
      const key = `${bucket.moduleKey}:${record.id}`
      if (seen.has(key)) return
      seen.add(key)
      targets.push({
        moduleKey: bucket.moduleKey,
        recordId: record.id,
        recordRef: record.ref,
        label: buildFinancialTraceRecordRefLabel({
          english: input.english,
          moduleLabel: input.moduleTitle(bucket.moduleKey),
          recordId: record.id,
          recordRef: record.ref,
          status: record.status,
        }),
      })
    })
  })

  return targets.slice(0, limit)
}
