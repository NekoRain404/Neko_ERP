import type { ModuleKey } from '@/config/module-manifest'
import type { ChainAcceptanceState, ChainContacts, PilotChainKey } from '@/stores/cutover'
import type { CutoverOperationsSnapshot } from '@/utils/cutover-ops'

export interface CutoverSnapshotModuleRow {
  moduleKey: ModuleKey
  title: string
  enabled: boolean
  chains: string
  overridden: boolean
}

export interface CutoverConfigSnapshot {
  version: number
  generatedAt: string
  locale?: string
  chainStates?: Partial<Record<PilotChainKey, boolean>>
  moduleOverrides?: Partial<Record<ModuleKey, boolean>>
  chainContacts?: Partial<Record<PilotChainKey, ChainContacts>>
  chainGateStates?: Partial<Record<PilotChainKey, ChainAcceptanceState>>
  firstWaveModules?: CutoverSnapshotModuleRow[]
  reviewState?: {
    reviewedCount: number
    snoozedCount: number
  }
  operations?: CutoverOperationsSnapshot
}

export function resolveDefaultChainContacts(chainKey: string, english: boolean): ChainContacts {
  const matrix: Record<PilotChainKey, ChainContacts> = {
    masterData: {
      owner: english ? 'Data Steward' : '主数据负责人',
      fallbackOwner: english ? 'ERP Admin' : 'ERP 管理员',
      rehearsalOwner: english ? 'Master Data Lead' : '主数据试点组长',
      pilotConfirmOwner: english ? 'Master Data Sign-off Lead' : '主数据放行确认负责人',
      reviewerOwner: english ? 'Master Data Reviewer' : '主数据复核人',
      financeOwner: english ? 'ERP Admin' : 'ERP 管理员',
    },
    sales: {
      owner: english ? 'Sales Operations Lead' : '销售运营负责人',
      fallbackOwner: english ? 'Odoo Sales Entry Owner' : 'Odoo 销售录单负责人',
      rehearsalOwner: english ? 'Sales Pilot Lead' : '销售试点组长',
      pilotConfirmOwner: english ? 'Sales Go-live Approver' : '销售放行确认负责人',
      reviewerOwner: english ? 'Sales Review Lead' : '销售复核负责人',
      financeOwner: english ? 'AR / Finance Lead' : '应收与财务负责人',
    },
    purchase: {
      owner: english ? 'Procurement Operations Lead' : '采购运营负责人',
      fallbackOwner: english ? 'Odoo Purchase Entry Owner' : 'Odoo 采购录单负责人',
      rehearsalOwner: english ? 'Purchase Pilot Lead' : '采购试点组长',
      pilotConfirmOwner: english ? 'Purchase Go-live Approver' : '采购放行确认负责人',
      reviewerOwner: english ? 'Purchase Review Lead' : '采购复核负责人',
      financeOwner: english ? 'AP / Finance Lead' : '应付与财务负责人',
    },
  }
  return matrix[chainKey as PilotChainKey] ?? matrix.masterData
}

export function resolveChainRouteName(chainKey: string) {
  if (chainKey === 'sales') return 'saleOrder'
  if (chainKey === 'purchase') return 'purchaseOrder'
  return 'resPartner'
}

export function resolveCutoverSettingsQuery(options?: {
  moduleKey?: ModuleKey | string
  chainKey?: PilotChainKey | string
  section?: 'handoff' | 'import' | 'gates' | 'close' | 'roleDesk' | 'financeBatch' | 'ops'
}) {
  return {
    tab: 'cutover',
    ...(options?.moduleKey ? { module: String(options.moduleKey) } : {}),
    ...(options?.chainKey ? { chain: String(options.chainKey) } : {}),
    ...(options?.section ? { section: options.section } : {}),
  }
}

export function buildCutoverConfigSnapshot(input: {
  locale: string
  chainStates: Partial<Record<PilotChainKey, boolean>>
  moduleOverrides: Partial<Record<ModuleKey, boolean>>
  chainContacts: Partial<Record<PilotChainKey, ChainContacts>>
  chainGateStates?: Partial<Record<PilotChainKey, ChainAcceptanceState>>
  firstWaveModules: CutoverSnapshotModuleRow[]
  reviewedCount: number
  snoozedCount: number
  operations?: CutoverOperationsSnapshot
}): CutoverConfigSnapshot {
  return {
    version: 3,
    generatedAt: new Date().toISOString(),
    locale: input.locale,
    chainStates: input.chainStates,
    moduleOverrides: input.moduleOverrides,
    chainContacts: input.chainContacts,
    chainGateStates: input.chainGateStates ?? {},
    firstWaveModules: input.firstWaveModules,
    reviewState: {
      reviewedCount: input.reviewedCount,
      snoozedCount: input.snoozedCount,
    },
    operations: input.operations,
  }
}

export function parseCutoverConfigSnapshot(raw: string): CutoverConfigSnapshot {
  const snapshot = JSON.parse(raw)
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Cutover snapshot must be a JSON object')
  }
  if (
    typeof snapshot.chainStates !== 'object' &&
    typeof snapshot.moduleOverrides !== 'object' &&
    typeof snapshot.chainContacts !== 'object'
  ) {
    throw new Error('Cutover snapshot is missing cutover fields')
  }
  return {
    version: Number(snapshot.version || 1),
    generatedAt: String(snapshot.generatedAt || ''),
    locale: snapshot.locale ? String(snapshot.locale) : undefined,
    chainStates: snapshot.chainStates ?? {},
    moduleOverrides: snapshot.moduleOverrides ?? {},
    chainContacts: snapshot.chainContacts ?? {},
    chainGateStates: snapshot.chainGateStates ?? {},
    firstWaveModules: Array.isArray(snapshot.firstWaveModules) ? snapshot.firstWaveModules : [],
    reviewState: {
      reviewedCount: Number(snapshot.reviewState?.reviewedCount || 0),
      snoozedCount: Number(snapshot.reviewState?.snoozedCount || 0),
    },
    operations: {
      rollbackDrills: Array.isArray(snapshot.operations?.rollbackDrills) ? snapshot.operations.rollbackDrills : [],
      pilotSignoffs: Array.isArray(snapshot.operations?.pilotSignoffs) ? snapshot.operations.pilotSignoffs : [],
      exceptionExports: Array.isArray(snapshot.operations?.exceptionExports) ? snapshot.operations.exceptionExports : [],
      roleDeskTasks: Array.isArray(snapshot.operations?.roleDeskTasks) ? snapshot.operations.roleDeskTasks : [],
      financeBatchReviews: Array.isArray(snapshot.operations?.financeBatchReviews) ? snapshot.operations.financeBatchReviews : [],
      financeResultPacks: Array.isArray(snapshot.operations?.financeResultPacks) ? snapshot.operations.financeResultPacks : [],
      closeTasks: Array.isArray(snapshot.operations?.closeTasks) ? snapshot.operations.closeTasks : [],
    },
  }
}

export function summarizeCutoverConfigSnapshot(snapshot: CutoverConfigSnapshot, english: boolean) {
  const enabledChains = Object.values(snapshot.chainStates ?? {}).filter(Boolean).length
  const disabledChains = Object.values(snapshot.chainStates ?? {}).length - enabledChains
  const overriddenModules = Object.keys(snapshot.moduleOverrides ?? {}).length
  const namedContacts = Object.values(snapshot.chainContacts ?? {}).filter((item) =>
    Boolean(
      item?.owner
      || item?.fallbackOwner
      || item?.rehearsalOwner
      || item?.pilotConfirmOwner
      || item?.reviewerOwner
      || item?.financeOwner,
    ),
  ).length
  const acceptedChains = Object.values(snapshot.chainGateStates ?? {}).filter((item) =>
    item?.smokeReady &&
    item?.workbenchReady &&
    item?.rollbackReady &&
    item?.traceabilityReady &&
    item?.manualReady &&
    item?.pilotConfirmed,
  ).length
  const rollbackDrills = snapshot.operations?.rollbackDrills?.length ?? 0
  const pilotSignoffs = snapshot.operations?.pilotSignoffs?.length ?? 0
  const exceptionExports = snapshot.operations?.exceptionExports?.length ?? 0
  const roleDeskTasks = snapshot.operations?.roleDeskTasks?.length ?? 0
  const financeBatchReviews = snapshot.operations?.financeBatchReviews?.length ?? 0
  const financeResultPacks = snapshot.operations?.financeResultPacks?.length ?? 0
  const closeTasks = snapshot.operations?.closeTasks?.length ?? 0
  return [
    {
      label: english ? 'Generated At' : '生成时间',
      value: snapshot.generatedAt || '-',
      description: english ? 'Imported snapshot timestamp.' : '导入快照的生成时间。',
    },
    {
      label: english ? 'Enabled Chains' : '启用链路',
      value: String(enabledChains),
      description: english ? `Disabled chains: ${disabledChains}` : `已关闭链路：${disabledChains}`,
    },
    {
      label: english ? 'Module Overrides' : '模块覆盖',
      value: String(overriddenModules),
      description: english ? 'Explicit module-level pilot switches.' : '显式保存的模块级试点开关。',
    },
    {
      label: english ? 'Named Contacts' : '联系人',
      value: String(namedContacts),
      description: english ? 'Chains carrying custom owner metadata.' : '带有自定义负责人的链路数量。',
    },
    {
      label: english ? 'Accepted Chains' : '放行链路',
      value: String(acceptedChains),
      description: english ? 'Chains whose acceptance gates are fully checked.' : '放行门槛已全部勾选的链路数量。',
    },
    {
      label: english ? 'Rollback Drills' : '回退演练',
      value: String(rollbackDrills),
      description: english ? `Pilot sign-offs: ${pilotSignoffs}` : `试点签收：${pilotSignoffs}`,
    },
    {
      label: english ? 'Exception Exports' : '异常导出',
      value: String(exceptionExports),
      description: english ? 'Recorded rollback evidence and exception packets.' : '已记录的异常清单与回退证据导出次数。',
    },
    {
      label: english ? 'Role Desk Tasks' : '责任台任务',
      value: String(roleDeskTasks),
      description: english ? `Finance batch reviews: ${financeBatchReviews}` : `财务批量复核：${financeBatchReviews}`,
    },
    {
      label: english ? 'Finance Packs' : '财务结果包',
      value: String(financeResultPacks),
      description: english ? `Close tasks: ${closeTasks}` : `关账任务：${closeTasks}`,
    },
  ]
}

export function resolveDefaultChainGateState(): ChainAcceptanceState {
  return {
    smokeReady: false,
    workbenchReady: false,
    rollbackReady: false,
    traceabilityReady: false,
    manualReady: false,
    pilotConfirmed: false,
    note: '',
  }
}
