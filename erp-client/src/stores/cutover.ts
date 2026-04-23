import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ModuleKey } from '@/config/module-manifest'

export type PilotChainKey = 'masterData' | 'sales' | 'purchase'
export interface ChainContacts {
  owner: string
  fallbackOwner: string
  rehearsalOwner: string
  pilotConfirmOwner: string
  reviewerOwner: string
  financeOwner: string
}
export interface ChainAcceptanceState {
  smokeReady: boolean
  workbenchReady: boolean
  rollbackReady: boolean
  traceabilityReady: boolean
  manualReady: boolean
  pilotConfirmed: boolean
  note: string
}

interface PilotChainState {
  key: PilotChainKey
  zhLabel: string
  enLabel: string
  moduleKeys: ModuleKey[]
}

const CUTOVER_CHAINS_KEY = 'neko_erp_cutover_chains'
const CUTOVER_MODULE_OVERRIDES_KEY = 'neko_erp_cutover_module_overrides'
const CUTOVER_CHAIN_CONTACTS_KEY = 'neko_erp_cutover_chain_contacts'
const CUTOVER_CHAIN_GATES_KEY = 'neko_erp_cutover_chain_gates'
const PILOT_CHAIN_KEYS: PilotChainKey[] = ['masterData', 'sales', 'purchase']

const PILOT_CHAINS: PilotChainState[] = [
  {
    key: 'masterData',
    zhLabel: '主数据试点',
    enLabel: 'Master Data Pilot',
    moduleKeys: ['resPartner', 'resCompany', 'resCurrency', 'productTemplate', 'productProduct', 'productCategory', 'productPricelist'],
  },
  {
    key: 'sales',
    zhLabel: '销售链试点',
    enLabel: 'Sales Chain Pilot',
    moduleKeys: ['saleOrder', 'stockPicking', 'accountInvoice'],
  },
  {
    key: 'purchase',
    zhLabel: '采购链试点',
    enLabel: 'Purchase Chain Pilot',
    moduleKeys: ['purchaseOrder', 'accountInvoice', 'accountPayment'],
  },
]

export const useCutoverStore = defineStore('cutover', () => {
  const chainStates = ref<Record<PilotChainKey, boolean>>(loadChainStates())
  const moduleOverrides = ref<Partial<Record<ModuleKey, boolean>>>(loadModuleOverrides())
  const chainContacts = ref<Partial<Record<PilotChainKey, ChainContacts>>>(loadChainContacts())
  const chainGateStates = ref<Partial<Record<PilotChainKey, ChainAcceptanceState>>>(loadChainGateStates())

  const firstWaveModules = computed(() =>
    Array.from(new Set(PILOT_CHAINS.flatMap((chain) => chain.moduleKeys))),
  )

  const chainRows = computed(() =>
    PILOT_CHAINS.map((chain) => ({
      ...chain,
      enabled: chainStates.value[chain.key],
    })),
  )

  function chainsForModule(moduleKey: ModuleKey) {
    return PILOT_CHAINS.filter((chain) => chain.moduleKeys.includes(moduleKey))
  }

  function isFirstWaveModule(moduleKey: ModuleKey) {
    return firstWaveModules.value.includes(moduleKey)
  }

  // First-wave modules are protected by chain toggles unless an explicit
  // module override exists. Support modules stay available by default.
  function isModuleEnabled(moduleKey: ModuleKey) {
    if (moduleOverrides.value[moduleKey] !== undefined) {
      return Boolean(moduleOverrides.value[moduleKey])
    }
    const chains = chainsForModule(moduleKey)
    if (!chains.length) return true
    return chains.some((chain) => chainStates.value[chain.key])
  }

  function setChainEnabled(chainKey: PilotChainKey, enabled: boolean) {
    chainStates.value = {
      ...chainStates.value,
      [chainKey]: enabled,
    }
    persistChainStates(chainStates.value)
  }

  function setModuleEnabled(moduleKey: ModuleKey, enabled: boolean) {
    moduleOverrides.value = {
      ...moduleOverrides.value,
      [moduleKey]: enabled,
    }
    persistModuleOverrides(moduleOverrides.value)
  }

  function clearModuleOverride(moduleKey: ModuleKey) {
    const next = { ...moduleOverrides.value }
    delete next[moduleKey]
    moduleOverrides.value = next
    persistModuleOverrides(moduleOverrides.value)
  }

  function rollbackChain(chainKey: PilotChainKey) {
    setChainEnabled(chainKey, false)
  }

  function rollbackModule(moduleKey: ModuleKey) {
    setModuleEnabled(moduleKey, false)
  }

  function restorePilotDefaults() {
    chainStates.value = {
      masterData: true,
      sales: true,
      purchase: true,
    }
    moduleOverrides.value = {}
    persistChainStates(chainStates.value)
    persistModuleOverrides(moduleOverrides.value)
  }

  function replaceCutoverConfig(snapshot: {
    chainStates?: Partial<Record<PilotChainKey, boolean>>
    moduleOverrides?: Partial<Record<ModuleKey, boolean>>
    chainContacts?: Partial<Record<PilotChainKey, ChainContacts>>
    chainGateStates?: Partial<Record<PilotChainKey, ChainAcceptanceState>>
  }) {
    chainStates.value = normalizeChainStates(snapshot.chainStates)
    moduleOverrides.value = normalizeModuleOverrides(snapshot.moduleOverrides)
    chainContacts.value = normalizeChainContacts(snapshot.chainContacts)
    chainGateStates.value = normalizeChainGateStates(snapshot.chainGateStates)
    persistChainStates(chainStates.value)
    persistModuleOverrides(moduleOverrides.value)
    persistChainContacts(chainContacts.value)
    persistChainGateStates(chainGateStates.value)
  }

  function chainContactFor(chainKey: PilotChainKey, defaults: ChainContacts) {
    const value = chainContacts.value[chainKey]
    return {
      owner: value?.owner?.trim() || defaults.owner,
      fallbackOwner: value?.fallbackOwner?.trim() || defaults.fallbackOwner,
      rehearsalOwner: value?.rehearsalOwner?.trim() || defaults.rehearsalOwner,
      pilotConfirmOwner: value?.pilotConfirmOwner?.trim() || defaults.pilotConfirmOwner,
      reviewerOwner: value?.reviewerOwner?.trim() || defaults.reviewerOwner,
      financeOwner: value?.financeOwner?.trim() || defaults.financeOwner,
    }
  }

  function setChainContacts(chainKey: PilotChainKey, contacts: ChainContacts) {
    chainContacts.value = {
      ...chainContacts.value,
      [chainKey]: contacts,
    }
    persistChainContacts(chainContacts.value)
  }

  function chainGateStateFor(chainKey: PilotChainKey, defaults: ChainAcceptanceState) {
    const value = chainGateStates.value[chainKey]
    return {
      smokeReady: Boolean(value?.smokeReady ?? defaults.smokeReady),
      workbenchReady: Boolean(value?.workbenchReady ?? defaults.workbenchReady),
      rollbackReady: Boolean(value?.rollbackReady ?? defaults.rollbackReady),
      traceabilityReady: Boolean(value?.traceabilityReady ?? defaults.traceabilityReady),
      manualReady: Boolean(value?.manualReady ?? defaults.manualReady),
      pilotConfirmed: Boolean(value?.pilotConfirmed ?? defaults.pilotConfirmed),
      note: String(value?.note ?? defaults.note ?? ''),
    }
  }

  function setChainGateState(chainKey: PilotChainKey, state: ChainAcceptanceState) {
    chainGateStates.value = {
      ...chainGateStates.value,
      [chainKey]: state,
    }
    persistChainGateStates(chainGateStates.value)
  }

  function clearChainGateState(chainKey: PilotChainKey) {
    const next = { ...chainGateStates.value }
    delete next[chainKey]
    chainGateStates.value = next
    persistChainGateStates(chainGateStates.value)
  }

  function clearChainContacts(chainKey: PilotChainKey) {
    const next = { ...chainContacts.value }
    delete next[chainKey]
    chainContacts.value = next
    persistChainContacts(chainContacts.value)
  }

  return {
    chainRows,
    chainStates,
    chainContacts,
    chainGateStates,
    chainContactFor,
    chainGateStateFor,
    chainsForModule,
    clearChainGateState,
    clearModuleOverride,
    clearChainContacts,
    firstWaveModules,
    isFirstWaveModule,
    isModuleEnabled,
    moduleOverrides,
    replaceCutoverConfig,
    restorePilotDefaults,
    rollbackChain,
    rollbackModule,
    setChainEnabled,
    setChainContacts,
    setChainGateState,
    setModuleEnabled,
  }
})

function loadChainStates(): Record<PilotChainKey, boolean> {
  const defaults = defaultChainStates()
  if (typeof window === 'undefined') return defaults
  const raw = window.localStorage.getItem(CUTOVER_CHAINS_KEY)
  if (!raw) return defaults
  try {
    return normalizeChainStates(JSON.parse(raw))
  } catch {
    return defaults
  }
}

function loadModuleOverrides(): Partial<Record<ModuleKey, boolean>> {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(CUTOVER_MODULE_OVERRIDES_KEY)
  if (!raw) return {}
  try {
    return normalizeModuleOverrides(JSON.parse(raw))
  } catch {
    return {}
  }
}

function loadChainContacts(): Partial<Record<PilotChainKey, ChainContacts>> {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(CUTOVER_CHAIN_CONTACTS_KEY)
  if (!raw) return {}
  try {
    return normalizeChainContacts(JSON.parse(raw))
  } catch {
    return {}
  }
}

function loadChainGateStates(): Partial<Record<PilotChainKey, ChainAcceptanceState>> {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(CUTOVER_CHAIN_GATES_KEY)
  if (!raw) return {}
  try {
    return normalizeChainGateStates(JSON.parse(raw))
  } catch {
    return {}
  }
}

function defaultChainStates(): Record<PilotChainKey, boolean> {
  return {
    masterData: true,
    sales: true,
    purchase: true,
  }
}

function normalizeChainStates(value: unknown): Record<PilotChainKey, boolean> {
  const next = defaultChainStates()
  if (!isRecord(value)) return next
  for (const key of PILOT_CHAIN_KEYS) {
    if (typeof value[key] === 'boolean') {
      next[key] = value[key]
    }
  }
  return next
}

function normalizeModuleOverrides(value: unknown): Partial<Record<ModuleKey, boolean>> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([, enabled]) => typeof enabled === 'boolean'),
  ) as Partial<Record<ModuleKey, boolean>>
}

function normalizeChainContacts(value: unknown): Partial<Record<PilotChainKey, ChainContacts>> {
  if (!isRecord(value)) return {}
  const next: Partial<Record<PilotChainKey, ChainContacts>> = {}
  for (const key of PILOT_CHAIN_KEYS) {
    const row = value[key]
    if (!isRecord(row)) continue
    next[key] = {
      owner: String(row.owner || ''),
      fallbackOwner: String(row.fallbackOwner || ''),
      rehearsalOwner: String(row.rehearsalOwner || ''),
      pilotConfirmOwner: String(row.pilotConfirmOwner || ''),
      reviewerOwner: String(row.reviewerOwner || ''),
      financeOwner: String(row.financeOwner || ''),
    }
  }
  return next
}

function normalizeChainGateStates(value: unknown): Partial<Record<PilotChainKey, ChainAcceptanceState>> {
  if (!isRecord(value)) return {}
  const next: Partial<Record<PilotChainKey, ChainAcceptanceState>> = {}
  for (const key of PILOT_CHAIN_KEYS) {
    const row = value[key]
    if (!isRecord(row)) continue
    next[key] = {
      smokeReady: Boolean(row.smokeReady),
      workbenchReady: Boolean(row.workbenchReady),
      rollbackReady: Boolean(row.rollbackReady),
      traceabilityReady: Boolean(row.traceabilityReady),
      manualReady: Boolean(row.manualReady),
      pilotConfirmed: Boolean(row.pilotConfirmed),
      note: String(row.note || ''),
    }
  }
  return next
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function persistChainStates(value: Record<PilotChainKey, boolean>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CUTOVER_CHAINS_KEY, JSON.stringify(value))
}

function persistModuleOverrides(value: Partial<Record<ModuleKey, boolean>>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CUTOVER_MODULE_OVERRIDES_KEY, JSON.stringify(value))
}

function persistChainContacts(value: Partial<Record<PilotChainKey, ChainContacts>>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CUTOVER_CHAIN_CONTACTS_KEY, JSON.stringify(value))
}

function persistChainGateStates(value: Partial<Record<PilotChainKey, ChainAcceptanceState>>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CUTOVER_CHAIN_GATES_KEY, JSON.stringify(value))
}
