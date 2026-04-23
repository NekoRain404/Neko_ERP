import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index'
import { createEntity, fetchEntityPage, fetchEntityById, executeEntityAction, updateEntity } from '@/api/modules'
import { loadModuleConfig } from '@/config/module-config-loader'
import type { ModuleKey } from '@/config/module-manifest'
import type { BaseEntity, ModuleConfig, ModuleFieldConfig, QueryParams } from '@/types/api'
import { useI18n } from '@/i18n'
import { usePreferencesStore } from '@/stores/preferences'

export function useEntityWorkbench(
  moduleKeyRef: Readonly<{ value: ModuleKey }>,
  configRef: Readonly<{ value: ModuleConfig }>,
) {
  const config = computed<ModuleConfig>(() => configRef.value)
  const { t } = useI18n()
  const preferencesStore = usePreferencesStore()
  const tableData = ref<any[]>([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const filterState = reactive<Record<string, string | number | undefined>>({})
  const activeRow = ref<any>(null)
  const isCreating = ref(false)
  const isPanelOpen = ref(false)
  const isSaving = ref(false)
  const lastActionOutcome = ref<{ actionKey: string; actionLabel: string; linkFieldKeys: string[] } | null>(null)
  const extraQueryState = reactive<Record<string, string | number | undefined>>({})
  const childTableRows = reactive<Record<string, any[]>>({})
  const childTableLoading = reactive<Record<string, boolean>>({})
  const childModuleConfigs = reactive<Record<string, ModuleConfig | undefined>>({})
  const relationLabels = reactive<Record<string, Record<number, string>>>({})

  function inferRelationModule(field: ModuleFieldConfig): string | undefined {
    if (field.relation) return field.relation
    const map: Record<string, string> = {
      userId: 'sysUser',
      partnerId: 'resPartner',
      companyId: 'resCompany',
      currencyId: 'resCurrency',
      productId: 'productProduct',
      productTmplId: 'productTemplate',
      categId: 'productCategory',
      employeeId: 'hrEmployee',
      departmentId: 'hrDepartment',
      jobId: 'hrJob',
      journalId: 'accountJournal',
      projectId: 'projectProject',
      stageId: 'crmStage',
      warehouseId: 'stockWarehouse',
      locationId: 'stockLocation',
      inventoryId: 'stockInventory',
      bomId: 'mrpBom',
      parentId:
        moduleKeyRef.value === 'productCategory'
          ? 'productCategory'
          : moduleKeyRef.value === 'resPartner'
            ? 'resPartner'
            : '',
    }
    const relation = map[field.key]
    return relation || undefined
  }

  async function fetchRelationLabel(relatedModuleKey: string, id: number) {
    if (relationLabels[relatedModuleKey]?.[id]) return
    if (!relationLabels[relatedModuleKey]) relationLabels[relatedModuleKey] = {}
    const relConfig = await loadModuleConfig(relatedModuleKey as ModuleKey)
    if (!relConfig) return
    try {
      const res = await fetchEntityById<any>(relConfig.apiBase, id)
      relationLabels[relatedModuleKey][id] = res.name || res.username || res.realName || `ID:${id}`
    } catch {
      relationLabels[relatedModuleKey][id] = `ID:${id}`
    }
  }

  async function loadData() {
    if (!config.value.apiBase) return
    loading.value = true
    try {
      const params: QueryParams = {
        current: currentPage.value,
        size: 20,
      }
      for (const filter of config.value.filters || []) {
        const value = filterState[filter.fieldKey]
        if (value !== undefined && value !== '') {
          params[filter.fieldKey] = value
        }
      }
      for (const [key, value] of Object.entries(extraQueryState)) {
        if (value !== undefined && value !== '') {
          params[key] = value
        }
      }
      const res = await fetchEntityPage<any>(config.value.apiBase, params)
      tableData.value = res.records
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  async function loadChildTables(row: any) {
    if (!row?.id) {
      for (const tab of config.value.odooNotebookTabs || []) {
        childTableRows[tab.key] = []
        childTableLoading[tab.key] = false
      }
      return
    }
    const tabs = config.value.odooNotebookTabs || []
    for (const tab of tabs) {
      const childModule = await loadModuleConfig(tab.key as ModuleKey)
      if (!childModule) continue
      childModuleConfigs[tab.key] = childModule
      childTableLoading[tab.key] = true
      try {
        const parentFieldKey = tab.parentFieldKey
        if (!parentFieldKey) {
          childTableRows[tab.key] = []
          continue
        }
        const res = await fetchEntityPage<any>(childModule.apiBase, {
          current: 1,
          size: 100,
          [parentFieldKey]: row.id,
        })
        childTableRows[tab.key] = res.records
      } finally {
        childTableLoading[tab.key] = false
      }
    }
  }

  function formatValue(row: any, field: ModuleFieldConfig) {
    const val = row[field.key]
    if (val === undefined || val === null) return '-'
    const relationModule = inferRelationModule(field)
    if (relationModule && typeof val === 'number') {
      void fetchRelationLabel(relationModule, val)
      return relationLabels[relationModule]?.[val] || '...'
    }
    if (field.formatter === 'amount') {
      return `¥${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    }
    return val
  }

  async function handleAction(actionKey: string) {
    if (!activeRow.value) return
    loading.value = true
    try {
      await executeEntityAction(config.value.apiBase, activeRow.value.id, actionKey)
      const updated = await fetchEntityById<any>(config.value.apiBase, activeRow.value.id)
      activeRow.value = updated
      isCreating.value = false
      const actionConfig = (config.value.odooActions || []).find((item) => item.key === actionKey)
      lastActionOutcome.value = {
        actionKey,
        actionLabel: actionConfig?.label || actionKey,
        linkFieldKeys: resolveActionLinkFieldKeys(config.value.key, actionKey, updated),
      }
      await loadChildTables(updated)
      await loadData()
      ElMessage.success(t('app.actionSuccess'))
      if (preferencesStore.notifications) {
        window.erpDesktop?.sendNotification('NEKO_ERP', t('app.actionSuccess'))
      }
    } finally {
      loading.value = false
    }
  }

  async function handleSave() {
    if (!activeRow.value) return
    isSaving.value = true
    try {
      if (isCreating.value) {
        await createEntity(config.value.apiBase, sanitizePayload(activeRow.value))
        activeRow.value = null
        isPanelOpen.value = false
        isCreating.value = false
      } else {
        await updateEntity(config.value.apiBase, activeRow.value.id, sanitizePayload(activeRow.value))
        const updated = await fetchEntityById<any>(config.value.apiBase, activeRow.value.id)
        activeRow.value = updated
        await loadChildTables(updated)
      }
      ElMessage.success(t('app.saveSuccess'))
      if (preferencesStore.notifications) {
        window.erpDesktop?.sendNotification('NEKO_ERP', t('app.saveSuccess'))
      }
      await loadData()
    } finally {
      isSaving.value = false
    }
  }

  function handleRowClick(row: any) {
    isCreating.value = false
    lastActionOutcome.value = null
    activeRow.value = JSON.parse(JSON.stringify(row))
    isPanelOpen.value = true
    void loadChildTables(row)
  }

  function openCreatePanel() {
    lastActionOutcome.value = null
    activeRow.value = buildDraftRow()
    isCreating.value = true
    isPanelOpen.value = true
    void loadChildTables(activeRow.value)
  }

  function buildDraftRow(): BaseEntity {
    const draft: BaseEntity = {}
    for (const field of config.value.fields) {
      if (!field.form || field.key === 'id') continue
      if (field.key === config.value.odooStatus?.fieldKey && config.value.odooStatus.visible.includes('draft')) {
        draft[field.key] = 'draft'
        continue
      }
      if (field.type === 'switch') {
        draft[field.key] = false
        continue
      }
      draft[field.key] = undefined
    }
    return draft
  }

  function sanitizePayload(payload: BaseEntity): BaseEntity {
    const sanitized: BaseEntity = { ...payload }
    if ('id' in sanitized) {
      delete sanitized.id
    }
    return sanitized
  }

  function resetFilters() {
    for (const filter of config.value.filters || []) {
      filterState[filter.fieldKey] = undefined
    }
    currentPage.value = 1
    void loadData()
  }

  function setExtraQueryParam(key: string, value: string | number | undefined) {
    extraQueryState[key] = value
  }

  function clearExtraQueryParams() {
    for (const key of Object.keys(extraQueryState)) {
      delete extraQueryState[key]
    }
  }

  function resolveActionLinkFieldKeys(moduleKey: string, actionKey: string, row: Record<string, any>) {
    if (moduleKey === 'saleOrder' && actionKey === 'action_confirm' && row.pickingRef) {
      return ['pickingRef']
    }
    if (moduleKey === 'saleOrder' && actionKey === 'action_create_invoice' && row.invoiceRef) {
      return ['invoiceRef']
    }
    if (moduleKey === 'purchaseOrder' && actionKey === 'action_create_bill' && row.billRef) {
      return ['billRef']
    }
    if (moduleKey === 'accountInvoice' && actionKey === 'register_payment' && row.paymentRef) {
      return ['paymentRef']
    }
    if (moduleKey === 'accountMove' && actionKey === 'reverse' && row.reversedEntryRef) {
      return ['reversedEntryRef']
    }
    return []
  }

  return {
    config,
    tableData,
    loading,
    total,
    currentPage,
    filterState,
    extraQueryState,
    activeRow,
    isCreating,
    isPanelOpen,
    isSaving,
    lastActionOutcome,
    childTableRows,
    childTableLoading,
    childModuleConfigs,
    relationLabels,
    loadData,
    loadChildTables,
    formatValue,
    handleAction,
    handleSave,
    handleRowClick,
    openCreatePanel,
    resetFilters,
    setExtraQueryParam,
    clearExtraQueryParams,
  }
}
