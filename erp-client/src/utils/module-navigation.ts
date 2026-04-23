import { moduleManifestMap, type ModuleKey } from '@/config/module-manifest'

export type ModuleRouteQuery = Record<string, string | undefined>
export interface ModuleRouteTarget {
  name: ModuleKey
  query: ModuleRouteQuery
}

const DEFAULT_WORKBENCH_SECTION_MAP: Partial<Record<ModuleKey, string>> = {
  resCompany: 'ops-evidence',
  resPartner: 'ops-evidence',
  productTemplate: 'ops-evidence',
  productProduct: 'ops-evidence',
  productCategory: 'ops-evidence',
  productPricelist: 'ops-evidence',
  saleOrder: 'ops-financial-trace',
  purchaseOrder: 'ops-financial-trace',
  stockPicking: 'ops-execution-feedback',
  accountInvoice: 'ops-settlement',
  accountPayment: 'ops-payment-linkage',
  accountMove: 'ops-settlement',
}

const DEFAULT_DETAIL_SECTION_MAP: Partial<Record<ModuleKey, string>> = {
  resCompany: 'context',
  resPartner: 'context',
  productTemplate: 'record',
  productProduct: 'record',
  productCategory: 'record',
  productPricelist: 'record',
  saleOrder: 'chain',
  purchaseOrder: 'chain',
  stockPicking: 'workflow',
  accountInvoice: 'workflow',
  accountPayment: 'workflow',
  accountMove: 'workflow',
}

export function isModuleRouteName(routeName: string): routeName is ModuleKey {
  return Boolean(moduleManifestMap[routeName as ModuleKey])
}

export function resolveDefaultWorkbenchSection(moduleKey: ModuleKey) {
  return DEFAULT_WORKBENCH_SECTION_MAP[moduleKey]
}

export function resolveDefaultDetailSection(moduleKey: ModuleKey) {
  return DEFAULT_DETAIL_SECTION_MAP[moduleKey]
}

function shouldFillDefaultSection(query: ModuleRouteQuery) {
  return !query.section
    && !query.create
    && !query.detailId
    && !query.focusField
    && !query.contextField
}

// Keep cross-module jumps predictable: land on the most useful desk first,
// preserve chain context, and only attach source linkage when it helps trace back.
export function buildModuleWorkbenchRouteQuery(input: {
  targetRouteName: string
  rawQuery?: ModuleRouteQuery
  sourceModuleKey?: ModuleKey | null
  chainKey?: string | null
}) {
  const query: ModuleRouteQuery = { ...(input.rawQuery || {}) }
  if (!isModuleRouteName(input.targetRouteName)) {
    return query
  }

  const targetModuleKey = input.targetRouteName
  if (input.sourceModuleKey && input.sourceModuleKey !== targetModuleKey && !query.relatedTo) {
    query.relatedTo = input.sourceModuleKey
  }
  if (input.chainKey && !query.chainKey) {
    query.chainKey = input.chainKey
  }
  if (shouldFillDefaultSection(query)) {
    const defaultSection = resolveDefaultWorkbenchSection(targetModuleKey)
    if (defaultSection) {
      query.section = defaultSection
    }
  }
  return query
}

export function buildModuleRouteTarget(input: {
  targetModuleKey: ModuleKey
  rawQuery?: ModuleRouteQuery
  sourceModuleKey?: ModuleKey | null
  chainKey?: string | null
}): ModuleRouteTarget {
  return {
    name: input.targetModuleKey,
    query: buildModuleWorkbenchRouteQuery({
      targetRouteName: input.targetModuleKey,
      rawQuery: input.rawQuery,
      sourceModuleKey: input.sourceModuleKey,
      chainKey: input.chainKey,
    }),
  }
}

export function buildModuleDetailRouteTarget(input: {
  targetModuleKey: ModuleKey
  recordId: string | number
  section?: string
  rawQuery?: ModuleRouteQuery
  sourceModuleKey?: ModuleKey | null
  chainKey?: string | null
}): ModuleRouteTarget {
  const defaultSection = input.section || resolveDefaultDetailSection(input.targetModuleKey)
  return buildModuleRouteTarget({
    targetModuleKey: input.targetModuleKey,
    rawQuery: {
      ...(input.rawQuery || {}),
      detailId: String(input.recordId),
      ...(defaultSection ? { section: defaultSection } : {}),
    },
    sourceModuleKey: input.sourceModuleKey,
    chainKey: input.chainKey,
  })
}
