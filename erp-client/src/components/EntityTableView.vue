<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import CompactNoticeBar from '@/components/CompactNoticeBar.vue'
import { moduleConfigMap, type ModuleKey } from '@/config/modules'
import { moduleManifestMap } from '@/config/module-manifest'
import { resolveUiRequestErrorMessage } from '@/api/http'
import { fetchReminders, type ReminderRecord } from '@/api/reminders'
import { createIrAttachment, fetchIrAttachmentPage } from '@/api/entities/irAttachment'
import {
  createEntity,
  deleteEntity,
  executeEntityAction,
  fetchEntityById,
  fetchEntityPage,
  updateEntity,
} from '@/api/modules'
import ReminderSummaryPanel from '@/components/ReminderSummaryPanel.vue'
import TimelinePanel from '@/components/TimelinePanel.vue'
import { fetchTimeline, type TimelineActivity } from '@/api/timeline'
import { useI18n } from '@/i18n'
import { useCommandCenterStore } from '@/stores/command-center'
import { useCutoverOpsStore } from '@/stores/cutover-ops'
import { useCutoverStore } from '@/stores/cutover'
import { resolveDefaultChainContacts, resolveDefaultChainGateState } from '@/utils/cutover'
import { buildCutoverClosedLoopSummary } from '@/utils/cutover-ops'
import { buildPilotConfirmationTemplate, buildSharedChainRunbookContent } from '@/utils/cutover-packets'
import {
  buildModuleEvidencePresets,
  resolveRecommendedEvidencePreset,
  summarizeEvidenceCoverage,
  type FirstWaveEvidencePreset,
} from '@/utils/first-wave-evidence'
import type {
  ModuleFieldConfig,
  ModuleFilterConfig,
  OdooNotebookTabConfig,
  QueryParams,
} from '@/types/api'
import {
  formatAmount,
  formatBoolean,
  formatDate,
  formatDateTime,
  formatModuleStatus,
} from '@/utils/format'
import { resolveDefaultDetailSection } from '@/utils/module-navigation'
import { downloadCsv, downloadJson, downloadText } from '@/utils/export'
import { decodeBase64Utf8, parseCsvText } from '@/utils/csv'
import { SHORTCUT_EVENT_MAP } from '@/stores/shortcuts'
import { buildReminderFamilyBlockers, pickTopReminder, resolveReminderSection, summarizeReminderFamilies } from '@/utils/reminders'
import { buildSysScriptDraftFromPreset } from '@/utils/sys-script-presets'

interface ResolvedLink {
  key: string
  label: string
  moduleKey: ModuleKey
  focusField: string
  value: string
  query?: Record<string, string>
}

interface WorkflowCard {
  key: string
  label: string
  value: string
  tone?: 'info' | 'success' | 'warning'
}

type WorkflowStageStatus = 'completed' | 'current' | 'blocked' | 'pending' | 'cancelled'

interface WorkflowStageNode {
  key: string
  label: string
  badge: string
  description: string
  status: WorkflowStageStatus
  link?: ResolvedLink
}

interface WorkflowExecutionCard {
  key: string
  label: string
  value: string
  description: string
  tone: 'default' | 'success' | 'warning' | 'danger'
  actionKey?: string
  link?: ResolvedLink
}

interface SuggestionItem {
  key: string
  label: string
  type: 'action' | 'link'
  actionKey?: string
  link?: ResolvedLink
}

interface RelationOption {
  id: number
  label: string
}

interface ContextChip {
  key: string
  label: string
  value: string
  link?: ResolvedLink
}

interface DocumentRecord {
  id: number
  name: string
  categoryKey: string
  displayName: string
  mimetype?: string
}

interface UploadDraft {
  presetKey: string
  displayName: string
  originalFileName: string
  mimetype: string
  dataBase64: string
}

interface ExtDataPresetField {
  key: string
  label: string
  placeholder: string
  type?: 'text' | 'textarea'
}

interface ExtDataPresetSection {
  key: string
  title: string
  description: string
  fields: ExtDataPresetField[]
}

interface DetailSectionLink {
  key: string
  label: string
  count: number
  tone: 'default' | 'warning' | 'danger' | 'success'
}

interface DownstreamRollbackItem {
  key: string
  label: string
  moduleKey: ModuleKey
  reference: string
  ready: boolean
  reason: string
}

interface DownstreamRollbackSummary {
  chainKey: string
  label: string
  expectedCount: number
  readyCount: number
  missingLabels: string[]
  items: DownstreamRollbackItem[]
  childLineSummary: Array<{ moduleKey: string; count: number }>
}

interface SettlementReadinessItem {
  key: string
  label: string
  value: string
  status: 'ready' | 'warning' | 'missing'
  reason: string
  link?: ResolvedLink
}

interface SettlementReadinessSummary {
  label: string
  statusLabel: string
  expectedCount: number
  readyCount: number
  warningCount: number
  missingCount: number
  missingLabels: string[]
  warningLabels: string[]
  items: SettlementReadinessItem[]
}

interface ReviewChecklistItem {
  key: string
  title: string
  description: string
  status: 'ready' | 'warning' | 'missing'
  section?: string
}

interface ExceptionActionCard {
  key: string
  title: string
  description: string
  buttonLabel: string
  tone: 'default' | 'warning' | 'danger' | 'success'
  actionType: 'section' | 'action' | 'link' | 'upload' | 'exportExceptions' | 'exportExceptionPacket' | 'exportHandoff' | 'copyHandoff' | 'copyContext' | 'exportContext'
  section?: string
  actionKey?: string
  link?: ResolvedLink
}

interface ContextSummaryCard {
  key: string
  label: string
  value: string
  description: string
  tone: 'default' | 'success' | 'warning' | 'danger'
}

interface ContextCoverageRow {
  key: string
  label: string
  value: string
  filled: boolean
  section?: string
}

interface ContextAlertItem {
  key: string
  title: string
  description: string
  tone: 'warning' | 'danger'
  section?: string
}

interface ContextTemplateItem {
  key: string
  label: string
  description: string
  values: Record<string, string>
}

interface ContextChainCard {
  key: string
  label: string
  enabled: boolean
  owner: string
  fallbackOwner: string
  rehearsalOwner: string
  pilotConfirmOwner: string
  reviewerOwner: string
  financeOwner: string
  readyCount: number
  pendingCount: number
  blockers: string[]
  note: string
  closedLoopReady: boolean
  closedLoopLabel: string
  closedLoopTone: 'success' | 'warning' | 'danger' | 'info'
  closedLoopMissingLabels: string[]
  closedLoopStaleLabels: string[]
}

interface ActionGuardrailPlan {
  title: string
  message: string
  type: 'warning' | 'error'
  recommendedSection: string
}

interface ClientFailureNotice {
  title: string
  message: string
  tone: 'warning' | 'danger'
  retryLabel: string
}

interface ActionGuardrailBlocker {
  key: string
  message: string
  section: string
  critical?: boolean
}

interface FirstWaveResultRailItem {
  key: string
  label: string
  value: string
  description: string
  tone: 'default' | 'success' | 'warning' | 'danger'
  actionType: 'action' | 'link' | 'section'
  buttonLabel: string
  actionKey?: string
  link?: ResolvedLink
  section?: string
}

interface FirstWaveResultSummaryCard {
  key: string
  label: string
  value: string
  description: string
  tone: 'default' | 'success' | 'warning' | 'danger'
}

interface CsvImportPreviewRow {
  rowNumber: number
  title: string
  summary: string
  status: 'ready' | 'invalid'
  reason: string
}

interface CsvImportPayloadRow {
  rowNumber: number
  title: string
  payload: Record<string, unknown>
}

interface CsvImportFailureRow {
  rowNumber: number
  title: string
  message: string
}

const PAGE_SIZE = 30
const EXT_DATA_MODULES = new Set<ModuleKey>(['resPartner', 'saleOrder', 'purchaseOrder', 'accountMove'])
const FIRST_WAVE_MASTER_DATA_MODULES = new Set<ModuleKey>([
  'resCompany',
  'productTemplate',
  'productProduct',
  'productCategory',
  'productPricelist',
])
const FIRST_WAVE_RESULT_COCKPIT_MODULES = new Set<ModuleKey>([
  'resPartner',
  'resCompany',
  'productTemplate',
  'productProduct',
  'productCategory',
  'productPricelist',
  'saleOrder',
  'purchaseOrder',
  'accountInvoice',
  'stockPicking',
  'accountPayment',
])
const RECORD_REMINDER_MODULES = new Set<ModuleKey>([
  'resPartner',
  'resCompany',
  'productTemplate',
  'productProduct',
  'productCategory',
  'productPricelist',
  'saleOrder',
  'purchaseOrder',
  'accountInvoice',
  'stockPicking',
  'accountPayment',
])
const FIRST_WAVE_ACTION_GUARDRAILS: Partial<Record<ModuleKey, string[]>> = {
  saleOrder: ['action_confirm', 'action_create_invoice'],
  purchaseOrder: ['action_confirm', 'action_create_bill'],
  stockPicking: ['action_confirm', 'action_validate'],
  accountInvoice: ['post', 'register_payment'],
  accountPayment: ['action_post', 'post'],
}
const FALLBACK_RELATION_MAP: Partial<Record<string, ModuleKey>> = {
  accountId: 'accountAccount',
  bomId: 'mrpBom',
  categId: 'productCategory',
  companyId: 'resCompany',
  currencyId: 'resCurrency',
  departmentId: 'hrDepartment',
  employeeId: 'hrEmployee',
  inventoryId: 'stockInventory',
  journalId: 'accountJournal',
  jobId: 'hrJob',
  locationDestId: 'stockLocation',
  locationId: 'stockLocation',
  moveId: 'accountMove',
  orderId: 'saleOrder',
  partnerId: 'resPartner',
  productId: 'productProduct',
  productTmplId: 'productTemplate',
  projectId: 'projectProject',
  stageId: 'crmStage',
  userId: 'sysUser',
  warehouseId: 'stockWarehouse',
}
const ACTION_RESULT_FIELD_MAP: Record<string, string[]> = {
  'accountInvoice:register_payment': ['paymentRef'],
  'accountMove:reverse': ['reversedEntryRef'],
  'purchaseOrder:action_confirm': ['receiptRef'],
  'purchaseOrder:action_create_bill': ['billRef'],
  'saleOrder:action_confirm': ['pickingRef'],
  'saleOrder:action_create_invoice': ['invoiceRef'],
}
const DOCUMENT_FIELD_TARGETS: Partial<Record<string, ModuleKey>> = {
  billRef: 'accountInvoice',
  invoiceRef: 'accountInvoice',
  journalEntryRef: 'accountMove',
  paymentRef: 'accountPayment',
  pickingRef: 'stockPicking',
  receiptRef: 'stockPicking',
  reversedEntryRef: 'accountMove',
  reversedFromRef: 'accountMove',
}

const props = defineProps<{ moduleKey: ModuleKey }>()

const route = useRoute()
const router = useRouter()
const desktopBridge = typeof window !== 'undefined' ? window.erpDesktop : undefined
const { actionLabel, fieldLabel, group, locale, moduleTitle, t } = useI18n()
const commandCenterStore = useCommandCenterStore()
const cutoverOpsStore = useCutoverOpsStore()
const cutoverStore = useCutoverStore()
const isEnglish = computed(() => locale.value === 'en-US')

const config = computed(() => moduleConfigMap[props.moduleKey])
const stateField = computed(() => config.value.odooStatus?.fieldKey || 'state')
const visibleListFields = computed(() => config.value.fields.filter((field) => field.list).slice(1, 4))
const visibleFormFields = computed(() => config.value.fields.filter((item) => item.form))
const detailFormFields = computed(() => visibleFormFields.value.filter((field) => !isCreating.value || field.key !== 'id'))
const supportsExtData = computed(() => EXT_DATA_MODULES.has(props.moduleKey))
const importableFields = computed(() =>
  visibleFormFields.value.filter((field) => field.key !== 'id' && !field.readonly),
)
const importableFieldMap = computed(
  () => Object.fromEntries(importableFields.value.map((field) => [field.key, field])) as Record<string, ModuleFieldConfig>,
)
const isFirstWaveRecord = computed(() => cutoverStore.isFirstWaveModule(props.moduleKey))
const extDataPresetSections = computed(() => buildExtDataPresetSections(props.moduleKey))
const extDataPresetKeySet = computed(() =>
  new Set(extDataPresetSections.value.flatMap((section) => section.fields.map((field) => field.key))),
)
const moduleDisplayTitle = computed(() => moduleTitle(props.moduleKey))
const groupDisplayTitle = computed(() => group(config.value.group))
const isDetailPage = computed(() => Boolean(expandedId.value && activeRow.value && !isCreating.value))
const fieldMap = computed(
  () => Object.fromEntries(config.value.fields.map((field) => [field.key, field])) as Record<string, ModuleFieldConfig>,
)

const tableData = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const expandedId = ref<number | null>(null)
const activeRow = ref<any>(null)
const isCreating = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const extDataDraftRows = ref<Array<{ key: string; value: string }>>([])
const extDataPresetDraft = reactive<Record<string, string>>({})
const childTableRows = reactive<Record<string, any[]>>({})
const childLoading = reactive<Record<string, boolean>>({})
const relationLabels = reactive<Record<string, Record<number, string>>>({})
const relationOptions = reactive<Record<string, RelationOption[]>>({})
const relationOptionLoading = reactive<Record<string, boolean>>({})
const detailSectionRefs = reactive<Record<string, HTMLElement | null>>({})
const lastActionOutcome = ref<{ actionKey: string; actionLabel: string; links: ResolvedLink[] } | null>(null)
const documentRows = ref<DocumentRecord[]>([])
const documentLoading = ref(false)
const recordReminderItems = ref<ReminderRecord[]>([])
const recordTimelineItems = ref<TimelineActivity[]>([])
const uploadDialogVisible = ref(false)
const uploadBusy = ref(false)
const selectedDocumentPreset = ref<string>('attachment')
const csvImportDialogVisible = ref(false)
const csvImportBusy = ref(false)
const csvImportSourceName = ref('')
const csvImportHeaders = ref<string[]>([])
const csvImportRecognizedHeaders = ref<string[]>([])
const csvImportExtHeaders = ref<string[]>([])
const csvImportUnknownHeaders = ref<string[]>([])
const csvImportPreviewRows = ref<CsvImportPreviewRow[]>([])
const csvImportPayloadRows = ref<CsvImportPayloadRow[]>([])
const csvImportFailureRows = ref<CsvImportFailureRow[]>([])
const csvImportSuccessCount = ref(0)
const csvImportSkippedRows = ref(0)
const csvImportCompleted = ref(false)
const clientFailureNotice = ref<ClientFailureNotice | null>(null)
const clientFailureRetry = ref<(() => void | Promise<void>) | null>(null)
const uploadDraft = reactive<UploadDraft>({
  presetKey: 'attachment',
  displayName: '',
  originalFileName: '',
  mimetype: '',
  dataBase64: '',
})

const filterState = reactive<Record<string, string | number | boolean | undefined>>({})
const relationPendingKeys = new Set<string>()
const relationOptionPendingKeys = new Set<string>()

const visibleActions = computed(() => {
  if (isCreating.value || !activeRow.value) return []
  const state = String(activeRow.value?.[stateField.value] || '')
  return (config.value.odooActions || []).filter((action) => {
    if (!action.visibleStates?.length) return true
    return action.visibleStates.map(String).includes(state)
  })
})

// Timeline stays generic and is enabled only on document-like records where audit trails matter most.
const shouldShowTimeline = computed(() =>
  ['resPartner', 'saleOrder', 'purchaseOrder', 'accountInvoice', 'accountPayment', 'stockPicking', 'mrpProduction', 'crmLead', 'accountJournal', 'sysUser', 'sysRole', 'projectProject', 'hrEmployee'].includes(config.value.key),
)
// First-wave reminders stay scoped to pilot-facing modules so cutover desks,
// rollback packets, and evidence pressure all align on the same detail page.
const shouldShowRecordReminders = computed(() =>
  RECORD_REMINDER_MODULES.has(config.value.key as ModuleKey),
)
const shouldShowRollbackPacket = computed(() => shouldShowRecordReminders.value && Boolean(activeRow.value?.id) && !isCreating.value)
const sheetTitle = computed(
  () => activeRow.value?.name || activeRow.value?.ref || activeRow.value?.model || `Entry #${activeRow.value?.id}`,
)

// Editable fields stay metadata-driven so later Odoo migration still only needs config changes.
const editableFieldKeys = computed(() => {
  if (!activeRow.value) return []
  if (isCreating.value) {
    return visibleFormFields.value
      .filter((field) => field.key !== 'id' && !field.readonly)
      .map((field) => field.key)
  }

  const state = String(activeRow.value?.[stateField.value] || '')
  if (config.value.odooEditableFieldsByState?.[state]) {
    return config.value.odooEditableFieldsByState[state]
  }
  if (config.value.odooEditableStates?.length) {
    return config.value.odooEditableStates.map(String).includes(state)
      ? visibleFormFields.value
          .filter((field) => field.key !== 'id' && !field.readonly)
          .map((field) => field.key)
      : []
  }
  return visibleFormFields.value
    .filter((field) => field.key !== 'id' && !field.readonly)
    .map((field) => field.key)
})

const canPersistRow = computed(() => {
  if (!activeRow.value) return false
  return isCreating.value || editableFieldKeys.value.length > 0 || supportsExtData.value
})

const canDuplicateRow = computed(() => Boolean(activeRow.value?.id) && !isCreating.value)

const formSections = computed(() => {
  const fieldMap = Object.fromEntries(detailFormFields.value.map((field) => [field.key, field])) as Record<string, ModuleFieldConfig>
  const sections: Array<{ key: string; title: string; fields: ModuleFieldConfig[] }> = []
  const usedFieldKeys = new Set<string>()
  const configuredGroups = config.value.odooFormGroups || []

  if (!configuredGroups.length) {
    return [
      {
        key: 'basic',
        title: t('app.basicInfo'),
        fields: detailFormFields.value,
      },
    ]
  }

  for (const section of configuredGroups) {
    const fields = section.fields
      .map((fieldKey) => fieldMap[fieldKey])
      .filter((field): field is ModuleFieldConfig => Boolean(field))
    if (!fields.length) continue
    fields.forEach((field) => usedFieldKeys.add(field.key))
    sections.push({
      key: section.key,
      title: section.title,
      fields,
    })
  }

  const remainingFields = detailFormFields.value.filter((field) => !usedFieldKeys.has(field.key))
  if (remainingFields.length) {
    sections.push({
      key: 'additional',
      title: 'Additional Fields',
      fields: remainingFields,
    })
  }

  return sections
})

const contextRows = computed<ContextChip[]>(() => {
  const rows: ContextChip[] = []
  if (route.query.contextField && route.query.contextValue) {
    rows.push(buildContextChip('context', String(route.query.contextField), String(route.query.contextValue)))
  }
  if (route.query.focusField && route.query.focusValue) {
    rows.push(buildContextChip('focus', String(route.query.focusField), String(route.query.focusValue)))
  }
  if (route.query.keyword) {
    rows.push({
      key: 'keyword',
      label: 'Keyword',
      value: String(route.query.keyword),
    })
  }
  return rows
})

const documentPresets = computed(() => buildDocumentPresets(props.moduleKey))
const recommendedUploadPreset = computed(() => resolveRecommendedEvidencePreset(props.moduleKey))
const selectedDocumentPresetLabel = computed(
  () => documentPresets.value.find((item) => item.key === selectedDocumentPreset.value)?.label || 'Attachment',
)
const groupedDocuments = computed(() =>
  documentPresets.value.map((preset) => ({
    ...preset,
    rows: documentRows.value.filter((item) => item.categoryKey === preset.key),
  })),
)
const uncategorizedDocuments = computed(() =>
  documentRows.value.filter((item) => !documentPresets.value.some((preset) => preset.key === item.categoryKey)),
)
const documentEvidenceSummary = computed(() => summarizeEvidenceCoverage(documentPresets.value, documentRows.value))

const linkedDocuments = computed(() => buildDocumentLinks(activeRow.value))
const linkedRelations = computed(() => buildRelationLinks(activeRow.value))
const workflowSnapshot = computed(() => buildWorkflowSnapshot(activeRow.value))
const workflowAlerts = computed(() => buildWorkflowAlerts(activeRow.value))
const nextSuggestions = computed(() => buildNextSuggestions(activeRow.value))
const primarySuggestionAction = computed(() => nextSuggestions.value.find((item) => item.type === 'action' && item.actionKey))
const primarySuggestionLink = computed(() => nextSuggestions.value.find((item) => item.type === 'link' && item.link))
const workflowStageNodes = computed(() => buildWorkflowStageNodes(activeRow.value))
const workflowBlockedStageCount = computed(() => workflowStageNodes.value.filter((item) => item.status === 'blocked').length)
const workflowCurrentStage = computed(() => {
  const current = workflowStageNodes.value.find((item) => item.status === 'current' || item.status === 'cancelled')
  if (current) return current
  return [...workflowStageNodes.value].reverse().find((item) => item.status === 'completed') || null
})
const workflowStageCaption = computed(() => {
  if (!workflowCurrentStage.value) {
    return isEnglish.value
      ? 'No rigid stage map is defined for this record yet.'
      : '当前记录暂时还没有刚性阶段图。'
  }
  return isEnglish.value
    ? `Current gate: ${workflowCurrentStage.value.label}. ${workflowCurrentStage.value.description}`
    : `当前门禁：${workflowCurrentStage.value.label}。${workflowCurrentStage.value.description}`
})
const workflowExecutionCards = computed(() => buildWorkflowExecutionCards(activeRow.value))
const shouldShowFirstWaveResultCockpit = computed(() => FIRST_WAVE_RESULT_COCKPIT_MODULES.has(props.moduleKey))
const firstWaveResultRailItems = computed<FirstWaveResultRailItem[]>(() => buildFirstWaveResultRailItems(activeRow.value))
const firstWaveResultSummaryCards = computed<FirstWaveResultSummaryCard[]>(() => buildFirstWaveResultSummaryCards())
// Rollback packets collect every reachable object reference around the record
// so cutover review does not depend on the operator remembering every jump path.
const rollbackLinks = computed(() => {
  const linkMap = new Map<string, ResolvedLink>()
  for (const link of [
    ...linkedDocuments.value,
    ...linkedRelations.value,
    ...buildFirstWaveRollbackLinks(activeRow.value),
    ...(lastActionOutcome.value?.links || []),
  ]) {
    linkMap.set(`${link.moduleKey}:${link.focusField}:${link.value}`, link)
  }
  return [...linkMap.values()]
})
const downstreamRollbackSummary = computed(() => buildDownstreamRollbackSummary(activeRow.value))
const firstWaveSettlementSummary = computed(() => buildFirstWaveSettlementSummary(activeRow.value))

const traceabilitySections = computed<DetailSectionLink[]>(() =>
  [
    hasRecordDetailContent.value
      ? {
          key: 'record',
          label: isEnglish.value ? 'Record' : '主记录',
          count: formSections.value.length + config.value.odooNotebookTabs.length + (supportsExtData.value ? 1 : 0),
          tone: 'default',
        }
      : null,
    isFirstWaveRecord.value
      ? {
          key: 'cutover',
          label: isEnglish.value ? 'Cutover' : '切换台',
          count: contextChainCards.value.length + recordReminderItems.value.length,
          tone: !cutoverStore.isModuleEnabled(props.moduleKey)
            ? 'danger'
            : recordReminderItems.value.some((item) => item.severity === 'critical')
              ? 'danger'
              : recordReminderItems.value.length || contextChainCards.value.some((item) => item.pendingCount)
                ? 'warning'
                : 'success',
        }
      : null,
    {
      key: 'context',
      label: isEnglish.value ? 'Context' : '上下文',
      count: contextOpenCount.value,
      tone: contextOpenCount.value
        ? contextAlertItems.value.some((item) => item.tone === 'danger')
          ? 'danger'
          : 'warning'
        : 'success',
    },
    shouldShowFirstWaveResultCockpit.value
      ? {
          key: 'chain',
          label: isEnglish.value ? 'Chain Cockpit' : '链路驾驶舱',
          count: firstWaveResultRailItems.value.length,
          tone: recordReminderItems.value.some((item) => item.severity === 'critical') || workflowBlockedStageCount.value
            ? 'danger'
            : firstWaveResultRailItems.value.some((item) => item.actionType === 'action')
              ? 'warning'
              : 'success',
        }
      : null,
    {
      key: 'traceability',
      label: isEnglish.value ? 'Traceability' : '追溯概览',
      count: rollbackLinks.value.length,
      tone: rollbackLinks.value.length ? 'success' : 'warning',
    },
    pilotReviewChecklist.value.length || visibleExceptionActionCards.value.length
      ? {
          key: 'review',
          label: isEnglish.value ? 'Review' : '核对台',
          count: pilotReviewChecklist.value.length + visibleExceptionActionCards.value.length,
          tone: pilotReviewChecklist.value.some((item) => item.status === 'missing')
            ? 'danger'
            : pilotReviewChecklist.value.some((item) => item.status === 'warning') || visibleExceptionActionCards.value.length
              ? 'warning'
              : 'default',
        }
      : null,
    {
      key: 'documents',
      label: isEnglish.value ? 'Documents' : '文档中心',
      count: documentRows.value.length,
      tone: documentRows.value.length ? 'success' : 'default',
    },
    {
      key: 'workflow',
      label: isEnglish.value ? 'Workflow' : '流程',
      count: workflowAlerts.value.length + nextSuggestions.value.length + workflowBlockedStageCount.value,
      tone: workflowAlerts.value.length
        ? 'danger'
        : workflowBlockedStageCount.value || nextSuggestions.value.length
          ? 'warning'
          : 'default',
    },
    {
      key: 'reminders',
      label: isEnglish.value ? 'Reminders' : '提醒',
      count: recordReminderItems.value.length,
      tone: recordReminderItems.value.some((item) => item.severity === 'critical')
        ? 'danger'
        : recordReminderItems.value.length
          ? 'warning'
          : 'default',
    },
    {
      key: 'timeline',
      label: isEnglish.value ? 'Timeline' : '时间轴',
      count: recordTimelineItems.value.length,
      tone: recordTimelineItems.value.length ? 'success' : 'default',
    },
    shouldShowRollbackPacket.value
      ? {
          key: 'rollback',
          label: isEnglish.value ? 'Rollback' : '回退包',
          count: rollbackLinks.value.length + downstreamRollbackSummary.value.items.length,
          tone: downstreamRollbackSummary.value.missingLabels.length
            ? 'warning'
            : rollbackLinks.value.length
              ? 'success'
              : 'default',
        }
      : null,
  ].filter((item): item is DetailSectionLink => Boolean(item)),
)

const traceabilitySummaryCards = computed(() => [
  {
    key: 'rollback',
    label: isEnglish.value ? 'Rollback Coverage' : '回退覆盖',
    value: `${rollbackLinks.value.length}`,
    description: isEnglish.value
      ? 'Reachable related objects packed for rollback review.'
      : '可追溯的关联对象都会进入回退核对范围。',
    tone: rollbackLinks.value.length ? 'success' : 'warning',
  },
  {
    key: 'documents',
    label: isEnglish.value ? 'Document Evidence' : '文档证据',
    value: `${documentRows.value.length}`,
    description: isEnglish.value
      ? 'Imported files, contracts, and proof documents on this record.'
      : '当前记录已经挂载的附件、合同和证明文件。',
    tone: documentRows.value.length ? 'success' : 'default',
  },
  ...(firstWaveSettlementSummary.value.expectedCount
    ? [
        {
          key: 'settlement',
          label: isEnglish.value ? 'Settlement Closure' : '结算闭环',
          value: `${firstWaveSettlementSummary.value.readyCount}/${firstWaveSettlementSummary.value.expectedCount}`,
          description: describeSettlementSummary(firstWaveSettlementSummary.value),
          tone: firstWaveSettlementSummary.value.missingCount
            ? 'danger'
            : firstWaveSettlementSummary.value.warningCount
              ? 'warning'
              : 'success',
        } satisfies ContextSummaryCard,
      ]
    : []),
  {
    key: 'downstream',
    label: isEnglish.value ? 'Downstream Pack' : '下游对象包',
    value: downstreamRollbackSummary.value.expectedCount
      ? `${downstreamRollbackSummary.value.readyCount}/${downstreamRollbackSummary.value.expectedCount}`
      : '-',
    description: downstreamRollbackSummary.value.missingLabels.length
      ? (isEnglish.value
          ? `Missing: ${downstreamRollbackSummary.value.missingLabels.join(' / ')}`
          : `缺失：${downstreamRollbackSummary.value.missingLabels.join(' / ')}`)
      : (isEnglish.value ? 'Downstream references are ready for rollback review.' : '下游引用已可用于回退核对。'),
    tone: downstreamRollbackSummary.value.expectedCount && downstreamRollbackSummary.value.readyCount === downstreamRollbackSummary.value.expectedCount
      ? 'success'
      : downstreamRollbackSummary.value.readyCount
        ? 'warning'
        : 'default',
  },
  {
    key: 'risks',
    label: isEnglish.value ? 'Open Risks' : '未处理风险',
    value: `${recordReminderItems.value.length + workflowAlerts.value.length + workflowBlockedStageCount.value}`,
    description: isEnglish.value
      ? 'Direct reminders, workflow warnings, and blocked stage gates that still need handling.'
      : '仍需处理的直接提醒、流程告警和被阻塞的阶段门禁数量。',
    tone: recordReminderItems.value.length || workflowAlerts.value.length || workflowBlockedStageCount.value ? 'danger' : 'success',
  },
  {
    key: 'timeline',
    label: isEnglish.value ? 'Timeline Signals' : '时间轴信号',
    value: `${recordTimelineItems.value.length}`,
    description: isEnglish.value
      ? 'Logs, notes, and attachment events already captured on this record.'
      : '当前记录已经累计的日志、便签和附件事件。',
    tone: recordTimelineItems.value.length ? 'success' : 'default',
  },
])

const extDataInsightRows = computed(() => {
  if (!supportsExtData.value || !activeRow.value) return []
  const extData = buildExtDataObject()
  if (props.moduleKey === 'resPartner') {
    return [
      { label: isEnglish.value ? 'Decision Maker' : '决策人', value: extData.decisionMaker || '-' },
      { label: isEnglish.value ? 'Contact Preference' : '沟通偏好', value: extData.communicationPreference || '-' },
      { label: isEnglish.value ? 'Relationship Risk' : '关系风险', value: extData.relationshipRisk || '-' },
      { label: isEnglish.value ? 'Background Notes' : '背景知识', value: extData.backgroundNotes ? truncateText(extData.backgroundNotes) : '-' },
    ]
  }
  if (props.moduleKey === 'saleOrder') {
    return [
      { label: isEnglish.value ? 'Delivery Risk' : '出库风险', value: extData.deliveryRisk || '-' },
      { label: isEnglish.value ? 'Invoice Checklist' : '开票检查', value: extData.invoiceChecklist || '-' },
      { label: isEnglish.value ? 'Customer Context' : '客户上下文', value: extData.customerContext ? truncateText(extData.customerContext) : '-' },
      { label: isEnglish.value ? 'Pilot Notes' : '试点备注', value: extData.pilotNotes ? truncateText(extData.pilotNotes) : '-' },
    ]
  }
  if (props.moduleKey === 'purchaseOrder') {
    return [
      { label: isEnglish.value ? 'Vendor Context' : '供应商背景', value: extData.vendorContext || '-' },
      { label: isEnglish.value ? 'Receipt Risk' : '收货风险', value: extData.receiptRisk || '-' },
      { label: isEnglish.value ? 'Payment Follow-up' : '付款跟进', value: extData.paymentFollowUp || '-' },
      { label: isEnglish.value ? 'Pilot Notes' : '试点备注', value: extData.pilotNotes ? truncateText(extData.pilotNotes) : '-' },
    ]
  }
  if (props.moduleKey === 'accountMove') {
    return [
      { label: isEnglish.value ? 'Audit Memo' : '审计备注', value: extData.auditMemo || '-' },
      { label: isEnglish.value ? 'Reconcile Context' : '对账上下文', value: extData.reconcileContext || '-' },
      { label: isEnglish.value ? 'Source Explanation' : '来源解释', value: extData.sourceExplanation || '-' },
      { label: isEnglish.value ? 'Reviewer' : '审核人', value: extData.reviewer || '-' },
    ]
  }
  return []
})

const contextCoverageRows = computed<ContextCoverageRow[]>(() => buildContextCoverageRows(activeRow.value))
const contextAlertItems = computed<ContextAlertItem[]>(() => buildContextAlertItems(activeRow.value))
const contextOpenCount = computed(() => contextAlertItems.value.length)
const contextSummaryCards = computed<ContextSummaryCard[]>(() => buildContextSummaryCards(activeRow.value))
const contextTemplateItems = computed<ContextTemplateItem[]>(() => buildContextTemplateItems(props.moduleKey))
const contextChainCards = computed<ContextChainCard[]>(() => buildContextChainCards())
const recordTopReminder = computed(() => pickTopReminder(recordReminderItems.value))
const firstWaveRecordCutoverCards = computed<ContextSummaryCard[]>(() => buildFirstWaveRecordCutoverCards())

const pilotReviewChecklist = computed<ReviewChecklistItem[]>(() => buildPilotReviewChecklist(activeRow.value))
const chainActionCards = computed<ExceptionActionCard[]>(() => buildChainActionCards(activeRow.value))
const exceptionActionCards = computed<ExceptionActionCard[]>(() => buildExceptionActionCards(activeRow.value))
const visibleChainActionCards = computed(() => chainActionCards.value.slice(0, shouldShowFirstWaveResultCockpit.value ? 4 : 6))
const hiddenChainActionCardCount = computed(() => Math.max(chainActionCards.value.length - visibleChainActionCards.value.length, 0))
const visibleExceptionActionCards = computed(() => exceptionActionCards.value.slice(0, shouldShowFirstWaveResultCockpit.value ? 4 : 6))
const hiddenExceptionActionCardCount = computed(() => Math.max(exceptionActionCards.value.length - visibleExceptionActionCards.value.length, 0))
const visibleLinkedDocuments = computed(() => shouldShowFirstWaveResultCockpit.value ? [] : linkedDocuments.value.slice(0, 6))
const hiddenLinkedDocumentCount = computed(() => Math.max(linkedDocuments.value.length - visibleLinkedDocuments.value.length, 0))
const visibleLinkedRelations = computed(() => shouldShowFirstWaveResultCockpit.value ? [] : linkedRelations.value.slice(0, 6))
const hiddenLinkedRelationCount = computed(() => Math.max(linkedRelations.value.length - visibleLinkedRelations.value.length, 0))
const hasRecordDetailContent = computed(() =>
  formSections.value.length || supportsExtData.value || config.value.odooNotebookTabs.length,
)
const availableDetailSections = computed(() => {
  const sections: string[] = []
  if (hasRecordDetailContent.value) sections.push('record')
  if (isFirstWaveRecord.value) sections.push('cutover')
  sections.push('context')
  if (shouldShowFirstWaveResultCockpit.value && firstWaveResultRailItems.value.length) sections.push('chain')
  sections.push('traceability')
  if (pilotReviewChecklist.value.length || visibleExceptionActionCards.value.length) sections.push('review')
  if (documentPresets.value.length) sections.push('documents')
  if (workflowStageNodes.value.length || workflowExecutionCards.value.length || workflowSnapshot.value.length || workflowAlerts.value.length || nextSuggestions.value.length) {
    sections.push('workflow')
  }
  if (shouldShowRollbackPacket.value) sections.push('rollback')
  if (shouldShowRecordReminders.value && activeRow.value?.id) sections.push('reminders')
  if (shouldShowTimeline.value && activeRow.value?.id) sections.push('timeline')
  return sections
})
const detailDefaultSection = computed(() => {
  if (shouldShowFirstWaveResultCockpit.value && firstWaveResultRailItems.value.length) return 'chain'
  if (isFirstWaveRecord.value) return 'cutover'
  if (props.moduleKey === 'resPartner') return 'context'
  if (hasRecordDetailContent.value) return 'record'
  return availableDetailSections.value[0] || 'context'
})
const csvImportTotalRows = computed(() => csvImportPreviewRows.value.length + csvImportSkippedRows.value)
const csvImportReadyCount = computed(() =>
  csvImportPreviewRows.value.filter((item) => item.status === 'ready').length,
)
const csvImportInvalidCount = computed(() =>
  csvImportPreviewRows.value.filter((item) => item.status === 'invalid').length,
)
const csvImportPreviewSample = computed(() => csvImportPreviewRows.value.slice(0, 8))
const currentDetailSection = computed(() => {
  const section = typeof route.query.section === 'string' ? route.query.section : ''
  return availableDetailSections.value.includes(section) ? section : detailDefaultSection.value
})

const insightRows = computed(() => {
  if (!activeRow.value) return []
  if (config.value.key === 'accountMove') {
    const lineRows = childTableRows.accountMoveLine || []
    const openCount = lineRows.filter((row) => String(row.reconciled) === 'open').length
    const matchedCount = lineRows.filter((row) => String(row.reconciled) === 'matched').length
    return [
      { label: 'Reference', value: activeRow.value.ref || '-' },
      {
        label: 'Amount Total',
        value: formatFieldValue(activeRow.value, {
          key: 'amountTotal',
          type: 'decimal',
          formatter: 'amount',
        }),
      },
      { label: 'Matched Lines', value: `${matchedCount}` },
      { label: 'Open Lines', value: `${openCount}` },
    ]
  }
  if (config.value.key === 'mrpProduction') {
    return [
      { label: 'Origin', value: activeRow.value.originRef || '-' },
      {
        label: 'Component Cost',
        value: formatFieldValue(activeRow.value, {
          key: 'componentCost',
          type: 'decimal',
          formatter: 'amount',
        }),
      },
      {
        label: 'Finished Cost',
        value: formatFieldValue(activeRow.value, {
          key: 'finishedCost',
          type: 'decimal',
          formatter: 'amount',
        }),
      },
      { label: 'Produced Qty', value: String(activeRow.value.qtyProduced ?? '-') },
    ]
  }
  if (config.value.key === 'stockMove') {
    return [
      { label: 'Role', value: formatModuleStatus(config.value.key, 'moveRole', activeRow.value.moveRole) },
      {
        label: 'Unit Cost',
        value: formatFieldValue(activeRow.value, {
          key: 'unitCost',
          type: 'decimal',
          formatter: 'amount',
        }),
      },
      {
        label: 'Total Cost',
        value: formatFieldValue(activeRow.value, {
          key: 'totalCost',
          type: 'decimal',
          formatter: 'amount',
        }),
      },
      { label: 'Origin', value: activeRow.value.originRef || '-' },
    ]
  }
  if (config.value.key === 'accountPayment') {
    return [
      { label: 'Reference', value: activeRow.value.name || '-' },
      { label: 'Type', value: formatModuleStatus(config.value.key, 'paymentType', activeRow.value.paymentType) },
      {
        label: 'Amount',
        value: formatFieldValue(activeRow.value, {
          key: 'amount',
          type: 'decimal',
          formatter: 'amount',
        }),
      },
      { label: 'Invoice', value: activeRow.value.invoiceRef || '-' },
      { label: 'Origin', value: activeRow.value.originRef || '-' },
    ]
  }
  if (config.value.key === 'stockPicking') {
    const moveRows = childTableRows.stockMove || []
    return [
      { label: 'Origin', value: activeRow.value.origin || '-' },
      { label: 'Partner', value: formatFieldValue(activeRow.value, { key: 'partnerId', type: 'number', relation: 'resPartner' }) },
      { label: 'Operations', value: `${moveRows.length}` },
      { label: 'Scheduled', value: activeRow.value.scheduledDate ? formatDateTime(String(activeRow.value.scheduledDate)) : '-' },
    ]
  }
  if (config.value.key === 'stockInventory') {
    const lineRows = childTableRows.stockInventoryLine || []
    return [
      { label: 'Reference', value: activeRow.value.name || '-' },
      { label: 'Scope', value: activeRow.value.locationIds || '-' },
      { label: 'Lines', value: `${lineRows.length}` },
      { label: 'Date', value: activeRow.value.date ? formatDateTime(String(activeRow.value.date)) : '-' },
    ]
  }
  if (config.value.key === 'crmLead') {
    return [
      { label: 'Partner', value: activeRow.value.partnerName || formatFieldValue(activeRow.value, { key: 'partnerId', type: 'number', relation: 'resPartner' }) },
      { label: 'Stage', value: activeRow.value.stageName || formatFieldValue(activeRow.value, { key: 'stageId', type: 'number', relation: 'crmStage' }) },
      {
        label: 'Expected Revenue',
        value: formatFieldValue(activeRow.value, {
          key: 'expectedRevenue',
          type: 'decimal',
          formatter: 'amount',
        }),
      },
      { label: 'Owner', value: activeRow.value.userName || formatFieldValue(activeRow.value, { key: 'userId', type: 'number', relation: 'sysUser' }) },
    ]
  }
  if (config.value.key === 'sysScript') {
    return [
      { label: 'Model', value: activeRow.value.model || '-' },
      { label: 'Event', value: activeRow.value.eventName || '-' },
      {
        label: 'Status',
        value: formatFieldValue(activeRow.value, {
          key: 'status',
          type: 'select',
          options: [{ label: 'Enabled', value: 1 }, { label: 'Disabled', value: 0 }],
        }),
      },
      { label: 'Lines', value: `${String(activeRow.value.scriptCode || '').split('\n').filter(Boolean).length}` },
    ]
  }
  if (config.value.key === 'sysUser') {
    return [
      { label: 'Username', value: activeRow.value.username || '-' },
      { label: 'Real Name', value: activeRow.value.realName || '-' },
      { label: 'Partner', value: formatFieldValue(activeRow.value, { key: 'partnerId', type: 'number', relation: 'resPartner' }) },
      { label: 'Status', value: String(activeRow.value.status ?? '-') },
    ]
  }
  if (config.value.key === 'accountJournal') {
    return [
      { label: 'Code', value: activeRow.value.code || '-' },
      { label: 'Type', value: activeRow.value.type || '-' },
      { label: 'Company', value: formatFieldValue(activeRow.value, { key: 'companyId', type: 'number', relation: 'resCompany' }) },
      { label: 'Currency', value: formatFieldValue(activeRow.value, { key: 'currencyId', type: 'number', relation: 'resCurrency' }) },
    ]
  }
  if (config.value.key === 'stockWarehouse') {
    return [
      { label: 'Code', value: activeRow.value.code || '-' },
      { label: 'Company', value: formatFieldValue(activeRow.value, { key: 'companyId', type: 'number', relation: 'resCompany' }) },
      { label: 'Name', value: activeRow.value.name || '-' },
      { label: 'Module', value: moduleDisplayTitle.value },
    ]
  }
  if (config.value.key === 'sysRole') {
    return [
      { label: 'Role Code', value: activeRow.value.roleCode || '-' },
      { label: 'Role Name', value: activeRow.value.roleName || '-' },
      { label: 'Status', value: String(activeRow.value.status ?? '-') },
      { label: 'Deleted', value: String(activeRow.value.deleted ?? '-') },
    ]
  }
  if (config.value.key === 'irLogging') {
    return [
      { label: 'Name', value: activeRow.value.name || '-' },
      { label: 'Level', value: activeRow.value.level || '-' },
      { label: 'User', value: formatFieldValue(activeRow.value, { key: 'userId', type: 'number', relation: 'sysUser' }) },
      { label: 'Model', value: activeRow.value.resModel || '-' },
    ]
  }
  if (config.value.key === 'resCompany') {
    return [
      { label: 'Partner', value: formatFieldValue(activeRow.value, { key: 'partnerId', type: 'number', relation: 'resPartner' }) },
      { label: 'Currency', value: formatFieldValue(activeRow.value, { key: 'currencyId', type: 'number', relation: 'resCurrency' }) },
      { label: 'Active', value: formatFieldValue(activeRow.value, { key: 'active', type: 'switch', formatter: 'boolean' }) },
      { label: 'Name', value: activeRow.value.name || '-' },
    ]
  }
  if (config.value.key === 'resCurrency') {
    return [
      { label: 'Symbol', value: activeRow.value.symbol || '-' },
      { label: 'Precision', value: `${activeRow.value.decimalPlaces ?? '-'}` },
      { label: 'Active', value: formatFieldValue(activeRow.value, { key: 'active', type: 'switch', formatter: 'boolean' }) },
      { label: 'Name', value: activeRow.value.name || '-' },
    ]
  }
  if (config.value.key === 'crmStage') {
    return [
      { label: 'Sequence', value: `${activeRow.value.sequence ?? '-'}` },
      { label: 'Won Stage', value: formatFieldValue(activeRow.value, { key: 'isWon', type: 'switch', formatter: 'boolean' }) },
      { label: 'Name', value: activeRow.value.name || '-' },
      { label: 'Module', value: moduleDisplayTitle.value },
    ]
  }
  if (config.value.key === 'hrEmployee') {
    return [
      { label: 'Job', value: activeRow.value.jobName || formatFieldValue(activeRow.value, { key: 'jobId', type: 'number', relation: 'hrJob' }) },
      { label: 'Department', value: activeRow.value.departmentName || formatFieldValue(activeRow.value, { key: 'departmentId', type: 'number', relation: 'hrDepartment' }) },
      { label: 'User', value: activeRow.value.userName || formatFieldValue(activeRow.value, { key: 'userId', type: 'number', relation: 'sysUser' }) },
      { label: 'Company', value: activeRow.value.companyName || formatFieldValue(activeRow.value, { key: 'companyId', type: 'number', relation: 'resCompany' }) },
    ]
  }
  if (config.value.key === 'irAttachment') {
    return [
      { label: 'Model', value: activeRow.value.resModel || '-' },
      { label: 'Record ID', value: `${activeRow.value.resId ?? '-'}` },
      { label: 'MIME', value: activeRow.value.mimetype || '-' },
      { label: 'Name', value: activeRow.value.name || '-' },
    ]
  }
  if (config.value.key === 'projectProject') {
    return [
      { label: 'Owner', value: activeRow.value.userName || formatFieldValue(activeRow.value, { key: 'userId', type: 'number', relation: 'sysUser' }) },
      { label: 'Partner', value: activeRow.value.partnerName || formatFieldValue(activeRow.value, { key: 'partnerId', type: 'number', relation: 'resPartner' }) },
      { label: 'Company', value: activeRow.value.companyName || formatFieldValue(activeRow.value, { key: 'companyId', type: 'number', relation: 'resCompany' }) },
      { label: 'Active', value: formatFieldValue(activeRow.value, { key: 'active', type: 'switch', formatter: 'boolean' }) },
    ]
  }
  if (config.value.key === 'stockLocation') {
    return [
      { label: 'Usage', value: activeRow.value.usage || '-' },
      { label: 'Warehouse', value: formatFieldValue(activeRow.value, { key: 'warehouseId', type: 'number', relation: 'stockWarehouse' }) },
      { label: 'Company', value: formatFieldValue(activeRow.value, { key: 'companyId', type: 'number', relation: 'resCompany' }) },
      { label: 'Name', value: activeRow.value.name || '-' },
    ]
  }
  if (extDataInsightRows.value.length) {
    return extDataInsightRows.value
  }
  return []
})

function buildDocumentPresets(moduleKey: ModuleKey): FirstWaveEvidencePreset[] {
  return buildModuleEvidencePresets(moduleKey, isEnglish.value)
}

function buildExtDataPresetSections(moduleKey: ModuleKey): ExtDataPresetSection[] {
  if (moduleKey === 'resPartner') {
    return [
      {
        key: 'background',
        title: isEnglish.value ? 'Background Knowledge' : '背景知识',
        description: isEnglish.value
          ? 'Capture relationship context that Odoo-style transactional fields do not express.'
          : '承接 Odoo 交易字段表达不了的关系背景和沟通上下文。',
        fields: [
          { key: 'decisionMaker', label: isEnglish.value ? 'Decision Maker' : '决策人', placeholder: isEnglish.value ? 'Who decides on orders or payments?' : '谁决定订单或付款？' },
          { key: 'communicationPreference', label: isEnglish.value ? 'Communication Preference' : '沟通偏好', placeholder: isEnglish.value ? 'Preferred time, channel, or tone' : '偏好的时间、渠道或沟通风格' },
          { key: 'relationshipRisk', label: isEnglish.value ? 'Relationship Risk' : '关系风险', placeholder: isEnglish.value ? 'Known risks or blockers' : '已知风险或阻碍' },
          { key: 'backgroundNotes', label: isEnglish.value ? 'Background Notes' : '背景备注', placeholder: isEnglish.value ? 'Culture, preference, or context notes' : '企业文化、偏好和背景说明', type: 'textarea' },
        ],
      },
    ]
  }
  if (moduleKey === 'saleOrder') {
    return [
      {
        key: 'cutover',
        title: isEnglish.value ? 'Sales Cutover Context' : '销售切换上下文',
        description: isEnglish.value
          ? 'Keep delivery and invoicing context close to the order instead of scattering it into separate notes.'
          : '把出库和开票上下文沉淀在订单旁边，而不是散落到单独备注里。',
        fields: [
          { key: 'customerContext', label: isEnglish.value ? 'Customer Context' : '客户上下文', placeholder: isEnglish.value ? 'Customer expectation, urgency, or special request' : '客户预期、紧急度或特殊要求', type: 'textarea' },
          { key: 'deliveryRisk', label: isEnglish.value ? 'Delivery Risk' : '出库风险', placeholder: isEnglish.value ? 'Stock or delivery risk' : '库存或交付风险' },
          { key: 'invoiceChecklist', label: isEnglish.value ? 'Invoice Checklist' : '开票检查', placeholder: isEnglish.value ? 'Billing checkpoints or exceptions' : '开票检查项或异常' },
          { key: 'pilotNotes', label: isEnglish.value ? 'Pilot Notes' : '试点备注', placeholder: isEnglish.value ? 'Cutover-specific notes' : '切换相关备注', type: 'textarea' },
        ],
      },
    ]
  }
  if (moduleKey === 'purchaseOrder') {
    return [
      {
        key: 'cutover',
        title: isEnglish.value ? 'Procurement Context' : '采购上下文',
        description: isEnglish.value
          ? 'Track vendor-side risks and bill follow-up without creating extra support pages.'
          : '记录供应商风险和账单跟进，不再额外散出支撑页面。',
        fields: [
          { key: 'vendorContext', label: isEnglish.value ? 'Vendor Context' : '供应商背景', placeholder: isEnglish.value ? 'Vendor preference or operating context' : '供应商偏好或合作背景', type: 'textarea' },
          { key: 'receiptRisk', label: isEnglish.value ? 'Receipt Risk' : '收货风险', placeholder: isEnglish.value ? 'Receiving or logistics risk' : '收货或物流风险' },
          { key: 'paymentFollowUp', label: isEnglish.value ? 'Payment Follow-up' : '付款跟进', placeholder: isEnglish.value ? 'Expected payment or bill follow-up' : '预期付款或账单跟进' },
          { key: 'pilotNotes', label: isEnglish.value ? 'Pilot Notes' : '试点备注', placeholder: isEnglish.value ? 'Cutover-specific notes' : '切换相关备注', type: 'textarea' },
        ],
      },
    ]
  }
  if (moduleKey === 'accountMove') {
    return [
      {
        key: 'accounting',
        title: isEnglish.value ? 'Accounting Context' : '会计上下文',
        description: isEnglish.value
          ? 'Store reconciliation and audit context without changing the hard-coded journal schema.'
          : '不改动硬编码凭证结构，也能沉淀对账和审计背景。',
        fields: [
          { key: 'auditMemo', label: isEnglish.value ? 'Audit Memo' : '审计备注', placeholder: isEnglish.value ? 'Audit memo or reviewer comment' : '审计备注或审核意见', type: 'textarea' },
          { key: 'reconcileContext', label: isEnglish.value ? 'Reconcile Context' : '对账上下文', placeholder: isEnglish.value ? 'Match rule or reconcile note' : '匹配规则或对账说明' },
          { key: 'sourceExplanation', label: isEnglish.value ? 'Source Explanation' : '来源解释', placeholder: isEnglish.value ? 'Where this entry comes from' : '该凭证的来源解释', type: 'textarea' },
          { key: 'reviewer', label: isEnglish.value ? 'Reviewer' : '审核人', placeholder: isEnglish.value ? 'Reviewer name or role' : '审核人姓名或角色' },
        ],
      },
    ]
  }
  return []
}

function buildAttachmentName(prefix: string, displayName: string, originalFileName: string) {
  const baseName = displayName.trim() || originalFileName.trim() || 'document'
  return `[${prefix}] ${baseName}`
}

function parseAttachmentCategory(name?: string | null) {
  const matched = String(name || '').match(/^\[([A-Z_]+)\]\s*(.*)$/)
  if (!matched) {
    return {
      categoryKey: 'attachment',
      displayName: String(name || '-'),
    }
  }
  const prefix = matched[1]
  const preset = documentPresets.value.find((item) => item.namePrefix === prefix)
  return {
    categoryKey: preset?.key || 'attachment',
    displayName: matched[2] || String(name || '-'),
  }
}

function clearDocumentDraft() {
  uploadDraft.presetKey = 'attachment'
  uploadDraft.displayName = ''
  uploadDraft.originalFileName = ''
  uploadDraft.mimetype = ''
  uploadDraft.dataBase64 = ''
}

function clearDocumentRows() {
  documentRows.value = []
}

async function loadDocumentRows() {
  if (!activeRow.value?.id || isCreating.value) {
    clearDocumentRows()
    return
  }
  documentLoading.value = true
  try {
    const res = await fetchIrAttachmentPage({
      current: 1,
      size: 50,
      resModel: props.moduleKey,
      resId: Number(activeRow.value.id),
    })
    documentRows.value = res.records.map((item: any) => {
      const parsed = parseAttachmentCategory(item.name)
      return {
        id: Number(item.id),
        name: String(item.name || '-'),
        categoryKey: parsed.categoryKey,
        displayName: parsed.displayName,
        mimetype: item.mimetype,
      }
    })
  } finally {
    documentLoading.value = false
  }
}

function guessMimeType(fileName: string) {
  const normalized = fileName.toLowerCase()
  if (normalized.endsWith('.pdf')) return 'application/pdf'
  if (normalized.endsWith('.png')) return 'image/png'
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg'
  if (normalized.endsWith('.webp')) return 'image/webp'
  if (normalized.endsWith('.doc')) return 'application/msword'
  if (normalized.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (normalized.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (normalized.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (normalized.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

async function pickDocumentFile() {
  const chosen = await window.erpDesktop?.chooseFile({
    title: selectedDocumentPresetLabel.value,
    filters: [
      { name: 'Business Files', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (!chosen) return
  uploadDraft.originalFileName = chosen.name
  uploadDraft.displayName = uploadDraft.displayName || chosen.name
  uploadDraft.dataBase64 = chosen.dataBase64
  uploadDraft.mimetype = guessMimeType(chosen.name)
}

function openUploadDialog(presetKey = 'attachment') {
  selectedDocumentPreset.value = presetKey
  uploadDraft.presetKey = presetKey
  uploadDraft.displayName = ''
  uploadDraft.originalFileName = ''
  uploadDraft.dataBase64 = ''
  uploadDraft.mimetype = ''
  uploadDialogVisible.value = true
}

async function saveDocumentAttachment() {
  if (!activeRow.value?.id) return
  const preset = documentPresets.value.find((item) => item.key === selectedDocumentPreset.value)
  if (!preset) {
    ElMessage.warning('Document category is required')
    return
  }
  if (!uploadDraft.originalFileName || !uploadDraft.dataBase64) {
    ElMessage.warning('Choose a file first')
    return
  }
  uploadBusy.value = true
  try {
    await createIrAttachment({
      name: buildAttachmentName(preset.namePrefix, uploadDraft.displayName, uploadDraft.originalFileName),
      resModel: props.moduleKey,
      resId: Number(activeRow.value.id),
      datas: uploadDraft.dataBase64,
      mimetype: uploadDraft.mimetype || guessMimeType(uploadDraft.originalFileName),
    } as any)
    uploadDialogVisible.value = false
    clearDocumentDraft()
    await loadDocumentRows()
    await loadDetailSignals(Number(activeRow.value.id))
    clearClientFailureNotice()
    ElMessage.success('Attachment imported')
  } catch (error) {
    reportHandledClientFailure('saveDocumentAttachment', error, {
      retry: () => {
        void saveDocumentAttachment()
      },
      retryLabel: isEnglish.value ? 'Retry Upload' : '重试上传',
      tone: 'warning',
    })
  } finally {
    uploadBusy.value = false
  }
}

function bytesFromAttachmentData(raw: unknown) {
  if (typeof raw === 'string') {
    const binary = window.atob(raw)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  }
  if (Array.isArray(raw)) {
    return Uint8Array.from(raw)
  }
  return new Uint8Array()
}

async function openDocumentAttachment(record: DocumentRecord) {
  const attachment = await fetchEntityById<any>('/base/ir-attachment', record.id)
  const bytes = bytesFromAttachmentData(attachment.datas)
  const blob = new Blob([bytes], { type: attachment.mimetype || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function openRecordCutoverSettings() {
  void router.push({
    name: 'settings',
    query: {
      tab: 'cutover',
      module: props.moduleKey,
    },
  })
}

function openRecordTopReminderArea() {
  openDetailSection(resolveReminderSection(recordTopReminder.value))
}

async function rollbackCurrentRecordModule() {
  if (!isFirstWaveRecord.value || !cutoverStore.isModuleEnabled(props.moduleKey)) {
    openRecordCutoverSettings()
    return
  }
  try {
    await ElMessageBox.confirm(
      isEnglish.value
        ? 'Disable the current module pilot entry and reopen cutover settings?'
        : '确认关闭当前模块的试点入口，并跳转到切换设置吗？',
      isEnglish.value ? 'Stop Pilot Entry' : '停止试点入口',
      {
        type: 'warning',
        confirmButtonText: isEnglish.value ? 'Disable Pilot' : '关闭试点',
        cancelButtonText: isEnglish.value ? 'Cancel' : '取消',
      },
    )
  } catch {
    return
  }
  cutoverStore.rollbackModule(props.moduleKey)
  ElMessage.success(isEnglish.value ? 'Pilot entry disabled for this module.' : '当前模块的试点入口已关闭。')
  openRecordCutoverSettings()
}

async function exportRecordRollbackPacket() {
  if (!activeRow.value?.id) return
  const reminders = await fetchReminders({
    limit: 20,
    moduleKey: props.moduleKey,
    recordId: Number(activeRow.value.id),
  })
  downloadJson(
    `neko_erp_${props.moduleKey}_${activeRow.value.id}_rollback_packet.json`,
    {
      exportedAt: new Date().toISOString(),
      moduleKey: props.moduleKey,
      recordId: Number(activeRow.value.id),
      title: sheetTitle.value,
      state: activeRow.value?.[stateField.value] ?? null,
      record: activeRow.value,
      evidenceSummary: {
        expectedCount: documentEvidenceSummary.value.expectedCount,
        readyCount: documentEvidenceSummary.value.readyCount,
        missingRequiredCategories: documentEvidenceSummary.value.missingLabels,
        readyCategories: documentEvidenceSummary.value.readyLabels,
      },
      documents: documentRows.value.map((item) => ({
        id: item.id,
        name: item.name,
        displayName: item.displayName,
        categoryKey: item.categoryKey,
        mimetype: item.mimetype,
      })),
      timelineSummary: {
        totalCount: recordTimelineItems.value.length,
        noteCount: recordTimelineItems.value.filter((item) => item.type === 'note').length,
        attachmentEventCount: recordTimelineItems.value.filter((item) => item.type === 'attachment').length,
        systemEventCount: recordTimelineItems.value.filter((item) => item.type === 'system').length,
      },
      timelineEvents: recordTimelineItems.value.slice(0, 20).map((item) => ({
        timestamp: item.timestamp,
        type: item.type,
        title: item.title,
        content: item.content,
        author: item.author,
        relatedRef: item.relatedRef,
      })),
      downstreamSummary: downstreamRollbackSummary.value,
      settlementSummary: firstWaveSettlementSummary.value,
      relatedLinks: rollbackLinks.value,
      workflowAlerts: workflowAlerts.value,
      nextSuggestions: nextSuggestions.value.map((item) => ({
        key: item.key,
        label: item.label,
        type: item.type,
        actionKey: item.actionKey,
        link: item.link,
      })),
      chainActions: chainActionCards.value.map((item) => ({
        key: item.key,
        title: item.title,
        description: item.description,
        actionType: item.actionType,
        actionKey: item.actionKey,
        section: item.section,
        link: item.link,
      })),
      cutoverContext: {
        checklist: pilotReviewChecklist.value,
        summaryCards: contextSummaryCards.value,
        coverageRows: contextCoverageRows.value,
        alertItems: contextAlertItems.value,
        chainCards: contextChainCards.value,
        extDataInsights: extDataInsightRows.value,
        pilotConfirmationTemplate: buildRecordPilotConfirmationTemplate(),
        chainRunbookSummaries: buildRecordChainRunbookSummaries(),
        contextBrief: buildContextBriefContent(),
        exceptionPacket: buildRecordExceptionPacketContent(),
      },
      reminders,
    },
  )
  ElMessage.success('Rollback packet exported')
}

async function exportRecordExceptionList() {
  if (!activeRow.value?.id) return
  const rows = await fetchReminders({
    limit: 20,
    moduleKey: props.moduleKey,
    recordId: Number(activeRow.value.id),
  })
  downloadCsv(
    `neko_erp_${props.moduleKey}_${activeRow.value.id}_exceptions.csv`,
    [
      { key: 'severity', title: 'Severity' },
      { key: 'recordId', title: 'Record ID' },
      { key: 'title', title: 'Title' },
      { key: 'relatedRef', title: 'Reference' },
      { key: 'content', title: 'Content' },
      { key: 'createdAt', title: 'Created At' },
    ],
    rows,
  )
  ElMessage.success('Record exception list exported')
}

function buildRecordExceptionPacketContent() {
  return [
    `# ${sheetTitle.value} ${isEnglish.value ? 'Exception Packet' : '异常包'}`,
    '',
    `${isEnglish.value ? 'Module' : '模块'}: ${moduleDisplayTitle.value}`,
    `${isEnglish.value ? 'Record ID' : '记录ID'}: ${activeRow.value?.id ?? '-'}`,
    `${isEnglish.value ? 'State' : '状态'}: ${activeRow.value?.[stateField.value] ?? '-'}`,
    `${isEnglish.value ? 'Exported At' : '导出时间'}: ${new Date().toISOString()}`,
    '',
    `## ${isEnglish.value ? 'Review Snapshot' : '核对快照'}`,
    `- ${isEnglish.value ? 'Checklist Ready' : '清单就绪'}: ${pilotReviewChecklist.value.filter((item) => item.status === 'ready').length}/${pilotReviewChecklist.value.length}`,
    `- ${isEnglish.value ? 'Direct Reminders' : '直接提醒'}: ${recordReminderItems.value.length}`,
    `- ${isEnglish.value ? 'Workflow Alerts' : '流程告警'}: ${workflowAlerts.value.length}`,
    `- ${isEnglish.value ? 'Blocked Workflow Stages' : '阻塞阶段'}: ${workflowBlockedStageCount.value}`,
    `- ${isEnglish.value ? 'Documents Ready' : '文档就绪'}: ${documentEvidenceSummary.value.readyCount}/${documentEvidenceSummary.value.expectedCount || 0}`,
    '',
    `## ${isEnglish.value ? 'Context Blockers' : '上下文阻塞'}`,
    ...(contextAlertItems.value.length
      ? contextAlertItems.value.map((item) => `- [${item.tone}] ${item.title}: ${item.description}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Direct Reminder Detail' : '直接提醒明细'}`,
    ...(recordReminderItems.value.length
      ? recordReminderItems.value.map((item) => `- [${item.severity}] ${item.title}: ${item.content}${item.relatedRef ? ` (${item.relatedRef})` : ''}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Workflow Alerts' : '流程告警'}`,
    ...(workflowAlerts.value.length ? workflowAlerts.value.map((item) => `- ${item}`) : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Missing Evidence' : '缺失证据'}`,
    ...(documentEvidenceSummary.value.missingLabels.length
      ? documentEvidenceSummary.value.missingLabels.map((item) => `- ${item}`)
      : [`- ${isEnglish.value ? 'No required evidence is missing.' : '当前没有缺失的必备证据。'}`]),
    '',
    `## ${isEnglish.value ? 'Related Rollback Links' : '回退关联链接'}`,
    ...(rollbackLinks.value.length
      ? rollbackLinks.value.map((item) => `- ${item.label}: ${item.value} -> ${item.moduleKey}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Downstream Pack' : '下游对象包'}`,
    `- ${isEnglish.value ? 'Ready' : '已就绪'}: ${downstreamRollbackSummary.value.readyCount}/${downstreamRollbackSummary.value.expectedCount}`,
    ...(downstreamRollbackSummary.value.missingLabels.length
      ? downstreamRollbackSummary.value.missingLabels.map((item) => `- ${isEnglish.value ? 'Missing' : '缺失'}: ${item}`)
      : [`- ${isEnglish.value ? 'No downstream gaps.' : '当前没有下游缺口。'}`]),
    '',
    `## ${isEnglish.value ? 'Settlement Closure' : '结算闭环'}`,
    ...buildSettlementSummaryLines(firstWaveSettlementSummary.value),
    '',
    `## ${isEnglish.value ? 'Chain Ownership' : '链路责任'}`,
    ...(contextChainCards.value.length
      ? contextChainCards.value.map((item) => `- ${item.label}: ${item.owner || '-'} / ${item.fallbackOwner || '-'} / ${item.rehearsalOwner || '-'} / ${item.pilotConfirmOwner || '-'} / ${describeContextChainClosedLoop(item)}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Suggested Next Step' : '建议下一步'}`,
    ...(nextSuggestions.value.length
      ? nextSuggestions.value.map((item) => `- ${item.label}`)
      : [`- ${isEnglish.value ? 'No direct next step.' : '当前没有直接下一步。'}`]),
  ].join('\n')
}

function exportRecordExceptionPacket() {
  if (!activeRow.value?.id) return
  downloadText(
    `neko_erp_${props.moduleKey}_${activeRow.value.id}_exception_packet_${new Date().toISOString().slice(0, 10)}.md`,
    buildRecordExceptionPacketContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(isEnglish.value ? 'Record exception packet exported' : '记录异常包已导出')
}

function checklistToneLabel(status: ReviewChecklistItem['status']) {
  if (status === 'ready') return isEnglish.value ? 'Ready' : '已就绪'
  if (status === 'missing') return isEnglish.value ? 'Missing' : '缺失'
  return isEnglish.value ? 'Review' : '待核对'
}

function describeContextChainClosedLoop(item: ContextChainCard) {
  const segments = [item.closedLoopLabel]
  if (item.closedLoopMissingLabels.length) {
    segments.push(`${isEnglish.value ? 'Missing' : '缺少'}: ${item.closedLoopMissingLabels.join(' / ')}`)
  }
  if (item.closedLoopStaleLabels.length) {
    segments.push(`${isEnglish.value ? 'Stale' : '过期'}: ${item.closedLoopStaleLabels.join(' / ')}`)
  }
  return segments.join(' · ')
}

function settlementItemStatusLabel(status: SettlementReadinessItem['status']) {
  if (status === 'ready') return isEnglish.value ? 'Ready' : '已就绪'
  if (status === 'missing') return isEnglish.value ? 'Missing' : '缺失'
  return isEnglish.value ? 'In Progress' : '进行中'
}

function describeSettlementSummary(summary: SettlementReadinessSummary) {
  if (!summary.expectedCount) {
    return isEnglish.value ? 'No settlement closure checklist applies to the current record.' : '当前记录没有适用的结算闭环检查。'
  }
  const segments = [`${summary.statusLabel} · ${summary.readyCount}/${summary.expectedCount}`]
  if (summary.missingLabels.length) {
    segments.push(`${isEnglish.value ? 'Missing' : '缺失'}: ${summary.missingLabels.join(' / ')}`)
  }
  if (summary.warningLabels.length) {
    segments.push(`${isEnglish.value ? 'Pending' : '待推进'}: ${summary.warningLabels.join(' / ')}`)
  }
  return segments.join(' · ')
}

function buildSettlementSummaryLines(summary: SettlementReadinessSummary) {
  if (!summary.expectedCount) {
    return [`- ${isEnglish.value ? 'No settlement closure checklist applies.' : '当前没有适用的结算闭环检查。'}`]
  }
  return [
    `- ${isEnglish.value ? 'Status' : '状态'}: ${summary.statusLabel}`,
    `- ${isEnglish.value ? 'Ready' : '已就绪'}: ${summary.readyCount}/${summary.expectedCount}`,
    ...summary.items.map((item) => `- [${settlementItemStatusLabel(item.status)}] ${item.label}: ${item.value} · ${item.reason}`),
  ]
}

function buildRecordHandoffContent() {
  return [
    `# ${sheetTitle.value}`,
    '',
    `${isEnglish.value ? 'Module' : '模块'}: ${props.moduleKey}`,
    `${isEnglish.value ? 'Record ID' : '记录ID'}: ${activeRow.value?.id ?? '-'}`,
    `${isEnglish.value ? 'State' : '状态'}: ${activeRow.value?.[stateField.value] ?? '-'}`,
    `${isEnglish.value ? 'Exported At' : '导出时间'}: ${new Date().toISOString()}`,
    '',
    `## ${isEnglish.value ? 'Pilot Review Checklist' : '试点核对清单'}`,
    ...pilotReviewChecklist.value.map((item) => `- [${checklistToneLabel(item.status)}] ${item.title}: ${item.description}`),
    '',
    `## ${isEnglish.value ? 'Workflow Alerts' : '流程告警'}`,
    ...(workflowAlerts.value.length ? workflowAlerts.value.map((item) => `- ${item}`) : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Chain Action Deck' : '链路动作台'}`,
    ...(chainActionCards.value.length
      ? chainActionCards.value.map((item) => `- ${item.title}: ${item.description}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Direct Reminders' : '直接提醒'}`,
    ...(recordReminderItems.value.length
      ? recordReminderItems.value.map((item) => `- ${item.title}: ${item.content}${item.relatedRef ? ` (${item.relatedRef})` : ''}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Chain Ownership' : '链路责任'}`,
    ...(contextChainCards.value.length
      ? contextChainCards.value.map((item) => [
          `- ${item.label}`,
          `  ${isEnglish.value ? 'Owner' : '负责人'}: ${item.owner || '-'}`,
          `  ${isEnglish.value ? 'Fallback Owner' : '回退负责人'}: ${item.fallbackOwner || '-'}`,
          `  ${isEnglish.value ? 'Rehearsal Owner' : '演练负责人'}: ${item.rehearsalOwner || '-'}`,
          `  ${isEnglish.value ? 'Pilot Confirmation Owner' : '试点确认负责人'}: ${item.pilotConfirmOwner || '-'}`,
          `  ${isEnglish.value ? 'Closed Loop' : '闭环状态'}: ${describeContextChainClosedLoop(item)}`,
        ].join('\n'))
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Traceability Links' : '追溯链接'}`,
    ...(rollbackLinks.value.length
      ? rollbackLinks.value.map((item) => `- ${item.label}: ${item.value} -> ${item.moduleKey}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Document Evidence' : '文档证据'}`,
    ...(documentRows.value.length
      ? documentRows.value.map((item) => `- ${item.displayName} (${item.mimetype || 'file'})`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    ...(documentEvidenceSummary.value.missingLabels.length
      ? [
          '',
          `## ${isEnglish.value ? 'Missing Required Evidence' : '缺失的必备证据'}`,
          ...documentEvidenceSummary.value.missingLabels.map((item) => `- ${item}`),
        ]
      : []),
    '',
    `## ${isEnglish.value ? 'Relationship Memory' : '关系记忆'}`,
    ...(extDataInsightRows.value.length
      ? extDataInsightRows.value.map((item) => `- ${item.label}: ${item.value}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Context Coverage' : '上下文覆盖'}`,
    ...(contextCoverageRows.value.length
      ? contextCoverageRows.value.map((item) => `- ${item.label}: ${item.value}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Available Templates' : '可用模板'}`,
    ...(contextTemplateItems.value.length
      ? contextTemplateItems.value.map((item) => `- ${item.label}: ${item.description}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Downstream Rollback Summary' : '下游回退摘要'}`,
    `- ${isEnglish.value ? 'Ready' : '已就绪'}: ${downstreamRollbackSummary.value.readyCount}/${downstreamRollbackSummary.value.expectedCount}`,
    ...(downstreamRollbackSummary.value.missingLabels.length
      ? downstreamRollbackSummary.value.missingLabels.map((item) => `- ${isEnglish.value ? 'Missing' : '缺失'}: ${item}`)
      : [`- ${isEnglish.value ? 'No downstream gaps.' : '当前没有下游缺口。'}`]),
    '',
    `## ${isEnglish.value ? 'Settlement Closure' : '结算闭环'}`,
    ...buildSettlementSummaryLines(firstWaveSettlementSummary.value),
    '',
    `## ${isEnglish.value ? 'Suggested Next Step' : '建议下一步'}`,
    ...(nextSuggestions.value.length
      ? nextSuggestions.value.map((item) => `- ${item.label}`)
      : [`- ${isEnglish.value ? 'No direct next step.' : '当前没有直接下一步。'}`]),
    '',
    `## ${isEnglish.value ? 'Timeline Signals' : '时间轴信号'}`,
    ...(recordTimelineItems.value.length
      ? recordTimelineItems.value.slice(0, 10).map((item) => `- ${item.type}: ${item.title} / ${item.content}`)
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
    '',
    `## ${isEnglish.value ? 'Pilot Confirmation Template' : '试点确认模板'}`,
    buildRecordPilotConfirmationTemplate(),
    '',
    `## ${isEnglish.value ? 'Chain Runbook Summaries' : '链路手册摘要'}`,
    ...(buildRecordChainRunbookSummaries().length
      ? buildRecordChainRunbookSummaries()
      : [`- ${isEnglish.value ? 'None' : '无'}`]),
  ].join('\n')
}

function buildRecordPilotConfirmationTemplate() {
  return buildPilotConfirmationTemplate({
    english: isEnglish.value,
    generatedAt: new Date().toISOString(),
    summary: {
      readyChains: contextChainCards.value.filter((item) => item.readyCount === 6).length,
      totalChains: contextChainCards.value.length,
      criticalChains: contextChainCards.value.filter((item) => item.pendingCount > 0 || !item.closedLoopReady).length,
      warningChains: contextChainCards.value.filter((item) => item.pendingCount > 0 || !item.closedLoopReady).length,
      pendingGates: contextChainCards.value.reduce((sum, item) => sum + item.pendingCount, 0),
      openReminders: recordReminderItems.value.length,
    },
    chains: contextChainCards.value.map((item) => ({
      label: item.label,
      enabled: item.enabled,
      modulesLabel: moduleDisplayTitle.value,
      readyLabel: `${item.readyCount}/6`,
      summaryLabel: item.pendingCount ? (isEnglish.value ? 'Needs Review' : '待核对') : (isEnglish.value ? 'Accepted' : '已放行'),
      closedLoopLabel: item.closedLoopLabel,
      closedLoopMissingLabels: item.closedLoopMissingLabels,
      closedLoopStaleLabels: item.closedLoopStaleLabels,
      pendingLabels: item.blockers,
      blockerLabels: item.blockers,
      owner: item.owner,
      fallbackOwner: item.fallbackOwner,
      rehearsalOwner: item.rehearsalOwner,
      pilotConfirmOwner: item.pilotConfirmOwner,
      reviewerOwner: item.reviewerOwner,
      financeOwner: item.financeOwner,
      gateNote: item.note,
    })),
  })
}

function buildRecordChainRunbookSummaries() {
  return contextChainCards.value.map((item) =>
    buildSharedChainRunbookContent({
      english: isEnglish.value,
      generatedAt: new Date().toISOString(),
      mode: 'handbook',
      chain: {
        label: item.label,
        enabled: item.enabled,
        modulesLabel: moduleDisplayTitle.value,
        readyLabel: `${item.readyCount}/6`,
        summaryLabel: item.pendingCount ? (isEnglish.value ? 'Needs Review' : '待核对') : (isEnglish.value ? 'Accepted' : '已放行'),
        closedLoopLabel: item.closedLoopLabel,
        closedLoopMissingLabels: item.closedLoopMissingLabels,
        closedLoopStaleLabels: item.closedLoopStaleLabels,
        pendingLabels: item.blockers,
        blockerLabels: item.blockers,
        owner: item.owner,
        fallbackOwner: item.fallbackOwner,
        rehearsalOwner: item.rehearsalOwner,
        pilotConfirmOwner: item.pilotConfirmOwner,
        reviewerOwner: item.reviewerOwner,
        financeOwner: item.financeOwner,
        gateNote: item.note,
      },
    }),
  )
}

function exportRecordHandoffSummary() {
  if (!activeRow.value?.id) return
  downloadText(
    `neko_erp_${props.moduleKey}_${activeRow.value.id}_handoff_summary.md`,
    buildRecordHandoffContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(isEnglish.value ? 'Handoff summary exported' : '交接摘要已导出')
}

async function copyRecordHandoffSummary() {
  if (!activeRow.value?.id || !navigator.clipboard) return
  await navigator.clipboard.writeText(buildRecordHandoffContent())
  ElMessage.success(isEnglish.value ? 'Handoff summary copied' : '交接摘要已复制')
}

function buildContextBriefContent() {
  const contextLines = contextCoverageRows.value.map((item) => `- ${item.label}: ${item.value}`)
  const insightLines = extDataInsightRows.value.length
    ? extDataInsightRows.value.map((item) => `- ${item.label}: ${item.value}`)
    : [`- ${isEnglish.value ? 'No Monica-style relationship memory is filled yet.' : '当前还没有填充 Monica 风格的关系记忆。'}`]
  const gateLines = contextChainCards.value.map((item) => {
    const blockerText = item.blockers.length ? item.blockers.join(', ') : (isEnglish.value ? 'none' : '无')
    return `- ${item.label}: ${item.readyCount}/6 · ${isEnglish.value ? 'owner' : '负责人'}=${item.owner || '-'} · ${isEnglish.value ? 'pending' : '待处理'}=${blockerText}`
  })
  const templateLines = contextTemplateItems.value.length
    ? contextTemplateItems.value.map((item) => `- ${item.label}: ${item.description}`)
    : [`- ${isEnglish.value ? 'No relationship memory template exists for this module.' : '当前模块没有关系记忆模板。'}`]
  const riskLines = contextAlertItems.value.length
    ? contextAlertItems.value.map((item) => `- [${item.tone === 'danger' ? (isEnglish.value ? 'Critical' : '严重') : (isEnglish.value ? 'Warning' : '提醒')}] ${item.title}: ${item.description}`)
    : [`- ${isEnglish.value ? 'No direct context blockers.' : '当前没有直接上下文阻塞项。'}`]
  const settlementLines = buildSettlementSummaryLines(firstWaveSettlementSummary.value)
  return [
    `# ${sheetTitle.value} ${isEnglish.value ? 'Context Brief' : '上下文摘要'}`,
    '',
    `- ${isEnglish.value ? 'Module' : '模块'}: ${moduleDisplayTitle.value}`,
    `- ${isEnglish.value ? 'Record' : '记录'}: ${sheetTitle.value}`,
    `- ${isEnglish.value ? 'Workflow State' : '流程状态'}: ${activeRow.value?.[stateField.value] ?? '-'}`,
    `- ${isEnglish.value ? 'Documents' : '文档'}: ${documentRows.value.length}`,
    `- ${isEnglish.value ? 'Timeline Signals' : '时间轴信号'}: ${recordTimelineItems.value.length}`,
    '',
    `## ${isEnglish.value ? 'Context Coverage' : '上下文覆盖'}`,
    ...contextLines,
    '',
    `## ${isEnglish.value ? 'Relationship Memory' : '关系记忆'}`,
    ...insightLines,
    '',
    `## ${isEnglish.value ? 'Cutover Chains' : '切换链路'}`,
    ...gateLines,
    '',
    `## ${isEnglish.value ? 'Settlement Closure' : '结算闭环'}`,
    ...settlementLines,
    '',
    `## ${isEnglish.value ? 'Available Templates' : '可用模板'}`,
    ...templateLines,
    '',
    `## ${isEnglish.value ? 'Open Blockers' : '待处理阻塞'}`,
    ...riskLines,
  ].join('\n')
}

async function copyContextBrief() {
  if (!activeRow.value?.id || !navigator.clipboard) return
  await navigator.clipboard.writeText(buildContextBriefContent())
  ElMessage.success(isEnglish.value ? 'Context brief copied' : '上下文摘要已复制')
}

function exportContextBrief() {
  if (!activeRow.value?.id) return
  downloadText(
    `neko_erp_${props.moduleKey}_${activeRow.value.id}_context_brief_${new Date().toISOString().slice(0, 10)}.md`,
    buildContextBriefContent(),
    'text/markdown;charset=utf-8',
  )
  ElMessage.success(isEnglish.value ? 'Context brief exported' : '上下文摘要已导出')
}

function exportVisibleList() {
  if (!tableData.value.length) {
    ElMessage.warning(isEnglish.value ? 'No visible rows to export' : '当前没有可导出的可见记录')
    return
  }
  downloadCsv(
    `neko_erp_${props.moduleKey}_visible_list_${new Date().toISOString().slice(0, 10)}.csv`,
    [
      {
        key: 'title',
        title: isEnglish.value ? 'Record' : '记录',
        resolve: (row: Record<string, any>) => resolveRowTitle(row),
      },
      ...visibleListFields.value.map((field) => ({
        key: field.key,
        title: resolveFieldLabel(field),
        resolve: (row: Record<string, any>) => formatFieldValue(row, field),
      })),
      {
        key: stateField.value,
        title: resolveFieldLabel(fieldMap.value[stateField.value] || { key: stateField.value, label: stateField.value }),
        resolve: (row: Record<string, any>) => formatModuleStatus(config.value.key, stateField.value, row[stateField.value]),
      },
    ],
    tableData.value,
  )
  ElMessage.success(isEnglish.value ? 'Visible list exported' : '当前可见列表已导出')
}

function buildCsvImportTemplateColumns() {
  const columns: Array<{ key: string; title: string }> = []
  const seen = new Set<string>()
  for (const field of importableFields.value) {
    if (seen.has(field.key)) continue
    seen.add(field.key)
    columns.push({
      key: field.key,
      title: field.key,
    })
  }
  for (const section of extDataPresetSections.value) {
    for (const field of section.fields) {
      if (seen.has(field.key)) continue
      seen.add(field.key)
      columns.push({
        key: field.key,
        title: field.key,
      })
    }
  }
  return columns
}

function exportCsvImportTemplate() {
  const columns = buildCsvImportTemplateColumns()
  if (!columns.length) {
    ElMessage.warning(isEnglish.value ? 'No importable fields in this module' : '当前模块没有可导入字段')
    return
  }
  downloadCsv(
    `neko_erp_${props.moduleKey}_import_template_${new Date().toISOString().slice(0, 10)}.csv`,
    columns,
    [],
  )
  ElMessage.success(isEnglish.value ? 'CSV import template exported' : 'CSV 导入模板已导出')
}

function resetCsvImportState() {
  csvImportSourceName.value = ''
  csvImportHeaders.value = []
  csvImportRecognizedHeaders.value = []
  csvImportExtHeaders.value = []
  csvImportUnknownHeaders.value = []
  csvImportPreviewRows.value = []
  csvImportPayloadRows.value = []
  csvImportFailureRows.value = []
  csvImportSuccessCount.value = 0
  csvImportSkippedRows.value = 0
  csvImportCompleted.value = false
}

function resolveCsvImportExtKey(header: string) {
  const normalized = String(header || '').trim()
  if (!normalized) return ''
  if (extDataPresetKeySet.value.has(normalized)) return normalized
  if (normalized.startsWith('ext.')) return normalized.slice(4).trim()
  return ''
}

function buildCsvImportPayload(row: Record<string, string>) {
  const draft = createDraftRow() as Record<string, unknown>
  const extData =
    supportsExtData.value && draft.extData && typeof draft.extData === 'object'
      ? { ...(draft.extData as Record<string, unknown>) }
      : {}

  for (const [header, rawValue] of Object.entries(row)) {
    const value = String(rawValue ?? '').trim()
    if (!value) continue
    const field = importableFieldMap.value[header]
    if (field) {
      draft[field.key] = coerceValueByField(field, value)
      continue
    }
    const extKey = resolveCsvImportExtKey(header)
    if (extKey) {
      extData[extKey] = value
    }
  }

  if (supportsExtData.value) {
    draft.extData = extData
  } else {
    delete draft.extData
  }

  return draft
}

function validateCsvImportPayload(payload: Record<string, unknown>) {
  for (const field of importableFields.value) {
    if (!field.required) continue
    const value = payload[field.key]
    if (value === undefined || value === null || value === '') {
      return isEnglish.value
        ? `${resolveFieldLabel(field)} is required`
        : `${resolveFieldLabel(field)}为必填项`
    }
  }
  return ''
}

function resolveCsvImportTitle(payload: Record<string, unknown>, rowNumber: number) {
  return (
    pickFirstFilledText(payload as Record<string, any>, ['name', 'ref', 'model', 'username', 'roleName'])
    || `${moduleDisplayTitle.value} #${rowNumber}`
  )
}

function buildCsvImportSummary(payload: Record<string, unknown>) {
  const summary = importableFields.value
    .filter((field) => payload[field.key] !== undefined && payload[field.key] !== null && payload[field.key] !== '')
    .slice(0, 3)
    .map((field) => `${resolveFieldLabel(field)}: ${formatFieldValue(payload, field)}`)

  const extData = payload.extData && typeof payload.extData === 'object'
    ? Object.keys(payload.extData as Record<string, unknown>).filter(Boolean)
    : []

  if (extData.length) {
    summary.push(
      isEnglish.value
        ? `Ext: ${extData.slice(0, 3).join(', ')}${extData.length > 3 ? '…' : ''}`
        : `扩展: ${extData.slice(0, 3).join('、')}${extData.length > 3 ? '…' : ''}`,
    )
  }

  return summary.join(' · ') || (isEnglish.value ? 'Ready to create from CSV row.' : '已从当前 CSV 行生成创建草稿。')
}

function readCsvImportFileFromBrowser() {
  return new Promise<{ name: string; text: string } | null>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,text/csv,text/plain'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          name: file.name,
          text: String(reader.result || ''),
        })
      }
      reader.onerror = () => {
        reject(new Error(isEnglish.value ? 'Unable to read the selected CSV file.' : '无法读取所选 CSV 文件。'))
      }
      reader.readAsText(file, 'utf-8')
    }
    input.click()
  })
}

async function pickCsvImportSource() {
  if (desktopBridge?.chooseFile) {
    const chosen = await desktopBridge.chooseFile({
      title: isEnglish.value ? `Import ${moduleDisplayTitle.value} CSV` : `导入${moduleDisplayTitle.value} CSV`,
      filters: [
        { name: 'CSV Files', extensions: ['csv', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    if (!chosen) return null
    return {
      name: chosen.name,
      text: decodeBase64Utf8(chosen.dataBase64),
    }
  }
  return readCsvImportFileFromBrowser()
}

function prepareCsvImportSession(text: string, sourceName: string) {
  const parsed = parseCsvText(text)
  if (!parsed.headers.length) {
    throw new Error(isEnglish.value ? 'The CSV file does not contain a valid header row.' : 'CSV 文件缺少有效表头。')
  }

  resetCsvImportState()
  csvImportSourceName.value = sourceName
  csvImportHeaders.value = parsed.headers
  csvImportRecognizedHeaders.value = parsed.headers.filter((header) => Boolean(importableFieldMap.value[header]))
  csvImportExtHeaders.value = parsed.headers
    .map((header) => resolveCsvImportExtKey(header))
    .filter(Boolean)
    .filter((header, index, list) => list.indexOf(header) === index)
  csvImportUnknownHeaders.value = parsed.headers.filter(
    (header) => !importableFieldMap.value[header] && !resolveCsvImportExtKey(header),
  )

  let skippedRows = 0
  const previewRows: CsvImportPreviewRow[] = []
  const payloadRows: CsvImportPayloadRow[] = []

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2
    const hasInput = Object.values(row).some((value) => String(value ?? '').trim() !== '')
    if (!hasInput) {
      skippedRows += 1
      return
    }

    const payload = buildCsvImportPayload(row)
    const title = resolveCsvImportTitle(payload, rowNumber)
    const validationMessage = validateCsvImportPayload(payload)

    previewRows.push({
      rowNumber,
      title,
      summary: buildCsvImportSummary(payload),
      status: validationMessage ? 'invalid' : 'ready',
      reason: validationMessage || (isEnglish.value ? 'Ready to create.' : '可以直接创建。'),
    })

    if (!validationMessage) {
      payloadRows.push({
        rowNumber,
        title,
        payload,
      })
    }
  })

  csvImportSkippedRows.value = skippedRows
  csvImportPreviewRows.value = previewRows
  csvImportPayloadRows.value = payloadRows
  csvImportDialogVisible.value = true
}

async function openCsvImportDialog() {
  try {
    const source = await pickCsvImportSource()
    if (!source) return
    prepareCsvImportSession(source.text, source.name)
    clearClientFailureNotice()
  } catch (error) {
    reportHandledClientFailure('csvImportParse', error, {
      retry: () => {
        void openCsvImportDialog()
      },
      retryLabel: isEnglish.value ? 'Reopen Import' : '重新打开导入',
      tone: 'warning',
    })
  }
}

async function reselectCsvImportFile() {
  await openCsvImportDialog()
}

async function runCsvImport() {
  if (!csvImportPayloadRows.value.length) {
    ElMessage.warning(isEnglish.value ? 'No valid rows are ready for import' : '当前没有可执行导入的有效行')
    return
  }

  csvImportBusy.value = true
  csvImportCompleted.value = false
  csvImportSuccessCount.value = 0
  csvImportFailureRows.value = []

  try {
    for (const row of csvImportPayloadRows.value) {
      try {
        await createEntity(config.value.apiBase, row.payload as any)
        csvImportSuccessCount.value += 1
      } catch (error) {
        csvImportFailureRows.value.push({
          rowNumber: row.rowNumber,
          title: row.title,
          message: resolveUiRequestErrorMessage(error),
        })
      }
    }

    csvImportCompleted.value = true
    if (csvImportSuccessCount.value) {
      await loadData()
    }
    clearClientFailureNotice()

    if (!csvImportFailureRows.value.length) {
      ElMessage.success(
        isEnglish.value
          ? `Imported ${csvImportSuccessCount.value} row(s) successfully`
          : `成功导入 ${csvImportSuccessCount.value} 行`,
      )
      return
    }

    ElMessage.warning(
      isEnglish.value
        ? `${csvImportSuccessCount.value} row(s) imported, ${csvImportFailureRows.value.length} row(s) failed`
        : `已导入 ${csvImportSuccessCount.value} 行，失败 ${csvImportFailureRows.value.length} 行`,
    )
  } catch (error) {
    reportHandledClientFailure('runCsvImport', error, {
      retry: () => {
        void runCsvImport()
      },
      retryLabel: isEnglish.value ? 'Retry Import' : '重试导入',
      tone: 'warning',
    })
  } finally {
    csvImportBusy.value = false
  }
}

function buildCurrentDeskExportDefinition() {
  const exportedAt = new Date().toISOString().slice(0, 10)
  if (currentDetailSection.value === 'context') {
    return {
      filename: `neko_erp_${props.moduleKey}_${activeRow.value.id}_context_brief_${exportedAt}.md`,
      content: buildContextBriefContent(),
      successMessage: isEnglish.value ? 'Context desk exported' : '上下文工作区已导出',
    }
  }
  if (['workflow', 'review', 'reminders', 'rollback'].includes(currentDetailSection.value)) {
    return {
      filename: `neko_erp_${props.moduleKey}_${activeRow.value.id}_${currentDetailSection.value}_packet_${exportedAt}.md`,
      content: buildRecordExceptionPacketContent(),
      successMessage: isEnglish.value ? 'Risk desk exported' : '风险工作区已导出',
    }
  }
  return {
    filename: `neko_erp_${props.moduleKey}_${activeRow.value.id}_${currentDetailSection.value}_desk_${exportedAt}.md`,
    content: buildRecordHandoffContent(),
    successMessage: isEnglish.value ? 'Current desk exported' : '当前工作区已导出',
  }
}

function exportCurrentDeskPacket() {
  if (!activeRow.value?.id || !isDetailPage.value) return
  const target = buildCurrentDeskExportDefinition()
  downloadText(target.filename, target.content, 'text/markdown;charset=utf-8')
  ElMessage.success(target.successMessage)
}

async function printCurrentDesk() {
  if (!isDetailPage.value) return
  if (desktopBridge?.printCurrentWindow) {
    const success = await desktopBridge.printCurrentWindow({ silent: false })
    if (!success) {
      ElMessage.warning(isEnglish.value ? 'Print dialog was cancelled or failed' : '打印已取消或失败')
    }
    return
  }
  window.print()
}

function applyContextTemplate(template: ContextTemplateItem) {
  if (!supportsExtData.value || !canPersistRow.value) return
  for (const [key, value] of Object.entries(template.values)) {
    if (!String(extDataPresetDraft[key] || '').trim()) {
      extDataPresetDraft[key] = value
    }
  }
  ElMessage.success(isEnglish.value ? 'Context template applied to empty fields' : '上下文模板已填入空白字段')
}

function initializeFilterState() {
  for (const key of Object.keys(filterState)) {
    delete filterState[key]
  }
  for (const filter of config.value.filters) {
    const raw = route.query[filter.fieldKey]
    filterState[filter.fieldKey] = normalizeFilterValue(filter, raw)
  }
}

function resolveGateChecklist(state: ReturnType<typeof resolveDefaultChainGateState>) {
  const checks = [
    {
      label: isEnglish.value ? 'Smoke' : 'Smoke',
      ready: state.smokeReady,
    },
    {
      label: isEnglish.value ? 'Workbench' : '工作台',
      ready: state.workbenchReady,
    },
    {
      label: isEnglish.value ? 'Rollback' : '回退',
      ready: state.rollbackReady,
    },
    {
      label: isEnglish.value ? 'Traceability' : '追溯',
      ready: state.traceabilityReady,
    },
    {
      label: isEnglish.value ? 'Manual' : '手册',
      ready: state.manualReady,
    },
    {
      label: isEnglish.value ? 'Pilot Confirmed' : '试点确认',
      ready: state.pilotConfirmed,
    },
  ]
  return {
    readyCount: checks.filter((item) => item.ready).length,
    blockers: checks.filter((item) => !item.ready).map((item) => item.label),
  }
}

function buildContextCoverageRows(row: Record<string, any> | null): ContextCoverageRow[] {
  if (!row) return []
  const extData = buildExtDataObject()
  const formatRelation = (fieldKey: string, moduleKey: ModuleKey) =>
    formatFieldValue(row, { key: fieldKey, type: 'number', relation: moduleKey })
  if (props.moduleKey === 'resPartner') {
    return [
      { key: 'decisionMaker', label: isEnglish.value ? 'Decision Maker' : '决策人', value: extData.decisionMaker || '-', filled: Boolean(extData.decisionMaker), section: 'context' },
      { key: 'communicationPreference', label: isEnglish.value ? 'Communication Preference' : '沟通偏好', value: extData.communicationPreference || '-', filled: Boolean(extData.communicationPreference), section: 'context' },
      { key: 'backgroundNotes', label: isEnglish.value ? 'Background Notes' : '背景知识', value: extData.backgroundNotes ? truncateText(extData.backgroundNotes, 64) : '-', filled: Boolean(extData.backgroundNotes), section: 'context' },
      { key: 'timeline', label: isEnglish.value ? 'Timeline Signals' : '时间轴信号', value: `${recordTimelineItems.value.length}`, filled: recordTimelineItems.value.length > 0, section: 'timeline' },
      { key: 'documents', label: isEnglish.value ? 'Evidence Files' : '证据文件', value: `${documentRows.value.length}`, filled: documentRows.value.length > 0, section: 'documents' },
    ]
  }
  if (props.moduleKey === 'saleOrder') {
    return [
      { key: 'partnerId', label: isEnglish.value ? 'Customer' : '客户', value: row.partnerId ? formatRelation('partnerId', 'resPartner') : '-', filled: Boolean(row.partnerId), section: 'traceability' },
      { key: 'companyId', label: isEnglish.value ? 'Company Scope' : '公司范围', value: row.companyId ? formatRelation('companyId', 'resCompany') : '-', filled: Boolean(row.companyId), section: 'traceability' },
      { key: 'orderLines', label: isEnglish.value ? 'Order Lines' : '订单行', value: `${childRowCount('saleOrderLine')}`, filled: childRowCount('saleOrderLine') > 0, section: 'traceability' },
      { key: 'customerContext', label: isEnglish.value ? 'Customer Context' : '客户上下文', value: extData.customerContext ? truncateText(extData.customerContext, 64) : '-', filled: Boolean(extData.customerContext), section: 'context' },
      { key: 'deliveryRisk', label: isEnglish.value ? 'Delivery Risk' : '出库风险', value: extData.deliveryRisk || '-', filled: Boolean(extData.deliveryRisk), section: 'context' },
      { key: 'invoiceChecklist', label: isEnglish.value ? 'Invoice Checklist' : '开票检查', value: extData.invoiceChecklist || '-', filled: Boolean(extData.invoiceChecklist), section: 'context' },
      { key: 'artifacts', label: isEnglish.value ? 'Downstream Artifacts' : '下游结果对象', value: [row.pickingRef, row.invoiceRef].filter(Boolean).join(' / ') || '-', filled: Boolean(row.pickingRef || row.invoiceRef), section: 'traceability' },
    ]
  }
  if (props.moduleKey === 'purchaseOrder') {
    return [
      { key: 'partnerId', label: isEnglish.value ? 'Vendor' : '供应商', value: row.partnerId ? formatRelation('partnerId', 'resPartner') : '-', filled: Boolean(row.partnerId), section: 'traceability' },
      { key: 'companyId', label: isEnglish.value ? 'Company Scope' : '公司范围', value: row.companyId ? formatRelation('companyId', 'resCompany') : '-', filled: Boolean(row.companyId), section: 'traceability' },
      { key: 'orderLines', label: isEnglish.value ? 'Order Lines' : '订单行', value: `${childRowCount('purchaseOrderLine')}`, filled: childRowCount('purchaseOrderLine') > 0, section: 'traceability' },
      { key: 'vendorContext', label: isEnglish.value ? 'Vendor Context' : '供应商背景', value: extData.vendorContext ? truncateText(extData.vendorContext, 64) : '-', filled: Boolean(extData.vendorContext), section: 'context' },
      { key: 'receiptRisk', label: isEnglish.value ? 'Receipt Risk' : '收货风险', value: extData.receiptRisk || '-', filled: Boolean(extData.receiptRisk), section: 'context' },
      { key: 'paymentFollowUp', label: isEnglish.value ? 'Payment Follow-up' : '付款跟进', value: extData.paymentFollowUp || '-', filled: Boolean(extData.paymentFollowUp), section: 'context' },
      { key: 'artifacts', label: isEnglish.value ? 'Downstream Artifacts' : '下游结果对象', value: [row.receiptRef, row.billRef, row.paymentRef].filter(Boolean).join(' / ') || '-', filled: Boolean(row.receiptRef || row.billRef || row.paymentRef), section: 'traceability' },
    ]
  }
  if (props.moduleKey === 'accountInvoice') {
    return [
      { key: 'partnerId', label: isEnglish.value ? 'Partner' : '伙伴', value: row.partnerId ? formatRelation('partnerId', 'resPartner') : '-', filled: Boolean(row.partnerId), section: 'traceability' },
      { key: 'companyId', label: isEnglish.value ? 'Company Scope' : '公司范围', value: row.companyId ? formatRelation('companyId', 'resCompany') : '-', filled: Boolean(row.companyId), section: 'traceability' },
      { key: 'originRef', label: isEnglish.value ? 'Origin Reference' : '来源引用', value: row.originRef || '-', filled: Boolean(row.originRef), section: 'traceability' },
      { key: 'paymentRef', label: isEnglish.value ? 'Payment Artifact' : '付款结果对象', value: row.paymentRef || '-', filled: Boolean(row.paymentRef), section: 'workflow' },
      { key: 'documents', label: isEnglish.value ? 'Evidence Files' : '证据文件', value: `${documentRows.value.length}`, filled: documentRows.value.length > 0, section: 'documents' },
      { key: 'timeline', label: isEnglish.value ? 'Timeline Signals' : '时间轴信号', value: `${recordTimelineItems.value.length}`, filled: recordTimelineItems.value.length > 0, section: 'timeline' },
    ]
  }
  if (props.moduleKey === 'stockPicking') {
    return [
      { key: 'partnerId', label: isEnglish.value ? 'Partner' : '伙伴', value: row.partnerId ? formatRelation('partnerId', 'resPartner') : '-', filled: Boolean(row.partnerId), section: 'traceability' },
      { key: 'companyId', label: isEnglish.value ? 'Company Scope' : '公司范围', value: row.companyId ? formatRelation('companyId', 'resCompany') : '-', filled: Boolean(row.companyId), section: 'traceability' },
      { key: 'origin', label: isEnglish.value ? 'Origin' : '来源', value: row.origin || '-', filled: Boolean(row.origin), section: 'traceability' },
      { key: 'route', label: isEnglish.value ? 'Route' : '库位路线', value: row.locationId || row.locationDestId ? `${row.locationId || '-'} → ${row.locationDestId || '-'}` : '-', filled: Boolean(row.locationId && row.locationDestId), section: 'traceability' },
      { key: 'moveRows', label: isEnglish.value ? 'Move Rows' : '移动行', value: `${(childTableRows.stockMove || []).length}`, filled: (childTableRows.stockMove || []).length > 0, section: 'traceability' },
      { key: 'documents', label: isEnglish.value ? 'Evidence Files' : '证据文件', value: `${documentRows.value.length}`, filled: documentRows.value.length > 0, section: 'documents' },
      { key: 'timeline', label: isEnglish.value ? 'Timeline Signals' : '时间轴信号', value: `${recordTimelineItems.value.length}`, filled: recordTimelineItems.value.length > 0, section: 'timeline' },
    ]
  }
  if (props.moduleKey === 'accountPayment') {
    return [
      { key: 'partnerId', label: isEnglish.value ? 'Partner' : '伙伴', value: row.partnerId ? formatRelation('partnerId', 'resPartner') : '-', filled: Boolean(row.partnerId), section: 'traceability' },
      { key: 'companyId', label: isEnglish.value ? 'Company Scope' : '公司范围', value: row.companyId ? formatRelation('companyId', 'resCompany') : '-', filled: Boolean(row.companyId), section: 'traceability' },
      { key: 'invoiceRef', label: isEnglish.value ? 'Invoice Reference' : '发票引用', value: row.invoiceRef || '-', filled: Boolean(row.invoiceRef), section: 'traceability' },
      { key: 'originRef', label: isEnglish.value ? 'Origin Reference' : '来源引用', value: row.originRef || '-', filled: Boolean(row.originRef), section: 'traceability' },
      { key: 'paymentType', label: isEnglish.value ? 'Direction' : '方向', value: row.paymentType || '-', filled: Boolean(row.paymentType), section: 'workflow' },
      { key: 'amount', label: isEnglish.value ? 'Amount' : '金额', value: formatFieldValue(row, { key: 'amount', type: 'decimal', formatter: 'amount' }), filled: Number(row.amount || 0) > 0, section: 'workflow' },
      { key: 'journalEntryRef', label: isEnglish.value ? 'Journal Entry' : '凭证引用', value: row.journalEntryRef || '-', filled: Boolean(row.journalEntryRef), section: 'traceability' },
    ]
  }
  if (props.moduleKey === 'accountMove') {
    return [
      { key: 'auditMemo', label: isEnglish.value ? 'Audit Memo' : '审计备注', value: extData.auditMemo || '-', filled: Boolean(extData.auditMemo), section: 'context' },
      { key: 'reconcileContext', label: isEnglish.value ? 'Reconcile Context' : '对账上下文', value: extData.reconcileContext || '-', filled: Boolean(extData.reconcileContext), section: 'context' },
      { key: 'sourceExplanation', label: isEnglish.value ? 'Source Explanation' : '来源解释', value: extData.sourceExplanation ? truncateText(extData.sourceExplanation, 64) : '-', filled: Boolean(extData.sourceExplanation), section: 'context' },
      { key: 'reviewer', label: isEnglish.value ? 'Reviewer' : '审核人', value: extData.reviewer || '-', filled: Boolean(extData.reviewer), section: 'context' },
      { key: 'timeline', label: isEnglish.value ? 'Timeline Signals' : '时间轴信号', value: `${recordTimelineItems.value.length}`, filled: recordTimelineItems.value.length > 0, section: 'timeline' },
    ]
  }
  return []
}

function buildContextAlertItems(row: Record<string, any> | null): ContextAlertItem[] {
  if (!row) return []
  const items: ContextAlertItem[] = []
  if (!cutoverStore.isModuleEnabled(props.moduleKey)) {
    items.push({
      key: 'module-disabled',
      title: isEnglish.value ? 'Module Is Outside Pilot Scope' : '模块已不在试点范围',
      description: isEnglish.value
        ? 'The current module is disabled by the cutover switch and should be restored before operators continue.'
        : '当前模块已被切换开关关闭，需要先恢复再继续处理。',
      tone: 'danger',
      section: 'cutover',
    })
  }
  contextCoverageRows.value
    .filter((item) => !item.filled)
    .slice(0, 4)
    .forEach((item) => {
      items.push({
        key: `coverage-${item.key}`,
        title: isEnglish.value ? `${item.label} Is Missing` : `${item.label}缺失`,
        description: isEnglish.value
          ? 'This context field or evidence area is still blank and weakens pilot traceability.'
          : '该上下文字段或证据区仍为空，会削弱试点追溯能力。',
        tone: item.section === 'documents' || item.section === 'timeline' ? 'warning' : 'danger',
        section: item.section,
      })
    })
  contextChainCards.value
    .filter((item) => item.pendingCount > 0)
    .forEach((item) => {
      items.push({
        key: `gate-${item.key}`,
        title: isEnglish.value ? `${item.label} Gates Still Pending` : `${item.label}放行项未完成`,
        description: item.blockers.length
          ? `${isEnglish.value ? 'Pending' : '待完成'}: ${item.blockers.join(', ')}`
          : (isEnglish.value ? 'Acceptance blockers still exist.' : '当前仍有放行阻塞项。'),
        tone: 'warning',
        section: 'cutover',
      })
    })
  if (firstWaveSettlementSummary.value.expectedCount && (firstWaveSettlementSummary.value.missingCount || firstWaveSettlementSummary.value.warningCount)) {
    const detail = [...firstWaveSettlementSummary.value.missingLabels, ...firstWaveSettlementSummary.value.warningLabels].join(', ')
    items.push({
      key: 'settlement-closure',
      title: isEnglish.value ? 'Settlement Closure Still Incomplete' : '结算闭环仍未完成',
      description: detail
        ? `${isEnglish.value ? 'Pending' : '待推进'}: ${detail}`
        : describeSettlementSummary(firstWaveSettlementSummary.value),
      tone: firstWaveSettlementSummary.value.missingCount ? 'danger' : 'warning',
      section: 'workflow',
    })
  }
  if (!documentRows.value.length && ['saleOrder', 'purchaseOrder', 'accountInvoice', 'stockPicking', 'accountPayment', 'resPartner'].includes(props.moduleKey)) {
    items.push({
      key: 'document-evidence',
      title: isEnglish.value ? 'No Supporting Files Yet' : '尚无支撑文件',
      description: isEnglish.value
        ? 'Contracts, invoices, slips, or supporting evidence should be attached before the pilot widens.'
        : '在扩大试点前，应补齐合同、发票、单据或其他支撑证据。',
      tone: 'warning',
      section: 'documents',
    })
  }
  return items.slice(0, 8)
}

function buildContextSummaryCards(row: Record<string, any> | null): ContextSummaryCard[] {
  const filledCount = contextCoverageRows.value.filter((item) => item.filled).length
  const totalCount = contextCoverageRows.value.length
  const totalGateChecks = contextChainCards.value.length * 6
  const readyGateChecks = contextChainCards.value.reduce((sum, item) => sum + item.readyCount, 0)
  const evidenceSignals = documentRows.value.length + recordTimelineItems.value.length
  const ownerCount = contextChainCards.value.filter((item) => item.owner).length
  return [
    {
      key: 'coverage',
      label: isEnglish.value ? 'Knowledge Coverage' : '知识覆盖',
      value: totalCount ? `${filledCount}/${totalCount}` : '-',
      description: isEnglish.value
        ? 'Hybrid-model context that is already carried beside the hard-coded business fields.'
        : '已经和硬编码业务字段并行沉淀的混合模型上下文。',
      tone: totalCount && filledCount === totalCount ? 'success' : filledCount ? 'warning' : 'danger',
    },
    {
      key: 'gates',
      label: isEnglish.value ? 'Gate Readiness' : '放行准备度',
      value: totalGateChecks ? `${readyGateChecks}/${totalGateChecks}` : '-',
      description: isEnglish.value
        ? 'Acceptance-gate coverage across the pilot chains that own this record.'
        : '当前记录所属试点链路的放行门槛覆盖情况。',
      tone: totalGateChecks && readyGateChecks === totalGateChecks ? 'success' : readyGateChecks ? 'warning' : 'danger',
    },
    {
      key: 'owners',
      label: isEnglish.value ? 'Chain Owners' : '链路负责人',
      value: String(ownerCount),
      description: isEnglish.value
        ? 'Named owners keep Monica-style follow-up accountable instead of leaving relationship work anonymous.'
        : '明确负责人，避免关系跟进变成无人承接的匿名工作。',
      tone: ownerCount ? 'success' : 'warning',
    },
    ...(firstWaveSettlementSummary.value.expectedCount
      ? [
          {
            key: 'settlement',
            label: isEnglish.value ? 'Settlement Closure' : '结算闭环',
            value: `${firstWaveSettlementSummary.value.readyCount}/${firstWaveSettlementSummary.value.expectedCount}`,
            description: describeSettlementSummary(firstWaveSettlementSummary.value),
            tone: firstWaveSettlementSummary.value.missingCount
              ? 'danger'
              : firstWaveSettlementSummary.value.warningCount
                ? 'warning'
                : 'success',
          } satisfies ContextSummaryCard,
        ]
      : []),
    {
      key: 'evidence',
      label: isEnglish.value ? 'Evidence Signals' : '证据信号',
      value: String(evidenceSignals),
      description: isEnglish.value
        ? 'Timeline events plus imported files that already support rollback and handoff review.'
        : '已经可用于回退与交接审查的时间轴事件和导入文件总量。',
      tone: evidenceSignals ? 'success' : 'warning',
    },
    {
      key: 'blockers',
      label: isEnglish.value ? 'Open Blockers' : '阻塞项',
      value: String(contextAlertItems.value.length),
      description: isEnglish.value
        ? 'High-value gaps still preventing this record from becoming a clean pilot handoff object.'
        : '当前仍阻碍这条记录成为干净试点交接对象的高价值缺口。',
      tone: contextAlertItems.value.some((item) => item.tone === 'danger')
        ? 'danger'
        : contextAlertItems.value.length
          ? 'warning'
          : 'success',
    },
  ]
}

function buildContextTemplateItems(moduleKey: ModuleKey): ContextTemplateItem[] {
  if (moduleKey === 'resPartner') {
    return isEnglish.value
      ? [
          {
            key: 'partner-enterprise',
            label: 'Enterprise Customer',
            description: 'Seed a common enterprise-account knowledge skeleton.',
            values: {
              decisionMaker: 'Procurement head / finance approver',
              communicationPreference: 'Weekday afternoons by email or WeCom',
              relationshipRisk: 'Long approval chain and strict pricing review',
              backgroundNotes: 'Prefers predictable delivery, dislikes surprise price changes, values concise status updates.',
            },
          },
          {
            key: 'partner-vendor',
            label: 'Strategic Vendor',
            description: 'Seed a supplier collaboration baseline for early cutover.',
            values: {
              decisionMaker: 'Account manager / shipment coordinator',
              communicationPreference: 'Morning chat for shipping updates, email for documents',
              relationshipRisk: 'Lead time fluctuation during month end',
              backgroundNotes: 'Needs PO and receipt proof early, responds faster when logistics context is explicit.',
            },
          },
        ]
      : [
          {
            key: 'partner-enterprise',
            label: '企业客户模板',
            description: '快速填入常见企业客户的关系背景骨架。',
            values: {
              decisionMaker: '采购负责人 / 财务审批人',
              communicationPreference: '工作日下午通过邮件或企微沟通',
              relationshipRisk: '审批链较长，价格审核严格',
              backgroundNotes: '偏好稳定交付，不喜欢临时改价，习惯看简洁的状态同步。',
            },
          },
          {
            key: 'partner-vendor',
            label: '核心供应商模板',
            description: '快速填入早期切换常见的供应商协作背景。',
            values: {
              decisionMaker: '客户经理 / 发货协调人',
              communicationPreference: '上午沟通发货，邮件留存单据',
              relationshipRisk: '月底交期波动较大',
              backgroundNotes: '需要尽早看到采购单和收货证明，物流上下文越清楚响应越快。',
            },
          },
        ]
  }
  if (moduleKey === 'saleOrder') {
    return isEnglish.value
      ? [
          {
            key: 'sale-urgent-delivery',
            label: 'Urgent Delivery',
            description: 'Fill the order with fast-moving customer and delivery context.',
            values: {
              customerContext: 'Customer is driving for a near-term delivery commitment and wants proactive status updates.',
              deliveryRisk: 'Check stock reservation and outbound slot before confirming the date.',
              invoiceChecklist: 'Confirm billing title, tax info, and attachment package before invoicing.',
              pilotNotes: 'Keep partner and transfer artifacts traceable for pilot acceptance review.',
            },
          },
          {
            key: 'sale-pilot-standard',
            label: 'Pilot Standard',
            description: 'Use the default first-wave sales cutover narrative.',
            values: {
              customerContext: 'Sales pilot order that should stay traceable from partner to picking and invoice.',
              deliveryRisk: 'Monitor inventory availability and signed delivery evidence.',
              invoiceChecklist: 'Do not invoice until delivery proof and partner billing context are both visible.',
              pilotNotes: 'Prefer direct links over manual search when handing off to the next operator.',
            },
          },
        ]
      : [
          {
            key: 'sale-urgent-delivery',
            label: '紧急交付模板',
            description: '快速填入常见的紧急销售和交付上下文。',
            values: {
              customerContext: '客户要求近期交付，并希望我们主动同步状态。',
              deliveryRisk: '确认承诺日期前先核库存预留和出库时段。',
              invoiceChecklist: '开票前确认抬头、税务信息和附件包是否齐全。',
              pilotNotes: '保持伙伴、出库和发票链路都能直接追溯。',
            },
          },
          {
            key: 'sale-pilot-standard',
            label: '试点标准模板',
            description: '用于首批销售链切换的默认叙事骨架。',
            values: {
              customerContext: '试点销售单，需要保持从伙伴到出库再到发票的全链路可追溯。',
              deliveryRisk: '持续关注库存可用性和签收证明。',
              invoiceChecklist: '在交付证明和伙伴开票上下文都可见前，不要提前开票。',
              pilotNotes: '交接时优先依赖直接链接，不要靠人工搜索。',
            },
          },
        ]
  }
  if (moduleKey === 'purchaseOrder') {
    return isEnglish.value
      ? [
          {
            key: 'purchase-follow-up',
            label: 'Vendor Follow-up',
            description: 'Seed receiving and payable follow-up context.',
            values: {
              vendorContext: 'Vendor requires early heads-up before receipt scheduling and billing.',
              receiptRisk: 'Watch logistics delay and incomplete receipt evidence.',
              paymentFollowUp: 'Bill should be matched with receipt proof before payment posting.',
              pilotNotes: 'Keep receipt and bill artifacts ready for rollback review.',
            },
          },
          {
            key: 'purchase-standard',
            label: 'Pilot Standard',
            description: 'Use the default first-wave procurement cutover narrative.',
            values: {
              vendorContext: 'Procurement pilot order that must stay visible through receipt, bill, and payment artifacts.',
              receiptRisk: 'Focus on signed receipt proof and inbound quantity mismatch.',
              paymentFollowUp: 'Do not post payment before bill total and origin references match.',
              pilotNotes: 'Use the shared partner master instead of downstream corrections.',
            },
          },
        ]
      : [
          {
            key: 'purchase-follow-up',
            label: '供应商跟进模板',
            description: '快速填入常见的收货与应付跟进上下文。',
            values: {
              vendorContext: '供应商希望在安排收货和开票前提前同步计划。',
              receiptRisk: '关注物流延误和收货证明不完整。',
              paymentFollowUp: '付款过账前要先把账单与收货证明对齐。',
              pilotNotes: '确保收货和账单结果对象都可用于回退审查。',
            },
          },
          {
            key: 'purchase-standard',
            label: '试点标准模板',
            description: '用于首批采购链切换的默认叙事骨架。',
            values: {
              vendorContext: '试点采购单，需要贯穿收货、账单和付款结果对象保持可见。',
              receiptRisk: '重点关注签收证明和入库数量差异。',
              paymentFollowUp: '付款前必须先核账单金额与来源引用一致。',
              pilotNotes: '优先回到共享伙伴主档修正信息，不在下游硬补。',
            },
          },
        ]
  }
  if (moduleKey === 'accountMove') {
    return isEnglish.value
      ? [
          {
            key: 'audit-review',
            label: 'Audit Review',
            description: 'Seed a lightweight audit and reconciliation narrative.',
            values: {
              auditMemo: 'Reviewed for pilot traceability and source consistency.',
              reconcileContext: 'Match against upstream business document and payment evidence.',
              sourceExplanation: 'Created from the first-wave business chain and kept for rollback clarity.',
              reviewer: 'Finance reviewer',
            },
          },
        ]
      : [
          {
            key: 'audit-review',
            label: '审计核对模板',
            description: '快速填入轻量的审计与对账叙事。',
            values: {
              auditMemo: '已按试点追溯和来源一致性完成基础核对。',
              reconcileContext: '按上游业务单据与付款证据进行匹配。',
              sourceExplanation: '来源于首批业务链，并保留以便回退核对。',
              reviewer: '财务审核人',
            },
          },
        ]
  }
  return []
}

function buildContextChainCards(): ContextChainCard[] {
  return cutoverStore.chainsForModule(props.moduleKey).map((chain) => {
    const contacts = cutoverStore.chainContactFor(chain.key, resolveDefaultChainContacts(chain.key, isEnglish.value))
    const gateState = cutoverStore.chainGateStateFor(chain.key, resolveDefaultChainGateState())
    const checklist = resolveGateChecklist(gateState)
    const closedLoopSummary = buildCutoverClosedLoopSummary({
      isEnglish: isEnglish.value,
      latestDrill: cutoverOpsStore.latestRollbackDrill(chain.key),
      latestSignoff: cutoverOpsStore.latestPilotSignoff(chain.key),
      latestExceptionExport: cutoverOpsStore.latestExceptionExport('chain', chain.key),
    })
    return {
      key: chain.key,
      label: isEnglish.value ? chain.enLabel : chain.zhLabel,
      enabled: Boolean(cutoverStore.chainStates[chain.key]),
      owner: contacts.owner,
      fallbackOwner: contacts.fallbackOwner,
      rehearsalOwner: contacts.rehearsalOwner,
      pilotConfirmOwner: contacts.pilotConfirmOwner,
      reviewerOwner: contacts.reviewerOwner,
      financeOwner: contacts.financeOwner,
      readyCount: checklist.readyCount,
      pendingCount: checklist.blockers.length,
      blockers: checklist.blockers,
      note: gateState.note,
      closedLoopReady: closedLoopSummary.ready,
      closedLoopLabel: closedLoopSummary.label,
      closedLoopTone: closedLoopSummary.tone,
      closedLoopMissingLabels: closedLoopSummary.missingLabels,
      closedLoopStaleLabels: closedLoopSummary.staleLabels,
    }
  })
}

function buildFirstWaveRecordCutoverCards(): ContextSummaryCard[] {
  if (!isFirstWaveRecord.value) return []
  const enabled = cutoverStore.isModuleEnabled(props.moduleKey)
  const gateReadyCount = contextChainCards.value.reduce((sum, item) => sum + item.readyCount, 0)
  const gateTotalCount = contextChainCards.value.length * 6
  const reminderSummary = summarizeReminderFamilies(recordReminderItems.value)
  const recommendedSection = recordTopReminder.value
    ? resolveReminderSection(recordTopReminder.value)
    : documentEvidenceSummary.value.missingLabels.length
      ? 'documents'
      : workflowBlockedStageCount.value
        ? 'workflow'
        : 'review'

  return [
    {
      key: 'cutover-module',
      label: isEnglish.value ? 'Pilot Entry' : '试点入口',
      value: enabled
        ? (isEnglish.value ? 'Enabled' : '已启用')
        : (isEnglish.value ? 'Disabled' : '已关闭'),
      description: enabled
        ? (isEnglish.value ? 'This module still accepts new records inside the current pilot scope.' : '当前模块仍在试点范围内接收新记录。')
        : (isEnglish.value ? 'This module is outside the active pilot scope until cutover settings reopen it.' : '当前模块已在试点范围外，需通过切换设置重新开放。'),
      tone: enabled ? 'success' : 'danger',
    },
    {
      key: 'cutover-chains',
      label: isEnglish.value ? 'Pilot Chains' : '试点链路',
      value: contextChainCards.value.map((item) => item.label).join(' / ') || '-',
      description: isEnglish.value
        ? 'The current record stays under these first-wave chains.'
        : '当前记录受这些首批试点链路约束。',
      tone: contextChainCards.value.length ? 'success' : 'default',
    },
    {
      key: 'cutover-gates',
      label: isEnglish.value ? 'Gate Readiness' : '门槛就绪度',
      value: gateTotalCount ? `${gateReadyCount}/${gateTotalCount}` : '-',
      description: contextChainCards.value.some((item) => item.pendingCount)
        ? (isEnglish.value
            ? `Pending: ${contextChainCards.value.flatMap((item) => item.blockers).join(' / ') || '-'}`
            : `待完成：${contextChainCards.value.flatMap((item) => item.blockers).join(' / ') || '-'}`)
        : (isEnglish.value ? 'Attached pilot chains currently show no pending acceptance blockers.' : '关联试点链当前没有未完成的放行阻塞项。'),
      tone: contextChainCards.value.some((item) => item.pendingCount) ? 'warning' : 'success',
    },
    {
      key: 'cutover-closed-loop',
      label: isEnglish.value ? 'Closed Loop' : '闭环就绪',
      value: contextChainCards.value.every((item) => item.closedLoopReady)
        ? (isEnglish.value ? 'Ready' : '已就绪')
        : (isEnglish.value ? 'Needs Evidence' : '待补证据'),
      description: contextChainCards.value.some((item) => !item.closedLoopReady)
        ? (isEnglish.value
            ? `Missing or stale: ${contextChainCards.value.flatMap((item) => [...item.closedLoopMissingLabels, ...item.closedLoopStaleLabels]).join(' / ') || '-'}`
            : `缺失或过期：${contextChainCards.value.flatMap((item) => [...item.closedLoopMissingLabels, ...item.closedLoopStaleLabels]).join(' / ') || '-'}`)
        : (isEnglish.value ? 'Rollback drill, sign-off, and exception export are all visible.' : '回退演练、签收和异常导出均已可见。'),
      tone: contextChainCards.value.every((item) => item.closedLoopReady) ? 'success' : 'warning',
    },
    ...(firstWaveSettlementSummary.value.expectedCount
      ? [
          {
            key: 'cutover-settlement',
            label: isEnglish.value ? 'Settlement Closure' : '结算闭环',
            value: `${firstWaveSettlementSummary.value.readyCount}/${firstWaveSettlementSummary.value.expectedCount}`,
            description: describeSettlementSummary(firstWaveSettlementSummary.value),
            tone: firstWaveSettlementSummary.value.missingCount
              ? 'danger'
              : firstWaveSettlementSummary.value.warningCount
                ? 'warning'
                : 'success',
          } satisfies ContextSummaryCard,
        ]
      : []),
    {
      key: 'cutover-evidence',
      label: isEnglish.value ? 'Evidence Pressure' : '证据压力',
      value: documentEvidenceSummary.value.expectedCount
        ? `${documentEvidenceSummary.value.readyCount}/${documentEvidenceSummary.value.expectedCount}`
        : `${documentRows.value.length}`,
      description: documentEvidenceSummary.value.missingLabels.length
        ? (isEnglish.value
            ? `Missing: ${documentEvidenceSummary.value.missingLabels.join(' / ')}`
            : `缺失：${documentEvidenceSummary.value.missingLabels.join(' / ')}`)
        : (isEnglish.value ? 'Required evidence is already visible on the record.' : '当前记录上的必备证据已经可见。'),
      tone: documentEvidenceSummary.value.missingLabels.length ? 'warning' : documentRows.value.length ? 'success' : 'default',
    },
    {
      key: 'cutover-risks',
      label: isEnglish.value ? 'Reminder Pressure' : '提醒压力',
      value: `${recordReminderItems.value.length}`,
      description: isEnglish.value
        ? `Evidence ${reminderSummary.evidenceCount} · Context ${reminderSummary.contextCount} · Collections ${reminderSummary.collectionsCount}`
        : `证据 ${reminderSummary.evidenceCount} · 上下文 ${reminderSummary.contextCount} · 收付款 ${reminderSummary.collectionsCount}`,
      tone: reminderSummary.criticalCount ? 'danger' : recordReminderItems.value.length ? 'warning' : 'success',
    },
    {
      key: 'cutover-next-section',
      label: isEnglish.value ? 'Next Review Area' : '下一核对区域',
      value: recommendedSection,
      description: recordTopReminder.value
        ? (isEnglish.value
            ? `Top reminder: ${recordTopReminder.value.title}`
            : `最高优先提醒：${recordTopReminder.value.title}`)
        : (isEnglish.value ? 'No direct reminder is blocking the current record right now.' : '当前记录暂无直接提醒阻塞。'),
      tone: recordTopReminder.value?.severity === 'critical' ? 'danger' : recordTopReminder.value ? 'warning' : 'default',
    },
  ]
}

function primeFilterRelationControls() {
  for (const filter of config.value.filters) {
    const relationModule = resolveFilterRelationModule(filter)
    if (!relationModule) continue
    const relationId = normalizeRelationId(filterState[filter.fieldKey])
    const bucketKey = relationBucketKey('filter', filter.fieldKey)
    void ensureRelationOptionById(bucketKey, relationModule, relationId)
  }
}

function normalizeFilterValue(filter: ModuleFilterConfig, rawValue: unknown) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return undefined
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
  if (filter.type === 'number') {
    const numeric = Number(value)
    return Number.isNaN(numeric) ? undefined : numeric
  }
  return String(value)
}

function resolveFieldLabel(field: Pick<ModuleFieldConfig, 'key' | 'label'>) {
  return fieldLabel(field.key, field.label)
}

function resolveFilterLabel(filter: ModuleFilterConfig) {
  return fieldLabel(filter.fieldKey, filter.label)
}

function resolveOptionLabel(field: ModuleFieldConfig, value: unknown) {
  if (!field.options?.length) return null
  return field.options.find((option) => option.value === value)?.label || null
}

function resolveActionConfig(actionKey?: string) {
  return config.value.odooActions.find((item) => item.key === actionKey)
}

function inferRelationModule(field: Pick<ModuleFieldConfig, 'key' | 'relation'>) {
  if (field.relation && moduleManifestMap[field.relation as ModuleKey]) {
    return field.relation as ModuleKey
  }
  if (field.key === 'parentId') {
    if (props.moduleKey === 'productCategory') return 'productCategory'
    if (props.moduleKey === 'resPartner') return 'resPartner'
  }
  if (field.key === 'orderId') {
    if (props.moduleKey === 'purchaseOrderLine') return 'purchaseOrder'
    if (props.moduleKey === 'saleOrderLine') return 'saleOrder'
  }
  if (field.key === 'pickingId' && props.moduleKey === 'stockMove') {
    return 'stockPicking'
  }
  return FALLBACK_RELATION_MAP[field.key]
}

function resolveFilterField(filter: ModuleFilterConfig) {
  return fieldMap.value[filter.fieldKey]
}

function resolveFilterRelationModule(filter: ModuleFilterConfig) {
  const field = resolveFilterField(filter)
  return field ? inferRelationModule(field) : undefined
}

function relationBucketKey(scope: 'field' | 'filter', fieldKey: string) {
  return `${scope}:${props.moduleKey}:${fieldKey}`
}

function relationOptionList(bucketKey: string) {
  return relationOptions[bucketKey] || []
}

function upsertRelationOption(bucketKey: string, option: RelationOption) {
  const next = relationOptionList(bucketKey).filter((item) => item.id !== option.id)
  relationOptions[bucketKey] = [option, ...next]
}

async function ensureRelationOptionById(bucketKey: string, relationModule: ModuleKey, relationId: number | null) {
  if (!relationId) return
  if (relationOptionList(bucketKey).some((item) => item.id === relationId)) return
  queueRelationLabel(relationModule, relationId)
  const relatedConfig = moduleConfigMap[relationModule]
  if (!relatedConfig) return
  try {
    const record = await fetchEntityById<any>(relatedConfig.apiBase, relationId)
    upsertRelationOption(bucketKey, {
      id: relationId,
      label: record.name || record.displayName || record.username || record.realName || record.ref || `ID:${relationId}`,
    })
  } catch {
    upsertRelationOption(bucketKey, {
      id: relationId,
      label: relationLabels[relationModule]?.[relationId] || `ID:${relationId}`,
    })
  }
}

// Generic relation pickers load options lazily so foreign-key editing works without per-module dialogs.
async function loadRelationOptions(bucketKey: string, relationModule: ModuleKey, search = '', selectedId?: number | null) {
  const pendingKey = `${bucketKey}:${relationModule}:${search}`
  if (relationOptionPendingKeys.has(pendingKey)) return
  relationOptionPendingKeys.add(pendingKey)
  relationOptionLoading[bucketKey] = true
  try {
    const relatedConfig = moduleConfigMap[relationModule]
    if (!relatedConfig) return
    const params: QueryParams = {
      current: 1,
      size: 20,
    }
    if (search.trim()) {
      params.keyword = search.trim()
    }
    const res = await fetchEntityPage<any>(relatedConfig.apiBase, params)
    relationOptions[bucketKey] = res.records.map((record) => ({
      id: Number(record.id),
      label: record.name || record.displayName || record.username || record.realName || record.ref || `ID:${record.id}`,
    }))
    if (selectedId) {
      await ensureRelationOptionById(bucketKey, relationModule, selectedId)
    }
  } finally {
    relationOptionLoading[bucketKey] = false
    relationOptionPendingKeys.delete(pendingKey)
  }
}

function handleRelationSearch(bucketKey: string, relationModule: ModuleKey, search: string, selectedId?: number | null) {
  void loadRelationOptions(bucketKey, relationModule, search, selectedId)
}

// Template callbacks are routed through typed helpers so strict TS does not infer implicit any.
function searchFilterRelationOptions(filter: ModuleFilterConfig, keyword: string) {
  const relationModule = resolveFilterRelationModule(filter)
  if (!relationModule) return
  handleRelationSearch(
    relationBucketKey('filter', filter.fieldKey),
    relationModule,
    keyword,
    normalizeRelationId(filterState[filter.fieldKey]),
  )
}

function handleFilterRelationVisibleChange(filter: ModuleFilterConfig, visible: boolean) {
  if (!visible) return
  searchFilterRelationOptions(filter, '')
}

// Field relation pickers share one loader path so new modules can reuse the same edit surface.
function searchFieldRelationOptions(field: ModuleFieldConfig, keyword: string) {
  const relationModule = inferRelationModule(field)
  if (!relationModule) return
  handleRelationSearch(
    relationBucketKey('field', field.key),
    relationModule,
    keyword,
    normalizeRelationId(activeRow.value?.[field.key]),
  )
}

function handleFieldRelationVisibleChange(field: ModuleFieldConfig, visible: boolean) {
  if (!visible) return
  searchFieldRelationOptions(field, '')
}

function normalizeRelationId(value: unknown) {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

function queueRelationLabel(relationModule: ModuleKey | undefined, relationId: number | null) {
  if (!relationModule || !relationId) return
  if (relationLabels[relationModule]?.[relationId]) return
  const pendingKey = `${relationModule}:${relationId}`
  if (relationPendingKeys.has(pendingKey)) return

  if (!relationLabels[relationModule]) {
    relationLabels[relationModule] = {}
  }
  relationPendingKeys.add(pendingKey)
  const relatedConfig = moduleConfigMap[relationModule]
  if (!relatedConfig) {
    relationPendingKeys.delete(pendingKey)
    return
  }

  // Related labels are resolved lazily to keep generic tables readable without custom joins.
  void fetchEntityById<any>(relatedConfig.apiBase, relationId)
    .then((record) => {
      relationLabels[relationModule][relationId] =
        record.name || record.displayName || record.username || record.realName || record.ref || `ID:${relationId}`
    })
    .catch(() => {
      relationLabels[relationModule][relationId] = `ID:${relationId}`
    })
    .finally(() => {
      relationPendingKeys.delete(pendingKey)
    })
}

function primeRelationLabels(rows: any[], fields: ModuleFieldConfig[]) {
  for (const row of rows) {
    for (const field of fields) {
      const relationModule = inferRelationModule(field)
      const relationId = normalizeRelationId(row?.[field.key])
      queueRelationLabel(relationModule, relationId)
    }
  }
}

function primeRelationControlsFromRow(row: Record<string, any> | null) {
  if (!row) return
  for (const field of detailFormFields.value) {
    const relationModule = inferRelationModule(field)
    const relationId = normalizeRelationId(row[field.key])
    if (!relationModule) continue
    const bucketKey = relationBucketKey('field', field.key)
    void ensureRelationOptionById(bucketKey, relationModule, relationId)
  }
}

function buildQueryParams(): QueryParams {
  const params: QueryParams = {
    current: currentPage.value,
    size: PAGE_SIZE,
  }
  for (const filter of config.value.filters) {
    const value = filterState[filter.fieldKey]
    if (value !== undefined && value !== null && value !== '') {
      params[filter.fieldKey] = value
    }
  }
  if (route.query.contextField && route.query.contextValue) {
    params[String(route.query.contextField)] = String(route.query.contextValue)
  }
  if (route.query.parentId) {
    params.parentId = String(route.query.parentId)
  }
  return params
}

async function loadData() {
  loading.value = true
  try {
    const res = await fetchEntityPage<any>(config.value.apiBase, buildQueryParams())
    tableData.value = res.records
    total.value = res.total
    primeRelationLabels(res.records, config.value.fields)
    clearClientFailureNotice()
    autoFocusRow()
  } catch (error) {
    reportHandledClientFailure('loadData', error, {
      retry: () => {
        void loadData()
      },
      retryLabel: isEnglish.value ? 'Retry Refresh' : '重新刷新',
    })
  } finally {
    loading.value = false
  }
}

function autoFocusRow() {
  const focusField = route.query.focusField
  const focusValue = route.query.focusValue
  if (!focusField || focusValue === undefined || expandedId.value || isCreating.value || route.query.detailId) return
  const matched = tableData.value.find((row) => String(row[String(focusField)]) === String(focusValue))
  if (matched) {
    void handleRowClick(matched)
  }
}

async function loadChildRows(row: any) {
  clearChildRows()
  for (const tab of config.value.odooNotebookTabs || []) {
    const childConfig = moduleConfigMap[tab.key as ModuleKey]
    if (!childConfig || !tab.parentFieldKey) continue
    childLoading[tab.key] = true
    try {
      const res = await fetchEntityPage<any>(childConfig.apiBase, {
        current: 1,
        size: 8,
        [tab.parentFieldKey]: row.id,
      })
      childTableRows[tab.key] = res.records
      primeRelationLabels(res.records, childConfig.fields)
    } finally {
      childLoading[tab.key] = false
    }
  }
}

function clearChildRows() {
  for (const key of Object.keys(childTableRows)) delete childTableRows[key]
}

function clearDetailSignals() {
  recordReminderItems.value = []
  recordTimelineItems.value = []
}

function syncExtDataDraftRows(row: any) {
  resetExtDataPresetDraft()
  if (!supportsExtData.value || !row?.extData || typeof row.extData !== 'object') {
    extDataDraftRows.value = []
    return
  }
  // Structured ext_data fields are surfaced in dedicated business panels so
  // operators can maintain relationship context without editing raw key names.
  for (const [key, value] of Object.entries(row.extData)) {
    if (extDataPresetKeySet.value.has(key)) {
      extDataPresetDraft[key] = value === undefined || value === null ? '' : String(value)
    }
  }
  extDataDraftRows.value = Object.entries(row.extData)
    .filter(([key]) => !extDataPresetKeySet.value.has(key))
    .map(([key, value]) => ({
    key,
    value: value === undefined || value === null ? '' : String(value),
  }))
}

// ext_data is edited as flat key/value pairs and normalized right before persistence.
function buildExtDataObject() {
  const presetFields = Object.entries(extDataPresetDraft).reduce<Record<string, string>>((acc, [key, value]) => {
    if (!key.trim() || !String(value).trim()) return acc
    acc[key] = String(value)
    return acc
  }, {})
  return extDataDraftRows.value.reduce<Record<string, string>>((acc, item) => {
    const key = item.key.trim()
    if (!key) return acc
    acc[key] = item.value
    return acc
  }, presetFields)
}

function createDraftRow() {
  const draft = visibleFormFields.value.reduce<Record<string, unknown>>((acc, field) => {
    if (field.key === 'id') return acc
    if (field.type === 'switch') {
      acc[field.key] = false
      return acc
    }
    acc[field.key] = undefined
    return acc
  }, {})

  if (route.query.contextField && route.query.contextValue) {
    const contextField = String(route.query.contextField)
    const fieldConfig = config.value.fields.find((item) => item.key === contextField)
    if (fieldConfig) {
      draft[contextField] = coerceValueByField(fieldConfig, String(route.query.contextValue))
    }
  }
  if (props.moduleKey === 'sysScript') {
    const presetKey = typeof route.query.preset === 'string' ? route.query.preset : ''
    const presetDraft = buildSysScriptDraftFromPreset(presetKey)
    if (presetDraft) {
      Object.assign(draft, presetDraft)
    }
  }

  if (supportsExtData.value) {
    draft.extData = {}
    resetExtDataPresetDraft()
  }
  return draft
}

// Duplicating stays entirely client-side until save so operators can adjust copied values before creating a new record.
function createDuplicateDraft(source: Record<string, unknown>) {
  const draft = createDraftRow()
  for (const field of visibleFormFields.value) {
    if (field.key === 'id') continue
    if (['createDate', 'createTime', 'writeDate', 'updateTime', 'dateDone'].includes(field.key)) continue
    draft[field.key] = source[field.key]
  }
  if ('state' in draft) {
    draft.state = source.state === 'draft' ? source.state : undefined
  }
  if (supportsExtData.value && source.extData && typeof source.extData === 'object') {
    draft.extData = JSON.parse(JSON.stringify(source.extData))
  }
  return draft
}

function coerceValueByField(field: ModuleFieldConfig, rawValue: string) {
  if (field.type === 'number' || field.type === 'decimal') {
    const numeric = Number(rawValue)
    return Number.isNaN(numeric) ? undefined : numeric
  }
  if (field.type === 'switch') {
    return ['1', 'true', 'yes'].includes(rawValue.toLowerCase())
  }
  return rawValue
}

function beginCreateRow() {
  isCreating.value = true
  expandedId.value = null
  lastActionOutcome.value = null
  clearChildRows()
  activeRow.value = createDraftRow()
  primeRelationControlsFromRow(activeRow.value)
  syncExtDataDraftRows(activeRow.value)
}

// Form creation now enters a dedicated page state so operators do not edit
// records inside the list surface and lose surrounding context.
function openCreateRow() {
  void router.push({
    name: props.moduleKey,
    query: buildPageQuery({ create: '1' }, ['detailId', 'focusField', 'focusValue', 'section']),
  })
}

function duplicateActiveRow() {
  if (!activeRow.value) return
  isCreating.value = true
  expandedId.value = null
  lastActionOutcome.value = null
  clearChildRows()
  activeRow.value = createDuplicateDraft(activeRow.value)
  primeRelationControlsFromRow(activeRow.value)
  syncExtDataDraftRows(activeRow.value)
}

function cancelCreateRow() {
  closeSheetPage()
}

function clearActiveSheetState() {
  isCreating.value = false
  expandedId.value = null
  activeRow.value = null
  lastActionOutcome.value = null
  clearClientFailureNotice()
  clearChildRows()
  clearDetailSignals()
  clearDocumentRows()
  clearDocumentDraft()
  syncExtDataDraftRows(null)
}

function closeSheetPage() {
  clearActiveSheetState()
  void router.push({
    name: props.moduleKey,
    query: buildPageQuery({}, ['detailId', 'create', 'focusField', 'focusValue', 'section', 'preset']),
  })
}

function buildPageQuery(extra: Record<string, string>, removeKeys: string[] = []) {
  const next: Record<string, string> = {}
  for (const [key, rawValue] of Object.entries(route.query)) {
    if (removeKeys.includes(key)) continue
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
    if (typeof value === 'string' && value !== '') {
      next[key] = value
    }
  }
  for (const [key, value] of Object.entries(extra)) {
    next[key] = value
  }
  return next
}

async function openDetailPage(row: any) {
  isCreating.value = false
  lastActionOutcome.value = null
  expandedId.value = Number(row.id)
  activeRow.value = JSON.parse(JSON.stringify(row))
  // The command center reuses the last opened business objects for quick reopen
  // and action shortcuts, so record openings are remembered here.
  commandCenterStore.rememberRecord({
    moduleKey: props.moduleKey,
    id: Number(row.id),
    label: String(row.name || row.ref || row.model || `#${row.id}`),
    subtitle: String(row.state || row.partnerName || row.partnerId || ''),
  })
  primeRelationLabels([activeRow.value], config.value.fields)
  primeRelationControlsFromRow(activeRow.value)
  syncExtDataDraftRows(activeRow.value)
  const detailTasks = await Promise.allSettled([
    loadChildRows(row),
    loadDocumentRows(),
    loadDetailSignals(Number(row.id)),
  ])
  let hasPartialFailure = false
  for (const [index, task] of detailTasks.entries()) {
    if (task.status === 'rejected') {
      const scope = ['childRows', 'documents', 'signals'][index] || 'detail'
      hasPartialFailure = true
      reportHandledClientFailure(`openDetailPage:${scope}`, task.reason, {
        retry: () => {
          void syncDetailRoute()
        },
        retryLabel: isEnglish.value ? 'Reload Detail' : '重新载入详情',
      })
    }
  }
  if (!hasPartialFailure) {
    clearClientFailureNotice()
  }
  await focusDetailSection(route.query.section)
}

async function syncDetailRoute() {
  const rawDetailId = Array.isArray(route.query.detailId) ? route.query.detailId[0] : route.query.detailId
  if (!rawDetailId) {
    clearActiveSheetState()
    return
  }
  const detailId = Number(rawDetailId)
  if (!Number.isInteger(detailId) || detailId <= 0) {
    clearActiveSheetState()
    return
  }
  const matched = tableData.value.find((row) => Number(row.id) === detailId)
  if (matched) {
    await openDetailPage(matched)
    return
  }
  loading.value = true
  try {
    const record = await fetchEntityById<any>(config.value.apiBase, detailId)
    await openDetailPage(record)
    clearClientFailureNotice()
  } catch (error) {
    reportHandledClientFailure('syncDetailRoute', error, {
      retry: () => {
        void syncDetailRoute()
      },
      retryLabel: isEnglish.value ? 'Retry Detail' : '重试详情页',
    })
  } finally {
    loading.value = false
  }
}

function registerDetailSection(key: string, el: unknown) {
  detailSectionRefs[key] = el instanceof HTMLElement ? el : null
}

function normalizeDetailSection(rawSection: unknown) {
  const section = typeof rawSection === 'string' ? rawSection : ''
  return availableDetailSections.value.includes(section) ? section : currentDetailSection.value
}

function isDetailSectionActive(...sections: string[]) {
  return sections.includes(currentDetailSection.value)
}

async function focusDetailSection(rawSection: unknown) {
  const section = normalizeDetailSection(rawSection)
  if (!section || !isDetailPage.value) return
  await nextTick()
  detailSectionRefs[section]?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function openDetailSection(section: string) {
  const targetSection = availableDetailSections.value.includes(section) ? section : detailDefaultSection.value
  if (currentDetailSection.value === targetSection && route.query.section === section) {
    void focusDetailSection(targetSection)
    return
  }
  void router.replace({
    name: props.moduleKey,
    query: buildPageQuery({ section: targetSection }),
  })
  void focusDetailSection(targetSection)
}

async function loadDetailSignals(recordId: number) {
  const [reminders, timeline] = await Promise.all([
    shouldShowRecordReminders.value
      ? fetchReminders({
          limit: 20,
          moduleKey: props.moduleKey,
          recordId,
        })
      : Promise.resolve([]),
    shouldShowTimeline.value ? fetchTimeline(props.moduleKey, recordId) : Promise.resolve([]),
  ])
  recordReminderItems.value = reminders
  recordTimelineItems.value = timeline
}

async function handleTimelineUpdated() {
  if (!activeRow.value?.id) return
  try {
    await loadDetailSignals(Number(activeRow.value.id))
    clearClientFailureNotice()
  } catch (error) {
    reportHandledClientFailure('handleTimelineUpdated', error, {
      retry: () => {
        void handleTimelineUpdated()
      },
      retryLabel: isEnglish.value ? 'Retry Refresh' : '重新刷新',
    })
  }
}

function buildDetailWindowPath(recordId: number) {
  const params = new URLSearchParams()
  params.set('detailId', String(recordId))
  if (currentDetailSection.value) {
    params.set('section', currentDetailSection.value)
  }
  return `${config.value.route}?${params.toString()}`
}

function openDetailInNewWindow(recordId: number) {
  if (!desktopBridge?.openWindow) return
  desktopBridge.openWindow(buildDetailWindowPath(recordId), {
    width: 1440,
    height: 920,
  })
}

function popoutActiveRow() {
  if (!activeRow.value?.id) return
  openDetailInNewWindow(Number(activeRow.value.id))
}

async function handleRowClick(row: any, event?: MouseEvent) {
  if (event && (event.ctrlKey || event.metaKey) && desktopBridge?.openWindow) {
    openDetailInNewWindow(Number(row.id))
    return
  }
  await router.push({
    name: props.moduleKey,
    query: buildPageQuery({ detailId: String(row.id) }, ['create', 'focusField', 'focusValue', 'preset']),
  })
}

function buildSavePayload() {
  const payload = JSON.parse(JSON.stringify(activeRow.value || {}))
  if (supportsExtData.value) {
    payload.extData = buildExtDataObject()
  } else {
    delete payload.extData
  }
  return payload
}

function validateActiveRow() {
  for (const field of visibleFormFields.value) {
    if (!field.required || field.key === 'id') continue
    const value = activeRow.value?.[field.key]
    if (value === undefined || value === null || value === '') {
      ElMessage.warning(`${resolveFieldLabel(field)} is required`)
      return false
    }
  }
  return true
}

function findSavedRow(payload: Record<string, unknown>) {
  const matchKeys = ['name', 'ref', 'model', 'eventName', 'username', 'roleCode']
  return tableData.value.find((row) =>
    matchKeys.some((key) => payload[key] !== undefined && String(row[key]) === String(payload[key])),
  )
}

async function saveActiveRow() {
  if (!activeRow.value || !validateActiveRow()) return
  isSaving.value = true
  try {
    const payload = buildSavePayload()
    if (isCreating.value) {
      delete payload.id
      await createEntity(config.value.apiBase, payload)
      isCreating.value = false
      await loadData()
      const matched = findSavedRow(payload)
      if (matched) {
        await handleRowClick(matched)
      } else {
        activeRow.value = null
      }
    } else if (activeRow.value.id) {
      await updateEntity(config.value.apiBase, Number(activeRow.value.id), payload)
      const updated = await fetchEntityById<any>(config.value.apiBase, Number(activeRow.value.id))
      await openDetailPage(updated)
      await loadData()
    }
    clearClientFailureNotice()
    ElMessage.success(t('app.saveSuccess'))
  } catch (error) {
    reportHandledClientFailure('saveActiveRow', error, {
      retry: () => {
        void saveActiveRow()
      },
      retryLabel: isEnglish.value ? 'Retry Save' : '重试保存',
    })
  } finally {
    isSaving.value = false
  }
}

async function removeActiveRow() {
  if (!activeRow.value?.id || isCreating.value) return
  try {
    await ElMessageBox.confirm('Delete the current record?', 'Confirm Delete', {
      type: 'warning',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    })
  } catch {
    return
  }
  isDeleting.value = true
  try {
    await deleteEntity(config.value.apiBase, Number(activeRow.value.id))
    clearActiveSheetState()
    await loadData()
    void router.push({
      name: props.moduleKey,
      query: buildPageQuery({}, ['detailId', 'create', 'focusField', 'focusValue']),
    })
    clearClientFailureNotice()
    ElMessage.success('Delete Success')
  } catch (error) {
    reportHandledClientFailure('removeActiveRow', error, {
      retry: () => {
        void removeActiveRow()
      },
      retryLabel: isEnglish.value ? 'Retry Delete' : '重试删除',
    })
  } finally {
    isDeleting.value = false
  }
}

function addExtDataRow() {
  extDataDraftRows.value.push({ key: '', value: '' })
}

function removeExtDataRow(index: number) {
  extDataDraftRows.value.splice(index, 1)
}

function resetExtDataPresetDraft() {
  for (const key of Object.keys(extDataPresetDraft)) {
    delete extDataPresetDraft[key]
  }
  for (const section of extDataPresetSections.value) {
    for (const field of section.fields) {
      extDataPresetDraft[field.key] = ''
    }
  }
}

function truncateText(value: string, limit = 42) {
  return value.length > limit ? `${value.slice(0, limit)}…` : value
}

function isFieldEditable(field: ModuleFieldConfig) {
  return !field.readonly && editableFieldKeys.value.includes(field.key)
}

function inputPlaceholder(field: ModuleFieldConfig) {
  return field.placeholder || `Input ${resolveFieldLabel(field)}`
}

// Large fields stay full width so scripts, descriptions, and notes remain workable in the shared form shell.
function isWideField(field: ModuleFieldConfig) {
  return field.type === 'textarea' || ['description', 'remark', 'memo', 'scriptCode'].includes(field.key)
}

function isCodeField(field: ModuleFieldConfig) {
  return ['scriptCode', 'code'].includes(field.key)
}

function relationHint(field: ModuleFieldConfig, row = activeRow.value) {
  const relationModule = inferRelationModule(field)
  const relationId = normalizeRelationId(row?.[field.key])
  if (!relationModule || !relationId) return ''
  queueRelationLabel(relationModule, relationId)
  return relationLabels[relationModule]?.[relationId] || `ID:${relationId}`
}

function formatFieldValue(
  row: any,
  field: Pick<ModuleFieldConfig, 'key' | 'formatter' | 'options' | 'type' | 'relation'>,
  moduleKey: ModuleKey = props.moduleKey,
) {
  const value = row?.[field.key]
  if (value === undefined || value === null || value === '') return '-'

  const relationModule = inferRelationModule(field)
  const relationId = normalizeRelationId(value)
  if (relationModule && relationId) {
    queueRelationLabel(relationModule, relationId)
    return relationLabels[relationModule]?.[relationId] || `ID:${relationId}`
  }

  if (field.formatter === 'amount') return formatAmount(value)
  if (field.formatter === 'date') return formatDate(String(value))
  if (field.formatter === 'datetime') return formatDateTime(String(value))
  if (field.formatter === 'boolean') return formatBoolean(value)
  if (field.formatter === 'tag') return formatModuleStatus(moduleKey, field.key, value)

  const optionLabel = resolveOptionLabel(field as ModuleFieldConfig, value)
  if (optionLabel) return optionLabel
  if (field.type === 'password') return '••••••'
  if (field.type === 'switch') return formatBoolean(value)
  return String(value)
}

function tagType(value: unknown) {
  const state = String(value || '')
  if (['done', 'posted', 'matched', 'sale', 'purchase', '1', 'true'].includes(state)) return 'success'
  if (['cancel', 'cancelled', 'reversed', 'refuse', 'loss', '0', 'false'].includes(state)) return 'danger'
  if (['assigned', 'confirmed', 'validate', 'gain'].includes(state)) return 'warning'
  return 'info'
}

function buildModuleQuery(moduleKey: ModuleKey, searchValue: string, focusField = 'name') {
  const detailId = focusField === 'id' ? normalizeRelationId(searchValue) : undefined
  if (detailId) {
    return buildDetailQuery(detailId)
  }
  const query: Record<string, string> = {
    focusField,
    focusValue: searchValue,
    relatedTo: props.moduleKey,
  }
  const targetConfig = moduleConfigMap[moduleKey]
  if (targetConfig.filters.some((filter) => filter.fieldKey === 'keyword')) {
    query.keyword = searchValue
  }
  if (targetConfig.filters.some((filter) => filter.fieldKey === focusField)) {
    query[focusField] = searchValue
  }
  return query
}

function inferModuleByReference(value?: string | null) {
  const normalized = String(value || '').trim().toUpperCase()
  if (!normalized) return undefined
  if (normalized.startsWith('SO')) return 'saleOrder'
  if (normalized.startsWith('PO')) return 'purchaseOrder'
  if (normalized.startsWith('MO')) return 'mrpProduction'
  if (normalized.startsWith('PAY')) return 'accountPayment'
  if (normalized.startsWith('MOVE') || normalized.startsWith('JE')) return 'accountMove'
  if (normalized.startsWith('INV') || normalized.startsWith('BILL')) return 'accountInvoice'
  if (normalized.startsWith('WH/') || normalized.startsWith('PICK') || normalized.startsWith('OUT/') || normalized.startsWith('IN/')) {
    return 'stockPicking'
  }
  return undefined
}

function normalizeLookupToken(value?: string | null) {
  return String(value || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

// Model names from server-script records are mapped back to module keys so platform pages can jump into business modules.
function inferModuleByModelName(value?: string | null): ModuleKey | undefined {
  const target = normalizeLookupToken(value)
  if (!target) return undefined
  const matched = Object.values(moduleConfigMap).find((item) => {
    const candidates = [
      item.key,
      item.title,
      item.apiBase.split('/').filter(Boolean).at(-1),
    ]
    return candidates.some((candidate) => normalizeLookupToken(candidate) === target)
  })
  return matched?.key as ModuleKey | undefined
}

function buildReferenceLink(label: string, value: string, moduleKey: ModuleKey, focusField = 'name'): ResolvedLink {
  return {
    key: `${moduleKey}:${label}:${value}`,
    label,
    moduleKey,
    focusField,
    value,
  }
}

function buildRouteLink(label: string, moduleKey: ModuleKey, query: Record<string, string>, value?: string): ResolvedLink {
  const normalizedQuery = applyDefaultDetailSectionToQuery(moduleKey, query)
  return {
    key: `${moduleKey}:${label}:${Object.values(normalizedQuery).join(':')}`,
    label,
    moduleKey,
    focusField: normalizedQuery.focusField || 'name',
    value: value || normalizedQuery.focusValue || normalizedQuery.contextValue || label,
    query: normalizedQuery,
  }
}

function pickFirstFilledText(row: Record<string, any> | null, keys: string[]) {
  for (const key of keys) {
    const value = String(row?.[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function resolveRowTitle(row: Record<string, any> | null) {
  return pickFirstFilledText(row, ['name', 'displayName', 'completeName', 'defaultCode', 'barcode', 'ref']) || String(row?.id ?? '-')
}

function applyDefaultDetailSectionToQuery(moduleKey: ModuleKey, query: Record<string, string>) {
  if (query.detailId || (query.focusField === 'id' && query.focusValue)) {
    return {
      ...query,
      ...(query.section ? {} : resolveDefaultDetailSection(moduleKey) ? { section: resolveDefaultDetailSection(moduleKey) } : {}),
    }
  }
  return query
}

function buildDetailQuery(recordId: number, extra: Record<string, string> = {}, targetModuleKey: ModuleKey = props.moduleKey) {
  return applyDefaultDetailSectionToQuery(targetModuleKey, {
    detailId: String(recordId),
    relatedTo: props.moduleKey,
    ...extra,
  })
}

function buildFocusIdLink(label: string, moduleKey: ModuleKey, rawId: unknown, value?: string): ResolvedLink | undefined {
  const relationId = normalizeRelationId(rawId)
  if (!relationId) return undefined
  return buildRouteLink(label, moduleKey, buildDetailQuery(relationId), value || String(relationId))
}

function buildContextListLink(
  label: string,
  moduleKey: ModuleKey,
  contextField: string,
  contextValue: unknown,
  value?: string,
): ResolvedLink | undefined {
  if (contextValue === undefined || contextValue === null || String(contextValue).trim() === '') return undefined
  return buildRouteLink(label, moduleKey, {
    contextField,
    contextValue: String(contextValue),
    relatedTo: props.moduleKey,
  }, value || String(contextValue))
}

function buildKeywordListLink(label: string, moduleKey: ModuleKey, keyword: string, value?: string): ResolvedLink | undefined {
  const normalized = keyword.trim()
  if (!normalized) return undefined
  return buildRouteLink(label, moduleKey, {
    keyword: normalized,
    relatedTo: props.moduleKey,
  }, value || normalized)
}

function childRowCount(moduleKey: ModuleKey) {
  return (childTableRows[moduleKey] || []).length
}

function buildChildRowsContextLink(
  label: string,
  moduleKey: ModuleKey,
  parentFieldKey: string,
  rowId: unknown,
  value?: string,
): ResolvedLink | undefined {
  const relationId = normalizeRelationId(rowId)
  if (!relationId) return undefined
  return buildContextListLink(label, moduleKey, parentFieldKey, relationId, value || String(relationId))
}

// Route context is translated into readable chips and optional jump targets so operators can trace where they came from.
function buildContextChip(scope: 'context' | 'focus', fieldKey: string, rawValue: string): ContextChip {
  const field = fieldMap.value[fieldKey]
  const relationModule = field ? inferRelationModule(field) : undefined
  const relationId = normalizeRelationId(rawValue)
  if (relationModule && relationId) {
    queueRelationLabel(relationModule, relationId)
  }
  const relationLabel = relationModule && relationId ? relationLabels[relationModule]?.[relationId] : undefined
  const displayValue = relationLabel || (field ? formatFieldValue({ [fieldKey]: rawValue }, field) : rawValue)
  const referenceModule = inferModuleByReference(rawValue)
  const modelModule = fieldKey === 'model' ? inferModuleByModelName(rawValue) : undefined
  const link = relationModule && relationId
    ? buildRouteLink(
        resolveFieldLabel(field || { key: fieldKey, label: fieldKey }),
        relationModule,
        buildDetailQuery(relationId),
        relationLabel || String(relationId),
      )
    : referenceModule
      ? buildReferenceLink(resolveFieldLabel(field || { key: fieldKey, label: fieldKey }), rawValue, referenceModule)
      : modelModule
        ? buildRouteLink(resolveFieldLabel(field || { key: fieldKey, label: fieldKey }), modelModule, {
            relatedTo: props.moduleKey,
          }, rawValue)
      : undefined
  return {
    key: `${scope}:${fieldKey}:${rawValue}`,
    label: scope === 'context' ? 'Context' : 'Focus',
    value: `${resolveFieldLabel(field || { key: fieldKey, label: fieldKey })} = ${displayValue}`,
    link,
  }
}

function buildDocumentLinks(row: Record<string, any> | null) {
  if (!row) return []
  const links: ResolvedLink[] = []
  for (const field of config.value.fields) {
    const rawValue = row[field.key]
    if (!rawValue || typeof rawValue !== 'string') continue

    const moduleKey = DOCUMENT_FIELD_TARGETS[field.key] || (field.key === 'origin' || field.key === 'originRef' ? inferModuleByReference(rawValue) : undefined)
    if (!moduleKey) continue
    links.push(buildReferenceLink(resolveFieldLabel(field), rawValue, moduleKey))
  }
  return links
}

// Relation links aggregate numeric foreign keys and polymorphic model/id pairs into one drilldown panel.
function buildRelationLinks(row: Record<string, any> | null) {
  if (!row) return []
  const links: ResolvedLink[] = []
  for (const field of config.value.fields) {
    const relationModule = inferRelationModule(field)
    const relationId = normalizeRelationId(row[field.key])
    if (relationModule && relationId) {
      links.push(
        buildRouteLink(resolveFieldLabel(field), relationModule, buildDetailQuery(relationId), relationHint(field, row) || String(relationId)),
      )
    }
  }
  const targetModule = inferModuleByModelName(row.resModel)
  if (targetModule && row.resId) {
    links.push(
      buildRouteLink(
        resolveFieldLabel({ key: 'resModel', label: 'resModel' }),
        targetModule,
        buildDetailQuery(Number(row.resId)),
        `${row.resModel}#${row.resId}`,
      ),
    )
  }
  return links.filter((link, index, items) => items.findIndex((item) => item.key === link.key) === index)
}

function buildDownstreamRollbackSummary(row: Record<string, any> | null): DownstreamRollbackSummary {
  const items: DownstreamRollbackItem[] = []
  const addReference = (
    key: string,
    label: string,
    moduleKey: ModuleKey,
    rawReference: unknown,
    readyReason: string,
    missingReason: string,
  ) => {
    const reference = String(rawReference || '').trim()
    items.push({
      key,
      label,
      moduleKey,
      reference: reference || '-',
      ready: Boolean(reference),
      reason: reference ? readyReason : missingReason,
    })
  }
  const addCount = (
    key: string,
    label: string,
    moduleKey: ModuleKey,
    count: number,
    readyReason: string,
    missingReason: string,
  ) => {
    items.push({
      key,
      label,
      moduleKey,
      reference: String(count),
      ready: count > 0,
      reason: count > 0 ? readyReason : missingReason,
    })
  }

  if (row && props.moduleKey === 'saleOrder') {
    addReference('sale-partner', isEnglish.value ? 'Customer Context' : '客户上下文', 'resPartner', row.partnerId, isEnglish.value ? 'Customer linkage remains visible.' : '客户关联保持可见。', isEnglish.value ? 'Customer linkage is missing.' : '缺少客户关联。')
    addReference('sale-company', isEnglish.value ? 'Company Scope' : '公司范围', 'resCompany', row.companyId, isEnglish.value ? 'Company scope remains visible.' : '公司范围保持可见。', isEnglish.value ? 'Company scope is missing.' : '缺少公司范围。')
    addCount('sale-lines', isEnglish.value ? 'Order Lines' : '订单行', 'saleOrderLine', childRowCount('saleOrderLine'), isEnglish.value ? 'Sales order lines are loaded for review.' : '销售订单行已可核对。', isEnglish.value ? 'Sales order lines are still missing.' : '销售订单行仍未就绪。')
    addReference('sale-picking', isEnglish.value ? 'Delivery Transfer' : '出库调拨', 'stockPicking', row.pickingRef, isEnglish.value ? 'Delivery transfer is linked.' : '出库调拨已链接。', isEnglish.value ? 'Delivery transfer reference is missing.' : '缺少出库调拨引用。')
    addReference('sale-invoice', isEnglish.value ? 'Customer Invoice' : '客户发票', 'accountInvoice', row.invoiceRef, isEnglish.value ? 'Invoice artifact is linked.' : '发票结果对象已链接。', isEnglish.value ? 'Invoice reference is missing.' : '缺少发票引用。')
    addReference('sale-payment', isEnglish.value ? 'Payment Artifact' : '付款结果对象', 'accountPayment', row.paymentRef || row.invoicePaymentRef, isEnglish.value ? 'Payment reference is visible from the sale chain.' : '销售链上已可见付款引用。', isEnglish.value ? 'Payment reference is not visible from the sale chain yet.' : '销售链上尚未看到付款引用。')
  } else if (row && props.moduleKey === 'purchaseOrder') {
    addReference('purchase-partner', isEnglish.value ? 'Vendor Context' : '供应商上下文', 'resPartner', row.partnerId, isEnglish.value ? 'Vendor linkage remains visible.' : '供应商关联保持可见。', isEnglish.value ? 'Vendor linkage is missing.' : '缺少供应商关联。')
    addReference('purchase-company', isEnglish.value ? 'Company Scope' : '公司范围', 'resCompany', row.companyId, isEnglish.value ? 'Company scope remains visible.' : '公司范围保持可见。', isEnglish.value ? 'Company scope is missing.' : '缺少公司范围。')
    addCount('purchase-lines', isEnglish.value ? 'Order Lines' : '订单行', 'purchaseOrderLine', childRowCount('purchaseOrderLine'), isEnglish.value ? 'Purchase order lines are loaded for review.' : '采购订单行已可核对。', isEnglish.value ? 'Purchase order lines are still missing.' : '采购订单行仍未就绪。')
    addReference('purchase-receipt', isEnglish.value ? 'Vendor Receipt' : '供应商收货', 'stockPicking', row.receiptRef, isEnglish.value ? 'Receipt transfer is linked.' : '收货调拨已链接。', isEnglish.value ? 'Receipt transfer reference is missing.' : '缺少收货调拨引用。')
    addReference('purchase-bill', isEnglish.value ? 'Vendor Bill' : '供应商账单', 'accountInvoice', row.billRef, isEnglish.value ? 'Vendor bill is linked.' : '供应商账单已链接。', isEnglish.value ? 'Vendor bill reference is missing.' : '缺少供应商账单引用。')
    addReference('purchase-payment', isEnglish.value ? 'Vendor Payment' : '供应商付款', 'accountPayment', row.paymentRef || row.billPaymentRef, isEnglish.value ? 'Payment artifact is linked.' : '付款结果对象已链接。', isEnglish.value ? 'Payment reference is not visible from the purchase chain yet.' : '采购链上尚未看到付款引用。')
  } else if (row && props.moduleKey === 'accountInvoice') {
    const originModule = inferModuleByReference(row.originRef)
    addReference('invoice-partner', isEnglish.value ? 'Partner Context' : '伙伴上下文', 'resPartner', row.partnerId, isEnglish.value ? 'Invoice partner linkage is retained.' : '发票伙伴关联已保留。', isEnglish.value ? 'Invoice partner linkage is missing.' : '缺少发票伙伴关联。')
    addReference('invoice-company', isEnglish.value ? 'Company Scope' : '公司范围', 'resCompany', row.companyId, isEnglish.value ? 'Invoice company scope is retained.' : '发票公司范围已保留。', isEnglish.value ? 'Invoice company scope is missing.' : '缺少发票公司范围。')
    addReference('invoice-origin', isEnglish.value ? 'Upstream Origin' : '上游来源', originModule || 'saleOrder', row.originRef, isEnglish.value ? 'Origin reference is retained.' : '来源引用已保留。', isEnglish.value ? 'Origin reference is missing.' : '缺少来源引用。')
    addReference('invoice-payment', isEnglish.value ? 'Payment Artifact' : '付款结果对象', 'accountPayment', row.paymentRef, isEnglish.value ? 'Payment artifact is linked.' : '付款结果对象已链接。', isEnglish.value ? 'Payment artifact is missing.' : '缺少付款结果对象。')
  } else if (row && props.moduleKey === 'stockPicking') {
    const originModule = inferModuleByReference(row.origin)
    addReference('picking-partner', isEnglish.value ? 'Partner Context' : '伙伴上下文', 'resPartner', row.partnerId, isEnglish.value ? 'Transfer partner context remains visible.' : '调拨伙伴上下文保持可见。', isEnglish.value ? 'Transfer partner context is missing.' : '缺少调拨伙伴上下文。')
    addReference('picking-company', isEnglish.value ? 'Company Scope' : '公司范围', 'resCompany', row.companyId, isEnglish.value ? 'Transfer company scope remains visible.' : '调拨公司范围保持可见。', isEnglish.value ? 'Transfer company scope is missing.' : '缺少调拨公司范围。')
    addReference('picking-origin', isEnglish.value ? 'Business Origin' : '业务来源', originModule || 'saleOrder', row.origin, isEnglish.value ? 'Origin document is linked.' : '来源单据已链接。', isEnglish.value ? 'Origin document reference is missing.' : '缺少来源单据引用。')
    addCount('picking-moves', isEnglish.value ? 'Move Rows' : '库存移动行', 'stockMove', (childTableRows.stockMove || []).length, isEnglish.value ? 'Move rows are available for review.' : '库存移动行可用于核对。', isEnglish.value ? 'Move rows are not loaded yet.' : '尚未加载库存移动行。')
  } else if (row && props.moduleKey === 'accountPayment') {
    const originModule = inferModuleByReference(row.originRef)
    addReference('payment-partner', isEnglish.value ? 'Partner Context' : '伙伴上下文', 'resPartner', row.partnerId, isEnglish.value ? 'Payment partner remains visible.' : '付款伙伴保持可见。', isEnglish.value ? 'Payment partner is missing.' : '缺少付款伙伴。')
    addReference('payment-company', isEnglish.value ? 'Company Scope' : '公司范围', 'resCompany', row.companyId, isEnglish.value ? 'Payment company scope remains visible.' : '付款公司范围保持可见。', isEnglish.value ? 'Payment company scope is missing.' : '缺少付款公司范围。')
    addReference('payment-origin', isEnglish.value ? 'Payment Origin' : '付款来源', originModule || 'accountInvoice', row.originRef, isEnglish.value ? 'Payment source remains visible.' : '付款来源保持可见。', isEnglish.value ? 'Payment origin is missing.' : '缺少付款来源。')
    addReference('payment-invoice', isEnglish.value ? 'Source Invoice' : '来源发票', 'accountInvoice', row.invoiceRef, isEnglish.value ? 'Source invoice is linked.' : '来源发票已链接。', isEnglish.value ? 'Source invoice reference is missing.' : '缺少来源发票引用。')
    addReference('payment-journal', isEnglish.value ? 'Journal Entry' : '会计凭证', 'accountMove', row.journalEntryRef, isEnglish.value ? 'Generated journal entry is linked.' : '生成凭证已链接。', isEnglish.value ? 'Generated journal entry is not visible yet.' : '尚未看到生成凭证。')
  }

  const readyCount = items.filter((item) => item.ready).length
  return {
    chainKey: props.moduleKey,
    label: isEnglish.value ? 'Downstream Rollback Summary' : '下游回退摘要',
    expectedCount: items.length,
    readyCount,
    missingLabels: items.filter((item) => !item.ready).map((item) => item.label),
    items,
    childLineSummary: Object.entries(childTableRows)
      .map(([moduleKey, rows]) => ({ moduleKey, count: rows.length }))
      .filter((item) => item.count > 0),
  }
}

function buildFirstWaveSettlementSummary(row: Record<string, any> | null): SettlementReadinessSummary {
  const items: SettlementReadinessItem[] = []
  const push = (
    key: string,
    label: string,
    value: string,
    status: SettlementReadinessItem['status'],
    reason: string,
    link?: ResolvedLink,
  ) => {
    items.push({ key, label, value, status, reason, link })
  }

  if (row && props.moduleKey === 'saleOrder') {
    const salePaymentRef = String(row.paymentRef || row.invoicePaymentRef || '').trim()
    const saleStarted = ['sale', 'done'].includes(String(row.state)) || Boolean(row.pickingRef || row.invoiceRef || salePaymentRef)
    push(
      'sale-release',
      isEnglish.value ? 'Sales Release' : '销售放行',
      String(row.state || '-'),
      saleStarted ? 'ready' : 'warning',
      saleStarted
        ? (isEnglish.value ? 'The sales document has already entered the executable chain.' : '销售单已经进入可执行链路。')
        : (isEnglish.value ? 'Confirm the sales order before downstream artifacts can close the chain.' : '先确认销售订单，才能继续闭合下游结果对象。'),
    )
    push(
      'sale-picking',
      isEnglish.value ? 'Delivery Artifact' : '出库结果对象',
      String(row.pickingRef || '-'),
      row.pickingRef ? 'ready' : saleStarted ? 'missing' : 'warning',
      row.pickingRef
        ? (isEnglish.value ? 'The delivery transfer is already reachable from the sales cockpit.' : '销售驾驶舱已经可以直接打开出库调拨。')
        : (isEnglish.value ? 'The sales chain still needs a visible delivery transfer artifact.' : '销售链还需要一个可见的出库调拨结果对象。'),
      row.pickingRef ? buildReferenceLink(resolveFieldLabel({ key: 'pickingRef', label: 'pickingRef' }), row.pickingRef, 'stockPicking') : undefined,
    )
    push(
      'sale-invoice',
      isEnglish.value ? 'Invoice Artifact' : '开票结果对象',
      String(row.invoiceRef || '-'),
      row.invoiceRef ? 'ready' : saleStarted || salePaymentRef ? 'missing' : 'warning',
      row.invoiceRef
        ? (isEnglish.value ? 'The invoice artifact is already linked to the sales source.' : '发票结果对象已经挂回销售源单。')
        : (isEnglish.value ? 'Billing is still not linked back to the sales record.' : '开票结果对象仍未回挂到销售记录。'),
      row.invoiceRef ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice') : undefined,
    )
    push(
      'sale-payment',
      isEnglish.value ? 'Payment Artifact' : '付款结果对象',
      salePaymentRef || '-',
      salePaymentRef ? 'ready' : row.invoiceRef ? 'warning' : 'warning',
      salePaymentRef
        ? (isEnglish.value ? 'The settlement payment artifact is already visible on the sales chain.' : '销售链上已经可以看到结算付款结果对象。')
        : row.invoiceRef
          ? (isEnglish.value ? 'Billing exists, but the final payment artifact still needs follow-up.' : '发票已经存在，但最终付款结果对象还需要继续补齐。')
          : (isEnglish.value ? 'Settlement cannot close until invoice and payment artifacts appear.' : '在发票和付款结果对象出现前，销售结算还无法闭环。'),
      salePaymentRef ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), salePaymentRef, 'accountPayment') : undefined,
    )
  } else if (row && props.moduleKey === 'purchaseOrder') {
    const purchasePaymentRef = String(row.paymentRef || row.billPaymentRef || '').trim()
    const purchaseStarted = ['purchase', 'done'].includes(String(row.state)) || Boolean(row.receiptRef || row.billRef || purchasePaymentRef)
    push(
      'purchase-release',
      isEnglish.value ? 'Procurement Release' : '采购放行',
      String(row.state || '-'),
      purchaseStarted ? 'ready' : 'warning',
      purchaseStarted
        ? (isEnglish.value ? 'The purchase document has already entered the executable chain.' : '采购单已经进入可执行链路。')
        : (isEnglish.value ? 'Confirm the purchase order before receipt, billing, and payment can close the chain.' : '先确认采购订单，才能继续闭合收货、账单和付款链路。'),
    )
    push(
      'purchase-receipt',
      isEnglish.value ? 'Receipt Artifact' : '收货结果对象',
      String(row.receiptRef || '-'),
      row.receiptRef ? 'ready' : purchaseStarted ? 'missing' : 'warning',
      row.receiptRef
        ? (isEnglish.value ? 'The receipt artifact is already reachable from the procurement source.' : '采购源单已经可以直接打开收货结果对象。')
        : (isEnglish.value ? 'The procurement chain still needs a visible receipt artifact.' : '采购链还需要一个可见的收货结果对象。'),
      row.receiptRef ? buildReferenceLink(resolveFieldLabel({ key: 'receiptRef', label: 'receiptRef' }), row.receiptRef, 'stockPicking') : undefined,
    )
    push(
      'purchase-bill',
      isEnglish.value ? 'Bill Artifact' : '账单结果对象',
      String(row.billRef || '-'),
      row.billRef ? 'ready' : purchaseStarted || purchasePaymentRef ? 'missing' : 'warning',
      row.billRef
        ? (isEnglish.value ? 'The vendor bill is already linked back to the purchase source.' : '供应商账单已经回挂到采购源单。')
        : (isEnglish.value ? 'The purchase record still lacks a linked vendor bill.' : '采购记录仍然缺少回挂的供应商账单。'),
      row.billRef ? buildReferenceLink(resolveFieldLabel({ key: 'billRef', label: 'billRef' }), row.billRef, 'accountInvoice') : undefined,
    )
    push(
      'purchase-payment',
      isEnglish.value ? 'Payment Artifact' : '付款结果对象',
      purchasePaymentRef || '-',
      purchasePaymentRef ? 'ready' : row.billRef ? 'warning' : 'warning',
      purchasePaymentRef
        ? (isEnglish.value ? 'The final payment artifact is already visible from the procurement chain.' : '采购链上已经可以看到最终付款结果对象。')
        : row.billRef
          ? (isEnglish.value ? 'The bill exists, but the payment artifact still needs follow-up.' : '账单已经存在，但付款结果对象还需要继续补齐。')
          : (isEnglish.value ? 'Settlement cannot close until bill and payment artifacts appear.' : '在账单和付款结果对象出现前，采购结算还无法闭环。'),
      purchasePaymentRef ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), purchasePaymentRef, 'accountPayment') : undefined,
    )
  } else if (row && props.moduleKey === 'accountInvoice') {
    const originModule = inferModuleByReference(row.originRef)
    push(
      'invoice-posting',
      isEnglish.value ? 'Invoice Posting' : '发票过账',
      String(row.state || '-'),
      String(row.state) === 'posted' ? 'ready' : 'warning',
      String(row.state) === 'posted'
        ? (isEnglish.value ? 'The invoice has already been posted into accounting.' : '发票已经完成会计过账。')
        : (isEnglish.value ? 'Post the invoice before payment registration or settlement acceptance.' : '先完成发票过账，再进入付款登记和结算放行。'),
    )
    push(
      'invoice-origin',
      isEnglish.value ? 'Upstream Origin' : '上游来源',
      String(row.originRef || '-'),
      row.originRef ? 'ready' : 'missing',
      row.originRef
        ? (isEnglish.value ? 'The upstream business source remains traceable from the invoice.' : '发票仍然可以追溯回上游业务来源。')
        : (isEnglish.value ? 'Billing review still lacks a retained upstream business source.' : '账单审查仍然缺少保留的上游业务来源。'),
      row.originRef && originModule ? buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule) : undefined,
    )
    push(
      'invoice-payment',
      isEnglish.value ? 'Payment Artifact' : '付款结果对象',
      String(row.paymentRef || '-'),
      row.paymentRef ? 'ready' : String(row.state) === 'posted' ? 'warning' : 'warning',
      row.paymentRef
        ? (isEnglish.value ? 'The payment artifact is already linked to the invoice.' : '付款结果对象已经关联到当前发票。')
        : (isEnglish.value ? 'Settlement review still needs a visible payment artifact.' : '结算审查仍然需要一个可见的付款结果对象。'),
      row.paymentRef ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), row.paymentRef, 'accountPayment') : undefined,
    )
  } else if (row && props.moduleKey === 'stockPicking') {
    const originModule = inferModuleByReference(row.origin)
    const moveCount = childRowCount('stockMove')
    push(
      'picking-origin',
      isEnglish.value ? 'Upstream Origin' : '上游来源',
      String(row.origin || '-'),
      row.origin ? 'ready' : 'missing',
      row.origin
        ? (isEnglish.value ? 'The transfer still points back to its business origin.' : '当前调拨仍然保留了业务来源。')
        : (isEnglish.value ? 'Warehouse execution still lacks a visible upstream origin.' : '仓储执行仍然缺少可见的上游来源。'),
      row.origin && originModule ? buildReferenceLink(resolveFieldLabel({ key: 'origin', label: 'origin' }), row.origin, originModule) : undefined,
    )
    push(
      'picking-moves',
      isEnglish.value ? 'Move Pack' : '移动行包',
      `${moveCount}`,
      moveCount ? 'ready' : 'missing',
      moveCount
        ? (isEnglish.value ? 'Move rows are already available for warehouse execution review.' : '库存移动行已经可用于仓储执行核对。')
        : (isEnglish.value ? 'The transfer still lacks visible stock move rows.' : '当前调拨仍然缺少可见的库存移动行。'),
      buildChildRowsContextLink(moduleTitle('stockMove'), 'stockMove', 'pickingId', row.id, resolveRowTitle(row)),
    )
    push(
      'picking-completion',
      isEnglish.value ? 'Transfer Completion' : '调拨完成',
      String(row.state || '-'),
      ['done', 'cancel'].includes(String(row.state)) ? 'ready' : 'warning',
      ['done', 'cancel'].includes(String(row.state))
        ? (isEnglish.value ? 'The transfer already reached a terminal execution state.' : '调拨已经进入终态执行状态。')
        : (isEnglish.value ? 'The transfer still needs warehouse execution or rollback review.' : '当前调拨仍然需要继续执行或回退核对。'),
    )
  } else if (row && props.moduleKey === 'accountPayment') {
    const originModule = inferModuleByReference(row.originRef)
    const sourceLink = row.originRef && originModule
      ? buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule)
      : row.invoiceRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice')
        : undefined
    push(
      'payment-source',
      isEnglish.value ? 'Source Anchor' : '来源锚点',
      String(row.originRef || row.invoiceRef || '-'),
      row.originRef || row.invoiceRef ? 'ready' : 'missing',
      row.originRef || row.invoiceRef
        ? (isEnglish.value ? 'The payment still keeps a visible source invoice or business anchor.' : '当前付款仍然保留了可见的来源发票或业务锚点。')
        : (isEnglish.value ? 'Payment review still lacks a visible source invoice or business anchor.' : '付款审查仍然缺少可见的来源发票或业务锚点。'),
      sourceLink,
    )
    push(
      'payment-posting',
      isEnglish.value ? 'Payment Posting' : '付款过账',
      String(row.state || '-'),
      String(row.state) === 'posted' ? 'ready' : 'warning',
      String(row.state) === 'posted'
        ? (isEnglish.value ? 'The payment has already been posted.' : '付款已经完成过账。')
        : (isEnglish.value ? 'Post the payment before accounting settlement closes.' : '先完成付款过账，再关闭会计结算。'),
    )
    push(
      'payment-journal',
      isEnglish.value ? 'Journal Entry' : '会计凭证',
      String(row.journalEntryRef || '-'),
      row.journalEntryRef ? 'ready' : String(row.state) === 'posted' ? 'missing' : 'warning',
      row.journalEntryRef
        ? (isEnglish.value ? 'The posted journal entry is already reachable from the payment desk.' : '付款工作台已经可以直接打开已生成的会计凭证。')
        : (isEnglish.value ? 'Final accounting evidence still lacks a visible posted journal entry.' : '最终会计证据仍然缺少一个可见的已过账凭证。'),
      row.journalEntryRef ? buildReferenceLink(resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' }), row.journalEntryRef, 'accountMove') : undefined,
    )
  }

  const readyCount = items.filter((item) => item.status === 'ready').length
  const warningLabels = items.filter((item) => item.status === 'warning').map((item) => item.label)
  const missingLabels = items.filter((item) => item.status === 'missing').map((item) => item.label)
  const warningCount = warningLabels.length
  const missingCount = missingLabels.length
  const statusLabel = !items.length
    ? (isEnglish.value ? 'Not Applicable' : '不适用')
    : missingCount
      ? (isEnglish.value ? 'Closure Missing' : '闭环缺失')
      : warningCount
        ? (isEnglish.value ? 'Closure In Progress' : '闭环推进中')
        : (isEnglish.value ? 'Closure Ready' : '闭环就绪')

  return {
    label: isEnglish.value ? 'Settlement Closure' : '结算闭环',
    statusLabel,
    expectedCount: items.length,
    readyCount,
    warningCount,
    missingCount,
    missingLabels,
    warningLabels,
    items,
  }
}

function buildFirstWaveRollbackLinks(row: Record<string, any> | null): ResolvedLink[] {
  if (!row) return []

  const links: ResolvedLink[] = []
  const push = (link?: ResolvedLink) => {
    if (link) links.push(link)
  }

  if (props.moduleKey === 'saleOrder') {
    push(
      row.partnerId
        ? buildFocusIdLink(
            resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }),
            'resPartner',
            row.partnerId,
            formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }),
          )
        : undefined,
    )
    push(
      row.companyId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId))
        : undefined,
    )
    push(buildChildRowsContextLink(moduleTitle('saleOrderLine'), 'saleOrderLine', 'orderId', row.id, resolveRowTitle(row)))
    push(
      row.pickingRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'pickingRef', label: 'pickingRef' }), row.pickingRef, 'stockPicking')
        : undefined,
    )
    push(
      row.invoiceRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice')
        : undefined,
    )
    const paymentRef = String(row.paymentRef || row.invoicePaymentRef || '').trim()
    push(
      paymentRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), paymentRef, 'accountPayment')
        : undefined,
    )
  } else if (props.moduleKey === 'purchaseOrder') {
    push(
      row.partnerId
        ? buildFocusIdLink(
            resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }),
            'resPartner',
            row.partnerId,
            formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }),
          )
        : undefined,
    )
    push(
      row.companyId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId))
        : undefined,
    )
    push(buildChildRowsContextLink(moduleTitle('purchaseOrderLine'), 'purchaseOrderLine', 'orderId', row.id, resolveRowTitle(row)))
    push(
      row.receiptRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'receiptRef', label: 'receiptRef' }), row.receiptRef, 'stockPicking')
        : undefined,
    )
    push(
      row.billRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'billRef', label: 'billRef' }), row.billRef, 'accountInvoice')
        : undefined,
    )
    const paymentRef = String(row.paymentRef || row.billPaymentRef || '').trim()
    push(
      paymentRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), paymentRef, 'accountPayment')
        : undefined,
    )
  } else if (props.moduleKey === 'accountInvoice') {
    const originModule = inferModuleByReference(row.originRef)
    push(
      row.partnerId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId))
        : undefined,
    )
    push(
      row.companyId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId))
        : undefined,
    )
    push(
      row.originRef && originModule
        ? buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule)
        : undefined,
    )
    push(
      row.paymentRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), row.paymentRef, 'accountPayment')
        : undefined,
    )
  } else if (props.moduleKey === 'stockPicking') {
    const originModule = inferModuleByReference(row.origin)
    push(
      row.partnerId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId))
        : undefined,
    )
    push(
      row.companyId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId))
        : undefined,
    )
    push(
      row.origin && originModule
        ? buildReferenceLink(resolveFieldLabel({ key: 'origin', label: 'origin' }), row.origin, originModule)
        : undefined,
    )
    push(buildChildRowsContextLink(moduleTitle('stockMove'), 'stockMove', 'pickingId', row.id, resolveRowTitle(row)))
  } else if (props.moduleKey === 'accountPayment') {
    const originModule = inferModuleByReference(row.originRef)
    push(
      row.partnerId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId))
        : undefined,
    )
    push(
      row.companyId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId))
        : undefined,
    )
    push(
      row.originRef && originModule
        ? buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule)
        : undefined,
    )
    push(
      row.invoiceRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice')
        : undefined,
    )
    push(
      row.journalEntryRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' }), row.journalEntryRef, 'accountMove')
        : undefined,
    )
  }

  return links
}

function buildFirstWaveResultRailItems(row: Record<string, any> | null): FirstWaveResultRailItem[] {
  if (!row || !FIRST_WAVE_RESULT_COCKPIT_MODULES.has(props.moduleKey)) return []

  const items: FirstWaveResultRailItem[] = []
  const pushLinkItem = (
    key: string,
    label: string,
    value: string,
    description: string,
    buttonLabel: string,
    link?: ResolvedLink,
    tone: FirstWaveResultRailItem['tone'] = 'success',
  ) => {
    if (!link) return
    items.push({
      key,
      label,
      value,
      description,
      tone,
      actionType: 'link',
      buttonLabel,
      link,
    })
  }
  const pushActionItem = (
    key: string,
    label: string,
    value: string,
    description: string,
    buttonLabel: string,
    actionKey?: string,
    tone: FirstWaveResultRailItem['tone'] = 'warning',
  ) => {
    if (!actionKey) return
    items.push({
      key,
      label,
      value,
      description,
      tone,
      actionType: 'action',
      buttonLabel,
      actionKey,
    })
  }
  const pushSectionItem = (
    key: string,
    label: string,
    value: string,
    description: string,
    buttonLabel: string,
    section: string,
    tone: FirstWaveResultRailItem['tone'] = 'default',
  ) => {
    items.push({
      key,
      label,
      value,
      description,
      tone,
      actionType: 'section',
      buttonLabel,
      section,
    })
  }

  const state = String(row.state || '')

  if (props.moduleKey === 'resPartner') {
    pushLinkItem(
      'partner-sales-chain',
      isEnglish.value ? 'Sales Pilot Chain' : '销售试点链',
      row.name || String(row.id),
      isEnglish.value
        ? 'Open first-wave sales orders filtered by the current partner.'
        : '直接打开按当前伙伴过滤后的首批销售订单。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      buildRouteLink(moduleTitle('saleOrder'), 'saleOrder', {
        partnerId: String(row.id),
        relatedTo: props.moduleKey,
      }, row.name || String(row.id)),
      'success',
    )
    pushLinkItem(
      'partner-purchase-chain',
      isEnglish.value ? 'Purchase Pilot Chain' : '采购试点链',
      row.name || String(row.id),
      isEnglish.value
        ? 'Open first-wave purchase orders filtered by the current partner.'
        : '直接打开按当前伙伴过滤后的首批采购订单。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      buildRouteLink(moduleTitle('purchaseOrder'), 'purchaseOrder', {
        partnerId: String(row.id),
        relatedTo: props.moduleKey,
      }, row.name || String(row.id)),
      'success',
    )
    pushSectionItem(
      'partner-timeline',
      isEnglish.value ? 'Relationship Timeline' : '关系时间轴',
      `${recordTimelineItems.value.length}`,
      isEnglish.value
        ? 'Keep logs, notes, and attachment events visible before opening downstream chains.'
        : '在进入下游链路前，先核对日志、便签和附件事件。',
      isEnglish.value ? 'Open Timeline' : '打开时间轴',
      'timeline',
      recordTimelineItems.value.length ? 'success' : 'warning',
    )
    pushSectionItem(
      'partner-documents',
      isEnglish.value ? 'Evidence Files' : '证据文件',
      `${documentRows.value.length}`,
      isEnglish.value
        ? 'Contracts, qualification files, and supporting documents stay on the same partner desk.'
        : '合同、资质文件和支撑材料都留在同一伙伴工作台。',
      isEnglish.value ? 'Open Documents' : '打开文档区',
      'documents',
      documentRows.value.length ? 'success' : 'warning',
    )
    return items
  }

  if (props.moduleKey === 'resCompany') {
    const companyTitle = resolveRowTitle(row)
    const companyLabel = formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' })
    if (row.partnerId) {
      pushLinkItem(
        'company-partner-context',
        isEnglish.value ? 'Legal Partner' : '主体伙伴',
        companyLabel,
        isEnglish.value
          ? 'Keep the legal partner context visible before expanding pricing or order pilot scope.'
          : '在扩大价格或订单试点范围前，先保持主体伙伴上下文可见。',
        isEnglish.value ? 'Open Partner' : '打开伙伴',
        buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, companyLabel),
        'default',
      )
    } else {
      pushSectionItem(
        'company-partner-context-missing',
        isEnglish.value ? 'Legal Partner' : '主体伙伴',
        '-',
        isEnglish.value
          ? 'The company pilot should not expand before a visible legal partner context exists.'
          : '公司试点不适合在没有可见主体伙伴上下文时继续扩大。',
        isEnglish.value ? 'Open Context' : '打开上下文',
        'context',
        'warning',
      )
    }
    pushLinkItem(
      'company-product-scope',
      isEnglish.value ? 'Product Catalog Scope' : '产品目录范围',
      companyTitle,
      isEnglish.value
        ? 'Review product templates under the same company scope before order or pricing drift grows.'
        : '在订单和价格漂移扩大前，先核对同公司范围下的产品模板。',
      isEnglish.value ? 'Open Templates' : '打开模板',
      buildContextListLink(moduleTitle('productTemplate'), 'productTemplate', 'companyId', row.id, companyTitle),
      'success',
    )
    pushLinkItem(
      'company-pricelist-scope',
      isEnglish.value ? 'Pricing Scope' : '价格范围',
      companyTitle,
      isEnglish.value
        ? 'Open company pricelists from the same desk instead of switching back to global search.'
        : '直接从当前工作台打开公司价目表，不再切回全局搜索。',
      isEnglish.value ? 'Open Pricelists' : '打开价目表',
      buildContextListLink(moduleTitle('productPricelist'), 'productPricelist', 'companyId', row.id, companyTitle),
      'success',
    )
    pushLinkItem(
      'company-sales-chain',
      isEnglish.value ? 'Sales Pilot Scope' : '销售试点范围',
      companyTitle,
      isEnglish.value
        ? 'Jump into first-wave sales orders filtered by the current company.'
        : '直接进入按当前公司过滤后的首批销售订单。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      buildContextListLink(moduleTitle('saleOrder'), 'saleOrder', 'companyId', row.id, companyTitle),
      'success',
    )
    pushLinkItem(
      'company-purchase-chain',
      isEnglish.value ? 'Purchase Pilot Scope' : '采购试点范围',
      companyTitle,
      isEnglish.value
        ? 'Jump into first-wave purchase orders filtered by the current company.'
        : '直接进入按当前公司过滤后的首批采购订单。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      buildContextListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', 'companyId', row.id, companyTitle),
      'success',
    )
    return items
  }

  if (props.moduleKey === 'productTemplate') {
    const templateTitle = resolveRowTitle(row)
    const templateToken = pickFirstFilledText(row, ['defaultCode', 'barcode', 'name']) || templateTitle
    pushLinkItem(
      'template-variants',
      isEnglish.value ? 'Variant Pack' : '变体包',
      templateTitle,
      isEnglish.value
        ? 'Open product variants generated under the same template before order-line review expands.'
        : '在订单行审查扩大前，先打开同模板下的产品变体。',
      isEnglish.value ? 'Open Variants' : '打开变体',
      buildContextListLink(moduleTitle('productProduct'), 'productProduct', 'productTmplId', row.id, templateTitle),
      'success',
    )
    if (row.categId) {
      const categoryLabel = formatFieldValue(row, { key: 'categId', type: 'number', relation: 'productCategory' })
      pushLinkItem(
        'template-category',
        isEnglish.value ? 'Category Governance' : '品类治理',
        categoryLabel,
        isEnglish.value
          ? 'Return to the product category before downstream sales or purchase review drifts away.'
          : '在继续销售或采购审查前，先回到产品品类核对分类治理。',
        isEnglish.value ? 'Open Category' : '打开品类',
        buildFocusIdLink(resolveFieldLabel({ key: 'categId', label: 'categId' }), 'productCategory', row.categId, categoryLabel),
        'default',
      )
    } else {
      pushSectionItem(
        'template-category-missing',
        isEnglish.value ? 'Category Governance' : '品类治理',
        '-',
        isEnglish.value
          ? 'The template should not expand into pilot orders before category governance is visible.'
          : '模板不适合在品类治理不可见时继续进入试点订单。',
        isEnglish.value ? 'Open Context' : '打开上下文',
        'context',
        'warning',
      )
    }
    if (row.companyId) {
      const companyLabel = formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' })
      pushLinkItem(
        'template-company-scope',
        isEnglish.value ? 'Company Scope' : '公司范围',
        companyLabel,
        isEnglish.value
          ? 'Review the owning company before pricing, stocking, or order pilots reuse this template.'
          : '在价格、库存或订单试点复用该模板前，先核对所属公司。',
        isEnglish.value ? 'Open Company' : '打开公司',
        buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, companyLabel),
        'default',
      )
    }
    pushLinkItem(
      'template-sales-review',
      isEnglish.value ? 'Sales Review Entry' : '销售审查入口',
      templateToken,
      isEnglish.value
        ? 'Use the template code or name to reopen matching first-wave sales orders from the same cockpit.'
        : '用模板编码或名称直接重开匹配的首批销售订单。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', templateToken, templateToken),
      'success',
    )
    pushLinkItem(
      'template-purchase-review',
      isEnglish.value ? 'Purchase Review Entry' : '采购审查入口',
      templateToken,
      isEnglish.value
        ? 'Use the template code or name to reopen matching first-wave purchase orders.'
        : '用模板编码或名称直接重开匹配的首批采购订单。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      buildKeywordListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', templateToken, templateToken),
      'success',
    )
    return items
  }

  if (props.moduleKey === 'productProduct') {
    const variantTitle = resolveRowTitle(row)
    const variantToken = pickFirstFilledText(row, ['defaultCode', 'barcode', 'name']) || variantTitle
    if (row.productTmplId) {
      const templateLabel = formatFieldValue(row, { key: 'productTmplId', type: 'number', relation: 'productTemplate' })
      pushLinkItem(
        'variant-template-context',
        isEnglish.value ? 'Template Context' : '模板上下文',
        templateLabel,
        isEnglish.value
          ? 'Reopen the parent template before reusing this variant in pilot chains.'
          : '在试点链继续复用当前变体前，先重开父模板。',
        isEnglish.value ? 'Open Template' : '打开模板',
        buildFocusIdLink(resolveFieldLabel({ key: 'productTmplId', label: 'productTmplId' }), 'productTemplate', row.productTmplId, templateLabel),
        'default',
      )
    } else {
      pushSectionItem(
        'variant-template-context-missing',
        isEnglish.value ? 'Template Context' : '模板上下文',
        '-',
        isEnglish.value
          ? 'A product variant without a visible parent template should not stay in pilot circulation.'
          : '没有可见父模板的产品变体不适合继续留在试点流转中。',
        isEnglish.value ? 'Open Context' : '打开上下文',
        'context',
        'warning',
      )
    }
    pushLinkItem(
      'variant-sale-lines',
      isEnglish.value ? 'Sales Order Lines' : '销售订单行',
      variantToken,
      isEnglish.value
        ? 'Open exact sales order lines that currently use this variant.'
        : '直接打开当前使用该变体的销售订单行。',
      isEnglish.value ? 'Open Sales Lines' : '打开销售行',
      buildContextListLink(moduleTitle('saleOrderLine'), 'saleOrderLine', 'productId', row.id, variantToken),
      'success',
    )
    pushLinkItem(
      'variant-purchase-lines',
      isEnglish.value ? 'Purchase Order Lines' : '采购订单行',
      variantToken,
      isEnglish.value
        ? 'Open exact purchase order lines that currently use this variant.'
        : '直接打开当前使用该变体的采购订单行。',
      isEnglish.value ? 'Open Purchase Lines' : '打开采购行',
      buildContextListLink(moduleTitle('purchaseOrderLine'), 'purchaseOrderLine', 'productId', row.id, variantToken),
      'success',
    )
    pushLinkItem(
      'variant-sales-review',
      isEnglish.value ? 'Sales Review Entry' : '销售审查入口',
      variantToken,
      isEnglish.value
        ? 'Use variant codes to reopen matching first-wave sales orders.'
        : '用变体编码直接重开匹配的首批销售订单。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', variantToken, variantToken),
      'default',
    )
    pushLinkItem(
      'variant-purchase-review',
      isEnglish.value ? 'Purchase Review Entry' : '采购审查入口',
      variantToken,
      isEnglish.value
        ? 'Use variant codes to reopen matching first-wave purchase orders.'
        : '用变体编码直接重开匹配的首批采购订单。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      buildKeywordListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', variantToken, variantToken),
      'default',
    )
    return items
  }

  if (props.moduleKey === 'productCategory') {
    const categoryTitle = resolveRowTitle(row)
    const categoryToken = pickFirstFilledText(row, ['completeName', 'name']) || categoryTitle
    if (row.parentId) {
      const parentLabel = formatFieldValue(row, { key: 'parentId', type: 'number', relation: 'productCategory' })
      pushLinkItem(
        'category-parent-context',
        isEnglish.value ? 'Parent Context' : '上级分类',
        parentLabel,
        isEnglish.value
          ? 'Return to the parent category when hierarchy governance still needs review.'
          : '当层级治理仍需核对时，先回到上级分类。',
        isEnglish.value ? 'Open Parent' : '打开上级',
        buildFocusIdLink(resolveFieldLabel({ key: 'parentId', label: 'parentId' }), 'productCategory', row.parentId, parentLabel),
        'default',
      )
    }
    pushLinkItem(
      'category-children',
      isEnglish.value ? 'Child Categories' : '下级分类',
      categoryTitle,
      isEnglish.value
        ? 'Open the next hierarchy layer from the same product-governance desk.'
        : '直接从当前产品治理工作台打开下一层级分类。',
      isEnglish.value ? 'Open Children' : '打开下级',
      buildContextListLink(moduleTitle('productCategory'), 'productCategory', 'parentId', row.id, categoryTitle),
      'success',
    )
    pushLinkItem(
      'category-template-catalog',
      isEnglish.value ? 'Template Catalog' : '模板目录',
      categoryTitle,
      isEnglish.value
        ? 'Open product templates under the same category before order pilots reuse them.'
        : '在订单试点继续复用前，先打开当前分类下的产品模板。',
      isEnglish.value ? 'Open Templates' : '打开模板',
      buildContextListLink(moduleTitle('productTemplate'), 'productTemplate', 'categId', row.id, categoryTitle),
      'success',
    )
    pushLinkItem(
      'category-sales-review',
      isEnglish.value ? 'Sales Review Entry' : '销售审查入口',
      categoryToken,
      isEnglish.value
        ? 'Use category naming to reopen sales orders that likely rely on this product family.'
        : '用分类名称直接重开可能依赖该产品族的销售订单。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', categoryToken, categoryToken),
      'default',
    )
    pushLinkItem(
      'category-purchase-review',
      isEnglish.value ? 'Purchase Review Entry' : '采购审查入口',
      categoryToken,
      isEnglish.value
        ? 'Use category naming to reopen purchase orders that likely rely on this product family.'
        : '用分类名称直接重开可能依赖该产品族的采购订单。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      buildKeywordListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', categoryToken, categoryToken),
      'default',
    )
    return items
  }

  if (props.moduleKey === 'productPricelist') {
    const pricelistTitle = resolveRowTitle(row)
    const companyLabel = row.companyId
      ? formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' })
      : pricelistTitle
    if (row.companyId) {
      pushLinkItem(
        'pricelist-company-scope',
        isEnglish.value ? 'Company Scope' : '公司范围',
        companyLabel,
        isEnglish.value
          ? 'Return to the owning company before widening pricing scope.'
          : '在扩大价格生效范围前，先回到所属公司核对。',
        isEnglish.value ? 'Open Company' : '打开公司',
        buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, companyLabel),
        'default',
      )
    } else {
      pushSectionItem(
        'pricelist-company-scope-missing',
        isEnglish.value ? 'Company Scope' : '公司范围',
        '-',
        isEnglish.value
          ? 'Pricing scope should not expand without a visible company boundary.'
          : '价格范围不适合在公司边界不可见时继续扩大。',
        isEnglish.value ? 'Open Context' : '打开上下文',
        'context',
        'warning',
      )
    }
    if (row.currencyId) {
      const currencyLabel = formatFieldValue(row, { key: 'currencyId', type: 'number', relation: 'resCurrency' })
      pushLinkItem(
        'pricelist-currency-scope',
        isEnglish.value ? 'Currency Scope' : '币种范围',
        currencyLabel,
        isEnglish.value
          ? 'Reopen the currency baseline before pricing approvals or pilot sales expand.'
          : '在价格审批或试点销售扩大前，先重开币种基线。',
        isEnglish.value ? 'Open Currency' : '打开币种',
        buildFocusIdLink(resolveFieldLabel({ key: 'currencyId', label: 'currencyId' }), 'resCurrency', row.currencyId, currencyLabel),
        'default',
      )
    }
    pushLinkItem(
      'pricelist-sales-scope',
      isEnglish.value ? 'Sales Pricing Review' : '销售价格审查',
      companyLabel,
      isEnglish.value
        ? 'Reopen sales orders within the same pricing scope instead of switching to global navigation.'
        : '直接重开同价格范围内的销售订单，不再切回全局导航。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      row.companyId
        ? buildContextListLink(moduleTitle('saleOrder'), 'saleOrder', 'companyId', row.companyId, companyLabel)
        : buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', pricelistTitle, pricelistTitle),
      'success',
    )
    pushLinkItem(
      'pricelist-product-scope',
      isEnglish.value ? 'Catalog Scope' : '目录范围',
      companyLabel,
      isEnglish.value
        ? 'Review product templates under the same pricing scope from one cockpit.'
        : '直接从同一驾驶舱核对价格范围下的产品模板。',
      isEnglish.value ? 'Open Templates' : '打开模板',
      row.companyId
        ? buildContextListLink(moduleTitle('productTemplate'), 'productTemplate', 'companyId', row.companyId, companyLabel)
        : undefined,
      'success',
    )
    pushLinkItem(
      'pricelist-purchase-scope',
      isEnglish.value ? 'Procurement Scope' : '采购范围',
      companyLabel,
      isEnglish.value
        ? 'Keep procurement review inside the same company scope when pricing changes affect buying decisions.'
        : '当价格变化影响采购决策时，直接保持在同一公司范围内核对采购链。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      row.companyId
        ? buildContextListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', 'companyId', row.companyId, companyLabel)
        : undefined,
      'default',
    )
    return items
  }

  if (props.moduleKey === 'saleOrder') {
    if (row.partnerId) {
      pushLinkItem(
        'sale-partner-context',
        isEnglish.value ? 'Partner Context' : '伙伴上下文',
        formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }),
        isEnglish.value
          ? 'Reopen the customer master before confirming delivery or billing steps.'
          : '在推进出库或开票前，先重开客户主档核对上下文。',
        isEnglish.value ? 'Open Partner' : '打开伙伴',
        buildFocusIdLink(
          resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }),
          'resPartner',
          row.partnerId,
          formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }),
        ),
        'default',
      )
    } else {
      pushSectionItem(
        'sale-partner-context-missing',
        isEnglish.value ? 'Partner Context' : '伙伴上下文',
        '-',
        isEnglish.value
          ? 'The sales chain should not continue without a visible customer context.'
          : '销售链缺少可见客户上下文，不适合继续推进。',
        isEnglish.value ? 'Open Context' : '打开上下文',
        'context',
        'warning',
      )
    }
    pushLinkItem(
      'sale-line-pack',
      isEnglish.value ? 'Order Lines' : '订单行',
      `${childRowCount('saleOrderLine')}`,
      isEnglish.value
        ? 'Keep sales order lines reachable from the same cockpit before delivery or invoice drift grows.'
        : '在出库或开票语义继续扩散前，保持销售订单行在同一驾驶舱里可达。',
      isEnglish.value ? 'Open Lines' : '打开订单行',
      buildChildRowsContextLink(moduleTitle('saleOrderLine'), 'saleOrderLine', 'orderId', row.id, resolveRowTitle(row)),
      childRowCount('saleOrderLine') ? 'success' : 'warning',
    )
    if (row.companyId) {
      const companyLabel = formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' })
      pushLinkItem(
        'sale-company-scope',
        isEnglish.value ? 'Company Scope' : '公司范围',
        companyLabel,
        isEnglish.value
          ? 'Return to the owning company before sales cutover widens across pricing or fulfillment.'
          : '在销售切换继续扩大到价格或履约前，先回到所属公司核对。',
        isEnglish.value ? 'Open Company' : '打开公司',
        buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, companyLabel),
        'default',
      )
    }
    if (row.pickingRef) {
      pushLinkItem(
        'sale-picking-artifact',
        isEnglish.value ? 'Delivery Transfer' : '出库调拨',
        row.pickingRef,
        isEnglish.value
          ? 'The delivery artifact is already generated and can be reopened from the same desk.'
          : '出库结果对象已经生成，可以直接从当前工作台重开。',
        isEnglish.value ? 'Open Transfer' : '打开调拨',
        buildReferenceLink(resolveFieldLabel({ key: 'pickingRef', label: 'pickingRef' }), row.pickingRef, 'stockPicking'),
      )
    } else if (['draft', 'sent'].includes(state) && resolveActionConfig('action_confirm')) {
      pushActionItem(
        'sale-picking-generate',
        isEnglish.value ? 'Delivery Transfer' : '出库调拨',
        isEnglish.value ? 'Pending confirmation' : '待确认生成',
        isEnglish.value
          ? 'Confirm the sales order to generate the delivery object and move traceability.'
          : '确认销售订单，生成出库对象和库存移动追溯。',
        isEnglish.value ? 'Confirm Order' : '确认订单',
        'action_confirm',
      )
    } else {
      pushSectionItem(
        'sale-picking-review',
        isEnglish.value ? 'Delivery Transfer' : '出库调拨',
        isEnglish.value ? 'Awaiting prior gate' : '等待前置门禁',
        isEnglish.value
          ? 'Review workflow gates first when the delivery artifact cannot be generated yet.'
          : '当前还不能生成出库对象，请先核对流程门禁。',
        isEnglish.value ? 'Open Workflow' : '打开流程',
        'workflow',
        'warning',
      )
    }
    if (row.invoiceRef) {
      pushLinkItem(
        'sale-invoice-artifact',
        isEnglish.value ? 'Customer Invoice' : '客户发票',
        row.invoiceRef,
        isEnglish.value
          ? 'Billing stays attached to the same sales chain instead of being searched manually.'
          : '开票结果对象继续挂在同一销售链上，不必手工搜索。',
        isEnglish.value ? 'Open Invoice' : '打开发票',
        buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice'),
      )
    } else if (state === 'sale' && resolveActionConfig('action_create_invoice')) {
      pushActionItem(
        'sale-invoice-generate',
        isEnglish.value ? 'Customer Invoice' : '客户发票',
        isEnglish.value ? 'Ready to create' : '可直接生成',
        isEnglish.value
          ? 'Create the invoice directly from the confirmed sales order.'
          : '直接从已确认销售订单创建发票。',
        isEnglish.value ? 'Create Invoice' : '创建发票',
        'action_create_invoice',
      )
    } else {
      pushSectionItem(
        'sale-invoice-review',
        isEnglish.value ? 'Customer Invoice' : '客户发票',
        isEnglish.value ? 'Awaiting sales gate' : '等待销售门禁',
        isEnglish.value
          ? 'Invoice creation remains blocked until the sales chain reaches the correct gate.'
          : '销售链没有到达正确门禁前，发票仍不可生成。',
        isEnglish.value ? 'Open Workflow' : '打开流程',
        'workflow',
        'warning',
      )
    }
    const salePaymentRef = String(row.paymentRef || row.invoicePaymentRef || '').trim()
    if (salePaymentRef) {
      pushLinkItem(
        'sale-payment-artifact',
        isEnglish.value ? 'Payment Artifact' : '付款结果对象',
        salePaymentRef,
        isEnglish.value
          ? 'The sales chain is already closed through the payment object.'
          : '销售链已经通过付款对象形成闭环。',
        isEnglish.value ? 'Open Payment' : '打开付款',
        buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), salePaymentRef, 'accountPayment'),
      )
    } else if (row.invoiceRef) {
      pushLinkItem(
        'sale-payment-follow-up',
        isEnglish.value ? 'Payment Follow-up' : '付款跟进',
        row.invoiceRef,
        isEnglish.value
          ? 'Open the generated invoice and continue with payment registration there.'
          : '重开发票结果对象，继续在发票侧登记付款。',
        isEnglish.value ? 'Open Invoice' : '打开发票',
        buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice'),
        'warning',
      )
    } else {
      pushSectionItem(
        'sale-payment-review',
        isEnglish.value ? 'Payment Follow-up' : '付款跟进',
        isEnglish.value ? 'Awaiting invoice' : '等待发票生成',
        isEnglish.value
          ? 'The payment step should start only after invoice generation is visible.'
          : '必须先看到发票结果对象，才能继续付款跟进。',
        isEnglish.value ? 'Open Review' : '打开核对台',
        'review',
        'warning',
      )
    }
    return items
  }

  if (props.moduleKey === 'purchaseOrder') {
    if (row.partnerId) {
      pushLinkItem(
        'purchase-vendor-context',
        isEnglish.value ? 'Vendor Context' : '供应商上下文',
        formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }),
        isEnglish.value
          ? 'Reopen the vendor master before driving receipt, bill, or payment steps.'
          : '在推进收货、账单或付款前，先重开供应商主档核上下文。',
        isEnglish.value ? 'Open Partner' : '打开伙伴',
        buildFocusIdLink(
          resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }),
          'resPartner',
          row.partnerId,
          formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }),
        ),
        'default',
      )
    } else {
      pushSectionItem(
        'purchase-vendor-context-missing',
        isEnglish.value ? 'Vendor Context' : '供应商上下文',
        '-',
        isEnglish.value
          ? 'The procurement chain needs a visible vendor context before further cutover actions.'
          : '采购链在继续切换动作前，需要可见的供应商上下文。',
        isEnglish.value ? 'Open Context' : '打开上下文',
        'context',
        'warning',
      )
    }
    pushLinkItem(
      'purchase-line-pack',
      isEnglish.value ? 'Order Lines' : '订单行',
      `${childRowCount('purchaseOrderLine')}`,
      isEnglish.value
        ? 'Keep purchase order lines reachable before receipt or billing review drifts away from sourcing details.'
        : '在收货或账单审查偏离采购明细前，保持采购订单行可直接打开。',
      isEnglish.value ? 'Open Lines' : '打开订单行',
      buildChildRowsContextLink(moduleTitle('purchaseOrderLine'), 'purchaseOrderLine', 'orderId', row.id, resolveRowTitle(row)),
      childRowCount('purchaseOrderLine') ? 'success' : 'warning',
    )
    if (row.companyId) {
      const companyLabel = formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' })
      pushLinkItem(
        'purchase-company-scope',
        isEnglish.value ? 'Company Scope' : '公司范围',
        companyLabel,
        isEnglish.value
          ? 'Return to the owning company before procurement cutover widens to billing or payment closure.'
          : '在采购切换继续扩大到账单或付款闭环前，先回到所属公司核对。',
        isEnglish.value ? 'Open Company' : '打开公司',
        buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, companyLabel),
        'default',
      )
    }
    if (row.receiptRef) {
      pushLinkItem(
        'purchase-receipt-artifact',
        isEnglish.value ? 'Receipt Transfer' : '收货调拨',
        row.receiptRef,
        isEnglish.value
          ? 'The receipt artifact is already linked for warehouse review.'
          : '收货结果对象已经链接，可直接进入仓储核对。',
        isEnglish.value ? 'Open Receipt' : '打开收货',
        buildReferenceLink(resolveFieldLabel({ key: 'receiptRef', label: 'receiptRef' }), row.receiptRef, 'stockPicking'),
      )
    } else if (['draft', 'sent'].includes(state) && resolveActionConfig('action_confirm')) {
      pushActionItem(
        'purchase-receipt-generate',
        isEnglish.value ? 'Receipt Transfer' : '收货调拨',
        isEnglish.value ? 'Pending confirmation' : '待确认生成',
        isEnglish.value
          ? 'Confirm the purchase order to create the receipt and stock traceability.'
          : '确认采购订单，生成收货调拨和库存追溯。',
        isEnglish.value ? 'Confirm Order' : '确认订单',
        'action_confirm',
      )
    } else {
      pushSectionItem(
        'purchase-receipt-review',
        isEnglish.value ? 'Receipt Transfer' : '收货调拨',
        isEnglish.value ? 'Awaiting prior gate' : '等待前置门禁',
        isEnglish.value
          ? 'Review the workflow gates first when receipt generation is still blocked.'
          : '收货对象仍然被门禁阻塞，请先核对流程。',
        isEnglish.value ? 'Open Workflow' : '打开流程',
        'workflow',
        'warning',
      )
    }
    if (row.billRef) {
      pushLinkItem(
        'purchase-bill-artifact',
        isEnglish.value ? 'Vendor Bill' : '供应商账单',
        row.billRef,
        isEnglish.value
          ? 'The billing artifact remains linked on the purchase cockpit.'
          : '账单结果对象继续挂在采购驾驶舱上。',
        isEnglish.value ? 'Open Bill' : '打开账单',
        buildReferenceLink(resolveFieldLabel({ key: 'billRef', label: 'billRef' }), row.billRef, 'accountInvoice'),
      )
    } else if (state === 'purchase' && resolveActionConfig('action_create_bill')) {
      pushActionItem(
        'purchase-bill-generate',
        isEnglish.value ? 'Vendor Bill' : '供应商账单',
        isEnglish.value ? 'Ready to create' : '可直接生成',
        isEnglish.value
          ? 'Create the vendor bill directly from the purchase order.'
          : '直接从采购订单创建供应商账单。',
        isEnglish.value ? 'Create Bill' : '创建账单',
        'action_create_bill',
      )
    } else {
      pushSectionItem(
        'purchase-bill-review',
        isEnglish.value ? 'Vendor Bill' : '供应商账单',
        isEnglish.value ? 'Awaiting purchase gate' : '等待采购门禁',
        isEnglish.value
          ? 'Billing remains blocked until the purchase order reaches the correct state.'
          : '采购订单未到正确状态前，账单仍不可生成。',
        isEnglish.value ? 'Open Workflow' : '打开流程',
        'workflow',
        'warning',
      )
    }
    const purchasePaymentRef = String(row.paymentRef || row.billPaymentRef || '').trim()
    if (purchasePaymentRef) {
      pushLinkItem(
        'purchase-payment-artifact',
        isEnglish.value ? 'Vendor Payment' : '供应商付款',
        purchasePaymentRef,
        isEnglish.value
          ? 'Payment closure is already reachable from the purchase chain.'
          : '采购链已经可以直接追到付款闭环。',
        isEnglish.value ? 'Open Payment' : '打开付款',
        buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), purchasePaymentRef, 'accountPayment'),
      )
    } else if (row.billRef) {
      pushLinkItem(
        'purchase-payment-follow-up',
        isEnglish.value ? 'Payment Follow-up' : '付款跟进',
        row.billRef,
        isEnglish.value
          ? 'Open the vendor bill and continue payment follow-up there.'
          : '重开供应商账单，继续在账单侧推进付款跟进。',
        isEnglish.value ? 'Open Bill' : '打开账单',
        buildReferenceLink(resolveFieldLabel({ key: 'billRef', label: 'billRef' }), row.billRef, 'accountInvoice'),
        'warning',
      )
    } else {
      pushSectionItem(
        'purchase-payment-review',
        isEnglish.value ? 'Payment Follow-up' : '付款跟进',
        isEnglish.value ? 'Awaiting bill' : '等待账单生成',
        isEnglish.value
          ? 'Payment follow-up should start only after the bill artifact is visible.'
          : '必须先看到账单结果对象，才能继续付款跟进。',
        isEnglish.value ? 'Open Review' : '打开核对台',
        'review',
        'warning',
      )
    }
    return items
  }

  if (props.moduleKey === 'accountInvoice') {
    if (row.partnerId) {
      const partnerLabel = formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' })
      pushLinkItem(
        'invoice-partner-context',
        isEnglish.value ? 'Partner Context' : '伙伴上下文',
        partnerLabel,
        isEnglish.value
          ? 'Return to the partner master before settlement pressure or collections follow-up widens.'
          : '在结算压力或收款跟进继续扩大前，先回到伙伴主档核对。',
        isEnglish.value ? 'Open Partner' : '打开伙伴',
        buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, partnerLabel),
        'default',
      )
    }
    if (row.companyId) {
      const companyLabel = formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' })
      pushLinkItem(
        'invoice-company-scope',
        isEnglish.value ? 'Company Scope' : '公司范围',
        companyLabel,
        isEnglish.value
          ? 'Keep invoice settlement grounded in the owning company boundary.'
          : '让发票结算始终落在所属公司的边界内核对。',
        isEnglish.value ? 'Open Company' : '打开公司',
        buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, companyLabel),
        'default',
      )
    }
    const originModule = inferModuleByReference(row.originRef)
    if (row.originRef && originModule) {
      pushLinkItem(
        'invoice-origin-chain',
        isEnglish.value ? 'Upstream Source' : '上游来源',
        row.originRef,
        isEnglish.value
          ? 'Return to the source order when invoice business context needs validation.'
          : '当发票业务语义需要核对时，直接返回来源单据。',
        isEnglish.value ? 'Open Origin' : '打开来源',
        buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule),
        'default',
      )
    } else {
      pushSectionItem(
        'invoice-origin-review',
        isEnglish.value ? 'Upstream Source' : '上游来源',
        row.originRef || '-',
        isEnglish.value
          ? 'Review traceability because the invoice origin cannot be resolved yet.'
          : '当前无法解析发票来源，请先核对追溯链路。',
        isEnglish.value ? 'Open Traceability' : '打开追溯中心',
        'traceability',
        'warning',
      )
    }
    if (row.paymentRef) {
      pushLinkItem(
        'invoice-payment-artifact',
        isEnglish.value ? 'Payment Artifact' : '付款结果对象',
        row.paymentRef,
        isEnglish.value
          ? 'Settlement is already closed through the linked payment object.'
          : '当前发票已经通过付款对象完成结算追溯。',
        isEnglish.value ? 'Open Payment' : '打开付款',
        buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), row.paymentRef, 'accountPayment'),
      )
    } else if (state === 'posted' && resolveActionConfig('register_payment')) {
      pushActionItem(
        'invoice-payment-generate',
        isEnglish.value ? 'Payment Artifact' : '付款结果对象',
        isEnglish.value ? 'Ready to register' : '可直接登记',
        isEnglish.value
          ? 'Register payment directly from the posted invoice to keep settlement in one flow.'
          : '直接从已过账发票登记付款，让结算保持在同一条链路里。',
        isEnglish.value ? 'Register Payment' : '登记付款',
        'register_payment',
      )
    } else {
      pushSectionItem(
        'invoice-payment-review',
        isEnglish.value ? 'Payment Artifact' : '付款结果对象',
        isEnglish.value ? 'Awaiting posting gate' : '等待过账门禁',
        isEnglish.value
          ? 'The invoice must reach the posted gate before payment registration can continue.'
          : '发票必须先到已过账门禁，才能继续登记付款。',
        isEnglish.value ? 'Open Workflow' : '打开流程',
        'workflow',
        'warning',
      )
    }
    pushSectionItem(
      'invoice-documents',
      isEnglish.value ? 'Evidence Files' : '证据文件',
      `${documentRows.value.length}`,
      isEnglish.value
        ? 'Keep invoices, attachments, and proof files ready before handoff or rollback.'
        : '交接或回退前，把发票附件和证明文件留在同一记录上。',
      isEnglish.value ? 'Open Documents' : '打开文档区',
      'documents',
      documentRows.value.length ? 'success' : 'warning',
    )
    pushSectionItem(
      'invoice-review',
      isEnglish.value ? 'Pilot Review' : '试点核对',
      `${pilotReviewChecklist.value.filter((item) => item.status === 'ready').length}/${pilotReviewChecklist.value.length}`,
      isEnglish.value
        ? 'Use the review desk for handoff export, rollback checks, and unresolved risks.'
        : '通过核对台统一处理交接导出、回退检查和未解决风险。',
      isEnglish.value ? 'Open Review' : '打开核对台',
      'review',
      workflowAlerts.value.length || recordReminderItems.value.length ? 'warning' : 'default',
    )
    return items
  }

  if (props.moduleKey === 'stockPicking') {
    if (row.partnerId) {
      const partnerLabel = formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' })
      pushLinkItem(
        'picking-partner-context',
        isEnglish.value ? 'Partner Context' : '伙伴上下文',
        partnerLabel,
        isEnglish.value
          ? 'Warehouse execution should retain the partner context before exceptions spread.'
          : '仓储执行在异常扩散前，应始终保留伙伴上下文。',
        isEnglish.value ? 'Open Partner' : '打开伙伴',
        buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, partnerLabel),
        'default',
      )
    }
    if (row.companyId) {
      const companyLabel = formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' })
      pushLinkItem(
        'picking-company-scope',
        isEnglish.value ? 'Company Scope' : '公司范围',
        companyLabel,
        isEnglish.value
          ? 'Execution and rollback should stay tied to the same company boundary.'
          : '执行和回退都应持续绑定在同一公司边界内。',
        isEnglish.value ? 'Open Company' : '打开公司',
        buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, companyLabel),
        'default',
      )
    }
    const originModule = inferModuleByReference(row.origin)
    if (row.origin && originModule) {
      pushLinkItem(
        'picking-origin-chain',
        isEnglish.value ? 'Business Origin' : '业务来源',
        row.origin,
        isEnglish.value
          ? 'Warehouse execution should always be able to jump back to the upstream business order.'
          : '仓储执行必须始终可以跳回上游业务单据。',
        isEnglish.value ? 'Open Origin' : '打开来源',
        buildReferenceLink(resolveFieldLabel({ key: 'origin', label: 'origin' }), row.origin, originModule),
        'default',
      )
    } else {
      pushSectionItem(
        'picking-origin-review',
        isEnglish.value ? 'Business Origin' : '业务来源',
        row.origin || '-',
        isEnglish.value
          ? 'Traceability review is required because the upstream source is not clear yet.'
          : '当前上游来源不清晰，需要先核对追溯关系。',
        isEnglish.value ? 'Open Traceability' : '打开追溯中心',
        'traceability',
        'warning',
      )
    }
    pushLinkItem(
      'picking-move-rows',
      isEnglish.value ? 'Operation Rows' : '操作行',
      `${(childTableRows.stockMove || []).length}`,
      isEnglish.value
        ? 'Review stock move rows from the same transfer desk instead of switching to a detached list.'
        : '直接在当前调拨工作台里查看库存移动行，不再切去分离列表。',
      isEnglish.value ? 'Open Moves' : '打开移动行',
      buildRouteLink(moduleTitle('stockMove'), 'stockMove', {
        contextField: 'pickingId',
        contextValue: String(row.id),
        relatedTo: props.moduleKey,
      }, String(row.id)),
      (childTableRows.stockMove || []).length ? 'success' : 'warning',
    )
    if (state === 'assigned' && resolveActionConfig('action_validate')) {
      pushActionItem(
        'picking-validate-action',
        isEnglish.value ? 'Finalize Transfer' : '完成调拨',
        isEnglish.value ? 'Ready to validate' : '可直接验证',
        isEnglish.value
          ? 'Validate the transfer once quantities and routes are ready.'
          : '数量与路由准备好之后，直接验证调拨。',
        isEnglish.value ? 'Validate Transfer' : '验证调拨',
        'action_validate',
      )
    } else if (['draft', 'confirmed'].includes(state) && resolveActionConfig('action_confirm')) {
      pushActionItem(
        'picking-confirm-action',
        isEnglish.value ? 'Confirm Transfer' : '确认调拨',
        isEnglish.value ? 'Pending confirm' : '待确认',
        isEnglish.value
          ? 'Confirm the transfer before execution can move to assignment and validation.'
          : '先确认调拨，才能进入分配与验证阶段。',
        isEnglish.value ? 'Confirm Transfer' : '确认调拨',
        'action_confirm',
      )
    } else {
      pushSectionItem(
        'picking-execution-review',
        isEnglish.value ? 'Execution Review' : '执行核对',
        formatModuleStatus(props.moduleKey, stateField.value, row.state),
        isEnglish.value
          ? 'Use the workflow desk to inspect the current transfer gate before moving again.'
          : '先在流程区核对当前调拨门禁，再继续推进。',
        isEnglish.value ? 'Open Workflow' : '打开流程',
        'workflow',
        workflowBlockedStageCount.value ? 'danger' : 'default',
      )
    }
    pushSectionItem(
      'picking-documents',
      isEnglish.value ? 'Evidence Files' : '证据文件',
      `${documentRows.value.length}`,
      isEnglish.value
        ? 'Execution proofs, signed receipts, and exception evidence stay attached to the transfer.'
        : '执行凭证、签收单和异常证据都留在当前调拨记录上。',
      isEnglish.value ? 'Open Documents' : '打开文档区',
      'documents',
      documentRows.value.length ? 'success' : 'warning',
    )
    return items
  }

  if (props.moduleKey === 'accountPayment') {
    if (row.partnerId) {
      const partnerLabel = formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' })
      pushLinkItem(
        'payment-partner-context',
        isEnglish.value ? 'Partner Context' : '伙伴上下文',
        partnerLabel,
        isEnglish.value
          ? 'Keep payment handling tied to the source partner before or after posting.'
          : '无论付款前后，都应让付款处理绑定来源伙伴上下文。',
        isEnglish.value ? 'Open Partner' : '打开伙伴',
        buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, partnerLabel),
        'default',
      )
    }
    if (row.companyId) {
      const companyLabel = formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' })
      pushLinkItem(
        'payment-company-scope',
        isEnglish.value ? 'Company Scope' : '公司范围',
        companyLabel,
        isEnglish.value
          ? 'Posting, journal review, and rollback should stay inside the same company scope.'
          : '过账、凭证审查和回退都应保持在同一公司范围内。',
        isEnglish.value ? 'Open Company' : '打开公司',
        buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, companyLabel),
        'default',
      )
    }
    const originModule = inferModuleByReference(row.originRef)
    if (row.originRef && originModule) {
      pushLinkItem(
        'payment-origin-chain',
        isEnglish.value ? 'Payment Origin' : '付款来源',
        row.originRef,
        isEnglish.value
          ? 'Return to the source document when payment direction or amount needs business validation.'
          : '当付款方向或金额需要业务核对时，直接回到来源单据。',
        isEnglish.value ? 'Open Origin' : '打开来源',
        buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule),
        'default',
      )
    } else {
      pushSectionItem(
        'payment-origin-review',
        isEnglish.value ? 'Payment Origin' : '付款来源',
        row.originRef || '-',
        isEnglish.value
          ? 'Payment origin is still unclear, so traceability review should run first.'
          : '付款来源仍不清晰，请先核对追溯链路。',
        isEnglish.value ? 'Open Traceability' : '打开追溯中心',
        'traceability',
        'warning',
      )
    }
    if (row.invoiceRef) {
      pushLinkItem(
        'payment-invoice-context',
        isEnglish.value ? 'Invoice Context' : '发票上下文',
        row.invoiceRef,
        isEnglish.value
          ? 'Keep the source invoice reachable before and after posting the payment.'
          : '无论付款前后，都应随时重开发票上下文。',
        isEnglish.value ? 'Open Invoice' : '打开发票',
        buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice'),
      )
    } else {
      pushSectionItem(
        'payment-invoice-review',
        isEnglish.value ? 'Invoice Context' : '发票上下文',
        '-',
        isEnglish.value
          ? 'Payment linkage is incomplete because the source invoice is not visible yet.'
          : '付款关联尚不完整，因为来源发票还不可见。',
        isEnglish.value ? 'Open Review' : '打开核对台',
        'review',
        'warning',
      )
    }
    if (row.journalEntryRef) {
      pushLinkItem(
        'payment-journal-artifact',
        isEnglish.value ? 'Journal Entry' : '会计凭证',
        row.journalEntryRef,
        isEnglish.value
          ? 'The accounting artifact is already generated and can be reopened from the payment desk.'
          : '会计结果对象已经生成，可以直接从付款工作台重开。',
        isEnglish.value ? 'Open Journal Entry' : '打开凭证',
        buildReferenceLink(resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' }), row.journalEntryRef, 'accountMove'),
      )
    } else if (state === 'draft' && resolveActionConfig('action_post')) {
      pushActionItem(
        'payment-post-artifact',
        isEnglish.value ? 'Journal Entry' : '会计凭证',
        isEnglish.value ? 'Ready to post' : '可直接过账',
        isEnglish.value
          ? 'Post the payment to generate the accounting artifact.'
          : '直接过账当前付款，生成会计结果对象。',
        isEnglish.value ? 'Post Payment' : '过账付款',
        'action_post',
      )
    } else {
      pushSectionItem(
        'payment-post-review',
        isEnglish.value ? 'Journal Entry' : '会计凭证',
        isEnglish.value ? 'Awaiting payment gate' : '等待付款门禁',
        isEnglish.value
          ? 'Inspect the workflow and evidence before retrying posting.'
          : '重新过账前，请先核对流程和证据。',
        isEnglish.value ? 'Open Workflow' : '打开流程',
        'workflow',
        'warning',
      )
    }
    pushSectionItem(
      'payment-review',
      isEnglish.value ? 'Pilot Review' : '试点核对',
      `${pilotReviewChecklist.value.filter((item) => item.status === 'ready').length}/${pilotReviewChecklist.value.length}`,
      isEnglish.value
        ? 'Use the review desk to export handoff packets and verify rollback readiness.'
        : '通过核对台统一导出交接包，并确认回退准备度。',
      isEnglish.value ? 'Open Review' : '打开核对台',
      'review',
      recordReminderItems.value.length || workflowAlerts.value.length ? 'warning' : 'default',
    )
    return items
  }

  return items
}

function buildFirstWaveResultSummaryCards(): FirstWaveResultSummaryCard[] {
  if (!shouldShowFirstWaveResultCockpit.value || !firstWaveResultRailItems.value.length) return []

  const readyCount = firstWaveResultRailItems.value.filter((item) => item.actionType === 'link').length
  const actionCount = firstWaveResultRailItems.value.filter((item) => item.actionType === 'action').length
  const openRiskCount = recordReminderItems.value.length + workflowAlerts.value.length + workflowBlockedStageCount.value
  const signalValue = documentEvidenceSummary.value.expectedCount
    ? `${documentEvidenceSummary.value.readyCount}/${documentEvidenceSummary.value.expectedCount} · ${recordTimelineItems.value.length}`
    : `${documentRows.value.length} · ${recordTimelineItems.value.length}`
  const resultPackValue = downstreamRollbackSummary.value.expectedCount
    ? `${downstreamRollbackSummary.value.readyCount}/${downstreamRollbackSummary.value.expectedCount}`
    : `${readyCount}/${firstWaveResultRailItems.value.length}`

  return [
    {
      key: 'chain-gate',
      label: isEnglish.value ? 'Current Gate' : '当前门禁',
      value: workflowCurrentStage.value?.label || (isEnglish.value ? 'Review record' : '核对记录'),
      description: workflowCurrentStage.value?.description || workflowStageCaption.value,
      tone: workflowBlockedStageCount.value ? 'danger' : workflowCurrentStage.value ? 'success' : 'default',
    },
    {
      key: 'result-pack',
      label: isEnglish.value ? 'Result Pack' : '结果对象包',
      value: resultPackValue,
      description: downstreamRollbackSummary.value.expectedCount
        ? (isEnglish.value
            ? 'Expected downstream objects already visible from the same detail cockpit.'
            : '预期的下游结果对象已经可以从同一详情驾驶舱里看到。')
        : (isEnglish.value
            ? 'Direct first-wave chain hops are exposed without extra searching.'
            : '首批链路的关键跳转已经显式暴露，不必额外搜索。'),
      tone: downstreamRollbackSummary.value.expectedCount
        ? downstreamRollbackSummary.value.readyCount === downstreamRollbackSummary.value.expectedCount
          ? 'success'
          : downstreamRollbackSummary.value.readyCount
            ? 'warning'
            : 'default'
        : readyCount
          ? 'success'
          : 'warning',
    },
    {
      key: 'next-move',
      label: isEnglish.value ? 'Next Move' : '下一步',
      value: primarySuggestionAction.value?.label || primarySuggestionLink.value?.label || (isEnglish.value ? 'Review desk' : '核对台'),
      description: primarySuggestionAction.value?.actionKey
        ? (isEnglish.value
            ? 'An executable next step is already available on the current record.'
            : '当前记录已经给出可直接执行的下一步动作。')
        : primarySuggestionLink.value?.link
          ? (isEnglish.value
              ? 'The most relevant downstream object is ready to reopen from here.'
              : '最相关的下游对象已经可以直接从这里重开。')
          : (isEnglish.value
              ? 'Use the review desk to decide the safest next cutover move.'
              : '通过核对台判断最安全的下一步切换动作。'),
      tone: primarySuggestionAction.value?.actionKey ? 'warning' : primarySuggestionLink.value?.link ? 'success' : 'default',
    },
    {
      key: 'open-risks',
      label: isEnglish.value ? 'Open Risks' : '未处理风险',
      value: `${openRiskCount}`,
      description: isEnglish.value
        ? 'Direct reminders, workflow blockers, and warning signals still waiting for resolution.'
        : '仍待处理的提醒、流程阻塞项和告警信号数量。',
      tone: openRiskCount ? 'danger' : 'success',
    },
    {
      key: 'evidence-signals',
      label: isEnglish.value ? 'Evidence Signals' : '证据信号',
      value: signalValue,
      description: isEnglish.value
        ? 'Evidence coverage and Monica-style timeline signals are kept on the same record.'
        : '证据覆盖率和 Monica 风格时间轴信号都保留在同一记录上。',
      tone: documentEvidenceSummary.value.missingLabels.length ? 'warning' : recordTimelineItems.value.length ? 'success' : 'default',
    },
    {
      key: 'actionable-items',
      label: isEnglish.value ? 'Actionable Items' : '可执行项',
      value: `${actionCount}`,
      description: isEnglish.value
        ? 'How many direct next-step actions can still be executed without leaving the record.'
        : '当前还有多少个下一步动作可以不离开记录直接执行。',
      tone: actionCount ? 'warning' : 'default',
    },
  ]
}

function buildActionResultLinks(moduleKey: ModuleKey, actionKey: string, row: Record<string, any>) {
  const fieldKeys = ACTION_RESULT_FIELD_MAP[`${moduleKey}:${actionKey}`] || []
  return fieldKeys
    .map((fieldKey) => {
      const value = row[fieldKey]
      if (!value || typeof value !== 'string') return null
      const field = config.value.fields.find((item) => item.key === fieldKey)
      const targetModule = DOCUMENT_FIELD_TARGETS[fieldKey] || inferModuleByReference(value)
      if (!targetModule) return null
      return buildReferenceLink(field ? resolveFieldLabel(field) : fieldKey, value, targetModule)
    })
    .filter((item): item is ResolvedLink => Boolean(item))
}

function openResolvedLink(link: ResolvedLink) {
  const normalizedDetailId = link.query?.focusField === 'id' ? normalizeRelationId(link.query.focusValue) : undefined
  const query = normalizedDetailId
    ? {
        ...Object.fromEntries(Object.entries(link.query || {}).filter(([key]) => !['focusField', 'focusValue'].includes(key))),
        ...buildDetailQuery(normalizedDetailId, {}, link.moduleKey),
      }
    : applyDefaultDetailSectionToQuery(link.moduleKey, link.query || buildModuleQuery(link.moduleKey, link.value, link.focusField))
  void router.push({
    name: link.moduleKey,
    query: applyDefaultDetailSectionToQuery(link.moduleKey, query),
  })
}

function openRelationField(field: ModuleFieldConfig, row = activeRow.value) {
  const relationModule = inferRelationModule(field)
  const relationId = normalizeRelationId(row?.[field.key])
  if (!relationModule || !relationId) return
  void router.push({
    name: relationModule,
    query: buildDetailQuery(relationId, {}, relationModule),
  })
}

function openChildModule(tab: OdooNotebookTabConfig, focusRow?: Record<string, any>) {
  if (!activeRow.value) return
  const manifest = moduleManifestMap[tab.key as ModuleKey]
  if (!manifest) return
  const firstRow = focusRow || childTableRows[tab.key]?.[0]
  router.push({
    name: manifest.key,
    query: {
      contextField: tab.parentFieldKey,
      contextValue: String(activeRow.value.id),
      relatedTo: props.moduleKey,
      ...(firstRow?.id ? { detailId: String(firstRow.id) } : {}),
    },
  })
}

function openChildRow(tab: OdooNotebookTabConfig, row: Record<string, any>) {
  openChildModule(tab, row)
}

function childMode(tab: OdooNotebookTabConfig) {
  const state = String(activeRow.value?.[stateField.value] || '')
  if (props.moduleKey === 'saleOrder' && tab.key === 'saleOrderLine') {
    return ['draft', 'sent'].includes(state) ? 'editable' : 'trace'
  }
  if (props.moduleKey === 'purchaseOrder' && tab.key === 'purchaseOrderLine') {
    return ['draft', 'sent'].includes(state) ? 'editable' : 'trace'
  }
  if (props.moduleKey === 'accountMove' && tab.key === 'accountMoveLine') {
    return state === 'draft' ? 'editable' : 'trace'
  }
  if (props.moduleKey === 'stockPicking' && tab.key === 'stockMove') {
    return state === 'assigned' ? 'execution' : ['draft', 'confirmed'].includes(state) ? 'pending' : 'trace'
  }
  // Inventory and manufacturing child rows follow parent workflow state to avoid per-module page forks.
  if (props.moduleKey === 'mrpProduction' && tab.key === 'stockMove') {
    return state === 'confirmed' ? 'execution' : state === 'draft' ? 'pending' : 'trace'
  }
  if (props.moduleKey === 'stockInventory' && tab.key === 'stockInventoryLine') {
    return ['draft', 'confirm'].includes(state) ? 'editable' : 'trace'
  }
  return 'trace'
}

function childModeTitle(tab: OdooNotebookTabConfig) {
  const mode = childMode(tab)
  if (mode === 'editable') return t('app.childEditableSummary')
  if (mode === 'execution') return t('app.childReadyExecution')
  if (mode === 'pending') return t('app.childPendingConfirmation')
  return t('app.childReadonlySummary')
}

function childModeDescription(tab: OdooNotebookTabConfig) {
  const mode = childMode(tab)
  if (mode === 'editable') return t('app.childRowEditHint')
  if (mode === 'execution') return t('app.childRowExecuteHint')
  if (mode === 'pending') return t('app.childPendingConfirmation')
  return t('app.childRowTraceHint')
}

function buildWorkflowStageNode(
  key: string,
  label: string,
  badge: string,
  description: string,
  status: WorkflowStageStatus,
  link?: ResolvedLink,
): WorkflowStageNode {
  return { key, label, badge, description, status, link }
}

function buildWorkflowStageNodes(row: Record<string, any> | null) {
  if (!row) return []
  const state = String(row[stateField.value] ?? '').toLowerCase()

  if (props.moduleKey === 'saleOrder') {
    const isCancelled = state === 'cancel'
    const isConfirmed = state === 'sale'
    const pickingLink = row.pickingRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'pickingRef', label: 'pickingRef' }), row.pickingRef, 'stockPicking')
      : undefined
    const invoiceLink = row.invoiceRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice')
      : undefined
    return [
      buildWorkflowStageNode(
        'sale-draft',
        isEnglish.value ? 'Draft Quote' : '草稿报价',
        formatModuleStatus(props.moduleKey, stateField.value, row.state),
        isEnglish.value ? 'Complete customer, owner, and sales lines before confirmation.' : '确认前先补齐客户、负责人和销售行。',
        isCancelled ? 'cancelled' : isConfirmed || row.pickingRef || row.invoiceRef ? 'completed' : 'current',
      ),
      buildWorkflowStageNode(
        'sale-confirmed',
        isEnglish.value ? 'Sale Confirmed' : '销售已确认',
        isConfirmed ? (isEnglish.value ? 'Confirmed' : '已确认') : (isEnglish.value ? 'Pending' : '待确认'),
        isEnglish.value ? 'This gate turns the draft into an executable first-wave sales document.' : '这一步把草稿转成可执行的首批销售单据。',
        isCancelled ? 'cancelled' : isConfirmed || row.pickingRef || row.invoiceRef ? 'completed' : 'blocked',
      ),
      buildWorkflowStageNode(
        'sale-delivery',
        isEnglish.value ? 'Delivery Ready' : '出库就绪',
        row.pickingRef || (isConfirmed ? (isEnglish.value ? 'Awaiting picking' : '待生成调拨') : (isEnglish.value ? 'Blocked' : '阻塞')),
        isEnglish.value ? 'Picking should stay reachable from the same sales shell once confirmation is done.' : '确认后应能直接在同一销售壳层里打开调拨。',
        isCancelled ? 'cancelled' : row.pickingRef ? 'completed' : isConfirmed ? 'current' : 'blocked',
        pickingLink,
      ),
      buildWorkflowStageNode(
        'sale-invoice',
        isEnglish.value ? 'Invoice Ready' : '开票就绪',
        row.invoiceRef || (isConfirmed ? (isEnglish.value ? 'Awaiting invoice' : '待生成发票') : (isEnglish.value ? 'Blocked' : '阻塞')),
        isEnglish.value ? 'Invoice creation should continue from the sales record without a detached accounting search.' : '发票创建应沿销售记录继续处理，而不是转去孤立会计搜索。',
        isCancelled ? 'cancelled' : row.invoiceRef ? 'completed' : isConfirmed ? 'current' : 'blocked',
        invoiceLink,
      ),
      buildWorkflowStageNode(
        'sale-payment',
        isEnglish.value ? 'Payment Reachable' : '付款可达',
        row.invoiceRef ? (isEnglish.value ? 'Open invoice payment' : '可继续登记付款') : (isEnglish.value ? 'Blocked by invoice' : '被发票阻塞'),
        isEnglish.value ? 'Once the invoice exists, settlement should continue from the generated invoice link.' : '一旦发票生成，付款链就应从发票引用继续闭环。',
        isCancelled ? 'cancelled' : row.invoiceRef ? 'current' : 'blocked',
        invoiceLink,
      ),
    ]
  }

  if (props.moduleKey === 'purchaseOrder') {
    const isCancelled = state === 'cancel'
    const isConfirmed = state === 'purchase'
    const receiptLink = row.receiptRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'receiptRef', label: 'receiptRef' }), row.receiptRef, 'stockPicking')
      : undefined
    const billLink = row.billRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'billRef', label: 'billRef' }), row.billRef, 'accountInvoice')
      : undefined
    return [
      buildWorkflowStageNode(
        'purchase-draft',
        isEnglish.value ? 'RFQ Draft' : '询价草稿',
        formatModuleStatus(props.moduleKey, stateField.value, row.state),
        isEnglish.value ? 'Vendor, buyer, and purchase lines should be stable before confirmation.' : '确认前先稳定供应商、采购员和采购行。',
        isCancelled ? 'cancelled' : isConfirmed || row.receiptRef || row.billRef ? 'completed' : 'current',
      ),
      buildWorkflowStageNode(
        'purchase-confirmed',
        isEnglish.value ? 'Purchase Confirmed' : '采购已确认',
        isConfirmed ? (isEnglish.value ? 'Confirmed' : '已确认') : (isEnglish.value ? 'Pending' : '待确认'),
        isEnglish.value ? 'This gate freezes the procurement header and starts the receipt chain.' : '这一步冻结采购头信息并启动收货链。',
        isCancelled ? 'cancelled' : isConfirmed || row.receiptRef || row.billRef ? 'completed' : 'blocked',
      ),
      buildWorkflowStageNode(
        'purchase-receipt',
        isEnglish.value ? 'Receipt Ready' : '收货就绪',
        row.receiptRef || (isConfirmed ? (isEnglish.value ? 'Awaiting receipt' : '待生成收货') : (isEnglish.value ? 'Blocked' : '阻塞')),
        isEnglish.value ? 'Receipt review stays in the same procurement context before billing begins.' : '在进入账单前，应先在同一采购上下文中检查收货对象。',
        isCancelled ? 'cancelled' : row.receiptRef ? 'completed' : isConfirmed ? 'current' : 'blocked',
        receiptLink,
      ),
      buildWorkflowStageNode(
        'purchase-bill',
        isEnglish.value ? 'Bill Ready' : '账单就绪',
        row.billRef || (isConfirmed ? (isEnglish.value ? 'Awaiting bill' : '待生成账单') : (isEnglish.value ? 'Blocked' : '阻塞')),
        isEnglish.value ? 'Bills should be created from the same purchase shell so amounts stay grounded in the source order.' : '账单应从同一采购壳层生成，避免金额与源采购单脱节。',
        isCancelled ? 'cancelled' : row.billRef ? 'completed' : isConfirmed ? 'current' : 'blocked',
        billLink,
      ),
      buildWorkflowStageNode(
        'purchase-payment',
        isEnglish.value ? 'Payment Reachable' : '付款可达',
        row.billRef ? (isEnglish.value ? 'Open vendor payment' : '可继续供应商付款') : (isEnglish.value ? 'Blocked by bill' : '被账单阻塞'),
        isEnglish.value ? 'Vendor settlement continues from the generated bill instead of from isolated finance entry.' : '供应商付款应从生成账单继续处理，而不是从孤立财务录入开始。',
        isCancelled ? 'cancelled' : row.billRef ? 'current' : 'blocked',
        billLink,
      ),
    ]
  }

  if (props.moduleKey === 'accountInvoice') {
    const isCancelled = ['cancel', 'reversed'].includes(state)
    const isPosted = state === 'posted' || Boolean(row.paymentRef)
    const paymentState = String(row.paymentState || '').toLowerCase()
    const paymentLink = row.paymentRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), row.paymentRef, 'accountPayment')
      : undefined
    const fullyPaid = paymentState === 'paid'
    const paymentInFlight = ['in_payment', 'partial'].includes(paymentState) || Boolean(row.paymentRef)
    return [
      buildWorkflowStageNode(
        'invoice-draft',
        isEnglish.value ? 'Draft Invoice' : '发票草稿',
        formatModuleStatus(props.moduleKey, stateField.value, row.state),
        isEnglish.value ? 'Amounts, due date, and partner context should be settled before posting.' : '过账前先稳定金额、到期日和伙伴上下文。',
        isCancelled ? 'cancelled' : isPosted ? 'completed' : 'current',
      ),
      buildWorkflowStageNode(
        'invoice-posted',
        isEnglish.value ? 'Posted' : '已过账',
        isPosted ? (isEnglish.value ? 'Posted' : '已过账') : (isEnglish.value ? 'Pending' : '待过账'),
        isEnglish.value ? 'Posting is the accounting gate that allows payment artifacts to be created safely.' : '过账是允许后续付款结果对象安全生成的会计门禁。',
        isCancelled ? 'cancelled' : isPosted ? 'completed' : 'blocked',
      ),
      buildWorkflowStageNode(
        'invoice-payment-artifact',
        isEnglish.value ? 'Payment Artifact' : '付款结果对象',
        row.paymentRef || (isPosted ? (isEnglish.value ? 'Register payment' : '待登记付款') : (isEnglish.value ? 'Blocked' : '阻塞')),
        isEnglish.value ? 'Payment registration should start from the posted invoice, not from a detached payment page.' : '付款登记应从已过账发票开始，而不是跳去孤立付款页。',
        isCancelled ? 'cancelled' : row.paymentRef ? 'completed' : isPosted ? 'current' : 'blocked',
        paymentLink,
      ),
      buildWorkflowStageNode(
        'invoice-settlement',
        isEnglish.value ? 'Settlement' : '结算',
        row.paymentState ? formatModuleStatus(props.moduleKey, 'paymentState', row.paymentState) : (isEnglish.value ? 'Blocked' : '阻塞'),
        isEnglish.value ? 'Settlement should remain traceable through payment artifacts and payment-state semantics.' : '结算状态应通过付款结果对象和付款状态语义持续可追溯。',
        isCancelled ? 'cancelled' : fullyPaid ? 'completed' : paymentInFlight ? 'current' : 'blocked',
        paymentLink,
      ),
    ]
  }

  if (props.moduleKey === 'stockPicking') {
    const isCancelled = state === 'cancel'
    const originModule = inferModuleByReference(row.origin)
    const originLink = row.origin && originModule
      ? buildReferenceLink(resolveFieldLabel({ key: 'origin', label: 'origin' }), row.origin, originModule)
      : undefined
    return [
      buildWorkflowStageNode(
        'picking-draft',
        isEnglish.value ? 'Draft Transfer' : '草稿调拨',
        formatModuleStatus(props.moduleKey, stateField.value, row.state),
        isEnglish.value ? 'Routing, schedule, and operation rows should be reviewed before execution begins.' : '执行前先核对路由、调度和操作行。',
        isCancelled ? 'cancelled' : ['confirmed', 'assigned', 'done'].includes(state) ? 'completed' : state === 'draft' ? 'current' : 'pending',
      ),
      buildWorkflowStageNode(
        'picking-confirmed',
        isEnglish.value ? 'Waiting / Confirmed' : '待处理 / 已确认',
        row.origin || (state === 'confirmed' ? (isEnglish.value ? 'Waiting execution' : '待执行') : (isEnglish.value ? 'Blocked' : '阻塞')),
        isEnglish.value ? 'Confirmation keeps the transfer visible to warehouse operators without validating stock yet.' : '确认后调拨已对仓储操作员可见，但尚未真正校验库存。',
        isCancelled ? 'cancelled' : ['assigned', 'done'].includes(state) ? 'completed' : state === 'confirmed' ? 'current' : 'blocked',
        originLink,
      ),
      buildWorkflowStageNode(
        'picking-assigned',
        isEnglish.value ? 'Ready / Assigned' : '就绪 / 已分配',
        state === 'assigned' ? (isEnglish.value ? 'Ready to validate' : '可执行校验') : (isEnglish.value ? 'Awaiting assignment' : '待分配'),
        isEnglish.value ? 'Assigned transfer lines are the execution gate right before inventory side effects are committed.' : '已分配操作行是库存副作用真正提交前的最后执行门禁。',
        isCancelled ? 'cancelled' : state === 'done' ? 'completed' : state === 'assigned' ? 'current' : 'blocked',
      ),
      buildWorkflowStageNode(
        'picking-done',
        isEnglish.value ? 'Done' : '已完成',
        state === 'done' ? (isEnglish.value ? 'Validated' : '已校验') : (isEnglish.value ? 'Not done' : '未完成'),
        isEnglish.value ? 'Validation closes the execution loop and should only happen after routing and operation checks are complete.' : 'Validate 会关闭执行链，必须在路由和操作行核对完成后进行。',
        isCancelled ? 'cancelled' : state === 'done' ? 'current' : 'blocked',
      ),
      buildWorkflowStageNode(
        'picking-cancel',
        isEnglish.value ? 'Cancelled' : '已取消',
        state === 'cancel' ? (isEnglish.value ? 'Stopped' : '已停止') : (isEnglish.value ? 'Inactive' : '未触发'),
        isEnglish.value ? 'Cancellation must stay visible because transfer rollback directly affects move and quant review.' : '取消状态必须可见，因为调拨回退会直接影响 move 和 quant 审查。',
        state === 'cancel' ? 'current' : 'pending',
      ),
    ]
  }

  if (props.moduleKey === 'accountPayment') {
    const isCancelled = state === 'cancel'
    const isPosted = state === 'posted' || Boolean(row.journalEntryRef)
    const invoiceLink = row.invoiceRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice')
      : undefined
    const journalLink = row.journalEntryRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' }), row.journalEntryRef, 'accountMove')
      : undefined
    return [
      buildWorkflowStageNode(
        'payment-draft',
        isEnglish.value ? 'Draft Payment' : '付款草稿',
        formatModuleStatus(props.moduleKey, stateField.value, row.state),
        isEnglish.value ? 'Direction, amount, partner, and date should match the source document before posting.' : '过账前先让方向、金额、伙伴和日期与源单据保持一致。',
        isCancelled ? 'cancelled' : isPosted ? 'completed' : 'current',
        invoiceLink,
      ),
      buildWorkflowStageNode(
        'payment-posted',
        isEnglish.value ? 'Posted' : '已过账',
        isPosted ? (isEnglish.value ? 'Posted' : '已过账') : (isEnglish.value ? 'Pending' : '待过账'),
        isEnglish.value ? 'Posting closes the payment artifact and should remain tied to invoice context.' : '过账会关闭付款结果对象，并应始终绑定发票上下文。',
        isCancelled ? 'cancelled' : isPosted ? 'completed' : 'blocked',
      ),
      buildWorkflowStageNode(
        'payment-journal',
        isEnglish.value ? 'Journal Ready' : '凭证就绪',
        row.journalEntryRef || (isPosted ? (isEnglish.value ? 'Awaiting journal link' : '待凭证链接') : (isEnglish.value ? 'Blocked' : '阻塞')),
        isEnglish.value ? 'Finance review should reopen the generated journal entry from the same payment shell.' : '财务审查应直接从同一付款壳层重开生成凭证。',
        isCancelled ? 'cancelled' : row.journalEntryRef ? 'current' : isPosted ? 'current' : 'blocked',
        journalLink,
      ),
      buildWorkflowStageNode(
        'payment-cancel',
        isEnglish.value ? 'Cancelled' : '已取消',
        state === 'cancel' ? (isEnglish.value ? 'Stopped' : '已停止') : (isEnglish.value ? 'Inactive' : '未触发'),
        isEnglish.value ? 'Cancellation remains visible so pilot users can stop or replay payment handling safely.' : '取消状态保持可见，方便试点用户安全停止或回放付款处理。',
        state === 'cancel' ? 'current' : 'pending',
        journalLink || invoiceLink,
      ),
    ]
  }

  return []
}

function childEmptyMessage(tab: OdooNotebookTabConfig) {
  const state = String(activeRow.value?.[stateField.value] || '')
  if (props.moduleKey === 'stockPicking' && tab.key === 'stockMove') {
    return ['draft', 'confirmed'].includes(state) ? t('app.emptyStockMoveDraft') : t('app.emptyStockMoveReady')
  }
  if (props.moduleKey === 'mrpProduction' && tab.key === 'stockMove') {
    return ['draft', 'confirmed'].includes(state) ? t('app.emptyStockMoveDraft') : t('app.emptyStockMoveReady')
  }
  if (props.moduleKey === 'saleOrder' && tab.key === 'saleOrderLine') {
    return ['draft', 'sent'].includes(state) ? t('app.emptySaleLineEditable') : t('app.emptySaleLineReadonly')
  }
  if (props.moduleKey === 'purchaseOrder' && tab.key === 'purchaseOrderLine') {
    return ['draft', 'sent'].includes(state) ? t('app.emptyPurchaseLineEditable') : t('app.emptyPurchaseLineReadonly')
  }
  if (props.moduleKey === 'accountMove' && tab.key === 'accountMoveLine') {
    return state === 'draft' ? t('app.emptyMoveLineDraft') : t('app.emptyMoveLineReadonly')
  }
  if (props.moduleKey === 'stockInventory' && tab.key === 'stockInventoryLine') {
    return ['draft', 'confirm'].includes(state) ? t('app.childPendingConfirmation') : t('app.emptyGenericChild')
  }
  return t('app.emptyGenericChild')
}

function buildWorkflowSnapshot(row: Record<string, any> | null) {
  if (!row) return []
  if (props.moduleKey === 'saleOrder') {
    return [
      { key: 'quote', label: t('app.snapshotSaleQuote'), value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: 'info' },
      { key: 'confirm', label: t('app.snapshotSaleConfirm'), value: row.state === 'sale' ? 'Confirmed' : 'Pending', tone: row.state === 'sale' ? 'success' : 'warning' },
      { key: 'delivery', label: t('app.snapshotSaleDelivery'), value: row.pickingRef || '-', tone: row.pickingRef ? 'success' : 'warning' },
      { key: 'invoice', label: t('app.snapshotSaleInvoice'), value: row.invoiceRef || '-', tone: row.invoiceRef ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'purchaseOrder') {
    return [
      { key: 'rfq', label: t('app.snapshotPurchaseRfq'), value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: 'info' },
      { key: 'confirm', label: t('app.snapshotPurchaseConfirm'), value: row.state === 'purchase' ? 'Confirmed' : 'Pending', tone: row.state === 'purchase' ? 'success' : 'warning' },
      { key: 'receipt', label: t('app.snapshotPurchaseReceipt'), value: row.receiptRef || '-', tone: row.receiptRef ? 'success' : 'warning' },
      { key: 'bill', label: t('app.snapshotPurchaseBill'), value: row.billRef || '-', tone: row.billRef ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'accountInvoice') {
    return [
      { key: 'draft', label: t('app.snapshotInvoiceDraft'), value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: 'info' },
      { key: 'post', label: t('app.snapshotInvoicePost'), value: row.state === 'posted' ? 'Posted' : 'Pending', tone: row.state === 'posted' ? 'success' : 'warning' },
      { key: 'pay', label: t('app.snapshotInvoicePay'), value: row.paymentRef || '-', tone: row.paymentRef ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'accountMove') {
    return [
      { key: 'draft', label: t('app.snapshotMoveDraft'), value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: 'info' },
      { key: 'post', label: t('app.snapshotMovePost'), value: row.state === 'posted' ? 'Posted' : 'Pending', tone: row.state === 'posted' ? 'success' : 'warning' },
      { key: 'reverse', label: t('app.snapshotMoveReverse'), value: row.reversedEntryRef || '-', tone: row.reversedEntryRef ? 'success' : 'warning' },
    ]
  }
  // Manufacturing orders surface production progress and source references in the same generic workflow panel.
  if (props.moduleKey === 'mrpProduction') {
    return [
      { key: 'production', label: moduleDisplayTitle.value, value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: 'info' },
      { key: 'bom', label: resolveFieldLabel({ key: 'bomId', label: 'bomId' }), value: formatFieldValue(row, { key: 'bomId', type: 'number', relation: 'mrpBom' }), tone: row.bomId ? 'success' : 'warning' },
      { key: 'source', label: resolveFieldLabel({ key: 'originRef', label: 'originRef' }), value: row.originRef || '-', tone: row.originRef ? 'success' : 'warning' },
      { key: 'produced', label: resolveFieldLabel({ key: 'qtyProduced', label: 'qtyProduced' }), value: String(row.qtyProduced ?? '-'), tone: Number(row.qtyProduced || 0) > 0 ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'stockPicking') {
    return [
      { key: 'transfer', label: moduleDisplayTitle.value, value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: 'info' },
      { key: 'origin', label: 'Origin', value: row.origin || '-', tone: row.origin ? 'success' : 'warning' },
      { key: 'scheduled', label: 'Scheduled', value: row.scheduledDate ? formatDateTime(String(row.scheduledDate)) : '-', tone: row.scheduledDate ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'stockMove') {
    return [
      { key: 'move', label: moduleDisplayTitle.value, value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: 'info' },
      { key: 'role', label: resolveFieldLabel({ key: 'moveRole', label: 'moveRole' }), value: formatModuleStatus(props.moduleKey, 'moveRole', row.moveRole), tone: row.moveRole ? 'success' : 'warning' },
      { key: 'source', label: resolveFieldLabel({ key: 'originRef', label: 'originRef' }), value: row.originRef || '-', tone: row.originRef ? 'success' : 'warning' },
      { key: 'qty', label: resolveFieldLabel({ key: 'quantity', label: 'quantity' }), value: String(row.quantity ?? row.productUomQty ?? '-'), tone: Number(row.quantity || row.productUomQty || 0) > 0 ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'stockInventory') {
    return [
      { key: 'inventory', label: moduleDisplayTitle.value, value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: 'info' },
      { key: 'date', label: resolveFieldLabel({ key: 'date', label: 'date' }), value: row.date ? formatDateTime(String(row.date)) : '-', tone: row.date ? 'success' : 'warning' },
      { key: 'scope', label: resolveFieldLabel({ key: 'locationIds', label: 'locationIds' }), value: row.locationIds || '-', tone: row.locationIds ? 'success' : 'warning' },
      { key: 'company', label: resolveFieldLabel({ key: 'companyId', label: 'companyId' }), value: formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' }), tone: row.companyId ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'crmLead') {
    return [
      { key: 'lead', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'stage', label: resolveFieldLabel({ key: 'stageId', label: 'stageId' }), value: row.stageName || formatFieldValue(row, { key: 'stageId', type: 'number', relation: 'crmStage' }), tone: row.stageId ? 'success' : 'warning' },
      { key: 'owner', label: resolveFieldLabel({ key: 'userId', label: 'userId' }), value: row.userName || formatFieldValue(row, { key: 'userId', type: 'number', relation: 'sysUser' }), tone: row.userId ? 'success' : 'warning' },
      { key: 'priority', label: resolveFieldLabel({ key: 'priority', label: 'priority' }), value: String(row.priority || '-'), tone: String(row.priority || '0') >= '2' ? 'warning' : 'success' },
    ]
  }
  if (props.moduleKey === 'accountPayment') {
    return [
      { key: 'payment', label: moduleDisplayTitle.value, value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: 'info' },
      { key: 'invoice', label: resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), value: row.invoiceRef || '-', tone: row.invoiceRef ? 'success' : 'warning' },
      { key: 'entry', label: resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' }), value: row.journalEntryRef || '-', tone: row.journalEntryRef ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'sysScript') {
    return [
      { key: 'model', label: resolveFieldLabel({ key: 'model', label: 'model' }), value: row.model || '-', tone: row.model ? 'success' : 'warning' },
      { key: 'event', label: resolveFieldLabel({ key: 'eventName', label: 'eventName' }), value: row.eventName || '-', tone: row.eventName ? 'success' : 'warning' },
      { key: 'lang', label: resolveFieldLabel({ key: 'scriptLang', label: 'scriptLang' }), value: row.scriptLang || '-', tone: row.scriptLang ? 'success' : 'warning' },
      { key: 'status', label: resolveFieldLabel({ key: 'status', label: 'status' }), value: String(row.status ?? '-'), tone: Number(row.status || 0) === 1 ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'sysUser') {
    return [
      { key: 'user', label: moduleDisplayTitle.value, value: row.username || row.name || '-', tone: 'info' },
      { key: 'realName', label: resolveFieldLabel({ key: 'realName', label: 'realName' }), value: row.realName || '-', tone: row.realName ? 'success' : 'warning' },
      { key: 'partner', label: resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), value: formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }), tone: row.partnerId ? 'success' : 'warning' },
      { key: 'status', label: resolveFieldLabel({ key: 'status', label: 'status' }), value: String(row.status ?? '-'), tone: Number(row.status || 0) === 1 ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'accountJournal') {
    return [
      { key: 'journal', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'code', label: resolveFieldLabel({ key: 'code', label: 'code' }), value: row.code || '-', tone: row.code ? 'success' : 'warning' },
      { key: 'type', label: resolveFieldLabel({ key: 'type', label: 'type' }), value: row.type || '-', tone: row.type ? 'success' : 'warning' },
      { key: 'status', label: resolveFieldLabel({ key: 'state', label: 'state' }), value: formatModuleStatus(props.moduleKey, stateField.value, row.state), tone: ['confirm', 'validate'].includes(String(row.state)) ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'stockWarehouse') {
    return [
      { key: 'warehouse', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'code', label: resolveFieldLabel({ key: 'code', label: 'code' }), value: row.code || '-', tone: row.code ? 'success' : 'warning' },
      { key: 'company', label: resolveFieldLabel({ key: 'companyId', label: 'companyId' }), value: formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' }), tone: row.companyId ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'sysRole') {
    return [
      { key: 'role', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'code', label: resolveFieldLabel({ key: 'roleCode', label: 'roleCode' }), value: row.roleCode || '-', tone: row.roleCode ? 'success' : 'warning' },
      { key: 'status', label: resolveFieldLabel({ key: 'status', label: 'status' }), value: String(row.status ?? '-'), tone: Number(row.status || 0) === 1 ? 'success' : 'warning' },
      { key: 'deleted', label: resolveFieldLabel({ key: 'deleted', label: 'deleted' }), value: String(row.deleted ?? '-'), tone: Number(row.deleted || 0) === 1 ? 'warning' : 'success' },
    ]
  }
  if (props.moduleKey === 'irLogging') {
    return [
      { key: 'name', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'level', label: resolveFieldLabel({ key: 'level', label: 'level' }), value: row.level || '-', tone: String(row.level || '').toLowerCase().includes('error') ? 'warning' : 'success' },
      { key: 'user', label: resolveFieldLabel({ key: 'userId', label: 'userId' }), value: formatFieldValue(row, { key: 'userId', type: 'number', relation: 'sysUser' }), tone: row.userId ? 'success' : 'warning' },
      { key: 'model', label: resolveFieldLabel({ key: 'resModel', label: 'resModel' }), value: row.resModel || '-', tone: row.resModel ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'resCompany') {
    return [
      { key: 'company', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'partner', label: resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), value: formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }), tone: row.partnerId ? 'success' : 'warning' },
      { key: 'currency', label: resolveFieldLabel({ key: 'currencyId', label: 'currencyId' }), value: formatFieldValue(row, { key: 'currencyId', type: 'number', relation: 'resCurrency' }), tone: row.currencyId ? 'success' : 'warning' },
      { key: 'active', label: resolveFieldLabel({ key: 'active', label: 'active' }), value: formatFieldValue(row, { key: 'active', type: 'switch', formatter: 'boolean' }), tone: row.active ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'resCurrency') {
    return [
      { key: 'currency', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'symbol', label: resolveFieldLabel({ key: 'symbol', label: 'symbol' }), value: row.symbol || '-', tone: row.symbol ? 'success' : 'warning' },
      { key: 'precision', label: resolveFieldLabel({ key: 'decimalPlaces', label: 'decimalPlaces' }), value: String(row.decimalPlaces ?? '-'), tone: Number.isFinite(Number(row.decimalPlaces)) ? 'success' : 'warning' },
      { key: 'active', label: resolveFieldLabel({ key: 'active', label: 'active' }), value: formatFieldValue(row, { key: 'active', type: 'switch', formatter: 'boolean' }), tone: row.active ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'crmStage') {
    return [
      { key: 'stage', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'sequence', label: resolveFieldLabel({ key: 'sequence', label: 'sequence' }), value: String(row.sequence ?? '-'), tone: Number.isFinite(Number(row.sequence)) ? 'success' : 'warning' },
      { key: 'won', label: resolveFieldLabel({ key: 'isWon', label: 'isWon' }), value: formatFieldValue(row, { key: 'isWon', type: 'switch', formatter: 'boolean' }), tone: row.isWon ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'hrEmployee') {
    return [
      { key: 'employee', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'job', label: resolveFieldLabel({ key: 'jobId', label: 'jobId' }), value: row.jobName || formatFieldValue(row, { key: 'jobId', type: 'number', relation: 'hrJob' }), tone: row.jobId ? 'success' : 'warning' },
      { key: 'department', label: resolveFieldLabel({ key: 'departmentId', label: 'departmentId' }), value: row.departmentName || formatFieldValue(row, { key: 'departmentId', type: 'number', relation: 'hrDepartment' }), tone: row.departmentId ? 'success' : 'warning' },
      { key: 'active', label: resolveFieldLabel({ key: 'active', label: 'active' }), value: formatFieldValue(row, { key: 'active', type: 'switch', formatter: 'boolean' }), tone: row.active ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'irAttachment') {
    return [
      { key: 'attachment', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'model', label: resolveFieldLabel({ key: 'resModel', label: 'resModel' }), value: row.resModel || '-', tone: row.resModel ? 'success' : 'warning' },
      { key: 'record', label: resolveFieldLabel({ key: 'resId', label: 'resId' }), value: String(row.resId ?? '-'), tone: row.resId ? 'success' : 'warning' },
      { key: 'mime', label: resolveFieldLabel({ key: 'mimetype', label: 'mimetype' }), value: row.mimetype || '-', tone: row.mimetype ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'projectProject') {
    return [
      { key: 'project', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'owner', label: resolveFieldLabel({ key: 'userId', label: 'userId' }), value: row.userName || formatFieldValue(row, { key: 'userId', type: 'number', relation: 'sysUser' }), tone: row.userId ? 'success' : 'warning' },
      { key: 'partner', label: resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), value: row.partnerName || formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }), tone: row.partnerId ? 'success' : 'warning' },
      { key: 'active', label: resolveFieldLabel({ key: 'active', label: 'active' }), value: formatFieldValue(row, { key: 'active', type: 'switch', formatter: 'boolean' }), tone: row.active ? 'success' : 'warning' },
    ]
  }
  if (props.moduleKey === 'stockLocation') {
    return [
      { key: 'location', label: moduleDisplayTitle.value, value: row.name || '-', tone: 'info' },
      { key: 'usage', label: resolveFieldLabel({ key: 'usage', label: 'usage' }), value: row.usage || '-', tone: row.usage ? 'success' : 'warning' },
      { key: 'warehouse', label: resolveFieldLabel({ key: 'warehouseId', label: 'warehouseId' }), value: formatFieldValue(row, { key: 'warehouseId', type: 'number', relation: 'stockWarehouse' }), tone: row.warehouseId ? 'success' : 'warning' },
      { key: 'company', label: resolveFieldLabel({ key: 'companyId', label: 'companyId' }), value: formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' }), tone: row.companyId ? 'success' : 'warning' },
    ]
  }
  return []
}

function buildWorkflowAlerts(row: Record<string, any> | null) {
  if (!row) return []
  if (props.moduleKey === 'saleOrder') {
    const alerts: string[] = []
    if (row.state === 'sale' && !row.pickingRef) alerts.push(t('app.alertSaleMissingPicking'))
    if (row.state === 'sale' && !row.invoiceRef) alerts.push(t('app.alertSaleMissingInvoice'))
    if (!row.partnerId) alerts.push(`${resolveFieldLabel({ key: 'partnerId', label: 'partnerId' })}: -`)
    if (!row.companyId) alerts.push(`${resolveFieldLabel({ key: 'companyId', label: 'companyId' })}: -`)
    if (row.pickingRef) alerts.push(t('app.alertSalePickingReady'))
    if (row.invoiceRef) alerts.push(t('app.alertSaleInvoiceReady'))
    if (row.invoiceRef && !String(row.paymentRef || row.invoicePaymentRef || '').trim()) {
      alerts.push(isEnglish.value ? 'Settlement is waiting for the payment artifact.' : '结算仍在等待付款结果对象。')
    }
    return alerts
  }
  if (props.moduleKey === 'purchaseOrder') {
    const alerts: string[] = []
    if (row.state === 'purchase' && !row.receiptRef) alerts.push(t('app.alertPurchaseMissingReceipt'))
    if (row.state === 'purchase' && !row.billRef) alerts.push(t('app.alertPurchaseMissingBill'))
    if (!row.partnerId) alerts.push(`${resolveFieldLabel({ key: 'partnerId', label: 'partnerId' })}: -`)
    if (!row.companyId) alerts.push(`${resolveFieldLabel({ key: 'companyId', label: 'companyId' })}: -`)
    if (row.receiptRef) alerts.push(t('app.alertPurchaseReceiptReady'))
    if (row.billRef) alerts.push(t('app.alertPurchaseBillReady'))
    if (row.billRef && !String(row.paymentRef || row.billPaymentRef || '').trim()) {
      alerts.push(isEnglish.value ? 'Settlement is waiting for the payment artifact.' : '结算仍在等待付款结果对象。')
    }
    return alerts
  }
  if (props.moduleKey === 'accountInvoice') {
    const alerts: string[] = []
    if (row.state === 'draft') alerts.push(actionLabel('Post'))
    if (row.state === 'posted' && !row.paymentRef) alerts.push(t('app.alertInvoiceMissingPayment'))
    if (row.paymentRef) alerts.push(t('app.alertInvoicePaymentReady'))
    if (!row.originRef) alerts.push(`${resolveFieldLabel({ key: 'originRef', label: 'originRef' })}: -`)
    if (!row.partnerId) alerts.push(`${resolveFieldLabel({ key: 'partnerId', label: 'partnerId' })}: -`)
    if (!row.companyId) alerts.push(`${resolveFieldLabel({ key: 'companyId', label: 'companyId' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'accountMove') {
    const alerts: string[] = []
    if (row.state === 'posted' && !row.reversedEntryRef) alerts.push(t('app.alertMoveReversalAvailable'))
    if (row.reversedEntryRef) alerts.push(t('app.alertMoveReversalReady'))
    return alerts
  }
  if (props.moduleKey === 'mrpProduction') {
    const alerts: string[] = []
    if (String(row.state) === 'draft') alerts.push(actionLabel('Confirm'))
    if (String(row.state) === 'confirmed' && Number(row.qtyProduced || 0) <= 0) alerts.push(actionLabel('Mark Done'))
    if (row.originRef) alerts.push(`${resolveFieldLabel({ key: 'originRef', label: 'originRef' })}: ${row.originRef}`)
    return alerts
  }
  if (props.moduleKey === 'stockPicking') {
    const alerts: string[] = []
    if (['draft', 'confirmed'].includes(String(row.state))) alerts.push(t('app.childPendingConfirmation'))
    if (String(row.state) === 'assigned') alerts.push(t('app.childReadyExecution'))
    if (row.origin) alerts.push(`${resolveFieldLabel({ key: 'origin', label: 'origin' })}: ${row.origin}`)
    if (!row.origin) alerts.push(`${resolveFieldLabel({ key: 'origin', label: 'origin' })}: -`)
    if (!childRowCount('stockMove')) alerts.push(`${moduleTitle('stockMove')}: 0`)
    if (!row.companyId) alerts.push(`${resolveFieldLabel({ key: 'companyId', label: 'companyId' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'stockMove') {
    const alerts: string[] = []
    if (row.pickingId) alerts.push(`${resolveFieldLabel({ key: 'pickingId', label: 'pickingId' })}: ${formatFieldValue(row, { key: 'pickingId', type: 'number', relation: 'stockPicking' })}`)
    if (row.productionId) alerts.push(`${resolveFieldLabel({ key: 'productionId', label: 'productionId' })}: ${formatFieldValue(row, { key: 'productionId', type: 'number', relation: 'mrpProduction' })}`)
    if (row.originRef) alerts.push(`${resolveFieldLabel({ key: 'originRef', label: 'originRef' })}: ${row.originRef}`)
    return alerts
  }
  if (props.moduleKey === 'stockInventory') {
    const alerts: string[] = []
    if (String(row.state) === 'draft') alerts.push(actionLabel('Start'))
    if (String(row.state) === 'confirm') alerts.push(actionLabel('Validate'))
    if (row.locationIds) alerts.push(`${resolveFieldLabel({ key: 'locationIds', label: 'locationIds' })}: ${row.locationIds}`)
    return alerts
  }
  if (props.moduleKey === 'crmLead') {
    const alerts: string[] = []
    if (!row.partnerId) alerts.push(`${resolveFieldLabel({ key: 'partnerId', label: 'partnerId' })}: -`)
    if (!row.stageId) alerts.push(`${resolveFieldLabel({ key: 'stageId', label: 'stageId' })}: -`)
    if (row.expectedRevenue) alerts.push(`${resolveFieldLabel({ key: 'expectedRevenue', label: 'expectedRevenue' })}: ${formatAmount(row.expectedRevenue)}`)
    return alerts
  }
  if (props.moduleKey === 'accountPayment') {
    const alerts: string[] = []
    if (String(row.state) === 'draft') alerts.push(actionLabel('Post'))
    if (row.invoiceRef) alerts.push(`${resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' })}: ${row.invoiceRef}`)
    if (row.originRef) alerts.push(`${resolveFieldLabel({ key: 'originRef', label: 'originRef' })}: ${row.originRef}`)
    if (row.journalEntryRef) alerts.push(`${resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' })}: ${row.journalEntryRef}`)
    if (!row.invoiceRef && !row.originRef) {
      alerts.push(isEnglish.value ? 'Payment still lacks a visible source invoice or business anchor.' : '付款仍然缺少可见的来源发票或业务锚点。')
    }
    if (String(row.state) === 'posted' && !row.journalEntryRef) {
      alerts.push(isEnglish.value ? 'Posted payment still lacks a visible journal entry.' : '已过账付款仍然缺少可见的会计凭证。')
    }
    if (!row.partnerId) alerts.push(`${resolveFieldLabel({ key: 'partnerId', label: 'partnerId' })}: -`)
    if (!row.companyId) alerts.push(`${resolveFieldLabel({ key: 'companyId', label: 'companyId' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'sysScript') {
    const alerts: string[] = []
    if (!row.model) alerts.push(`${resolveFieldLabel({ key: 'model', label: 'model' })}: -`)
    if (!row.eventName) alerts.push(`${resolveFieldLabel({ key: 'eventName', label: 'eventName' })}: -`)
    if (!row.scriptCode) alerts.push(`${resolveFieldLabel({ key: 'scriptCode', label: 'scriptCode' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'sysUser') {
    const alerts: string[] = []
    if (!row.username) alerts.push(`${resolveFieldLabel({ key: 'username', label: 'username' })}: -`)
    if (!row.partnerId) alerts.push(`${resolveFieldLabel({ key: 'partnerId', label: 'partnerId' })}: -`)
    if (Number(row.deleted || 0) === 1) alerts.push(`${resolveFieldLabel({ key: 'deleted', label: 'deleted' })}: 1`)
    return alerts
  }
  if (props.moduleKey === 'accountJournal') {
    const alerts: string[] = []
    if (String(row.state) === 'draft') alerts.push(actionLabel('Confirm'))
    if (String(row.state) === 'confirm') alerts.push(actionLabel('Approve'))
    if (!row.companyId) alerts.push(`${resolveFieldLabel({ key: 'companyId', label: 'companyId' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'stockWarehouse') {
    const alerts: string[] = []
    if (!row.code) alerts.push(`${resolveFieldLabel({ key: 'code', label: 'code' })}: -`)
    if (!row.companyId) alerts.push(`${resolveFieldLabel({ key: 'companyId', label: 'companyId' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'sysRole') {
    const alerts: string[] = []
    if (!row.roleCode) alerts.push(`${resolveFieldLabel({ key: 'roleCode', label: 'roleCode' })}: -`)
    if (Number(row.deleted || 0) === 1) alerts.push(`${resolveFieldLabel({ key: 'deleted', label: 'deleted' })}: 1`)
    return alerts
  }
  if (props.moduleKey === 'irLogging') {
    const alerts: string[] = []
    if (String(row.level || '').toLowerCase().includes('error')) alerts.push(`${resolveFieldLabel({ key: 'level', label: 'level' })}: ${row.level}`)
    if (row.resModel) alerts.push(`${resolveFieldLabel({ key: 'resModel', label: 'resModel' })}: ${row.resModel}`)
    if (row.path) alerts.push(`${resolveFieldLabel({ key: 'path', label: 'path' })}: ${row.path}`)
    return alerts
  }
  if (props.moduleKey === 'resCompany') {
    const alerts: string[] = []
    if (!row.partnerId) alerts.push(`${resolveFieldLabel({ key: 'partnerId', label: 'partnerId' })}: -`)
    if (!row.currencyId) alerts.push(`${resolveFieldLabel({ key: 'currencyId', label: 'currencyId' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'resCurrency') {
    const alerts: string[] = []
    if (!row.symbol) alerts.push(`${resolveFieldLabel({ key: 'symbol', label: 'symbol' })}: -`)
    if (row.decimalPlaces === undefined || row.decimalPlaces === null) alerts.push(`${resolveFieldLabel({ key: 'decimalPlaces', label: 'decimalPlaces' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'crmStage') {
    const alerts: string[] = []
    if (row.sequence === undefined || row.sequence === null) alerts.push(`${resolveFieldLabel({ key: 'sequence', label: 'sequence' })}: -`)
    if (row.isWon) alerts.push(`${resolveFieldLabel({ key: 'isWon', label: 'isWon' })}: true`)
    return alerts
  }
  if (props.moduleKey === 'hrEmployee') {
    const alerts: string[] = []
    if (!row.jobId) alerts.push(`${resolveFieldLabel({ key: 'jobId', label: 'jobId' })}: -`)
    if (!row.departmentId) alerts.push(`${resolveFieldLabel({ key: 'departmentId', label: 'departmentId' })}: -`)
    if (!row.userId) alerts.push(`${resolveFieldLabel({ key: 'userId', label: 'userId' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'irAttachment') {
    const alerts: string[] = []
    if (!row.resModel) alerts.push(`${resolveFieldLabel({ key: 'resModel', label: 'resModel' })}: -`)
    if (!row.resId) alerts.push(`${resolveFieldLabel({ key: 'resId', label: 'resId' })}: -`)
    if (!row.mimetype) alerts.push(`${resolveFieldLabel({ key: 'mimetype', label: 'mimetype' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'projectProject') {
    const alerts: string[] = []
    if (!row.userId) alerts.push(`${resolveFieldLabel({ key: 'userId', label: 'userId' })}: -`)
    if (!row.partnerId) alerts.push(`${resolveFieldLabel({ key: 'partnerId', label: 'partnerId' })}: -`)
    return alerts
  }
  if (props.moduleKey === 'stockLocation') {
    const alerts: string[] = []
    if (!row.usage) alerts.push(`${resolveFieldLabel({ key: 'usage', label: 'usage' })}: -`)
    if (!row.warehouseId) alerts.push(`${resolveFieldLabel({ key: 'warehouseId', label: 'warehouseId' })}: -`)
    return alerts
  }
  return []
}

function buildNextSuggestions(row: Record<string, any> | null) {
  if (!row) return []
  const suggestions: SuggestionItem[] = []
  if (props.moduleKey === 'saleOrder') {
    if (['draft', 'sent'].includes(String(row.state)) && resolveActionConfig('action_confirm')) {
      suggestions.push({ key: 'sale-confirm', label: actionLabel('Confirm'), type: 'action', actionKey: 'action_confirm' })
    }
    suggestions.push({
      key: 'sale-lines-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildChildRowsContextLink(moduleTitle('saleOrderLine'), 'saleOrderLine', 'orderId', row.id, resolveRowTitle(row)),
    })
    if (row.invoiceRef) {
      suggestions.push({
        key: 'sale-invoice',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice'),
      })
      const salePaymentRef = String(row.paymentRef || row.invoicePaymentRef || '').trim()
      if (salePaymentRef) {
        suggestions.push({
          key: 'sale-payment-open',
          label: t('app.openGeneratedResults'),
          type: 'link',
          link: buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), salePaymentRef, 'accountPayment'),
        })
      }
    } else if (String(row.state) === 'sale' && resolveActionConfig('action_create_invoice')) {
      suggestions.push({ key: 'sale-create-invoice', label: actionLabel('Create Invoice'), type: 'action', actionKey: 'action_create_invoice' })
    }
    if (row.pickingRef) {
      suggestions.push({
        key: 'sale-picking',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildReferenceLink(resolveFieldLabel({ key: 'pickingRef', label: 'pickingRef' }), row.pickingRef, 'stockPicking'),
      })
    }
    if (row.companyId) {
      suggestions.push({
        key: 'sale-company-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      })
    }
  }
  if (props.moduleKey === 'purchaseOrder') {
    if (['draft', 'sent'].includes(String(row.state)) && resolveActionConfig('action_confirm')) {
      suggestions.push({ key: 'purchase-confirm', label: actionLabel('Confirm Order'), type: 'action', actionKey: 'action_confirm' })
    }
    suggestions.push({
      key: 'purchase-lines-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildChildRowsContextLink(moduleTitle('purchaseOrderLine'), 'purchaseOrderLine', 'orderId', row.id, resolveRowTitle(row)),
    })
    if (row.billRef) {
      suggestions.push({
        key: 'purchase-bill-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildReferenceLink(resolveFieldLabel({ key: 'billRef', label: 'billRef' }), row.billRef, 'accountInvoice'),
      })
      const purchasePaymentRef = String(row.paymentRef || row.billPaymentRef || '').trim()
      if (purchasePaymentRef) {
        suggestions.push({
          key: 'purchase-payment-open',
          label: t('app.openGeneratedResults'),
          type: 'link',
          link: buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), purchasePaymentRef, 'accountPayment'),
        })
      }
    } else if (String(row.state) === 'purchase' && resolveActionConfig('action_create_bill')) {
      suggestions.push({ key: 'purchase-create-bill', label: actionLabel('Create Bill'), type: 'action', actionKey: 'action_create_bill' })
    }
    if (row.receiptRef) {
      suggestions.push({
        key: 'purchase-receipt-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildReferenceLink(resolveFieldLabel({ key: 'receiptRef', label: 'receiptRef' }), row.receiptRef, 'stockPicking'),
      })
    }
    if (row.companyId) {
      suggestions.push({
        key: 'purchase-company-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      })
    }
  }
  if (props.moduleKey === 'accountInvoice') {
    if (String(row.state) === 'draft' && resolveActionConfig('post')) {
      suggestions.push({ key: 'invoice-post', label: actionLabel('Post'), type: 'action', actionKey: 'post' })
    }
    if (String(row.state) === 'posted' && !row.paymentRef && resolveActionConfig('register_payment')) {
      suggestions.push({ key: 'invoice-payment', label: actionLabel('Register Payment'), type: 'action', actionKey: 'register_payment' })
    }
    if (row.paymentRef) {
      suggestions.push({
        key: 'invoice-payment-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), row.paymentRef, 'accountPayment'),
      })
    }
    if (row.partnerId) {
      suggestions.push({
        key: 'invoice-partner-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId)),
      })
    }
    if (row.companyId) {
      suggestions.push({
        key: 'invoice-company-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      })
    }
    if (row.originRef) {
      const originModule = inferModuleByReference(row.originRef)
      if (originModule) {
        suggestions.push({
          key: 'invoice-origin-open',
          label: t('app.openGeneratedResults'),
          type: 'link',
          link: buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule),
        })
      }
    }
  }
  if (props.moduleKey === 'accountMove') {
    if (String(row.state) === 'posted' && !row.reversedEntryRef && resolveActionConfig('reverse')) {
      suggestions.push({ key: 'move-reverse', label: actionLabel('Reverse'), type: 'action', actionKey: 'reverse' })
    }
    if (row.reversedEntryRef) {
      suggestions.push({
        key: 'move-reversed-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildReferenceLink(resolveFieldLabel({ key: 'reversedEntryRef', label: 'reversedEntryRef' }), row.reversedEntryRef, 'accountMove'),
      })
    }
  }
  if (props.moduleKey === 'mrpProduction') {
    if (String(row.state) === 'draft' && resolveActionConfig('action_confirm')) {
      suggestions.push({ key: 'mo-confirm', label: actionLabel('Confirm'), type: 'action', actionKey: 'action_confirm' })
    }
    if (String(row.state) === 'confirmed' && resolveActionConfig('button_mark_done')) {
      suggestions.push({ key: 'mo-done', label: actionLabel('Mark Done'), type: 'action', actionKey: 'button_mark_done' })
    }
    if (row.originRef) {
      const originModule = inferModuleByReference(row.originRef)
      if (originModule) {
        suggestions.push({
          key: 'mo-origin-open',
          label: t('app.openRelatedObject'),
          type: 'link',
          link: buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule),
        })
      }
    }
  }
  if (props.moduleKey === 'stockPicking') {
    if (['draft', 'confirmed'].includes(String(row.state)) && resolveActionConfig('action_confirm')) {
      suggestions.push({ key: 'picking-confirm', label: actionLabel('Confirm'), type: 'action', actionKey: 'action_confirm' })
    }
    if (String(row.state) === 'assigned' && resolveActionConfig('action_validate')) {
      suggestions.push({ key: 'picking-validate', label: actionLabel('Validate'), type: 'action', actionKey: 'action_validate' })
    }
    if (row.origin) {
      const originModule = inferModuleByReference(row.origin)
      if (originModule) {
        suggestions.push({
          key: 'picking-origin-open',
          label: t('app.openRelatedObject'),
          type: 'link',
          link: buildReferenceLink(resolveFieldLabel({ key: 'origin', label: 'origin' }), row.origin, originModule),
        })
      }
    }
    suggestions.push({
      key: 'picking-moves-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildChildRowsContextLink(moduleTitle('stockMove'), 'stockMove', 'pickingId', row.id, resolveRowTitle(row)),
    })
    if (row.partnerId) {
      suggestions.push({
        key: 'picking-partner-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId)),
      })
    }
    if (row.companyId) {
      suggestions.push({
        key: 'picking-company-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      })
    }
  }
  if (props.moduleKey === 'stockMove') {
    if (row.pickingId) {
      suggestions.push({
        key: 'move-picking-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'pickingId', label: 'pickingId' }), 'stockPicking', row.pickingId, String(row.pickingId)),
      })
    }
    if (row.productionId) {
      suggestions.push({
        key: 'move-production-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'productionId', label: 'productionId' }), 'mrpProduction', row.productionId, String(row.productionId)),
      })
    }
    if (row.originRef) {
      const originModule = inferModuleByReference(row.originRef)
      if (originModule) {
        suggestions.push({
          key: 'move-origin-open',
          label: t('app.openRelatedObject'),
          type: 'link',
          link: buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule),
        })
      }
    }
  }
  if (props.moduleKey === 'stockInventory') {
    if (String(row.state) === 'draft' && resolveActionConfig('action_start')) {
      suggestions.push({ key: 'inventory-start', label: actionLabel('Start'), type: 'action', actionKey: 'action_start' })
    }
    if (String(row.state) === 'confirm' && resolveActionConfig('action_validate')) {
      suggestions.push({ key: 'inventory-validate', label: actionLabel('Validate'), type: 'action', actionKey: 'action_validate' })
    }
    suggestions.push({
      key: 'inventory-lines-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildRouteLink(moduleTitle('stockInventoryLine'), 'stockInventoryLine', {
        contextField: 'inventoryId',
        contextValue: String(row.id),
        relatedTo: props.moduleKey,
      }, String(row.id)),
    })
  }
  if (props.moduleKey === 'crmLead') {
    if (resolveActionConfig('action_mark_won')) {
      suggestions.push({ key: 'lead-won', label: actionLabel('Mark Won'), type: 'action', actionKey: 'action_mark_won' })
    }
    if (resolveActionConfig('action_set_lost')) {
      suggestions.push({ key: 'lead-lost', label: actionLabel('Mark Lost'), type: 'action', actionKey: 'action_set_lost' })
    }
    if (row.partnerId) {
      suggestions.push({
        key: 'lead-partner-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId)),
      })
    }
  }
  if (props.moduleKey === 'sysUser' && row.partnerId) {
    suggestions.push({
      key: 'sys-user-partner-open',
      label: t('app.openRelatedObject'),
      type: 'link',
      link: buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId)),
    })
  }
  if (props.moduleKey === 'accountJournal') {
    if (String(row.state) === 'draft' && resolveActionConfig('action_confirm')) {
      suggestions.push({ key: 'journal-confirm', label: actionLabel('Confirm'), type: 'action', actionKey: 'action_confirm' })
    }
    if (String(row.state) === 'confirm' && resolveActionConfig('action_approve')) {
      suggestions.push({ key: 'journal-approve', label: actionLabel('Approve'), type: 'action', actionKey: 'action_approve' })
    }
    if (row.companyId) {
      suggestions.push({
        key: 'journal-company-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      })
    }
  }
  if (props.moduleKey === 'stockWarehouse' && row.companyId) {
    suggestions.push({
      key: 'warehouse-company-open',
      label: t('app.openRelatedObject'),
      type: 'link',
      link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
    })
  }
  if (props.moduleKey === 'irLogging') {
    if (row.userId) {
      suggestions.push({
        key: 'logging-user-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'userId', label: 'userId' }), 'sysUser', row.userId, String(row.userId)),
      })
    }
    const targetModule = inferModuleByModelName(row.resModel)
    if (targetModule) {
      suggestions.push({
        key: 'logging-model-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildRouteLink(
          resolveFieldLabel({ key: 'resModel', label: 'resModel' }),
          targetModule,
          row.resId ? buildDetailQuery(Number(row.resId)) : { relatedTo: props.moduleKey },
          String(row.resModel),
        ),
      })
    }
  }
  if (props.moduleKey === 'resCompany') {
    const companyTitle = resolveRowTitle(row)
    suggestions.push({
      key: 'company-sales-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildContextListLink(moduleTitle('saleOrder'), 'saleOrder', 'companyId', row.id, companyTitle),
    })
    suggestions.push({
      key: 'company-purchase-open',
      label: t('app.openGeneratedResults'),
      type: 'link',
      link: buildContextListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', 'companyId', row.id, companyTitle),
    })
    suggestions.push({
      key: 'company-pricelist-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildContextListLink(moduleTitle('productPricelist'), 'productPricelist', 'companyId', row.id, companyTitle),
    })
    suggestions.push({
      key: 'company-template-open',
      label: t('app.openGeneratedResults'),
      type: 'link',
      link: buildContextListLink(moduleTitle('productTemplate'), 'productTemplate', 'companyId', row.id, companyTitle),
    })
    if (row.partnerId) {
      suggestions.push({
        key: 'company-partner-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId)),
      })
    }
    if (row.currencyId) {
      suggestions.push({
        key: 'company-currency-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'currencyId', label: 'currencyId' }), 'resCurrency', row.currencyId, String(row.currencyId)),
      })
    }
  }
  if (props.moduleKey === 'productTemplate') {
    const templateTitle = resolveRowTitle(row)
    const templateToken = pickFirstFilledText(row, ['defaultCode', 'barcode', 'name']) || templateTitle
    suggestions.push({
      key: 'template-variants-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildContextListLink(moduleTitle('productProduct'), 'productProduct', 'productTmplId', row.id, templateTitle),
    })
    suggestions.push({
      key: 'template-sales-review-open',
      label: t('app.openGeneratedResults'),
      type: 'link',
      link: buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', templateToken, templateToken),
    })
    suggestions.push({
      key: 'template-purchase-review-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildKeywordListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', templateToken, templateToken),
    })
    if (row.categId) {
      suggestions.push({
        key: 'template-category-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'categId', label: 'categId' }), 'productCategory', row.categId, String(row.categId)),
      })
    }
    if (row.companyId) {
      suggestions.push({
        key: 'template-company-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      })
    }
  }
  if (props.moduleKey === 'productProduct') {
    const variantTitle = resolveRowTitle(row)
    const variantToken = pickFirstFilledText(row, ['defaultCode', 'barcode', 'name']) || variantTitle
    suggestions.push({
      key: 'variant-sale-lines-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildContextListLink(moduleTitle('saleOrderLine'), 'saleOrderLine', 'productId', row.id, variantToken),
    })
    suggestions.push({
      key: 'variant-purchase-lines-open',
      label: t('app.openGeneratedResults'),
      type: 'link',
      link: buildContextListLink(moduleTitle('purchaseOrderLine'), 'purchaseOrderLine', 'productId', row.id, variantToken),
    })
    suggestions.push({
      key: 'variant-sales-review-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', variantToken, variantToken),
    })
    suggestions.push({
      key: 'variant-purchase-review-open',
      label: t('app.openGeneratedResults'),
      type: 'link',
      link: buildKeywordListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', variantToken, variantToken),
    })
    if (row.productTmplId) {
      suggestions.push({
        key: 'variant-template-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'productTmplId', label: 'productTmplId' }), 'productTemplate', row.productTmplId, String(row.productTmplId)),
      })
    }
  }
  if (props.moduleKey === 'productCategory') {
    const categoryTitle = resolveRowTitle(row)
    const categoryToken = pickFirstFilledText(row, ['completeName', 'name']) || categoryTitle
    suggestions.push({
      key: 'category-templates-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildContextListLink(moduleTitle('productTemplate'), 'productTemplate', 'categId', row.id, categoryTitle),
    })
    suggestions.push({
      key: 'category-children-open',
      label: t('app.openGeneratedResults'),
      type: 'link',
      link: buildContextListLink(moduleTitle('productCategory'), 'productCategory', 'parentId', row.id, categoryTitle),
    })
    suggestions.push({
      key: 'category-sales-review-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', categoryToken, categoryToken),
    })
    suggestions.push({
      key: 'category-purchase-review-open',
      label: t('app.openGeneratedResults'),
      type: 'link',
      link: buildKeywordListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', categoryToken, categoryToken),
    })
    if (row.parentId) {
      suggestions.push({
        key: 'category-parent-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'parentId', label: 'parentId' }), 'productCategory', row.parentId, String(row.parentId)),
      })
    }
  }
  if (props.moduleKey === 'productPricelist') {
    const pricelistTitle = resolveRowTitle(row)
    const companyTitle = row.companyId
      ? formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' })
      : pricelistTitle
    suggestions.push({
      key: 'pricelist-sales-review-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: row.companyId
        ? buildContextListLink(moduleTitle('saleOrder'), 'saleOrder', 'companyId', row.companyId, companyTitle)
        : buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', pricelistTitle, pricelistTitle),
    })
    suggestions.push({
      key: 'pricelist-template-scope-open',
      label: t('app.openGeneratedResults'),
      type: 'link',
      link: row.companyId
        ? buildContextListLink(moduleTitle('productTemplate'), 'productTemplate', 'companyId', row.companyId, companyTitle)
        : undefined,
    })
    suggestions.push({
      key: 'pricelist-purchase-scope-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: row.companyId
        ? buildContextListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', 'companyId', row.companyId, companyTitle)
        : undefined,
    })
    if (row.companyId) {
      suggestions.push({
        key: 'pricelist-company-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      })
    }
    if (row.currencyId) {
      suggestions.push({
        key: 'pricelist-currency-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'currencyId', label: 'currencyId' }), 'resCurrency', row.currencyId, String(row.currencyId)),
      })
    }
  }
  if (props.moduleKey === 'sysScript') {
    const targetModule = inferModuleByModelName(row.model)
    if (targetModule) {
      suggestions.push({
        key: 'sys-script-target-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildRouteLink(resolveFieldLabel({ key: 'model', label: 'model' }), targetModule, {
          relatedTo: props.moduleKey,
        }, String(row.model)),
      })
    }
  }
  if (props.moduleKey === 'resCurrency') {
    suggestions.push({
      key: 'currency-companies-open',
      label: t('app.openRelatedList'),
      type: 'link',
      link: buildRouteLink(moduleTitle('resCompany'), 'resCompany', {
        contextField: 'currencyId',
        contextValue: String(row.id),
        relatedTo: props.moduleKey,
      }, String(row.id)),
    })
  }
  if (props.moduleKey === 'crmStage') {
    return suggestions
  }
  if (props.moduleKey === 'hrEmployee') {
    if (row.userId) {
      suggestions.push({
        key: 'employee-user-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'userId', label: 'userId' }), 'sysUser', row.userId, String(row.userId)),
      })
    }
    if (row.departmentId) {
      suggestions.push({
        key: 'employee-department-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'departmentId', label: 'departmentId' }), 'hrDepartment', row.departmentId, String(row.departmentId)),
      })
    }
  }
  if (props.moduleKey === 'irAttachment') {
    const targetModule = inferModuleByModelName(row.resModel)
    if (targetModule) {
      suggestions.push({
        key: 'attachment-target-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildRouteLink(
          resolveFieldLabel({ key: 'resModel', label: 'resModel' }),
          targetModule,
          row.resId ? buildDetailQuery(Number(row.resId)) : { relatedTo: props.moduleKey },
          String(row.resModel),
        ),
      })
    }
  }
  if (props.moduleKey === 'projectProject') {
    if (row.userId) {
      suggestions.push({
        key: 'project-owner-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'userId', label: 'userId' }), 'sysUser', row.userId, String(row.userId)),
      })
    }
    if (row.partnerId) {
      suggestions.push({
        key: 'project-partner-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId)),
      })
    }
  }
  if (props.moduleKey === 'stockLocation') {
    if (row.warehouseId) {
      suggestions.push({
        key: 'location-warehouse-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'warehouseId', label: 'warehouseId' }), 'stockWarehouse', row.warehouseId, String(row.warehouseId)),
      })
    }
    if (row.companyId) {
      suggestions.push({
        key: 'location-company-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      })
    }
  }
  if (props.moduleKey === 'accountPayment') {
    if (String(row.state) === 'draft' && resolveActionConfig('action_post')) {
      suggestions.push({ key: 'payment-post', label: actionLabel('Post'), type: 'action', actionKey: 'action_post' })
    }
    if (row.journalEntryRef) {
      suggestions.push({
        key: 'payment-entry-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildReferenceLink(resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' }), row.journalEntryRef, 'accountMove'),
      })
    }
    if (row.originRef) {
      const originModule = inferModuleByReference(row.originRef)
      if (originModule) {
        suggestions.push({
          key: 'payment-origin-open',
          label: t('app.openRelatedObject'),
          type: 'link',
          link: buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule),
        })
      }
    }
    if (row.invoiceRef) {
      suggestions.push({
        key: 'payment-invoice-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice'),
      })
    }
    if (row.partnerId) {
      suggestions.push({
        key: 'payment-partner-open',
        label: t('app.openRelatedObject'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId)),
      })
    }
    if (row.companyId) {
      suggestions.push({
        key: 'payment-company-open',
        label: t('app.openGeneratedResults'),
        type: 'link',
        link: buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      })
    }
  }
  return suggestions.filter((item) => (item.type === 'action' ? Boolean(item.actionKey) : Boolean(item.link)))
}

function buildWorkflowExecutionCards(row: Record<string, any> | null) {
  if (!row) return []

  const cards: WorkflowExecutionCard[] = []
  const currentStage = workflowCurrentStage.value
  const nextAction = primarySuggestionAction.value
  const nextLink = primarySuggestionLink.value?.link
  const settlementSummary = buildFirstWaveSettlementSummary(row)
  const rollbackAction = ['action_cancel', 'action_reset_draft', 'button_draft']
    .map((actionKey) => resolveActionConfig(actionKey))
    .find((item) => Boolean(item))

  if (currentStage) {
    cards.push({
      key: 'current-stage',
      label: isEnglish.value ? 'Current Gate' : '当前门禁',
      value: currentStage.label,
      description: currentStage.description,
      tone: currentStage.status === 'cancelled' ? 'danger' : currentStage.status === 'completed' ? 'success' : 'warning',
      link: currentStage.link,
    })
  }

  if (nextAction?.actionKey) {
    cards.push({
      key: 'next-action',
      label: isEnglish.value ? 'Next Move' : '下一步',
      value: nextAction.label,
      description: isEnglish.value ? 'Run the suggested action from the same record to keep the chain moving.' : '直接在同一记录上执行建议动作，保持链路连续推进。',
      tone: 'warning',
      actionKey: nextAction.actionKey,
    })
  } else if (nextLink) {
    cards.push({
      key: 'next-link',
      label: isEnglish.value ? 'Next Drilldown' : '下一跳转',
      value: nextLink.value,
      description: isEnglish.value ? 'Open the most relevant downstream or related object from the same shell.' : '直接从同一壳层打开最相关的下游或关联对象。',
      tone: 'success',
      link: nextLink,
    })
  } else {
    cards.push({
      key: 'next-clear',
      label: isEnglish.value ? 'Next Move' : '下一步',
      value: isEnglish.value ? 'No immediate action' : '当前无直接动作',
      description: isEnglish.value ? 'The current record has no urgent next action exposed in the configured workflow.' : '当前记录在已配置流程里没有紧急下一步动作。',
      tone: 'default',
    })
  }

  if (rollbackAction) {
    cards.push({
      key: 'rollback',
      label: isEnglish.value ? 'Rollback Path' : '回退路径',
      value: actionLabel(rollbackAction.label),
      description: isEnglish.value ? 'Keep rollback visible so pilot users can stop or reset the chain before side effects spread.' : '回退路径必须保持可见，方便试点用户在副作用扩散前及时停止或重置。',
      tone: 'warning',
      actionKey: rollbackAction.key,
    })
  } else {
    cards.push({
      key: 'rollback-passive',
      label: isEnglish.value ? 'Rollback Path' : '回退路径',
      value: isEnglish.value ? 'Review only' : '当前仅可审查',
      description: isEnglish.value ? 'No rollback action is configured for the current state, so review and export remain the safe fallback.' : '当前状态没有配置回退动作，因此审查与导出是更安全的兜底路径。',
      tone: 'default',
    })
  }

  if (settlementSummary.expectedCount) {
    const focusItem = settlementSummary.items.find((item) => item.status !== 'ready')
    cards.push({
      key: 'settlement-closure',
      label: isEnglish.value ? 'Settlement Closure' : '结算闭环',
      value: `${settlementSummary.readyCount}/${settlementSummary.expectedCount}`,
      description: focusItem
        ? `${describeSettlementSummary(settlementSummary)}`
        : (isEnglish.value ? 'Settlement closure steps are all visible from the current record.' : '结算闭环步骤已经全部可以从当前记录直接进入。'),
      tone: settlementSummary.missingCount ? 'danger' : settlementSummary.warningCount ? 'warning' : 'success',
      link: focusItem?.link,
    })
  }

  if (props.moduleKey === 'saleOrder') {
    const saleLink = row.invoiceRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice')
      : row.pickingRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'pickingRef', label: 'pickingRef' }), row.pickingRef, 'stockPicking')
        : undefined
    cards.push({
      key: 'sale-downstream',
      label: isEnglish.value ? 'Downstream Objects' : '下游结果对象',
      value: [row.pickingRef, row.invoiceRef].filter(Boolean).join(' / ') || (isEnglish.value ? 'Not generated' : '尚未生成'),
      description: isEnglish.value ? 'Sales should keep delivery and invoice artifacts reachable from the same cockpit.' : '销售链应把出库和发票结果对象都保持在同一驾驶舱里可追溯。',
      tone: row.pickingRef || row.invoiceRef ? 'success' : 'warning',
      link: saleLink,
    })
    cards.push({
      key: 'sale-line-readiness',
      label: isEnglish.value ? 'Line Readiness' : '订单行就绪',
      value: `${childRowCount('saleOrderLine')}`,
      description: isEnglish.value ? 'Sales order lines should remain reviewable from the same record before downstream side effects spread.' : '在下游副作用继续扩散前，销售订单行应始终能从同一记录直接核对。',
      tone: childRowCount('saleOrderLine') ? 'success' : 'warning',
      link: buildChildRowsContextLink(moduleTitle('saleOrderLine'), 'saleOrderLine', 'orderId', row.id, resolveRowTitle(row)),
    })
    const salePaymentRef = String(row.paymentRef || row.invoicePaymentRef || '').trim()
    cards.push({
      key: 'sale-settlement',
      label: isEnglish.value ? 'Settlement Handoff' : '结算交接',
      value: salePaymentRef || row.invoiceRef || (isEnglish.value ? 'Awaiting invoice / payment' : '待发票 / 付款'),
      description: isEnglish.value
        ? 'The sales chain should keep invoice and payment artifacts reachable until settlement closes.'
        : '销售链应持续保持发票和付款结果对象可达，直到结算闭环。',
      tone: salePaymentRef ? 'success' : row.invoiceRef ? 'warning' : 'default',
      link: salePaymentRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), salePaymentRef, 'accountPayment')
        : row.invoiceRef
          ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice')
          : undefined,
    })
  } else if (props.moduleKey === 'purchaseOrder') {
    const purchaseLink = row.billRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'billRef', label: 'billRef' }), row.billRef, 'accountInvoice')
      : row.receiptRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'receiptRef', label: 'receiptRef' }), row.receiptRef, 'stockPicking')
        : undefined
    cards.push({
      key: 'purchase-downstream',
      label: isEnglish.value ? 'Downstream Objects' : '下游结果对象',
      value: [row.receiptRef, row.billRef].filter(Boolean).join(' / ') || (isEnglish.value ? 'Not generated' : '尚未生成'),
      description: isEnglish.value ? 'Receipt and bill artifacts should stay attached to the procurement source record.' : '收货与账单结果对象应持续挂在采购源记录下审查。',
      tone: row.receiptRef || row.billRef ? 'success' : 'warning',
      link: purchaseLink,
    })
    cards.push({
      key: 'purchase-line-readiness',
      label: isEnglish.value ? 'Line Readiness' : '订单行就绪',
      value: `${childRowCount('purchaseOrderLine')}`,
      description: isEnglish.value ? 'Purchase order lines should remain reviewable before receipt, billing, or payment effects spread.' : '在收货、账单或付款副作用继续扩散前，采购订单行应持续可核对。',
      tone: childRowCount('purchaseOrderLine') ? 'success' : 'warning',
      link: buildChildRowsContextLink(moduleTitle('purchaseOrderLine'), 'purchaseOrderLine', 'orderId', row.id, resolveRowTitle(row)),
    })
    const purchasePaymentRef = String(row.paymentRef || row.billPaymentRef || '').trim()
    cards.push({
      key: 'purchase-settlement',
      label: isEnglish.value ? 'Settlement Handoff' : '结算交接',
      value: purchasePaymentRef || row.billRef || (isEnglish.value ? 'Awaiting bill / payment' : '待账单 / 付款'),
      description: isEnglish.value
        ? 'The procurement chain should keep bill and payment artifacts reachable until settlement closes.'
        : '采购链应持续保持账单和付款结果对象可达，直到结算闭环。',
      tone: purchasePaymentRef ? 'success' : row.billRef ? 'warning' : 'default',
      link: purchasePaymentRef
        ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), purchasePaymentRef, 'accountPayment')
        : row.billRef
          ? buildReferenceLink(resolveFieldLabel({ key: 'billRef', label: 'billRef' }), row.billRef, 'accountInvoice')
          : undefined,
    })
  } else if (props.moduleKey === 'accountInvoice') {
    const paymentLink = row.paymentRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), row.paymentRef, 'accountPayment')
      : undefined
    cards.push({
      key: 'invoice-settlement',
      label: isEnglish.value ? 'Settlement Trace' : '结算追溯',
      value: row.paymentRef || formatModuleStatus(props.moduleKey, 'paymentState', row.paymentState || '-') || '-',
      description: isEnglish.value ? 'Invoice posting should lead directly into payment registration and settlement review.' : '发票过账后应直接继续到付款登记与结算审查。',
      tone: row.paymentRef ? 'success' : String(row.state) === 'posted' ? 'warning' : 'default',
      link: paymentLink,
    })
    cards.push({
      key: 'invoice-party-scope',
      label: isEnglish.value ? 'Party / Company Scope' : '伙伴 / 公司范围',
      value: [row.partnerId ? formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }) : '', row.companyId ? formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' }) : '']
        .filter(Boolean)
        .join(' / ') || '-',
      description: isEnglish.value ? 'Settlement should remain grounded in the same partner and company scope.' : '结算过程应持续落在同一伙伴和公司范围内。',
      tone: row.partnerId && row.companyId ? 'success' : 'warning',
      link: row.partnerId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId))
        : row.companyId
          ? buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId))
          : undefined,
    })
    const invoiceOriginModule = inferModuleByReference(row.originRef)
    cards.push({
      key: 'invoice-origin',
      label: isEnglish.value ? 'Upstream Trace' : '上游追溯',
      value: row.originRef || (isEnglish.value ? 'No origin' : '暂无来源'),
      description: isEnglish.value
        ? 'Billing review should always keep the upstream business source reachable.'
        : '账单审查时应始终能回到上游业务来源。',
      tone: row.originRef ? 'success' : 'warning',
      link: row.originRef && invoiceOriginModule
        ? buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, invoiceOriginModule)
        : undefined,
    })
  } else if (props.moduleKey === 'stockPicking') {
    const originModule = inferModuleByReference(row.origin)
    const originLink = row.origin && originModule
      ? buildReferenceLink(resolveFieldLabel({ key: 'origin', label: 'origin' }), row.origin, originModule)
      : undefined
    cards.push({
      key: 'picking-origin',
      label: isEnglish.value ? 'Origin Chain' : '来源链路',
      value: row.origin || (isEnglish.value ? 'No origin' : '暂无来源'),
      description: isEnglish.value ? 'Warehouse execution should always be able to jump back to the upstream business document.' : '仓储执行应始终能跳回上游业务单据。',
      tone: row.origin ? 'success' : 'warning',
      link: originLink,
    })
    cards.push({
      key: 'picking-execution-pack',
      label: isEnglish.value ? 'Execution Pack' : '执行包',
      value: `${childRowCount('stockMove')}`,
      description: isEnglish.value ? 'Move rows should stay visible from the same transfer shell together with partner and company scope.' : '库存移动行应与伙伴、公司范围一起保留在同一调拨壳层中。',
      tone: childRowCount('stockMove') && row.companyId ? 'success' : 'warning',
      link: buildChildRowsContextLink(moduleTitle('stockMove'), 'stockMove', 'pickingId', row.id, resolveRowTitle(row)),
    })
    cards.push({
      key: 'picking-rollback-pack',
      label: isEnglish.value ? 'Rollback Coverage' : '回退覆盖',
      value: `${buildFirstWaveRollbackLinks(row).length}`,
      description: isEnglish.value
        ? 'Transfer rollback should preserve partner, company, origin, and move-row references together.'
        : '调拨回退应同时保留伙伴、公司、来源和移动行引用。',
      tone: buildFirstWaveRollbackLinks(row).length >= 3 ? 'success' : 'warning',
    })
  } else if (props.moduleKey === 'accountPayment') {
    const journalLink = row.journalEntryRef
      ? buildReferenceLink(resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' }), row.journalEntryRef, 'accountMove')
      : undefined
    cards.push({
      key: 'payment-journal',
      label: isEnglish.value ? 'Journal Trace' : '凭证追溯',
      value: row.journalEntryRef || (isEnglish.value ? 'Awaiting posting result' : '待过账结果'),
      description: isEnglish.value ? 'Posting should reopen the generated journal entry from the same payment cockpit.' : '过账后应能直接从同一付款驾驶舱重开生成凭证。',
      tone: row.journalEntryRef ? 'success' : String(row.state) === 'posted' ? 'warning' : 'default',
      link: journalLink,
    })
    cards.push({
      key: 'payment-party-scope',
      label: isEnglish.value ? 'Party / Company Scope' : '伙伴 / 公司范围',
      value: [row.partnerId ? formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }) : '', row.companyId ? formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' }) : '']
        .filter(Boolean)
        .join(' / ') || '-',
      description: isEnglish.value ? 'Payment handling, posting, and rollback should remain grounded in the same partner and company scope.' : '付款处理、过账和回退都应持续落在同一伙伴和公司范围内。',
      tone: row.partnerId && row.companyId ? 'success' : 'warning',
      link: row.partnerId
        ? buildFocusIdLink(resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }), 'resPartner', row.partnerId, String(row.partnerId))
        : row.companyId
          ? buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId))
          : undefined,
    })
    const paymentOriginModule = inferModuleByReference(row.originRef)
    cards.push({
      key: 'payment-upstream',
      label: isEnglish.value ? 'Upstream Trace' : '上游追溯',
      value: row.originRef || row.invoiceRef || (isEnglish.value ? 'No origin' : '暂无来源'),
      description: isEnglish.value
        ? 'Payment posting and rollback should stay anchored to the source invoice or business document.'
        : '付款过账和回退都应锚定到来源发票或业务单据。',
      tone: row.originRef || row.invoiceRef ? 'success' : 'warning',
      link: row.originRef && paymentOriginModule
        ? buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, paymentOriginModule)
        : row.invoiceRef
          ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice')
          : undefined,
    })
  }

  return cards
}

function buildChecklistItem(
  key: string,
  title: string,
  description: string,
  status: ReviewChecklistItem['status'],
  section?: string,
): ReviewChecklistItem {
  return { key, title, description, status, section }
}

function buildPilotReviewChecklist(row: Record<string, any> | null) {
  if (!row) return []
  const hasDocuments = documentRows.value.length > 0
  const hasTimeline = recordTimelineItems.value.length > 0
  const hasRisks = recordReminderItems.value.length > 0 || workflowAlerts.value.length > 0 || workflowBlockedStageCount.value > 0
  const childLineCount = Object.values(childTableRows).reduce((sum, rows) => sum + rows.length, 0)
  const items: ReviewChecklistItem[] = []

  if (props.moduleKey === 'saleOrder') {
    items.push(
      buildChecklistItem(
        'sale-header',
        isEnglish.value ? 'Sales Header Ready' : '销售头信息就绪',
        row.partnerId
          ? (isEnglish.value ? 'Customer linkage is filled.' : '客户关联已经补齐。')
          : (isEnglish.value ? 'Customer is still missing.' : '客户信息仍然缺失。'),
        row.partnerId ? 'ready' : 'missing',
      ),
      buildChecklistItem(
        'sale-artifacts',
        isEnglish.value ? 'Delivery / Invoice Artifacts' : '出库 / 开票结果对象',
        row.pickingRef || row.invoiceRef
          ? (isEnglish.value ? 'Downstream artifacts are already reachable.' : '下游结果对象已经可以直接追溯。')
          : (isEnglish.value ? 'Delivery or invoice artifacts are not ready yet.' : '出库或发票结果对象还没有就绪。'),
        row.pickingRef || row.invoiceRef ? 'ready' : String(row.state) === 'sale' ? 'warning' : 'missing',
        'traceability',
      ),
      buildChecklistItem(
        'sale-lines',
        isEnglish.value ? 'Order Lines Ready' : '订单行就绪',
        childRowCount('saleOrderLine')
          ? (isEnglish.value ? `${childRowCount('saleOrderLine')} sales lines are available for review.` : `当前已有 ${childRowCount('saleOrderLine')} 条销售订单行可供核对。`)
          : (isEnglish.value ? 'No sales order lines are available yet.' : '当前还没有可用的销售订单行。'),
        childRowCount('saleOrderLine') ? 'ready' : 'warning',
        'traceability',
      ),
      buildChecklistItem(
        'sale-company',
        isEnglish.value ? 'Company Scope Ready' : '公司范围就绪',
        row.companyId
          ? (isEnglish.value ? 'Company scope is visible for sales cutover review.' : '销售切换所需的公司范围已经可见。')
          : (isEnglish.value ? 'Company scope is still missing.' : '销售切换所需的公司范围仍然缺失。'),
        row.companyId ? 'ready' : 'warning',
        'traceability',
      ),
      buildChecklistItem(
        'sale-settlement',
        isEnglish.value ? 'Settlement Closure' : '结算闭环',
        String(row.paymentRef || row.invoicePaymentRef || '').trim()
          ? (isEnglish.value ? 'The final payment artifact is already visible from the sales chain.' : '销售链已经可以直接看到最终付款结果对象。')
          : row.invoiceRef
            ? (isEnglish.value ? 'Invoice exists, but payment closure still needs follow-up.' : '发票已经存在，但付款闭环仍需继续跟进。')
            : (isEnglish.value ? 'Invoice and payment artifacts still need to be closed on the sales chain.' : '销售链上的发票和付款结果对象仍需继续闭合。'),
        String(row.paymentRef || row.invoicePaymentRef || '').trim() ? 'ready' : 'warning',
        'workflow',
      ),
    )
  } else if (props.moduleKey === 'purchaseOrder') {
    items.push(
      buildChecklistItem(
        'purchase-header',
        isEnglish.value ? 'Vendor Header Ready' : '采购头信息就绪',
        row.partnerId
          ? (isEnglish.value ? 'Vendor linkage is filled.' : '供应商关联已经补齐。')
          : (isEnglish.value ? 'Vendor is still missing.' : '供应商信息仍然缺失。'),
        row.partnerId ? 'ready' : 'missing',
      ),
      buildChecklistItem(
        'purchase-artifacts',
        isEnglish.value ? 'Receipt / Bill Artifacts' : '收货 / 账单结果对象',
        row.receiptRef || row.billRef
          ? (isEnglish.value ? 'Receipt or bill records are already linked.' : '收货或账单记录已经完成链接。')
          : (isEnglish.value ? 'Receipt or bill records are still missing.' : '收货或账单记录仍未生成。'),
        row.receiptRef || row.billRef ? 'ready' : String(row.state) === 'purchase' ? 'warning' : 'missing',
        'traceability',
      ),
      buildChecklistItem(
        'purchase-lines',
        isEnglish.value ? 'Order Lines Ready' : '订单行就绪',
        childRowCount('purchaseOrderLine')
          ? (isEnglish.value ? `${childRowCount('purchaseOrderLine')} purchase lines are available for review.` : `当前已有 ${childRowCount('purchaseOrderLine')} 条采购订单行可供核对。`)
          : (isEnglish.value ? 'No purchase order lines are available yet.' : '当前还没有可用的采购订单行。'),
        childRowCount('purchaseOrderLine') ? 'ready' : 'warning',
        'traceability',
      ),
      buildChecklistItem(
        'purchase-company',
        isEnglish.value ? 'Company Scope Ready' : '公司范围就绪',
        row.companyId
          ? (isEnglish.value ? 'Company scope is visible for procurement cutover review.' : '采购切换所需的公司范围已经可见。')
          : (isEnglish.value ? 'Company scope is still missing.' : '采购切换所需的公司范围仍然缺失。'),
        row.companyId ? 'ready' : 'warning',
        'traceability',
      ),
      buildChecklistItem(
        'purchase-settlement',
        isEnglish.value ? 'Settlement Closure' : '结算闭环',
        String(row.paymentRef || row.billPaymentRef || '').trim()
          ? (isEnglish.value ? 'The final payment artifact is already visible from the procurement chain.' : '采购链已经可以直接看到最终付款结果对象。')
          : row.billRef
            ? (isEnglish.value ? 'Bill exists, but payment closure still needs follow-up.' : '账单已经存在，但付款闭环仍需继续跟进。')
            : (isEnglish.value ? 'Bill and payment artifacts still need to be closed on the procurement chain.' : '采购链上的账单和付款结果对象仍需继续闭合。'),
        String(row.paymentRef || row.billPaymentRef || '').trim() ? 'ready' : 'warning',
        'workflow',
      ),
    )
  } else if (props.moduleKey === 'accountInvoice') {
    items.push(
      buildChecklistItem(
        'invoice-state',
        isEnglish.value ? 'Posting Status' : '过账状态',
        String(row.state) === 'posted'
          ? (isEnglish.value ? 'Invoice is already posted.' : '发票已经完成过账。')
          : (isEnglish.value ? 'Invoice is still not posted.' : '发票尚未完成过账。'),
        String(row.state) === 'posted' ? 'ready' : 'warning',
        'workflow',
      ),
      buildChecklistItem(
        'invoice-payment',
        isEnglish.value ? 'Payment Traceability' : '付款追溯',
        row.paymentRef
          ? (isEnglish.value ? 'Payment artifact is already linked.' : '付款结果对象已经完成关联。')
          : (isEnglish.value ? 'Payment artifact is still missing.' : '付款结果对象仍未生成。'),
        row.paymentRef ? 'ready' : String(row.state) === 'posted' ? 'warning' : 'missing',
        'workflow',
      ),
      buildChecklistItem(
        'invoice-origin-trace',
        isEnglish.value ? 'Origin Trace Ready' : '来源追溯就绪',
        row.originRef
          ? (isEnglish.value ? 'Upstream origin reference is already retained.' : '上游来源引用已经保留。')
          : (isEnglish.value ? 'Upstream origin reference is still missing.' : '上游来源引用仍然缺失。'),
        row.originRef ? 'ready' : 'warning',
        'traceability',
      ),
      buildChecklistItem(
        'invoice-party-scope',
        isEnglish.value ? 'Partner / Company Scope' : '伙伴 / 公司范围',
        row.partnerId && row.companyId
          ? (isEnglish.value ? 'Partner and company scope are both visible.' : '伙伴与公司范围都已经可见。')
          : (isEnglish.value ? 'Partner or company scope is still incomplete.' : '伙伴或公司范围仍不完整。'),
        row.partnerId && row.companyId ? 'ready' : 'warning',
        'traceability',
      ),
    )
  } else if (props.moduleKey === 'accountPayment') {
    items.push(
      buildChecklistItem(
        'payment-posting',
        isEnglish.value ? 'Posting Status' : '过账状态',
        String(row.state) === 'posted'
          ? (isEnglish.value ? 'Payment is already posted.' : '付款已经完成过账。')
          : (isEnglish.value ? 'Payment is still not posted.' : '付款尚未完成过账。'),
        String(row.state) === 'posted' ? 'ready' : 'warning',
        'workflow',
      ),
      buildChecklistItem(
        'payment-links',
        isEnglish.value ? 'Invoice / Journal Traceability' : '发票 / 凭证追溯',
        row.invoiceRef || row.journalEntryRef
          ? (isEnglish.value ? 'Invoice or journal linkage is already reachable.' : '发票或凭证链接已经可直接打开。')
          : (isEnglish.value ? 'Invoice and journal linkage are still missing.' : '发票和凭证链接仍然缺失。'),
        row.invoiceRef || row.journalEntryRef ? 'ready' : String(row.state) === 'posted' ? 'warning' : 'missing',
        'workflow',
      ),
      buildChecklistItem(
        'payment-journal-closure',
        isEnglish.value ? 'Journal Closure' : '凭证闭环',
        row.journalEntryRef
          ? (isEnglish.value ? 'The payment already exposes its journal evidence.' : '付款已经直接暴露出会计凭证证据。')
          : (isEnglish.value ? 'The payment still needs a visible journal entry as final accounting evidence.' : '付款仍然需要一个可见的会计凭证作为最终证据。'),
        row.journalEntryRef ? 'ready' : 'warning',
        'workflow',
      ),
      buildChecklistItem(
        'payment-origin',
        isEnglish.value ? 'Origin Reference' : '来源引用',
        row.originRef
          ? (isEnglish.value ? 'Origin reference is already attached.' : '来源引用已经补齐。')
          : (isEnglish.value ? 'Origin reference is still missing.' : '来源引用仍然缺失。'),
        row.originRef ? 'ready' : 'warning',
        'traceability',
      ),
      buildChecklistItem(
        'payment-party-scope',
        isEnglish.value ? 'Partner / Company Scope' : '伙伴 / 公司范围',
        row.partnerId && row.companyId
          ? (isEnglish.value ? 'Partner and company scope are both visible.' : '伙伴与公司范围都已经可见。')
          : (isEnglish.value ? 'Partner or company scope is still incomplete.' : '伙伴或公司范围仍不完整。'),
        row.partnerId && row.companyId ? 'ready' : 'warning',
        'traceability',
      ),
    )
  } else if (props.moduleKey === 'stockPicking') {
    const moveCount = (childTableRows.stockMove || []).length
    items.push(
      buildChecklistItem(
        'picking-origin',
        isEnglish.value ? 'Origin Trace Ready' : '来源追溯就绪',
        row.origin
          ? (isEnglish.value ? 'Origin reference is already filled.' : '来源引用已经补齐。')
          : (isEnglish.value ? 'Origin reference is still missing.' : '来源引用仍然缺失。'),
        row.origin ? 'ready' : 'warning',
        'traceability',
      ),
      buildChecklistItem(
        'picking-moves',
        isEnglish.value ? 'Operation Rows Ready' : '操作行就绪',
        moveCount
          ? (isEnglish.value ? `${moveCount} related move rows are available.` : `当前已有 ${moveCount} 条相关操作行。`)
          : (isEnglish.value ? 'No related move rows found yet.' : '当前还没有相关操作行。'),
        moveCount ? 'ready' : 'warning',
        'traceability',
      ),
      buildChecklistItem(
        'picking-party-scope',
        isEnglish.value ? 'Partner / Company Scope' : '伙伴 / 公司范围',
        row.partnerId && row.companyId
          ? (isEnglish.value ? 'Partner and company scope are both visible.' : '伙伴与公司范围都已经可见。')
          : (isEnglish.value ? 'Partner or company scope is still incomplete.' : '伙伴或公司范围仍不完整。'),
        row.partnerId && row.companyId ? 'ready' : 'warning',
        'traceability',
      ),
    )
  } else if (props.moduleKey === 'resPartner') {
    items.push(
      buildChecklistItem(
        'partner-profile',
        isEnglish.value ? 'Profile Baseline' : '档案基础信息',
        row.name && (row.email || row.phone)
          ? (isEnglish.value ? 'Name and at least one contact field are ready.' : '名称和至少一个联系方式已经补齐。')
          : (isEnglish.value ? 'Profile still lacks basic identity or contact data.' : '档案仍缺少基础身份或联系方式。'),
        row.name && (row.email || row.phone) ? 'ready' : 'warning',
      ),
      buildChecklistItem(
        'partner-activity',
        isEnglish.value ? 'Relationship Activity' : '关系活动记录',
        hasTimeline
          ? (isEnglish.value ? 'Timeline already contains interaction signals.' : '时间轴里已经有互动信号。')
          : (isEnglish.value ? 'No timeline history has been captured yet.' : '当前还没有沉淀到时间轴中的活动记录。'),
        hasTimeline ? 'ready' : 'warning',
        'timeline',
      ),
    )
  }

  items.push(
    buildChecklistItem(
      'evidence',
      isEnglish.value ? 'Evidence Pack' : '证据包',
      hasDocuments || hasTimeline
        ? (isEnglish.value ? 'Documents or timeline evidence is already present.' : '当前已经具备文档或时间轴证据。')
        : (isEnglish.value ? 'No document or timeline evidence has been attached yet.' : '当前还没有挂载文档或时间轴证据。'),
      hasDocuments || hasTimeline ? 'ready' : 'warning',
      hasDocuments ? 'documents' : 'timeline',
    ),
    buildChecklistItem(
      'risk',
      isEnglish.value ? 'Open Risk Review' : '风险核对',
      hasRisks
        ? (isEnglish.value ? 'Open reminders, workflow warnings, or blocked stage gates still need handling.' : '当前仍有提醒、流程告警或阶段阻塞需要处理。')
        : (isEnglish.value ? 'No direct reminders, workflow warnings, or blocked stage gates are open.' : '当前没有直接提醒、流程告警或阶段阻塞。'),
      hasRisks ? 'warning' : 'ready',
      hasRisks && (workflowAlerts.value.length || workflowBlockedStageCount.value) ? 'workflow' : 'reminders',
    ),
    buildChecklistItem(
      'handoff',
      isEnglish.value ? 'Handoff Readiness' : '交接就绪度',
      rollbackLinks.value.length || childLineCount
        ? (isEnglish.value ? 'Related records are already reachable for handoff review.' : '交接所需的关联记录已经可以直接追溯。')
        : (isEnglish.value ? 'Related records are still too thin for safe handoff.' : '当前关联记录过少，尚不适合安全交接。'),
      rollbackLinks.value.length || childLineCount ? 'ready' : 'warning',
      'traceability',
    ),
  )

  return items
}

function buildExceptionActionCards(row: Record<string, any> | null) {
  if (!row) return []
  const cards: ExceptionActionCard[] = []
  const criticalReminder = recordReminderItems.value.find((item) => item.severity === 'critical')
  const warningReminder = recordReminderItems.value.find((item) => item.severity === 'warning')
  const firstChecklistGap = pilotReviewChecklist.value.find((item) => item.status !== 'ready')
  const blockedStage = workflowStageNodes.value.find((item) => item.status === 'blocked')

  if (criticalReminder || workflowAlerts.value.length || blockedStage) {
    cards.push({
      key: 'risk-review',
      title: isEnglish.value ? 'Resolve Open Risks' : '处理当前风险',
      description: criticalReminder
        ? criticalReminder.content
        : workflowAlerts.value[0] || blockedStage?.description || '',
      buttonLabel: isEnglish.value ? 'Open Risk Area' : '打开风险区',
      tone: 'danger',
      actionType: 'section',
      section: workflowAlerts.value.length || blockedStage ? 'workflow' : 'reminders',
    })
  }

  if (!documentRows.value.length) {
    cards.push({
      key: 'attach-evidence',
      title: isEnglish.value ? 'Attach Evidence' : '补充证据文件',
      description: isEnglish.value
        ? 'This record still lacks document evidence for pilot review or rollback.'
        : '当前记录还没有用于试点核对或回退的证据文件。',
      buttonLabel: isEnglish.value ? 'Import File' : '导入文件',
      tone: 'warning',
      actionType: 'upload',
    })
  }

  if (primarySuggestionAction.value?.actionKey) {
    cards.push({
      key: 'next-action',
      title: isEnglish.value ? 'Execute Next Business Step' : '执行下一步业务动作',
      description: isEnglish.value
        ? 'The current record exposes a direct business action that keeps the first-wave chain moving.'
        : '当前记录存在一个可以直接推进首批链路的业务动作。',
      buttonLabel: primarySuggestionAction.value.label,
      tone: 'success',
      actionType: 'action',
      actionKey: primarySuggestionAction.value.actionKey,
    })
  } else if (primarySuggestionLink.value?.link) {
    cards.push({
      key: 'next-link',
      title: isEnglish.value ? 'Open Downstream Object' : '打开下游对象',
      description: isEnglish.value
        ? 'A downstream object is already reachable from this record.'
        : '当前记录已经可以直接打开下游结果对象。',
      buttonLabel: primarySuggestionLink.value.label,
      tone: 'success',
      actionType: 'link',
      link: primarySuggestionLink.value.link,
    })
  }

  if (firstChecklistGap?.section) {
    cards.push({
      key: 'checklist-gap',
      title: isEnglish.value ? 'Review Checklist Gap' : '核对清单缺口',
      description: firstChecklistGap.description,
      buttonLabel: isEnglish.value ? 'Open Area' : '打开区域',
      tone: firstChecklistGap.status === 'missing' ? 'danger' : 'warning',
      actionType: 'section',
      section: firstChecklistGap.section,
    })
  }

  cards.push(
    {
      key: 'copy-context',
      title: isEnglish.value ? 'Copy Context Brief' : '复制上下文摘要',
      description: isEnglish.value
        ? 'Copy Monica-style relationship and cutover context for direct chat handoff.'
        : '复制 Monica 风格的关系上下文和切换摘要，直接用于聊天交接。',
      buttonLabel: isEnglish.value ? 'Copy Brief' : '复制摘要',
      tone: 'default',
      actionType: 'copyContext',
    },
    {
      key: 'export-context',
      title: isEnglish.value ? 'Export Context Brief' : '导出上下文摘要',
      description: isEnglish.value
        ? 'Export the current record context, relationship memory, and chain ownership as markdown.'
        : '导出当前记录的上下文、关系记忆和链路责任摘要。',
      buttonLabel: isEnglish.value ? 'Export Brief' : '导出摘要',
      tone: 'default',
      actionType: 'exportContext',
    },
    {
      key: 'copy-handoff',
      title: isEnglish.value ? 'Copy Handoff Summary' : '复制交接摘要',
      description: isEnglish.value
        ? 'Copy the current review summary and send it directly to the pilot reviewer.'
        : '复制当前记录的核对摘要，直接发给试点审核人。',
      buttonLabel: isEnglish.value ? 'Copy Summary' : '复制摘要',
      tone: 'default',
      actionType: 'copyHandoff',
    },
    {
      key: 'export-exceptions',
      title: isEnglish.value ? 'Export Exception List' : '导出异常清单',
      description: warningReminder
        ? warningReminder.content
        : isEnglish.value
          ? 'Export the current record exceptions for rollback and reconciliation.'
          : '导出当前记录的异常清单，便于回退和核对。',
      buttonLabel: isEnglish.value ? 'Export CSV' : '导出CSV',
      tone: recordReminderItems.value.length ? 'warning' : 'default',
      actionType: 'exportExceptions',
    },
    {
      key: 'export-exception-packet',
      title: isEnglish.value ? 'Export Exception Packet' : '导出异常包',
      description: isEnglish.value
        ? 'Generate a markdown packet with blockers, evidence gaps, reminders, and rollback links.'
        : '导出包含阻塞项、证据缺口、提醒和回退链接的 Markdown 异常包。',
      buttonLabel: isEnglish.value ? 'Export Packet' : '导出包',
      tone: recordReminderItems.value.length || contextAlertItems.value.length ? 'warning' : 'default',
      actionType: 'exportExceptionPacket',
    },
    {
      key: 'export-handoff',
      title: isEnglish.value ? 'Export Handoff Note' : '导出交接摘要',
      description: isEnglish.value
        ? 'Generate a markdown handoff note with checklist, risks, evidence, and traceability.'
        : '导出包含清单、风险、证据和追溯信息的 Markdown 交接摘要。',
      buttonLabel: isEnglish.value ? 'Export Markdown' : '导出 Markdown',
      tone: 'default',
      actionType: 'exportHandoff',
    },
  )

  return cards.slice(0, 8)
}

function buildChainActionCards(row: Record<string, any> | null) {
  if (!row) return []
  const cards: ExceptionActionCard[] = []
  const settlementSummary = buildFirstWaveSettlementSummary(row)

  const addLinkCard = (
    key: string,
    title: string,
    description: string,
    buttonLabel: string,
    tone: ExceptionActionCard['tone'],
    link?: ResolvedLink,
  ) => {
    if (!link) return
    cards.push({
      key,
      title,
      description,
      buttonLabel,
      tone,
      actionType: 'link',
      link,
    })
  }

  const addActionCard = (
    key: string,
    title: string,
    description: string,
    buttonLabel: string,
    tone: ExceptionActionCard['tone'],
    actionKey?: string,
  ) => {
    if (!actionKey) return
    cards.push({
      key,
      title,
      description,
      buttonLabel,
      tone,
      actionType: 'action',
      actionKey,
    })
  }

  // First-wave records should expose the whole next business hop directly on
  // the detail page so operators can keep following the chain without detours.
  if (props.moduleKey === 'resPartner' && row.id) {
    addLinkCard(
      'partner-sales',
      isEnglish.value ? 'Open Sales Chain' : '打开销售链',
      isEnglish.value
        ? 'Continue into sales orders filtered by the current partner.'
        : '直接进入按当前伙伴过滤后的销售订单列表。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      'success',
      buildRouteLink(moduleTitle('saleOrder'), 'saleOrder', {
        partnerId: String(row.id),
        relatedTo: props.moduleKey,
      }, row.name || String(row.id)),
    )
    addLinkCard(
      'partner-purchase',
      isEnglish.value ? 'Open Purchase Chain' : '打开采购链',
      isEnglish.value
        ? 'Continue into purchase orders filtered by the current partner.'
        : '直接进入按当前伙伴过滤后的采购订单列表。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      'success',
      buildRouteLink(moduleTitle('purchaseOrder'), 'purchaseOrder', {
        partnerId: String(row.id),
        relatedTo: props.moduleKey,
      }, row.name || String(row.id)),
    )
  }

  if (props.moduleKey === 'resCompany' && row.id) {
    const companyTitle = resolveRowTitle(row)
    addLinkCard(
      'company-templates',
      isEnglish.value ? 'Open Product Catalog Scope' : '打开产品目录范围',
      isEnglish.value
        ? 'Review product templates under the current company before sales or procurement drift grows.'
        : '在销售或采购漂移扩大前，先核对当前公司的产品模板。',
      isEnglish.value ? 'Open Templates' : '打开模板',
      'success',
      buildContextListLink(moduleTitle('productTemplate'), 'productTemplate', 'companyId', row.id, companyTitle),
    )
    addLinkCard(
      'company-pricelists',
      isEnglish.value ? 'Open Pricing Scope' : '打开价格范围',
      isEnglish.value
        ? 'Keep company pricelists on the same desk as company cutover review.'
        : '让公司价目表和公司切换审查留在同一工作台。',
      isEnglish.value ? 'Open Pricelists' : '打开价目表',
      'success',
      buildContextListLink(moduleTitle('productPricelist'), 'productPricelist', 'companyId', row.id, companyTitle),
    )
    addLinkCard(
      'company-sales',
      isEnglish.value ? 'Open Sales Pilot Scope' : '打开销售试点范围',
      isEnglish.value
        ? 'Continue straight into first-wave sales orders filtered by the current company.'
        : '直接继续进入按当前公司过滤后的首批销售订单。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      'success',
      buildContextListLink(moduleTitle('saleOrder'), 'saleOrder', 'companyId', row.id, companyTitle),
    )
    addLinkCard(
      'company-purchase',
      isEnglish.value ? 'Open Purchase Pilot Scope' : '打开采购试点范围',
      isEnglish.value
        ? 'Continue straight into first-wave purchase orders filtered by the current company.'
        : '直接继续进入按当前公司过滤后的首批采购订单。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      'success',
      buildContextListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', 'companyId', row.id, companyTitle),
    )
  }

  if (props.moduleKey === 'productTemplate' && row.id) {
    const templateTitle = resolveRowTitle(row)
    const templateToken = pickFirstFilledText(row, ['defaultCode', 'barcode', 'name']) || templateTitle
    addLinkCard(
      'template-variants',
      isEnglish.value ? 'Open Variant Pack' : '打开变体包',
      isEnglish.value
        ? 'Keep the variant set visible before order lines or pricing rules drift away from the template.'
        : '在订单行或价格规则偏离前，先保持变体集合可见。',
      isEnglish.value ? 'Open Variants' : '打开变体',
      'success',
      buildContextListLink(moduleTitle('productProduct'), 'productProduct', 'productTmplId', row.id, templateTitle),
    )
    addLinkCard(
      'template-sales',
      isEnglish.value ? 'Open Sales Review Entry' : '打开销售审查入口',
      isEnglish.value
        ? 'Reuse the template code or name to reopen first-wave sales orders from one desk.'
        : '直接复用模板编码或名称，从同一工作台重开首批销售订单。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      'success',
      buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', templateToken, templateToken),
    )
    addLinkCard(
      'template-purchase',
      isEnglish.value ? 'Open Purchase Review Entry' : '打开采购审查入口',
      isEnglish.value
        ? 'Reuse the template code or name to reopen first-wave purchase orders.'
        : '直接复用模板编码或名称，重开首批采购订单。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      'success',
      buildKeywordListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', templateToken, templateToken),
    )
    if (row.categId) {
      addLinkCard(
        'template-category',
        isEnglish.value ? 'Review Category Governance' : '核对品类治理',
        isEnglish.value
          ? 'Return to the category before downstream order pilots reuse this template.'
          : '在下游订单试点继续复用前，先回到品类核对治理。',
        isEnglish.value ? 'Open Category' : '打开品类',
        'default',
        buildFocusIdLink(resolveFieldLabel({ key: 'categId', label: 'categId' }), 'productCategory', row.categId, String(row.categId)),
      )
    }
  }

  if (props.moduleKey === 'productProduct' && row.id) {
    const variantTitle = resolveRowTitle(row)
    const variantToken = pickFirstFilledText(row, ['defaultCode', 'barcode', 'name']) || variantTitle
    addLinkCard(
      'variant-sale-lines',
      isEnglish.value ? 'Open Exact Sales Lines' : '打开精确销售行',
      isEnglish.value
        ? 'Review exact sales order lines that currently use this variant.'
        : '直接核对当前正在使用该变体的销售订单行。',
      isEnglish.value ? 'Open Sales Lines' : '打开销售行',
      'success',
      buildContextListLink(moduleTitle('saleOrderLine'), 'saleOrderLine', 'productId', row.id, variantToken),
    )
    addLinkCard(
      'variant-purchase-lines',
      isEnglish.value ? 'Open Exact Purchase Lines' : '打开精确采购行',
      isEnglish.value
        ? 'Review exact purchase order lines that currently use this variant.'
        : '直接核对当前正在使用该变体的采购订单行。',
      isEnglish.value ? 'Open Purchase Lines' : '打开采购行',
      'success',
      buildContextListLink(moduleTitle('purchaseOrderLine'), 'purchaseOrderLine', 'productId', row.id, variantToken),
    )
    addLinkCard(
      'variant-sales-review',
      isEnglish.value ? 'Open Sales Review Entry' : '打开销售审查入口',
      isEnglish.value
        ? 'Use barcode or default code to reopen matching sales orders without leaving the current record.'
        : '直接用条码或默认编码重开匹配的销售订单，不离开当前记录。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      'default',
      buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', variantToken, variantToken),
    )
    addLinkCard(
      'variant-purchase-review',
      isEnglish.value ? 'Open Purchase Review Entry' : '打开采购审查入口',
      isEnglish.value
        ? 'Use barcode or default code to reopen matching purchase orders from one desk.'
        : '直接用条码或默认编码从同一工作台重开采购订单。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      'default',
      buildKeywordListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', variantToken, variantToken),
    )
  }

  if (props.moduleKey === 'productCategory' && row.id) {
    const categoryTitle = resolveRowTitle(row)
    const categoryToken = pickFirstFilledText(row, ['completeName', 'name']) || categoryTitle
    addLinkCard(
      'category-templates',
      isEnglish.value ? 'Open Template Catalog' : '打开模板目录',
      isEnglish.value
        ? 'Open all product templates under the current category from the same governance desk.'
        : '直接从同一治理工作台打开当前分类下的全部产品模板。',
      isEnglish.value ? 'Open Templates' : '打开模板',
      'success',
      buildContextListLink(moduleTitle('productTemplate'), 'productTemplate', 'categId', row.id, categoryTitle),
    )
    addLinkCard(
      'category-children',
      isEnglish.value ? 'Open Child Categories' : '打开下级分类',
      isEnglish.value
        ? 'Continue hierarchy cleanup or pilot classification review on the next layer.'
        : '继续推进下一层级的分类清理和试点分类审查。',
      isEnglish.value ? 'Open Children' : '打开下级',
      'success',
      buildContextListLink(moduleTitle('productCategory'), 'productCategory', 'parentId', row.id, categoryTitle),
    )
    addLinkCard(
      'category-sales',
      isEnglish.value ? 'Open Sales Review Entry' : '打开销售审查入口',
      isEnglish.value
        ? 'Reuse category naming to reopen sales orders tied to this product family.'
        : '直接复用分类名称，重开与该产品族相关的销售订单。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      'default',
      buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', categoryToken, categoryToken),
    )
    addLinkCard(
      'category-purchase',
      isEnglish.value ? 'Open Purchase Review Entry' : '打开采购审查入口',
      isEnglish.value
        ? 'Reuse category naming to reopen purchase orders tied to this product family.'
        : '直接复用分类名称，重开与该产品族相关的采购订单。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      'default',
      buildKeywordListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', categoryToken, categoryToken),
    )
  }

  if (props.moduleKey === 'productPricelist') {
    const pricelistTitle = resolveRowTitle(row)
    const companyTitle = row.companyId
      ? formatFieldValue(row, { key: 'companyId', type: 'number', relation: 'resCompany' })
      : pricelistTitle
    addLinkCard(
      'pricelist-sales',
      isEnglish.value ? 'Open Sales Pricing Scope' : '打开销售价格范围',
      isEnglish.value
        ? 'Keep sales review inside the same pricing scope rather than returning to global module search.'
        : '保持在同一价格范围内核对销售链，而不是回到全局模块搜索。',
      isEnglish.value ? 'Open Sales Orders' : '打开销售订单',
      'success',
      row.companyId
        ? buildContextListLink(moduleTitle('saleOrder'), 'saleOrder', 'companyId', row.companyId, companyTitle)
        : buildKeywordListLink(moduleTitle('saleOrder'), 'saleOrder', pricelistTitle, pricelistTitle),
    )
    addLinkCard(
      'pricelist-templates',
      isEnglish.value ? 'Open Catalog Scope' : '打开目录范围',
      isEnglish.value
        ? 'Review company product templates before pricing changes widen pilot impact.'
        : '在价格变更扩大试点影响前，先核对公司产品模板。',
      isEnglish.value ? 'Open Templates' : '打开模板',
      'success',
      row.companyId
        ? buildContextListLink(moduleTitle('productTemplate'), 'productTemplate', 'companyId', row.companyId, companyTitle)
        : undefined,
    )
    addLinkCard(
      'pricelist-purchase',
      isEnglish.value ? 'Open Procurement Scope' : '打开采购范围',
      isEnglish.value
        ? 'Keep procurement review inside the same company scope when pricing shifts affect vendor decisions.'
        : '当价格变化影响供应商决策时，保持在同一公司范围内核对采购链。',
      isEnglish.value ? 'Open Purchase Orders' : '打开采购订单',
      'default',
      row.companyId
        ? buildContextListLink(moduleTitle('purchaseOrder'), 'purchaseOrder', 'companyId', row.companyId, companyTitle)
        : undefined,
    )
    if (row.companyId) {
      addLinkCard(
        'pricelist-company',
        isEnglish.value ? 'Review Company Boundary' : '核对公司边界',
        isEnglish.value
          ? 'Return to the company boundary before pricing approvals or pilot rollout expands.'
          : '在价格审批或试点扩大前，先回到公司边界核对。',
        isEnglish.value ? 'Open Company' : '打开公司',
        'default',
        buildFocusIdLink(resolveFieldLabel({ key: 'companyId', label: 'companyId' }), 'resCompany', row.companyId, String(row.companyId)),
      )
    }
  }

  if (props.moduleKey === 'saleOrder') {
    if (row.partnerId) {
      addLinkCard(
        'sale-partner',
        isEnglish.value ? 'Review Partner Context' : '核对伙伴上下文',
        isEnglish.value
          ? 'Open the partner master before pushing delivery or invoice steps.'
          : '在推进出库或开票前，先打开伙伴主档核上下文。',
        isEnglish.value ? 'Open Partner' : '打开伙伴',
        'default',
        buildFocusIdLink(
          resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }),
          'resPartner',
          row.partnerId,
          formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }),
        ),
      )
    }
    if (row.pickingRef) {
      addLinkCard(
        'sale-picking',
        isEnglish.value ? 'Open Delivery Artifact' : '打开出库结果对象',
        isEnglish.value
          ? 'Jump straight into the generated transfer object from the sales chain.'
          : '直接从销售链跳进生成的调拨结果对象。',
        isEnglish.value ? 'Open Transfer' : '打开调拨',
        'success',
        buildReferenceLink(resolveFieldLabel({ key: 'pickingRef', label: 'pickingRef' }), row.pickingRef, 'stockPicking'),
      )
    } else {
      addActionCard(
        'sale-confirm',
        isEnglish.value ? 'Generate Delivery Artifact' : '生成出库结果对象',
        isEnglish.value
          ? 'Confirm the sales order so the delivery object and move traceability are created.'
          : '确认销售订单，生成出库对象和库存移动追溯。',
        isEnglish.value ? 'Confirm Order' : '确认订单',
        'warning',
        ['draft', 'sent'].includes(String(row.state)) ? 'action_confirm' : undefined,
      )
    }
    if (row.invoiceRef) {
      addLinkCard(
        'sale-invoice',
        isEnglish.value ? 'Open Billing Artifact' : '打开开票结果对象',
        isEnglish.value
          ? 'Continue into invoice posting and payment follow-up from the same chain.'
          : '从同一链路继续进入发票过账和付款跟进。',
        isEnglish.value ? 'Open Invoice' : '打开发票',
        'success',
        buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice'),
      )
      const salePaymentRef = String(row.paymentRef || row.invoicePaymentRef || '').trim()
      if (salePaymentRef) {
        addLinkCard(
          'sale-payment',
          isEnglish.value ? 'Open Payment Artifact' : '打开付款结果对象',
          isEnglish.value
            ? 'Continue straight into the final settlement artifact from the sales chain.'
            : '直接从销售链继续进入最终结算结果对象。',
          isEnglish.value ? 'Open Payment' : '打开付款',
          'success',
          buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), salePaymentRef, 'accountPayment'),
        )
      }
    } else {
      addActionCard(
        'sale-create-invoice',
        isEnglish.value ? 'Create Billing Artifact' : '生成开票结果对象',
        isEnglish.value
          ? 'Create the invoice directly from the sales order instead of switching to accounting search.'
          : '直接从销售订单创建发票，不再切去会计搜索。',
        isEnglish.value ? 'Create Invoice' : '创建发票',
        'warning',
        String(row.state) === 'sale' ? 'action_create_invoice' : undefined,
      )
    }
  }

  if (props.moduleKey === 'purchaseOrder') {
    if (row.partnerId) {
      addLinkCard(
        'purchase-vendor',
        isEnglish.value ? 'Review Vendor Context' : '核对供应商上下文',
        isEnglish.value
          ? 'Open the vendor master before pushing receipt or billing steps.'
          : '在推进收货或账单前，先打开供应商主档核上下文。',
        isEnglish.value ? 'Open Partner' : '打开伙伴',
        'default',
        buildFocusIdLink(
          resolveFieldLabel({ key: 'partnerId', label: 'partnerId' }),
          'resPartner',
          row.partnerId,
          formatFieldValue(row, { key: 'partnerId', type: 'number', relation: 'resPartner' }),
        ),
      )
    }
    if (row.receiptRef) {
      addLinkCard(
        'purchase-receipt',
        isEnglish.value ? 'Open Receipt Artifact' : '打开收货结果对象',
        isEnglish.value
          ? 'Jump into the generated receipt object before continuing to bill review.'
          : '先跳进生成的收货对象，再继续账单审查。',
        isEnglish.value ? 'Open Receipt' : '打开收货',
        'success',
        buildReferenceLink(resolveFieldLabel({ key: 'receiptRef', label: 'receiptRef' }), row.receiptRef, 'stockPicking'),
      )
    } else {
      addActionCard(
        'purchase-confirm',
        isEnglish.value ? 'Generate Receipt Artifact' : '生成收货结果对象',
        isEnglish.value
          ? 'Confirm the purchase order so receipt objects and stock traceability are created.'
          : '确认采购订单，生成收货对象和库存追溯。',
        isEnglish.value ? 'Confirm Order' : '确认订单',
        'warning',
        ['draft', 'sent'].includes(String(row.state)) ? 'action_confirm' : undefined,
      )
    }
    if (row.billRef) {
      addLinkCard(
        'purchase-bill',
        isEnglish.value ? 'Open Bill Artifact' : '打开账单结果对象',
        isEnglish.value
          ? 'Continue directly into bill review and downstream payment linkage.'
          : '直接继续进入账单审查和下游付款链接。',
        isEnglish.value ? 'Open Bill' : '打开账单',
        'success',
        buildReferenceLink(resolveFieldLabel({ key: 'billRef', label: 'billRef' }), row.billRef, 'accountInvoice'),
      )
      const purchasePaymentRef = String(row.paymentRef || row.billPaymentRef || '').trim()
      if (purchasePaymentRef) {
        addLinkCard(
          'purchase-payment',
          isEnglish.value ? 'Open Payment Artifact' : '打开付款结果对象',
          isEnglish.value
            ? 'Continue straight into the final settlement artifact from the procurement chain.'
            : '直接从采购链继续进入最终结算结果对象。',
          isEnglish.value ? 'Open Payment' : '打开付款',
          'success',
          buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), purchasePaymentRef, 'accountPayment'),
        )
      }
    } else {
      addActionCard(
        'purchase-create-bill',
        isEnglish.value ? 'Create Bill Artifact' : '生成账单结果对象',
        isEnglish.value
          ? 'Create the bill directly from the purchase order to keep procurement traceability intact.'
          : '直接从采购订单创建账单，保持采购追溯完整。',
        isEnglish.value ? 'Create Bill' : '创建账单',
        'warning',
        String(row.state) === 'purchase' ? 'action_create_bill' : undefined,
      )
    }
  }

  if (props.moduleKey === 'stockPicking' && row.id) {
    if (row.origin) {
      const originModule = inferModuleByReference(row.origin)
      addLinkCard(
        'picking-origin',
        isEnglish.value ? 'Open Upstream Order' : '打开上游单据',
        isEnglish.value
          ? 'Trace the current transfer back to the upstream business order.'
          : '把当前调拨追回上游业务单据。',
        isEnglish.value ? 'Open Origin' : '打开来源',
        'default',
        originModule ? buildReferenceLink(resolveFieldLabel({ key: 'origin', label: 'origin' }), row.origin, originModule) : undefined,
      )
    }
    addLinkCard(
      'picking-moves',
      isEnglish.value ? 'Open Operation Rows' : '打开操作行',
      isEnglish.value
        ? 'Review stock move rows from the same transfer context instead of scanning a detached list.'
        : '直接在同一调拨上下文里继续审查库存移动行。',
      isEnglish.value ? 'Open Moves' : '打开移动行',
      'success',
      buildRouteLink(moduleTitle('stockMove'), 'stockMove', {
        contextField: 'pickingId',
        contextValue: String(row.id),
        relatedTo: props.moduleKey,
      }, String(row.id)),
    )
    addActionCard(
      'picking-validate',
      isEnglish.value ? 'Finalize Transfer Execution' : '完成调拨执行',
      isEnglish.value
        ? 'Validate the transfer once routing and quantities are ready.'
        : '在路由和数量核对完成后执行调拨验证。',
      isEnglish.value ? 'Validate Transfer' : '验证调拨',
      'warning',
      String(row.state) === 'assigned' ? 'action_validate' : undefined,
    )
  }

  if (props.moduleKey === 'accountInvoice') {
    addActionCard(
      'invoice-post',
      isEnglish.value ? 'Post Billing Artifact' : '过账开票结果对象',
      isEnglish.value
        ? 'Post the invoice before payment registration or settlement review starts.'
        : '在进入付款登记或结算审查前，先完成发票过账。',
      isEnglish.value ? 'Post Invoice' : '过账发票',
      'warning',
      String(row.state) === 'draft' ? 'post' : undefined,
    )
    if (row.originRef) {
      const originModule = inferModuleByReference(row.originRef)
      addLinkCard(
        'invoice-origin',
        isEnglish.value ? 'Open Upstream Source' : '打开上游来源',
        isEnglish.value
          ? 'Return to the source order when invoice context needs business validation.'
          : '当发票上下文需要业务核对时，直接回到来源单据。',
        isEnglish.value ? 'Open Origin' : '打开来源',
        'default',
        originModule ? buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule) : undefined,
      )
    }
    if (row.paymentRef) {
      addLinkCard(
        'invoice-payment',
        isEnglish.value ? 'Open Payment Artifact' : '打开付款结果对象',
        isEnglish.value
          ? 'Continue into the linked payment object without rebuilding accounting context.'
          : '直接继续进入关联付款对象，不再重建会计上下文。',
        isEnglish.value ? 'Open Payment' : '打开付款',
        'success',
        buildReferenceLink(resolveFieldLabel({ key: 'paymentRef', label: 'paymentRef' }), row.paymentRef, 'accountPayment'),
      )
    } else {
      addActionCard(
        'invoice-register-payment',
        isEnglish.value ? 'Generate Payment Artifact' : '生成付款结果对象',
        isEnglish.value
          ? 'Register payment directly from the posted invoice to keep the chain closed.'
          : '直接从已过账发票登记付款，保持链路闭环。',
        isEnglish.value ? 'Register Payment' : '登记付款',
        'warning',
        String(row.state) === 'posted' ? 'register_payment' : undefined,
      )
    }
  }

  if (props.moduleKey === 'accountPayment') {
    if (row.originRef) {
      const originModule = inferModuleByReference(row.originRef)
      addLinkCard(
        'payment-origin',
        isEnglish.value ? 'Open Upstream Source' : '打开上游来源',
        isEnglish.value
          ? 'Return to the source document when payment direction or amount needs business validation.'
          : '当付款方向或金额需要业务核对时，直接回到来源单据。',
        isEnglish.value ? 'Open Origin' : '打开来源',
        'default',
        originModule ? buildReferenceLink(resolveFieldLabel({ key: 'originRef', label: 'originRef' }), row.originRef, originModule) : undefined,
      )
    }
    addLinkCard(
      'payment-invoice',
      isEnglish.value ? 'Open Invoice Context' : '打开发票上下文',
      isEnglish.value
        ? 'Reopen the linked invoice before or after posting the payment.'
        : '在付款过账前后都可以重开发票上下文。',
      isEnglish.value ? 'Open Invoice' : '打开发票',
      'success',
      row.invoiceRef ? buildReferenceLink(resolveFieldLabel({ key: 'invoiceRef', label: 'invoiceRef' }), row.invoiceRef, 'accountInvoice') : undefined,
    )
    if (row.journalEntryRef) {
      addLinkCard(
        'payment-entry',
        isEnglish.value ? 'Open Journal Entry' : '打开凭证',
        isEnglish.value
          ? 'Inspect the posted accounting artifact from the same payment surface.'
          : '直接从同一付款界面检查已生成的会计结果对象。',
        isEnglish.value ? 'Open Journal Entry' : '打开凭证',
        'success',
        buildReferenceLink(resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' }), row.journalEntryRef, 'accountMove'),
      )
    } else {
      addActionCard(
        'payment-post',
        isEnglish.value ? 'Post Payment Artifact' : '过账付款结果对象',
        isEnglish.value
          ? 'Post the payment once direction, amount, and partner are aligned with the source document.'
          : '在付款方向、金额和伙伴与源单据一致后执行过账。',
        isEnglish.value ? 'Post Payment' : '过账付款',
        'warning',
        String(row.state) === 'draft' ? 'action_post' : undefined,
      )
    }
    if (String(row.state) === 'posted' && row.journalEntryRef) {
      addLinkCard(
        'payment-settlement-entry',
        isEnglish.value ? 'Review Posted Journal' : '审查已过账凭证',
        isEnglish.value
          ? 'Use the generated journal entry as the final accounting evidence for payment settlement.'
          : '把生成凭证作为付款结算的最终会计证据继续审查。',
        isEnglish.value ? 'Open Journal Entry' : '打开凭证',
        'success',
        buildReferenceLink(resolveFieldLabel({ key: 'journalEntryRef', label: 'journalEntryRef' }), row.journalEntryRef, 'accountMove'),
      )
    }
  }

  if (settlementSummary.expectedCount) {
    const focusItem = settlementSummary.items.find((item) => item.status !== 'ready')
    if (focusItem?.link) {
      addLinkCard(
        'chain-settlement-focus',
        isEnglish.value ? 'Open Settlement Gap' : '打开结算缺口',
        focusItem.reason,
        isEnglish.value ? 'Open Gap' : '打开缺口',
        settlementSummary.missingCount ? 'warning' : 'default',
        focusItem.link,
      )
    } else if (settlementSummary.warningCount || settlementSummary.missingCount) {
      cards.push({
        key: 'chain-settlement-review',
        title: isEnglish.value ? 'Review Settlement Closure' : '核对结算闭环',
        description: describeSettlementSummary(settlementSummary),
        buttonLabel: isEnglish.value ? 'Open Workflow' : '打开流程区',
        tone: settlementSummary.missingCount ? 'warning' : 'default',
        actionType: 'section',
        section: 'workflow',
      })
    }
  }

  if (isFirstWaveRecord.value) {
    cards.push({
      key: 'chain-cutover-desk',
      title: isEnglish.value ? 'Open Cutover Desk' : '打开切换台',
      description: FIRST_WAVE_MASTER_DATA_MODULES.has(props.moduleKey)
        ? (isEnglish.value
            ? 'Review pilot entry, governance readiness, and the next review area before master data spreads into live chains.'
            : '在主数据继续扩散到真实链路前，先核对试点入口、治理就绪度和下一核对区域。')
        : (isEnglish.value
            ? 'Review pilot entry, gate readiness, and the next review area without leaving the current record.'
            : '不离开当前记录，直接核对试点入口、门槛就绪度和下一核对区域。'),
      buttonLabel: isEnglish.value ? 'Open Cutover Desk' : '打开切换台',
      tone: !cutoverStore.isModuleEnabled(props.moduleKey)
        ? 'danger'
        : contextChainCards.value.some((item) => item.pendingCount) || recordReminderItems.value.length
          ? 'warning'
          : 'success',
      actionType: 'section',
      section: 'cutover',
    })
    cards.push({
      key: 'chain-evidence-desk',
      title: isEnglish.value ? 'Review Evidence Desk' : '核对证据台',
      description: FIRST_WAVE_MASTER_DATA_MODULES.has(props.moduleKey)
        ? (isEnglish.value
            ? 'Keep specs, approvals, pricing policies, and import files on the same master-data record before rollout expands.'
            : '在继续扩大切换前，把规格书、审批件、价格政策和导入文件都保留在同一主数据记录上。')
        : (isEnglish.value
            ? 'Keep attachments, contracts, approvals, and import files on the same record before handoff or rollback.'
            : '在交接或回退前，把附件、合同、审批件和导入文件都保留在同一记录上。'),
      buttonLabel: isEnglish.value ? 'Open Documents' : '打开文档区',
      tone: documentEvidenceSummary.value.missingLabels.length
        ? 'warning'
        : documentRows.value.length
          ? 'success'
          : 'default',
      actionType: 'section',
      section: 'documents',
    })
  }

  if (activeRow.value?.id && shouldShowRollbackPacket.value) {
    cards.push({
      key: 'chain-rollback-packet',
      title: isEnglish.value ? 'Prepare Rollback Packet' : '准备回退包',
      description: isEnglish.value
        ? 'Export the current record, related links, and reminders before pilot rollback or handoff.'
        : '在试点回退或交接前，导出当前记录、关联链接和提醒。',
      buttonLabel: isEnglish.value ? 'Open Rollback Desk' : '打开回退台',
      tone: 'default',
      actionType: 'section',
      section: 'rollback',
    })
  }

  cards.push({
    key: 'chain-handoff',
    title: isEnglish.value ? 'Prepare Handoff Note' : '准备交接摘要',
    description: isEnglish.value
      ? 'Review the current chain state and export the handoff note from the review desk.'
      : '在核对当前链路状态后，从交接台导出交接摘要。',
    buttonLabel: isEnglish.value ? 'Open Review Desk' : '打开交接台',
    tone: 'default',
    actionType: 'section',
    section: 'review',
  })

  return cards.slice(0, 8)
}

function isGuardedFirstWaveAction(actionKey: string) {
  return Boolean(FIRST_WAVE_ACTION_GUARDRAILS[props.moduleKey]?.includes(actionKey))
}

function resolveGuardrailSectionLabel(section: string) {
  if (section === 'cutover') return isEnglish.value ? 'Cutover Desk' : '切换台'
  if (section === 'documents') return isEnglish.value ? 'Documents' : '文档中心'
  if (section === 'timeline') return isEnglish.value ? 'Timeline' : '时间轴'
  if (section === 'workflow') return isEnglish.value ? 'Workflow' : '流程'
  if (section === 'reminders') return isEnglish.value ? 'Reminders' : '提醒'
  return isEnglish.value ? 'Traceability' : '追溯概览'
}

function resolveActionGuardrailSection(chainSections: string[] = []) {
  if (chainSections.includes('cutover')) return 'cutover'
  if (chainSections.includes('documents')) return 'documents'
  if (chainSections.includes('timeline')) return 'timeline'
  if (chainSections.includes('workflow')) return 'workflow'
  if (chainSections.includes('reminders')) return 'reminders'
  if (chainSections.includes('traceability')) return 'traceability'
  const reminderFamilies = summarizeReminderFamilies(recordReminderItems.value)
  const contextSections = contextAlertItems.value.map((item) => item.section).filter(Boolean)
  if (contextSections.includes('cutover')) return 'cutover'
  if (reminderFamilies.evidenceCount || contextSections.includes('documents')) return 'documents'
  if (reminderFamilies.contextCount || contextSections.includes('timeline')) return 'timeline'
  if (
    reminderFamilies.collectionsCount
    || workflowAlerts.value.length
    || workflowBlockedStageCount.value
    || contextSections.includes('workflow')
  ) {
    return 'workflow'
  }
  if (recordReminderItems.value.length) return 'reminders'
  return 'traceability'
}

function buildFirstWaveActionBlockers(actionKey: string, row: Record<string, any>): ActionGuardrailBlocker[] {
  const blockers: ActionGuardrailBlocker[] = []
  const push = (key: string, message: string, section: string, critical = false) => {
    blockers.push({ key, message, section, critical })
  }

  if (!cutoverStore.isModuleEnabled(props.moduleKey)) {
    push(
      'cutover-disabled',
      isEnglish.value ? 'The current module is disabled by the cutover switch.' : '当前模块已被切换开关关闭。',
      'cutover',
      true,
    )
  }
  contextChainCards.value
    .filter((item) => item.pendingCount > 0)
    .forEach((item) => {
      push(
        `cutover-gate-${item.key}`,
        item.blockers.length
          ? `${item.label}: ${isEnglish.value ? 'pending gates' : '放行项未完成'} - ${item.blockers.join(', ')}`
          : `${item.label}: ${isEnglish.value ? 'pending gate review remains' : '仍有放行项待复核'}`,
        'cutover',
      )
    })
  contextChainCards.value
    .filter((item) => !item.closedLoopReady)
    .forEach((item) => {
      const missing = [...item.closedLoopMissingLabels, ...item.closedLoopStaleLabels].join(', ')
      push(
        `cutover-closed-loop-${item.key}`,
        missing
          ? `${item.label}: ${isEnglish.value ? 'closed-loop evidence is incomplete' : '闭环证据不完整'} - ${missing}`
          : `${item.label}: ${isEnglish.value ? 'closed-loop evidence still needs review' : '闭环证据仍待复核'}`,
        'cutover',
      )
    })

  if (props.moduleKey === 'saleOrder') {
    const lineCount = childRowCount('saleOrderLine')
    if (['action_confirm', 'action_create_invoice'].includes(actionKey)) {
      if (!row.partnerId) {
        push('sale-partner', isEnglish.value ? 'Customer context is missing.' : '缺少客户上下文。', 'traceability', true)
      }
      if (!row.companyId) {
        push('sale-company', isEnglish.value ? 'Company scope is missing.' : '缺少公司范围。', 'traceability', true)
      }
      if (!lineCount) {
        push('sale-lines', isEnglish.value ? 'No sales order lines are ready yet.' : '销售订单行尚未就绪。', 'traceability', true)
      }
    }
    if (actionKey === 'action_create_invoice') {
      if (!row.pickingRef) {
        push('sale-picking', isEnglish.value ? 'Delivery artifact is still not visible.' : '出库结果对象尚不可见。', 'traceability')
      }
      if (!documentRows.value.length) {
        push('sale-documents', isEnglish.value ? 'Sales evidence files are still missing.' : '销售证据文件仍然缺失。', 'documents')
      }
    }
  }

  if (props.moduleKey === 'purchaseOrder') {
    const lineCount = childRowCount('purchaseOrderLine')
    if (['action_confirm', 'action_create_bill'].includes(actionKey)) {
      if (!row.partnerId) {
        push('purchase-partner', isEnglish.value ? 'Vendor context is missing.' : '缺少供应商上下文。', 'traceability', true)
      }
      if (!row.companyId) {
        push('purchase-company', isEnglish.value ? 'Company scope is missing.' : '缺少公司范围。', 'traceability', true)
      }
      if (!lineCount) {
        push('purchase-lines', isEnglish.value ? 'No purchase order lines are ready yet.' : '采购订单行尚未就绪。', 'traceability', true)
      }
    }
    if (actionKey === 'action_create_bill') {
      if (!row.receiptRef) {
        push('purchase-receipt', isEnglish.value ? 'Receipt artifact is still not visible.' : '收货结果对象尚不可见。', 'traceability')
      }
      if (!documentRows.value.length) {
        push('purchase-documents', isEnglish.value ? 'Procurement evidence files are still missing.' : '采购证据文件仍然缺失。', 'documents')
      }
    }
  }

  if (props.moduleKey === 'stockPicking') {
    if (['action_confirm', 'action_validate'].includes(actionKey)) {
      if (!row.origin) {
        push('picking-origin', isEnglish.value ? 'Business origin is missing.' : '缺少业务来源。', 'traceability', true)
      }
      if (!row.companyId) {
        push('picking-company', isEnglish.value ? 'Company scope is missing.' : '缺少公司范围。', 'traceability', true)
      }
      if (!row.locationId || !row.locationDestId) {
        push('picking-route', isEnglish.value ? 'Transfer route is incomplete.' : '调拨路线不完整。', 'traceability', true)
      }
      if (!childRowCount('stockMove')) {
        push('picking-moves', isEnglish.value ? 'No stock move rows are ready yet.' : '库存移动行尚未就绪。', 'traceability', true)
      }
    }
    if (actionKey === 'action_validate' && !documentRows.value.length) {
      push('picking-documents', isEnglish.value ? 'Execution evidence files are still missing.' : '执行证据文件仍然缺失。', 'documents')
    }
  }

  if (props.moduleKey === 'accountInvoice') {
    if (['post', 'register_payment'].includes(actionKey)) {
      if (!row.partnerId) {
        push('invoice-partner', isEnglish.value ? 'Partner context is missing.' : '缺少伙伴上下文。', 'traceability', true)
      }
      if (!row.companyId) {
        push('invoice-company', isEnglish.value ? 'Company scope is missing.' : '缺少公司范围。', 'traceability', true)
      }
    }
    if (actionKey === 'post' && !row.originRef) {
      push('invoice-origin', isEnglish.value ? 'Upstream origin is still missing.' : '上游来源仍然缺失。', 'traceability')
    }
    if (actionKey === 'register_payment') {
      if (!row.originRef) {
        push('invoice-origin', isEnglish.value ? 'Upstream origin is still missing.' : '上游来源仍然缺失。', 'traceability')
      }
      if (!documentRows.value.length) {
        push('invoice-documents', isEnglish.value ? 'Invoice evidence files are still missing.' : '发票证据文件仍然缺失。', 'documents')
      }
    }
  }

  if (props.moduleKey === 'accountPayment' && ['action_post', 'post'].includes(actionKey)) {
    if (!row.partnerId) {
      push('payment-partner', isEnglish.value ? 'Partner context is missing.' : '缺少伙伴上下文。', 'traceability', true)
    }
    if (!row.companyId) {
      push('payment-company', isEnglish.value ? 'Company scope is missing.' : '缺少公司范围。', 'traceability', true)
    }
    if (!row.invoiceRef && !row.originRef) {
      push('payment-origin', isEnglish.value ? 'Invoice or origin reference is missing.' : '缺少发票或来源引用。', 'traceability', true)
    }
    if (!row.journalId) {
      push('payment-journal', isEnglish.value ? 'Payment journal is missing.' : '缺少付款账簿。', 'workflow', true)
    }
    if (!(Number(row.amount || 0) > 0)) {
      push('payment-amount', isEnglish.value ? 'Payment amount is not valid yet.' : '付款金额当前无效。', 'workflow', true)
    }
    if (!documentRows.value.length) {
      push('payment-documents', isEnglish.value ? 'Payment evidence files are still missing.' : '付款证据文件仍然缺失。', 'documents')
    }
  }

  return blockers
}

function buildActionGuardrailPlan(actionKey: string): ActionGuardrailPlan | null {
  if (!activeRow.value || !isGuardedFirstWaveAction(actionKey)) return null
  const reminderFamilies = summarizeReminderFamilies(recordReminderItems.value)
  const chainBlockers = buildFirstWaveActionBlockers(actionKey, activeRow.value)
  const reminderBlockers = buildReminderFamilyBlockers(recordReminderItems.value, isEnglish.value)
  const contextBlockers = contextAlertItems.value
    .slice(0, 3)
    .map((item) => `${item.title}: ${item.description}`)
  const workflowBlockers: string[] = []
  if (workflowBlockedStageCount.value) {
    workflowBlockers.push(
      isEnglish.value
        ? `${workflowBlockedStageCount.value} blocked workflow stage(s) still need review`
        : `仍有 ${workflowBlockedStageCount.value} 个流程阶段被阻塞`,
    )
  }
  if (workflowAlerts.value.length) {
    workflowBlockers.push(...workflowAlerts.value.slice(0, 2))
  }

  const blockerLines = [
    ...chainBlockers.map((item) => item.message),
    ...reminderBlockers,
    ...contextBlockers,
    ...workflowBlockers,
  ]
  if (!blockerLines.length) return null

  const actionDisplayLabel = actionLabel(resolveActionConfig(actionKey)?.label || actionKey)
  const recommendedSection = resolveActionGuardrailSection(chainBlockers.map((item) => item.section))
  const recommendedLabel = resolveGuardrailSectionLabel(recommendedSection)
  const hasCriticalRisk = chainBlockers.some((item) => item.critical)
    || recordReminderItems.value.some((item) => item.severity === 'critical')
    || contextAlertItems.value.some((item) => item.tone === 'danger')
    || workflowBlockedStageCount.value > 0
    || reminderFamilies.collectionsCount > 0

  return {
    title: isEnglish.value
      ? `Proceed with ${actionDisplayLabel}?`
      : `确认继续执行「${actionDisplayLabel}」吗？`,
    message: [
      isEnglish.value
        ? 'This first-wave action can still run, but the record shows unresolved cutover risks:'
        : '这个首批主线动作仍可继续执行，但当前记录存在未处理的切换风险：',
      ...blockerLines.map((item) => `- ${item}`),
      '',
      isEnglish.value
        ? `Choose “Review Record” to jump to ${recommendedLabel} first, or continue anyway.`
        : `可先选择“先核对记录”跳到「${recommendedLabel}」，也可以继续执行。`,
    ].join('\n'),
    type: hasCriticalRisk ? 'error' : 'warning',
    recommendedSection,
  }
}

async function confirmGuardedAction(actionKey: string) {
  const guardrail = buildActionGuardrailPlan(actionKey)
  if (!guardrail) return true
  try {
    await ElMessageBox.confirm(guardrail.message, guardrail.title, {
      type: guardrail.type,
      confirmButtonText: isEnglish.value ? 'Continue Anyway' : '仍然继续',
      cancelButtonText: isEnglish.value ? 'Review Record' : '先核对记录',
      closeOnClickModal: false,
      autofocus: false,
    })
    return true
  } catch {
    openDetailSection(guardrail.recommendedSection)
    return false
  }
}

async function handleAction(actionKey: string) {
  if (!activeRow.value || isCreating.value) return
  const canProceed = await confirmGuardedAction(actionKey)
  if (!canProceed) return
  loading.value = true
  try {
    await executeEntityAction(config.value.apiBase, activeRow.value.id, actionKey)
    const updated = await fetchEntityById<any>(config.value.apiBase, activeRow.value.id)
    await openDetailPage(updated)
    lastActionOutcome.value = {
      actionKey,
      actionLabel: actionLabel(resolveActionConfig(actionKey)?.label || actionKey),
      links: buildActionResultLinks(props.moduleKey, actionKey, updated),
    }
    await loadData()
    clearClientFailureNotice()
    ElMessage.success(t('app.actionSuccess'))
  } catch (error) {
    reportHandledClientFailure(`handleAction:${actionKey}`, error, {
      retry: () => {
        void handleAction(actionKey)
      },
      retryLabel: isEnglish.value ? 'Retry Action' : '重试动作',
    })
  } finally {
    loading.value = false
  }
}

function clearClientFailureNotice() {
  clientFailureNotice.value = null
  clientFailureRetry.value = null
}

function retryClientFailureNotice() {
  clientFailureRetry.value?.()
}

function buildFailureTitle(scope: string) {
  if (scope.startsWith('handleAction:')) {
    return isEnglish.value ? 'Action Failed' : '动作执行失败'
  }
  if (scope === 'saveActiveRow') {
    return isEnglish.value ? 'Save Failed' : '保存失败'
  }
  if (scope === 'removeActiveRow') {
    return isEnglish.value ? 'Delete Failed' : '删除失败'
  }
  if (scope === 'saveDocumentAttachment') {
    return isEnglish.value ? 'File Import Failed' : '文件导入失败'
  }
  if (scope === 'csvImportParse') {
    return isEnglish.value ? 'CSV Preview Failed' : 'CSV 预览失败'
  }
  if (scope === 'runCsvImport') {
    return isEnglish.value ? 'CSV Import Failed' : 'CSV 导入失败'
  }
  if (scope === 'syncDetailRoute') {
    return isEnglish.value ? 'Detail Page Failed To Open' : '详情页打开失败'
  }
  if (scope.startsWith('openDetailPage:')) {
    return isEnglish.value ? 'Partial Detail Data Failed To Load' : '详情页部分数据加载失败'
  }
  if (scope === 'loadData') {
    return isEnglish.value ? 'List Failed To Refresh' : '列表刷新失败'
  }
  if (scope === 'handleTimelineUpdated') {
    return isEnglish.value ? 'Timeline Refresh Failed' : '时间轴刷新失败'
  }
  return isEnglish.value ? 'Current View Failed' : '当前页面处理失败'
}

function buildFailureMessage(scope: string, error: unknown) {
  const message = resolveUiRequestErrorMessage(error)
  if (scope.startsWith('openDetailPage:')) {
    const areaMap: Record<string, string> = isEnglish.value
      ? {
          childRows: 'Child rows',
          documents: 'document hub',
          signals: 'timeline or reminders',
          detail: 'detail view',
        }
      : {
          childRows: '子表区域',
          documents: '文档中心',
          signals: '时间轴或提醒区域',
          detail: '详情页',
        }
    const areaKey = scope.split(':')[1] || 'detail'
    const areaLabel = areaMap[areaKey] || areaMap.detail
    return isEnglish.value
      ? `${areaLabel} could not finish loading. ${message}`
      : `${areaLabel}未能完成加载。${message}`
  }
  return message
}

function reportHandledClientFailure(
  scope: string,
  error: unknown,
  options: {
    retry?: () => void | Promise<void>
    retryLabel?: string
    tone?: ClientFailureNotice['tone']
  } = {},
) {
  if (import.meta.env.DEV) {
    console.warn(`[EntityTableView] ${scope} failed`, error)
  }
  clientFailureNotice.value = {
    title: buildFailureTitle(scope),
    message: buildFailureMessage(scope, error),
    tone: options.tone || (scope.startsWith('openDetailPage:') ? 'warning' : 'danger'),
    retryLabel: options.retryLabel || (isEnglish.value ? 'Retry' : '重试'),
  }
  clientFailureRetry.value = options.retry || (() => {
    refreshCurrentView()
  })
}

function resolveFirstWaveResultRailTagType(item: FirstWaveResultRailItem) {
  if (item.tone === 'success') return 'success'
  if (item.tone === 'warning') return 'warning'
  if (item.tone === 'danger') return 'danger'
  return 'info'
}

function resolveFirstWaveResultRailStatusLabel(item: FirstWaveResultRailItem) {
  if (item.actionType === 'link') return isEnglish.value ? 'Ready' : '已就绪'
  if (item.actionType === 'action') return isEnglish.value ? 'Action' : '待执行'
  return isEnglish.value ? 'Review' : '待核对'
}

async function handleFirstWaveResultRailItem(item: FirstWaveResultRailItem) {
  if (item.actionType === 'link' && item.link) {
    openResolvedLink(item.link)
    return
  }
  if (item.actionType === 'action' && item.actionKey) {
    await handleAction(item.actionKey)
    return
  }
  if (item.actionType === 'section' && item.section) {
    openDetailSection(item.section)
  }
}

async function handleExceptionAction(card: ExceptionActionCard) {
  if (card.actionType === 'section' && card.section) {
    openDetailSection(card.section)
    return
  }
  if (card.actionType === 'action' && card.actionKey) {
    await handleAction(card.actionKey)
    return
  }
  if (card.actionType === 'link' && card.link) {
    openResolvedLink(card.link)
    return
  }
  if (card.actionType === 'upload') {
    openUploadDialog(recommendedUploadPreset.value)
    return
  }
  if (card.actionType === 'copyContext') {
    await copyContextBrief()
    return
  }
  if (card.actionType === 'exportContext') {
    exportContextBrief()
    return
  }
  if (card.actionType === 'exportExceptions') {
    await exportRecordExceptionList()
    return
  }
  if (card.actionType === 'exportExceptionPacket') {
    exportRecordExceptionPacket()
    return
  }
  if (card.actionType === 'exportHandoff') {
    exportRecordHandoffSummary()
    return
  }
  if (card.actionType === 'copyHandoff') {
    await copyRecordHandoffSummary()
  }
}

function applyFilters() {
  currentPage.value = 1
  void loadData()
}

function resetFilters() {
  for (const filter of config.value.filters) {
    filterState[filter.fieldKey] = undefined
  }
  currentPage.value = 1
  void loadData()
}

function clearContext() {
  router.push({ name: props.moduleKey })
}

function notebookSummary(tab: OdooNotebookTabConfig) {
  const rows = childTableRows[tab.key] || []
  if (!rows.length) return '0 rows'
  const parts = [`${rows.length} rows`]
  if (rows.some((row) => row.balance !== undefined && row.balance !== null)) {
    parts.push(`Balance ${formatAmount(rows.reduce((sum, row) => sum + Number(row.balance || 0), 0))}`)
  } else if (rows.some((row) => row.totalCost !== undefined && row.totalCost !== null)) {
    parts.push(`Cost ${formatAmount(rows.reduce((sum, row) => sum + Number(row.totalCost || 0), 0))}`)
  } else if (rows.some((row) => row.actualQty !== undefined && row.actualQty !== null)) {
    parts.push(`Actual ${formatAmount(rows.reduce((sum, row) => sum + Number(row.actualQty || 0), 0))}`)
  } else if (rows.some((row) => row.productUomQty !== undefined && row.productUomQty !== null)) {
    parts.push(`Qty ${formatAmount(rows.reduce((sum, row) => sum + Number(row.productUomQty || 0), 0))}`)
  } else if (rows.some((row) => row.quantity !== undefined && row.quantity !== null)) {
    parts.push(`Qty ${formatAmount(rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0))}`)
  }
  return parts.join(' · ')
}

function handlePageChange(page: number) {
  currentPage.value = page
  void loadData()
}

function refreshCurrentView() {
  if (isCreating.value) return
  if (route.query.detailId) {
    void syncDetailRoute()
    return
  }
  void loadData()
}

function handleBackShortcut() {
  if (isCreating.value || isDetailPage.value) {
    closeSheetPage()
  }
}

function handleNewShortcut() {
  openCreateRow()
}

function handleSaveShortcut() {
  if (isCreating.value || isDetailPage.value) {
    void saveActiveRow()
  }
}

function handleExportDeskShortcut() {
  if (isDetailPage.value) {
    exportCurrentDeskPacket()
  }
}

function handlePrintDeskShortcut() {
  if (isDetailPage.value) {
    void printCurrentDesk()
  }
}

function handleExportListShortcut() {
  if (!isDetailPage.value && !isCreating.value) {
    exportVisibleList()
  }
}

function handleImportCsvShortcut() {
  if (!isDetailPage.value && !isCreating.value) {
    void openCsvImportDialog()
  }
}

onMounted(() => {
  initializeFilterState()
  primeFilterRelationControls()
  window.addEventListener(SHORTCUT_EVENT_MAP.backToList, handleBackShortcut as EventListener)
  window.addEventListener(SHORTCUT_EVENT_MAP.newRecord, handleNewShortcut as EventListener)
  window.addEventListener(SHORTCUT_EVENT_MAP.saveRecord, handleSaveShortcut as EventListener)
  window.addEventListener(SHORTCUT_EVENT_MAP.exportDesk, handleExportDeskShortcut as EventListener)
  window.addEventListener(SHORTCUT_EVENT_MAP.printDesk, handlePrintDeskShortcut as EventListener)
  window.addEventListener(SHORTCUT_EVENT_MAP.exportList, handleExportListShortcut as EventListener)
  window.addEventListener(SHORTCUT_EVENT_MAP.importCsv, handleImportCsvShortcut as EventListener)
  window.addEventListener(SHORTCUT_EVENT_MAP.refreshView, refreshCurrentView as EventListener)
  if (route.query.create === '1') {
    beginCreateRow()
    return
  }
  if (route.query.detailId) {
    void syncDetailRoute()
    return
  }
  void loadData()
})

onUnmounted(() => {
  window.removeEventListener(SHORTCUT_EVENT_MAP.backToList, handleBackShortcut as EventListener)
  window.removeEventListener(SHORTCUT_EVENT_MAP.newRecord, handleNewShortcut as EventListener)
  window.removeEventListener(SHORTCUT_EVENT_MAP.saveRecord, handleSaveShortcut as EventListener)
  window.removeEventListener(SHORTCUT_EVENT_MAP.exportDesk, handleExportDeskShortcut as EventListener)
  window.removeEventListener(SHORTCUT_EVENT_MAP.printDesk, handlePrintDeskShortcut as EventListener)
  window.removeEventListener(SHORTCUT_EVENT_MAP.exportList, handleExportListShortcut as EventListener)
  window.removeEventListener(SHORTCUT_EVENT_MAP.importCsv, handleImportCsvShortcut as EventListener)
  window.removeEventListener(SHORTCUT_EVENT_MAP.refreshView, refreshCurrentView as EventListener)
})

watch(
  () => props.moduleKey,
  () => {
    clearActiveSheetState()
    currentPage.value = 1
    initializeFilterState()
    primeFilterRelationControls()
    void loadData()
  },
)

watch(
  () => ({
    create: route.query.create,
    detailId: route.query.detailId,
    section: route.query.section,
    contextField: route.query.contextField,
    contextValue: route.query.contextValue,
    focusField: route.query.focusField,
    focusValue: route.query.focusValue,
    keyword: route.query.keyword,
    parentId: route.query.parentId,
  }),
  (next, previous) => {
    const onlySectionChanged = previous
      && next.section !== previous.section
      && next.create === previous.create
      && next.detailId === previous.detailId
      && next.contextField === previous.contextField
      && next.contextValue === previous.contextValue
      && next.focusField === previous.focusField
      && next.focusValue === previous.focusValue
      && next.keyword === previous.keyword
      && next.parentId === previous.parentId

    if (onlySectionChanged && next.detailId && isDetailPage.value) {
      void focusDetailSection(next.section)
      return
    }

    initializeFilterState()
    primeFilterRelationControls()
    if (route.query.create === '1') {
      beginCreateRow()
    } else if (route.query.detailId) {
      void syncDetailRoute()
    } else if (isCreating.value || expandedId.value) {
      clearActiveSheetState()
      void loadData()
    } else {
      void loadData()
    }
  },
)
</script>

<template>
  <div class="pro-workspace">
    <header class="pro-toolbar">
      <div class="toolbar-info">
        <span class="pro-label">{{ groupDisplayTitle }}</span>
        <h1 class="pro-title">{{ moduleDisplayTitle }}</h1>
      </div>
      <div class="toolbar-actions">
        <el-button v-if="isDetailPage || isCreating" size="small" @click="closeSheetPage">Back To List</el-button>
        <el-button v-if="isDetailPage && desktopBridge?.openWindow" size="small" @click="popoutActiveRow">
          {{ isEnglish ? 'Pop Out' : '弹出窗口' }}
        </el-button>
        <el-button v-if="isDetailPage" size="small" @click="exportCurrentDeskPacket">
          {{ isEnglish ? 'Export Desk' : '导出当前工作区' }}
        </el-button>
        <el-button v-if="isDetailPage" size="small" @click="printCurrentDesk">
          {{ isEnglish ? 'Print Desk' : '打印当前工作区' }}
        </el-button>
        <el-button
          v-if="isDetailPage && activeRow?.id && documentPresets.length"
          size="small"
          type="primary"
          plain
          @click="openUploadDialog(recommendedUploadPreset)"
        >
          {{ isEnglish ? 'Import File' : '导入文件' }}
        </el-button>
        <el-button v-if="!isDetailPage && !isCreating" size="small" @click="openCreateRow">New</el-button>
        <el-button v-if="!isDetailPage && !isCreating" size="small" @click="exportCsvImportTemplate">
          {{ isEnglish ? 'Export Template' : '导出导入模板' }}
        </el-button>
        <el-button
          v-if="!isDetailPage && !isCreating"
          size="small"
          type="primary"
          plain
          @click="openCsvImportDialog"
        >
          {{ isEnglish ? 'Import CSV' : 'CSV 批量导入' }}
        </el-button>
        <el-button v-if="!isDetailPage && !isCreating" size="small" @click="exportVisibleList">
          {{ isEnglish ? 'Export List' : '导出当前列表' }}
        </el-button>
        <el-button v-if="canDuplicateRow" size="small" @click="duplicateActiveRow">Duplicate</el-button>
        <el-button type="primary" size="small" @click="refreshCurrentView">Refresh</el-button>
        <el-button v-if="config.filters.length && !isDetailPage && !isCreating" size="small" @click="resetFilters">Reset Filters</el-button>
      </div>
    </header>

    <section v-if="contextRows.length" class="context-panel">
      <div class="context-chips">
        <span v-for="item in contextRows" :key="`${item.label}-${item.value}`" class="context-chip">
          <strong>{{ item.label }}</strong>
          <span>{{ item.value }}</span>
          <el-button v-if="item.link" text size="small" @click="openResolvedLink(item.link)">{{ t('app.openRelatedObject') }}</el-button>
        </span>
      </div>
      <el-button size="small" @click="clearContext">{{ t('app.clearContext') }}</el-button>
    </section>

    <section v-if="config.filters.length && !isDetailPage && !isCreating" class="filter-panel">
      <div class="filter-grid">
        <div v-for="filter in config.filters" :key="filter.key" class="filter-item">
          <label>{{ resolveFilterLabel(filter) }}</label>
          <el-input
            v-if="filter.type === 'text'"
            v-model="filterState[filter.fieldKey]"
            :placeholder="filter.placeholder"
            clearable
            @keyup.enter="applyFilters"
          />
          <el-select
            v-else-if="filter.type === 'number' && resolveFilterRelationModule(filter)"
            v-model="filterState[filter.fieldKey]"
            filterable
            remote
            clearable
            :remote-method="(keyword: string) => searchFilterRelationOptions(filter, keyword)"
            :loading="relationOptionLoading[relationBucketKey('filter', filter.fieldKey)]"
            :placeholder="filter.placeholder || resolveFilterLabel(filter)"
            @visible-change="(visible: boolean) => handleFilterRelationVisibleChange(filter, visible)"
          >
            <el-option
              v-for="option in relationOptionList(relationBucketKey('filter', filter.fieldKey))"
              :key="option.id"
              :label="option.label"
              :value="option.id"
            />
          </el-select>
          <el-input-number
            v-else-if="filter.type === 'number'"
            v-model="filterState[filter.fieldKey]"
            :controls="false"
            :placeholder="filter.placeholder"
          />
          <el-select
            v-else-if="filter.type === 'select'"
            v-model="filterState[filter.fieldKey]"
            :placeholder="filter.placeholder || resolveFilterLabel(filter)"
            clearable
          >
            <el-option
              v-for="option in filter.options || []"
              :key="String(option.value)"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-date-picker
            v-else
            v-model="filterState[filter.fieldKey]"
            :type="filter.type"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            style="width: 100%"
          />
        </div>
      </div>
      <div class="filter-actions">
        <el-button type="primary" size="small" @click="applyFilters">Apply</el-button>
      </div>
    </section>

    <CompactNoticeBar
      v-if="clientFailureNotice"
      inline
      :class="['client-failure-notice', clientFailureNotice.tone]"
      :message="`${clientFailureNotice.title} · ${clientFailureNotice.message}`"
    >
      <template #actions>
        <el-button
          v-if="clientFailureRetry"
          size="small"
          :type="clientFailureNotice.tone === 'danger' ? 'danger' : 'warning'"
          @click="retryClientFailureNotice"
        >
          {{ clientFailureNotice.retryLabel }}
        </el-button>
        <el-button size="small" @click="clearClientFailureNotice">
          {{ isEnglish ? 'Dismiss' : '关闭提示' }}
        </el-button>
      </template>
    </CompactNoticeBar>

    <div class="pro-content" v-loading="loading">
      <section v-if="isCreating && activeRow" class="draft-sheet">
        <div class="sheet-inner">
          <header class="sheet-header">
            <div class="sheet-nav">
              <span class="sheet-id">DRAFT</span>
              <div class="sheet-steps">
                <div class="step-node active">Create</div>
                <div class="step-line"></div>
                <div class="step-node">Save</div>
              </div>
            </div>
            <div class="sheet-actions">
              <el-button size="small" @click="cancelCreateRow">Cancel</el-button>
              <el-button type="primary" size="small" :loading="isSaving" @click="saveActiveRow">Save</el-button>
            </div>
          </header>

          <main class="sheet-body">
            <h2 class="sheet-title">New {{ moduleDisplayTitle }}</h2>

            <section v-for="section in formSections" :key="`draft-${section.key}`" class="field-section">
              <h3 class="field-section-title">{{ section.title }}</h3>
              <div class="sheet-grid">
                <div
                  v-for="field in section.fields"
                  :key="field.key"
                  :class="['sheet-field', { 'is-wide': isWideField(field), 'is-code': isCodeField(field) }]"
                >
                  <label>{{ resolveFieldLabel(field) }}</label>
                  <div class="field-input-stack">
                    <el-input
                      v-if="field.type === 'text'"
                      v-model="activeRow[field.key]"
                      :placeholder="inputPlaceholder(field)"
                    />
                    <el-input
                      v-else-if="field.type === 'textarea'"
                      v-model="activeRow[field.key]"
                      type="textarea"
                      :rows="4"
                      :placeholder="inputPlaceholder(field)"
                    />
                    <el-input-number
                      v-else-if="(field.type === 'number' || field.type === 'decimal') && !inferRelationModule(field)"
                      v-model="activeRow[field.key]"
                      :controls="false"
                      :precision="field.type === 'decimal' ? field.precision || 2 : 0"
                      style="width: 100%"
                    />
                    <el-select
                      v-else-if="field.type === 'number' && inferRelationModule(field)"
                      v-model="activeRow[field.key]"
                      filterable
                      remote
                      clearable
                      :remote-method="(keyword: string) => searchFieldRelationOptions(field, keyword)"
                      :loading="relationOptionLoading[relationBucketKey('field', field.key)]"
                      :placeholder="inputPlaceholder(field)"
                      @visible-change="(visible: boolean) => handleFieldRelationVisibleChange(field, visible)"
                    >
                      <el-option
                        v-for="option in relationOptionList(relationBucketKey('field', field.key))"
                        :key="option.id"
                        :label="option.label"
                        :value="option.id"
                      />
                    </el-select>
                    <el-select
                      v-else-if="field.type === 'select'"
                      v-model="activeRow[field.key]"
                      :placeholder="inputPlaceholder(field)"
                      clearable
                    >
                      <el-option
                        v-for="option in field.options || []"
                        :key="String(option.value)"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                    <el-switch
                      v-else-if="field.type === 'switch'"
                      v-model="activeRow[field.key]"
                    />
                    <el-date-picker
                      v-else
                      v-model="activeRow[field.key]"
                      :type="field.type"
                      :value-format="field.type === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
                      :format="field.type === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
                      style="width: 100%"
                    />
                    <div v-if="relationHint(field)" class="field-hint-row">
                      <p class="relation-hint">{{ relationHint(field) }}</p>
                      <el-button text size="small" @click="openRelationField(field)">{{ t('app.openRelatedObject') }}</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div v-if="supportsExtData" class="sheet-ext-panel">
              <div v-if="extDataPresetSections.length" class="ext-knowledge-grid">
                <section
                  v-for="section in extDataPresetSections"
                  :key="section.key"
                  class="ext-knowledge-card"
                >
                  <div class="ext-header">
                    <div>
                      <h4>{{ section.title }}</h4>
                      <span>{{ section.description }}</span>
                    </div>
                  </div>
                  <div class="ext-preset-grid">
                    <div
                      v-for="field in section.fields"
                      :key="field.key"
                      class="ext-preset-row"
                    >
                      <label>{{ field.label }}</label>
                      <el-input
                        v-if="field.type !== 'textarea'"
                        v-model="extDataPresetDraft[field.key]"
                        :placeholder="field.placeholder"
                      />
                      <el-input
                        v-else
                        v-model="extDataPresetDraft[field.key]"
                        type="textarea"
                        :autosize="{ minRows: 2, maxRows: 4 }"
                        :placeholder="field.placeholder"
                      />
                    </div>
                  </div>
                </section>
              </div>
              <div class="ext-header">
                <div>
                  <h4>Ext Data</h4>
                  <span>{{ extDataDraftRows.length }} fields</span>
                </div>
                <el-button size="small" @click="addExtDataRow">Add Field</el-button>
              </div>
              <div v-if="extDataDraftRows.length" class="ext-editor-grid">
                <div v-for="(item, index) in extDataDraftRows" :key="`draft-ext-${index}`" class="ext-editor-row">
                  <el-input v-model="item.key" placeholder="Field Key" />
                  <el-input v-model="item.value" placeholder="Field Value" />
                  <el-button text type="danger" @click="removeExtDataRow(index)">Remove</el-button>
                </div>
              </div>
              <div v-else class="pro-placeholder">No dynamic fields yet.</div>
            </div>
          </main>
        </div>
      </section>

      <section v-else-if="isDetailPage && activeRow" class="detail-page-sheet">
        <div class="sheet-inner">
          <header class="sheet-header">
            <div class="sheet-nav">
              <span class="sheet-id">ID: {{ activeRow.id }}</span>
              <div v-if="workflowStageNodes.length" class="sheet-stage-stack">
                <div class="sheet-stage-rail">
                  <button
                    v-for="item in workflowStageNodes"
                    :key="item.key"
                    type="button"
                    :class="['sheet-stage-node', `is-${item.status}`, { clickable: Boolean(item.link) }]"
                    @click="item.link ? openResolvedLink(item.link) : openDetailSection('workflow')"
                  >
                    <span>{{ item.label }}</span>
                    <strong>{{ item.badge }}</strong>
                  </button>
                </div>
                <p class="sheet-stage-caption">{{ workflowStageCaption }}</p>
              </div>
              <div v-else class="sheet-steps">
                <div :class="['step-node', String(activeRow[stateField]) === 'draft' ? 'active' : '']">Draft</div>
                <div class="step-line"></div>
                <div :class="['step-node', ['sale', 'purchase', 'posted', 'done', 'assigned', 'confirmed'].includes(String(activeRow[stateField])) ? 'active' : '']">Active</div>
              </div>
            </div>
            <div class="sheet-actions">
              <el-button size="small" @click="closeSheetPage">Back To List</el-button>
              <el-button
                v-if="canDuplicateRow"
                size="small"
                @click.stop="duplicateActiveRow"
              >
                Duplicate
              </el-button>
              <el-button
                v-if="canPersistRow"
                type="primary"
                size="small"
                :loading="isSaving"
                @click.stop="saveActiveRow"
              >
                Save
              </el-button>
              <el-button
                v-if="activeRow?.id"
                size="small"
                type="danger"
                plain
                :loading="isDeleting"
                @click.stop="removeActiveRow"
              >
                Delete
              </el-button>
              <el-button
                v-for="action in visibleActions"
                :key="action.key"
                size="small"
                @click.stop="handleAction(action.key)"
              >
                {{ actionLabel(action.label) }}
              </el-button>
            </div>
          </header>

          <main class="sheet-body">
            <h2 class="sheet-title">{{ sheetTitle }}</h2>

            <div class="detail-section-nav">
              <button
                v-for="item in traceabilitySections"
                :key="item.key"
                type="button"
                :class="['section-chip', item.tone, { active: currentDetailSection === item.key }]"
                @click="openDetailSection(item.key)"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.count }}</strong>
              </button>
            </div>

            <CompactNoticeBar
              inline
              class="detail-section-notice"
              :message="isEnglish
                ? `Current desk: ${traceabilitySections.find((item) => item.key === currentDetailSection)?.label || currentDetailSection}. Keep the page focused by switching to the next area instead of scanning the full record.`
                : `当前工作区：${traceabilitySections.find((item) => item.key === currentDetailSection)?.label || currentDetailSection}。通过切换区域处理问题，不再在整张详情页里来回寻找。`"
            >
              <template #actions>
                <el-button
                  v-if="currentDetailSection !== detailDefaultSection"
                  size="small"
                  @click="openDetailSection(detailDefaultSection)"
                >
                  {{ isEnglish ? 'Back To Default Desk' : '回到默认工作区' }}
                </el-button>
                <el-button
                  v-if="currentDetailSection !== 'record' && hasRecordDetailContent"
                  size="small"
                  @click="openDetailSection('record')"
                >
                  {{ isEnglish ? 'Open Record' : '打开主记录' }}
                </el-button>
              </template>
            </CompactNoticeBar>

            <div v-if="insightRows.length" class="sheet-insights">
              <div v-for="item in insightRows" :key="item.label" class="insight-card">
                <label>{{ item.label }}</label>
                <p>{{ item.value }}</p>
              </div>
            </div>

            <div
              v-if="isFirstWaveRecord && isDetailSectionActive('cutover')"
              class="sheet-meta-panel"
              :ref="(el) => registerDetailSection('cutover', el)"
            >
              <div class="meta-header">
                <div>
                  <h4>{{ locale === 'en-US' ? 'Record Cutover Desk' : '记录切换台' }}</h4>
                  <p>
                    {{ locale === 'en-US'
                      ? 'Keep module scope, gate readiness, evidence pressure, and top reminder handling visible on the current record.'
                      : '把模块范围、门槛就绪度、证据压力和最高优先提醒都固定展示在当前记录上。' }}
                  </p>
                </div>
                <div class="document-actions">
                  <el-button size="small" @click="openRecordCutoverSettings">
                    {{ locale === 'en-US' ? 'Open Cutover' : '打开切换设置' }}
                  </el-button>
                  <el-button size="small" @click="openDetailSection('documents')">
                    {{ locale === 'en-US' ? 'Open Documents' : '打开文档区' }}
                  </el-button>
                  <el-button size="small" @click="openDetailSection('review')">
                    {{ locale === 'en-US' ? 'Open Review' : '打开核对台' }}
                  </el-button>
                  <el-button
                    v-if="recordTopReminder"
                    size="small"
                    @click="openRecordTopReminderArea"
                  >
                    {{ locale === 'en-US' ? 'Open Top Risk' : '打开最高风险' }}
                  </el-button>
                  <el-button
                    v-if="cutoverStore.isModuleEnabled(props.moduleKey)"
                    size="small"
                    type="danger"
                    plain
                    @click="rollbackCurrentRecordModule"
                  >
                    {{ locale === 'en-US' ? 'Stop Pilot' : '停止试点' }}
                  </el-button>
                </div>
              </div>

              <div class="meta-link-grid">
                <article
                  v-for="item in firstWaveRecordCutoverCards"
                  :key="item.key"
                  :class="['meta-link-card', 'static-card', `tone-${item.tone}`]"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <p>{{ item.description }}</p>
                </article>
              </div>

              <div v-if="contextChainCards.length" class="result-pack-strip">
                <span
                  v-for="item in contextChainCards"
                  :key="`record-cutover-${item.key}`"
                  :class="{ ready: !item.pendingCount && item.closedLoopReady }"
                >
                  {{ item.label }} · {{ item.readyCount }}/6 · {{ item.closedLoopLabel }}
                </span>
              </div>

              <article v-if="recordTopReminder" class="record-cutover-risk">
                <div class="record-cutover-risk-copy">
                  <div class="record-cutover-risk-head">
                    <strong>{{ recordTopReminder.title }}</strong>
                    <el-tag
                      size="small"
                      effect="plain"
                      :type="recordTopReminder.severity === 'critical' ? 'danger' : 'warning'"
                    >
                      {{ recordTopReminder.severity }}
                    </el-tag>
                  </div>
                  <p>{{ recordTopReminder.content }}</p>
                  <span>
                    {{ locale === 'en-US' ? 'Suggested Area' : '建议区域' }} · {{ resolveReminderSection(recordTopReminder) }}
                  </span>
                </div>
                <div class="record-cutover-risk-actions">
                  <el-button size="small" @click="openRecordTopReminderArea">
                    {{ locale === 'en-US' ? 'Open Suggested Area' : '打开建议区域' }}
                  </el-button>
                  <el-button size="small" type="primary" @click="exportRecordHandoffSummary">
                    {{ locale === 'en-US' ? 'Export Handoff' : '导出交接摘要' }}
                  </el-button>
                </div>
              </article>
            </div>

            <div
              v-if="isDetailSectionActive('context')"
              class="sheet-meta-panel"
              :ref="(el) => registerDetailSection('context', el)"
            >
              <div class="meta-header">
                <div>
                  <h4>{{ locale === 'en-US' ? 'Context Cockpit' : '上下文驾驶舱' }}</h4>
                  <p>
                    {{ locale === 'en-US'
                      ? 'Blend ERPNext-style hybrid fields with Monica-style relationship depth so operators can decide faster without leaving the record.'
                      : '把 ERPNext 式混合字段与 Monica 式关系深度合在一处，让操作员不离开记录也能快速判断。' }}
                  </p>
                </div>
                <div class="document-actions">
                  <el-button size="small" @click="copyContextBrief">
                    {{ locale === 'en-US' ? 'Copy Brief' : '复制摘要' }}
                  </el-button>
                  <el-button size="small" @click="exportContextBrief">
                    {{ locale === 'en-US' ? 'Export Brief' : '导出摘要' }}
                  </el-button>
                  <el-button size="small" @click="openDetailSection('documents')">
                    {{ locale === 'en-US' ? 'Open Documents' : '打开文档区' }}
                  </el-button>
                  <el-button size="small" @click="openDetailSection('timeline')">
                    {{ locale === 'en-US' ? 'Open Timeline' : '打开时间轴' }}
                  </el-button>
                  <el-button size="small" @click="openRecordCutoverSettings">
                    {{ locale === 'en-US' ? 'Open Cutover' : '打开切换设置' }}
                  </el-button>
                </div>
              </div>

              <div class="meta-link-grid">
                <article
                  v-for="item in contextSummaryCards"
                  :key="item.key"
                  :class="['meta-link-card', 'static-card', `tone-${item.tone}`]"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <p>{{ item.description }}</p>
                </article>
              </div>

              <div class="context-cockpit-grid">
                <section v-if="contextChainCards.length" class="context-cockpit-card">
                  <div class="context-card-header">
                    <div>
                      <h5>{{ locale === 'en-US' ? 'Chain Ownership' : '链路责任' }}</h5>
                      <p>
                        {{ locale === 'en-US'
                          ? 'Keep pilot owners, fallback owners, and acceptance blockers visible beside the record.'
                          : '把试点负责人、兜底负责人和放行阻塞项直接放在记录旁边。' }}
                      </p>
                    </div>
                  </div>
                  <div class="context-chain-list">
                    <article v-for="item in contextChainCards" :key="item.key" class="context-chain-item">
                      <div class="context-chain-top">
                        <strong>{{ item.label }}</strong>
                        <el-tag size="small" effect="plain" :type="item.pendingCount ? 'warning' : item.closedLoopTone">
                          {{ item.readyCount }}/6 · {{ item.closedLoopLabel }}
                        </el-tag>
                      </div>
                      <div class="context-owner-grid">
                        <span>{{ locale === 'en-US' ? 'Owner' : '负责人' }} · {{ item.owner || '-' }}</span>
                        <span>{{ locale === 'en-US' ? 'Fallback' : '兜底' }} · {{ item.fallbackOwner || '-' }}</span>
                        <span>{{ locale === 'en-US' ? 'Rehearsal' : '演练' }} · {{ item.rehearsalOwner || '-' }}</span>
                        <span>{{ locale === 'en-US' ? 'Confirm' : '确认' }} · {{ item.pilotConfirmOwner || '-' }}</span>
                      </div>
                      <p class="context-chain-note">
                        {{ item.enabled
                          ? (locale === 'en-US' ? 'Pilot chain is enabled.' : '当前试点链已启用。')
                          : (locale === 'en-US' ? 'Pilot chain is disabled.' : '当前试点链已关闭。') }}
                        <template v-if="item.blockers.length">
                          {{ locale === 'en-US' ? ' Pending:' : ' 待完成：' }}{{ item.blockers.join('、') }}
                        </template>
                      </p>
                      <p v-if="item.closedLoopMissingLabels.length || item.closedLoopStaleLabels.length" class="context-chain-note">
                        {{
                          [
                            item.closedLoopMissingLabels.length
                              ? `${locale === 'en-US' ? 'Missing' : '缺少'}: ${item.closedLoopMissingLabels.join(' / ')}`
                              : null,
                            item.closedLoopStaleLabels.length
                              ? `${locale === 'en-US' ? 'Stale' : '过期'}: ${item.closedLoopStaleLabels.join(' / ')}`
                              : null,
                          ].filter(Boolean).join(' · ')
                        }}
                      </p>
                      <p v-if="item.note" class="context-chain-note">{{ item.note }}</p>
                    </article>
                  </div>
                </section>

                <section v-if="contextCoverageRows.length" class="context-cockpit-card">
                  <div class="context-card-header">
                    <div>
                      <h5>{{ locale === 'en-US' ? 'Coverage Grid' : '覆盖网格' }}</h5>
                      <p>
                        {{ locale === 'en-US'
                          ? 'See which relationship, business, and evidence signals are still blank.'
                          : '直接看到哪些关系、业务和证据信号仍然为空。' }}
                      </p>
                    </div>
                  </div>
                  <div class="context-coverage-list">
                    <button
                      v-for="item in contextCoverageRows"
                      :key="item.key"
                      type="button"
                      class="context-coverage-row"
                      @click="item.section && item.section !== 'context' ? openDetailSection(item.section) : null"
                    >
                      <div>
                        <strong>{{ item.label }}</strong>
                        <p>{{ item.value }}</p>
                      </div>
                      <el-tag size="small" effect="plain" :type="item.filled ? 'success' : 'warning'">
                        {{ item.filled ? (locale === 'en-US' ? 'Ready' : '已就绪') : (locale === 'en-US' ? 'Missing' : '缺失') }}
                      </el-tag>
                    </button>
                  </div>
                </section>

                <section v-if="contextAlertItems.length || contextTemplateItems.length" class="context-cockpit-card">
                  <div class="context-card-header">
                    <div>
                      <h5>{{ locale === 'en-US' ? 'Gaps And Templates' : '缺口与模板' }}</h5>
                      <p>
                        {{ locale === 'en-US'
                          ? 'Patch missing context quickly and keep first-wave pilot records consistent.'
                          : '快速补齐缺失上下文，让首批试点记录保持一致。' }}
                      </p>
                    </div>
                  </div>

                  <div v-if="contextAlertItems.length" class="context-alert-list">
                    <article
                      v-for="item in contextAlertItems"
                      :key="item.key"
                      :class="['context-alert-item', item.tone]"
                    >
                      <div>
                        <strong>{{ item.title }}</strong>
                        <p>{{ item.description }}</p>
                      </div>
                      <el-button
                        v-if="item.section"
                        text
                        size="small"
                        @click="openDetailSection(item.section)"
                      >
                        {{ locale === 'en-US' ? 'Open Area' : '打开区域' }}
                      </el-button>
                    </article>
                  </div>

                  <div v-if="contextTemplateItems.length" class="context-template-list">
                    <button
                      v-for="item in contextTemplateItems"
                      :key="item.key"
                      type="button"
                      class="context-template-item"
                      :disabled="!canPersistRow"
                      @click="applyContextTemplate(item)"
                    >
                      <strong>{{ item.label }}</strong>
                      <p>{{ item.description }}</p>
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <div
              v-if="shouldShowFirstWaveResultCockpit && firstWaveResultRailItems.length && isDetailSectionActive('chain')"
              class="sheet-meta-panel"
              :ref="(el) => registerDetailSection('chain', el)"
            >
              <div class="meta-header">
                <div>
                  <h4>{{ locale === 'en-US' ? 'First-Wave Chain Cockpit' : '首批链路驾驶舱' }}</h4>
                  <p>
                    {{ locale === 'en-US'
                      ? 'Surface result objects, chain jumps, and next actions explicitly so operators stay inside one desktop workbench.'
                      : '把结果对象、链路跳转和下一步动作显式放在一起，让操作员始终停留在同一个桌面工作台里。' }}
                  </p>
                </div>
                <div class="document-actions">
                  <el-button size="small" @click="openDetailSection('traceability')">
                    {{ locale === 'en-US' ? 'Open Traceability' : '打开追溯中心' }}
                  </el-button>
                  <el-button size="small" @click="openDetailSection('workflow')">
                    {{ locale === 'en-US' ? 'Open Workflow' : '打开流程区' }}
                  </el-button>
                  <el-button size="small" @click="openDetailSection('documents')">
                    {{ locale === 'en-US' ? 'Open Documents' : '打开文档区' }}
                  </el-button>
                  <el-button
                    v-if="primarySuggestionAction?.actionKey"
                    size="small"
                    type="primary"
                    @click="handleAction(primarySuggestionAction.actionKey)"
                  >
                    {{ primarySuggestionAction.label }}
                  </el-button>
                  <el-button
                    v-else-if="primarySuggestionLink?.link"
                    size="small"
                    type="primary"
                    @click="openResolvedLink(primarySuggestionLink.link)"
                  >
                    {{ primarySuggestionLink.label }}
                  </el-button>
                </div>
              </div>

              <div class="meta-link-grid">
                <article
                  v-for="item in firstWaveResultSummaryCards"
                  :key="item.key"
                  :class="['meta-link-card', 'static-card', `tone-${item.tone}`]"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <p>{{ item.description }}</p>
                </article>
              </div>

              <div class="result-rail-grid">
                <article
                  v-for="item in firstWaveResultRailItems"
                  :key="item.key"
                  :class="['result-rail-card', `tone-${item.tone}`]"
                >
                  <div class="result-rail-top">
                    <div>
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </div>
                    <el-tag size="small" effect="plain" :type="resolveFirstWaveResultRailTagType(item)">
                      {{ resolveFirstWaveResultRailStatusLabel(item) }}
                    </el-tag>
                  </div>
                  <p>{{ item.description }}</p>
                  <el-button
                    size="small"
                    :type="item.tone === 'success' ? 'primary' : item.tone === 'danger' ? 'danger' : undefined"
                    @click="handleFirstWaveResultRailItem(item)"
                  >
                    {{ item.buttonLabel }}
                  </el-button>
                </article>
              </div>

              <div v-if="downstreamRollbackSummary.items.length" class="result-pack-strip">
                <span
                  v-for="item in downstreamRollbackSummary.items"
                  :key="`chain-${item.key}`"
                  :class="{ ready: item.ready }"
                >
                  {{ item.label }} · {{ item.reference }}
                </span>
              </div>
            </div>

            <div
              v-if="isDetailSectionActive('traceability')"
              class="sheet-meta-panel"
              :ref="(el) => registerDetailSection('traceability', el)"
            >
              <div class="meta-header">
                <div>
                  <h4>{{ locale === 'en-US' ? 'Traceability Center' : '追溯中心' }}</h4>
                  <p>
                    {{ locale === 'en-US'
                      ? 'Jump to the exact evidence area instead of scanning the whole record page.'
                      : '直接跳到证据区域，不再在整张记录页里手动寻找。' }}
                  </p>
                </div>
                <div class="document-actions">
                  <el-button size="small" @click="openDetailSection('documents')">
                    {{ locale === 'en-US' ? 'Open Documents' : '打开文档区' }}
                  </el-button>
                  <el-button size="small" @click="openDetailSection('workflow')">
                    {{ locale === 'en-US' ? 'Open Workflow' : '打开流程区' }}
                  </el-button>
                  <el-button size="small" @click="openDetailSection('timeline')">
                    {{ locale === 'en-US' ? 'Open Timeline' : '打开时间轴' }}
                  </el-button>
                </div>
              </div>
              <div class="meta-link-grid">
                <article
                  v-for="item in traceabilitySummaryCards"
                  :key="item.key"
                  :class="['meta-link-card', 'static-card', `tone-${item.tone}`]"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <p>{{ item.description }}</p>
                </article>
              </div>
              <div v-if="downstreamRollbackSummary.items.length" class="document-missing-bar">
                <strong>{{ locale === 'en-US' ? 'Downstream Rollback Checklist' : '下游回退清单' }}</strong>
                <div class="document-missing-list">
                  <span
                    v-for="item in downstreamRollbackSummary.items"
                    :key="item.key"
                    :class="{ ready: item.ready }"
                  >
                    {{ item.label }} · {{ item.reference }} · {{ item.reason }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="isDetailSectionActive('chain') && visibleChainActionCards.length" class="sheet-meta-panel">
              <div class="meta-header">
                <div>
                  <h4>{{ locale === 'en-US' ? 'Chain Action Deck' : '链路动作台' }}</h4>
                  <p>
                    {{ locale === 'en-US'
                      ? 'Push the first-wave business chain forward from one desk instead of bouncing between modules.'
                      : '在同一操作台里推进首批业务链，不再在多个模块间来回跳转。' }}
                  </p>
                </div>
              </div>
              <div class="exception-card-grid">
                <article
                  v-for="item in visibleChainActionCards"
                  :key="item.key"
                  :class="['exception-card', item.tone]"
                >
                  <div class="exception-copy">
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.description }}</p>
                  </div>
                  <el-button
                    size="small"
                    :type="item.tone === 'danger' ? 'danger' : item.tone === 'success' ? 'primary' : undefined"
                    @click="handleExceptionAction(item)"
                  >
                    {{ item.buttonLabel }}
                  </el-button>
                </article>
              </div>
              <p v-if="hiddenChainActionCardCount" class="panel-compact-hint">
                {{ locale === 'en-US'
                  ? `Focused on the top ${visibleChainActionCards.length} chain actions. ${hiddenChainActionCardCount} lower-priority actions remain available through workflow, review, and traceability areas.`
                  : `当前只默认展示最关键的 ${visibleChainActionCards.length} 个链路动作，另外还有 ${hiddenChainActionCardCount} 个低优先级入口保留在流程、核对和追溯区域中。` }}
              </p>
            </div>

            <div
              v-if="isDetailSectionActive('review')"
              class="sheet-meta-panel"
              :ref="(el) => registerDetailSection('review', el)"
            >
              <div class="meta-header">
                <div>
                  <h4>{{ locale === 'en-US' ? 'Pilot Review' : '试点核对' }}</h4>
                  <p>
                    {{ locale === 'en-US'
                      ? 'Review readiness, export a handoff note, and jump into the exact area that still needs work.'
                      : '核对当前记录的交接准备度，并直接跳到仍需处理的区域。' }}
                  </p>
                </div>
                <div class="document-actions">
                  <el-button size="small" @click="exportRecordHandoffSummary">
                    {{ locale === 'en-US' ? 'Export Handoff' : '导出交接摘要' }}
                  </el-button>
                  <el-button size="small" @click="openDetailSection('reminders')">
                    {{ locale === 'en-US' ? 'Open Risks' : '打开风险区' }}
                  </el-button>
                  <el-button
                    v-if="primarySuggestionAction?.actionKey"
                    size="small"
                    type="primary"
                    @click="handleAction(primarySuggestionAction.actionKey)"
                  >
                    {{ primarySuggestionAction.label }}
                  </el-button>
                  <el-button
                    v-else-if="primarySuggestionLink?.link"
                    size="small"
                    type="primary"
                    @click="openResolvedLink(primarySuggestionLink.link)"
                  >
                    {{ primarySuggestionLink.label }}
                  </el-button>
                </div>
              </div>
              <div class="review-checklist">
                <article
                  v-for="item in pilotReviewChecklist"
                  :key="item.key"
                  :class="['review-item', item.status]"
                >
                  <div class="review-copy">
                    <div class="review-title-row">
                      <strong>{{ item.title }}</strong>
                      <span class="review-badge">{{ checklistToneLabel(item.status) }}</span>
                    </div>
                    <p>{{ item.description }}</p>
                  </div>
                  <el-button
                    v-if="item.section"
                    text
                    size="small"
                    @click="openDetailSection(item.section)"
                  >
                    {{ locale === 'en-US' ? 'Open Area' : '打开区域' }}
                  </el-button>
                </article>
              </div>
            </div>

            <div v-if="visibleExceptionActionCards.length && isDetailSectionActive('review')" class="sheet-meta-panel">
              <div class="meta-header">
                <div>
                  <h4>{{ locale === 'en-US' ? 'Exception Desk' : '异常处理台' }}</h4>
                  <p>
                    {{ locale === 'en-US'
                      ? 'Use direct actions to resolve the current record instead of switching between multiple panels.'
                      : '直接在这里处理当前记录，不再在多个面板之间来回切换。' }}
                  </p>
                </div>
              </div>
              <div class="exception-card-grid">
                <article
                  v-for="item in visibleExceptionActionCards"
                  :key="item.key"
                  :class="['exception-card', item.tone]"
                >
                  <div class="exception-copy">
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.description }}</p>
                  </div>
                  <el-button
                    size="small"
                    :type="item.tone === 'danger' ? 'danger' : item.tone === 'success' ? 'primary' : undefined"
                    @click="handleExceptionAction(item)"
                  >
                    {{ item.buttonLabel }}
                  </el-button>
                </article>
              </div>
              <p v-if="hiddenExceptionActionCardCount" class="panel-compact-hint">
                {{ locale === 'en-US'
                  ? `Showing the highest-value ${visibleExceptionActionCards.length} exception actions first. ${hiddenExceptionActionCardCount} additional export or handoff tools remain in the full exception workflow.`
                  : `默认先展示价值最高的 ${visibleExceptionActionCards.length} 个异常动作，另外还有 ${hiddenExceptionActionCardCount} 个导出或交接工具仍保留在完整异常流程里。` }}
              </p>
            </div>

            <div
              v-if="lastActionOutcome && lastActionOutcome.links.length && isDetailSectionActive('traceability')"
              class="sheet-meta-panel"
            >
              <div class="meta-header">
                <div>
                  <h4>{{ t('app.lastActionResult') }}</h4>
                  <p>{{ lastActionOutcome.actionLabel }} · {{ t('app.generatedObjectsReady') }}</p>
                </div>
              </div>
              <div class="meta-link-grid">
                <button
                  v-for="link in lastActionOutcome.links"
                  :key="link.key"
                  type="button"
                  class="meta-link-card"
                  @click="openResolvedLink(link)"
                >
                  <span>{{ link.label }}</span>
                  <strong>{{ link.value }}</strong>
                  <p>{{ t('app.openGeneratedResults') }}</p>
                </button>
              </div>
            </div>

            <div
              v-if="visibleLinkedDocuments.length && isDetailSectionActive('traceability')"
              class="sheet-meta-panel"
            >
              <div class="meta-header">
                <div>
                  <h4>{{ t('app.documentLinks') }}</h4>
                  <p>
                    {{ visibleLinkedDocuments.length }} linked objects
                    <template v-if="hiddenLinkedDocumentCount">
                      · {{ locale === 'en-US' ? `${hiddenLinkedDocumentCount} more in Document Hub` : `另外 ${hiddenLinkedDocumentCount} 个已收敛到文档中心` }}
                    </template>
                  </p>
                </div>
              </div>
              <div class="meta-link-grid">
                <button
                  v-for="link in visibleLinkedDocuments"
                  :key="link.key"
                  type="button"
                  class="meta-link-card"
                  @click="openResolvedLink(link)"
                >
                  <span>{{ link.label }}</span>
                  <strong>{{ link.value }}</strong>
                  <p>{{ t('app.openRelatedObject') }}</p>
                </button>
              </div>
            </div>

            <div
              v-if="visibleLinkedRelations.length && isDetailSectionActive('traceability')"
              class="sheet-meta-panel"
            >
              <div class="meta-header">
                <div>
                  <h4>{{ t('app.relationLinks') }}</h4>
                  <p>
                    {{ visibleLinkedRelations.length }} · {{ t('app.relationObjectsReady') }}
                    <template v-if="hiddenLinkedRelationCount">
                      · {{ locale === 'en-US' ? `${hiddenLinkedRelationCount} more in Traceability Center` : `另外 ${hiddenLinkedRelationCount} 个已收敛到追溯中心` }}
                    </template>
                  </p>
                </div>
              </div>
              <div class="meta-link-grid">
                <button
                  v-for="link in visibleLinkedRelations"
                  :key="link.key"
                  type="button"
                  class="meta-link-card"
                  @click="openResolvedLink(link)"
                >
                  <span>{{ link.label }}</span>
                  <strong>{{ link.value }}</strong>
                  <p>{{ t('app.openRelatedObject') }}</p>
                </button>
              </div>
            </div>

            <div
              v-if="shouldShowRollbackPacket && isDetailSectionActive('rollback')"
              class="sheet-meta-panel"
              :ref="(el) => registerDetailSection('rollback', el)"
            >
              <div class="meta-header">
                <div>
                  <h4>{{ locale === 'en-US' ? 'Rollback Packet' : '回退包' }}</h4>
                  <p>
                    {{ locale === 'en-US'
                      ? 'Export the current record, related references, and direct reminders for rollback review.'
                      : '导出当前记录、关联引用和直接命中的提醒，用于回退核对。' }}
                  </p>
                </div>
                <div class="document-actions">
                  <el-button size="small" @click="exportRecordExceptionList">
                    {{ locale === 'en-US' ? 'Export Exceptions' : '导出异常清单' }}
                  </el-button>
                  <el-button size="small" @click="exportRecordExceptionPacket">
                    {{ locale === 'en-US' ? 'Export Exception Packet' : '导出异常包' }}
                  </el-button>
                  <el-button size="small" type="primary" @click="exportRecordRollbackPacket">
                    {{ locale === 'en-US' ? 'Export Packet' : '导出回退包' }}
                  </el-button>
                  <el-button size="small" @click="openRecordCutoverSettings">
                    {{ locale === 'en-US' ? 'Open Cutover' : '打开切换设置' }}
                  </el-button>
                </div>
              </div>
              <div class="meta-link-grid">
                <article class="meta-link-card static-card">
                  <span>{{ locale === 'en-US' ? 'Current Record' : '当前记录' }}</span>
                  <strong>{{ sheetTitle }}</strong>
                  <p>{{ stateField }} = {{ activeRow?.[stateField] ?? '-' }}</p>
                </article>
                <article class="meta-link-card static-card">
                  <span>{{ locale === 'en-US' ? 'Related Objects' : '关联对象' }}</span>
                  <strong>{{ rollbackLinks.length }}</strong>
                  <p>{{ locale === 'en-US' ? 'References packed into the rollback export.' : '这些引用都会进入回退导出包。' }}</p>
                </article>
                <article class="meta-link-card static-card">
                  <span>{{ locale === 'en-US' ? 'Downstream Pack' : '下游对象包' }}</span>
                  <strong>
                    {{ downstreamRollbackSummary.expectedCount
                      ? `${downstreamRollbackSummary.readyCount}/${downstreamRollbackSummary.expectedCount}`
                      : '-' }}
                  </strong>
                  <p>
                    {{ downstreamRollbackSummary.missingLabels.length
                      ? (locale === 'en-US'
                          ? `Missing: ${downstreamRollbackSummary.missingLabels.join(' / ')}`
                          : `缺失：${downstreamRollbackSummary.missingLabels.join(' / ')}`)
                      : (locale === 'en-US' ? 'Downstream rollback references are ready.' : '下游回退引用已就绪。') }}
                  </p>
                </article>
                <article class="meta-link-card static-card">
                  <span>{{ locale === 'en-US' ? 'Workflow Alerts' : '流程告警' }}</span>
                  <strong>{{ workflowAlerts.length }}</strong>
                  <p>{{ locale === 'en-US' ? 'Current workflow warnings are included.' : '当前流程告警也会一起带出。' }}</p>
                </article>
                <article class="meta-link-card static-card">
                  <span>{{ locale === 'en-US' ? 'Timeline Signals' : '时间轴信号' }}</span>
                  <strong>{{ recordTimelineItems.length }}</strong>
                  <p>{{ locale === 'en-US' ? 'Notes, logs, and attachment events are packed for handoff review.' : '便签、日志和附件事件会进入交接核对。' }}</p>
                </article>
                <article class="meta-link-card static-card">
                  <span>{{ locale === 'en-US' ? 'Evidence Coverage' : '证据覆盖' }}</span>
                  <strong>{{ documentEvidenceSummary.readyCount }}/{{ documentEvidenceSummary.expectedCount }}</strong>
                  <p>
                    {{ documentEvidenceSummary.missingLabels.length
                      ? (locale === 'en-US'
                          ? `Missing: ${documentEvidenceSummary.missingLabels.join(' / ')}`
                          : `缺失：${documentEvidenceSummary.missingLabels.join(' / ')}`)
                      : (locale === 'en-US' ? 'Required evidence is already covered.' : '必备证据已覆盖。') }}
                  </p>
                </article>
                <article class="meta-link-card static-card">
                  <span>{{ locale === 'en-US' ? 'Open Reminders' : '未处理提醒' }}</span>
                  <strong>{{ recordReminderItems.length }}</strong>
                  <p>{{ locale === 'en-US' ? 'Direct context, evidence, and collection risks are exported.' : '直接命中的上下文、证据和收付款风险会被导出。' }}</p>
                </article>
              </div>
            </div>

            <div
              v-if="isDetailSectionActive('documents')"
              class="sheet-meta-panel document-panel"
              :ref="(el) => registerDetailSection('documents', el)"
            >
              <div class="meta-header">
                <div>
                  <h4>Document Hub</h4>
                  <p>
                    {{
                      locale === 'en-US'
                        ? 'Attachments, contracts, invoices, and module-specific evidence stay here.'
                        : '附件、合同、发票和模块专属证据文件都集中留在这里。'
                    }}
                  </p>
                </div>
                <div class="document-actions">
                  <el-button size="small" @click="openUploadDialog(recommendedUploadPreset)">
                    {{ locale === 'en-US' ? 'Import Recommended File' : '导入推荐文件' }}
                  </el-button>
                  <el-button size="small" @click="openResolvedLink(buildRouteLink('Attachments', 'irAttachment', { resModel: props.moduleKey, resId: String(activeRow.id), relatedTo: props.moduleKey }, String(activeRow.id)))">
                    Open Attachment List
                  </el-button>
                </div>
              </div>

              <div v-if="documentEvidenceSummary.missingLabels.length" class="document-missing-bar">
                <strong>{{ locale === 'en-US' ? 'Missing Required Evidence' : '缺失的必备证据' }}</strong>
                <div class="document-missing-list">
                  <span v-for="item in documentEvidenceSummary.missingLabels" :key="item">{{ item }}</span>
                </div>
              </div>

              <div class="document-preset-grid">
                <article v-for="preset in groupedDocuments" :key="preset.key" class="document-category-card">
                  <div class="document-category-header">
                    <div>
                      <strong>{{ preset.label }}</strong>
                      <p>{{ preset.description }}</p>
                    </div>
                    <el-button size="small" type="primary" @click="openUploadDialog(preset.key)">Import</el-button>
                  </div>
                  <div v-if="documentLoading" class="pro-placeholder">Loading documents...</div>
                  <div v-else-if="preset.rows.length" class="document-list">
                    <button
                      v-for="item in preset.rows"
                      :key="item.id"
                      type="button"
                      class="document-row"
                      @click="openDocumentAttachment(item)"
                    >
                      <span>{{ item.displayName }}</span>
                      <strong>{{ item.mimetype || 'file' }}</strong>
                    </button>
                  </div>
                  <div v-else class="pro-placeholder">No files in this category yet.</div>
                </article>
              </div>

              <div v-if="uncategorizedDocuments.length" class="document-extra-list">
                <div class="field-section-title">Other Files</div>
                <div class="document-list">
                  <button
                    v-for="item in uncategorizedDocuments"
                    :key="`other-${item.id}`"
                    type="button"
                    class="document-row"
                    @click="openDocumentAttachment(item)"
                  >
                    <span>{{ item.displayName }}</span>
                    <strong>{{ item.mimetype || 'file' }}</strong>
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="isDetailSectionActive('workflow') && (workflowStageNodes.length || workflowExecutionCards.length || workflowSnapshot.length || workflowAlerts.length || nextSuggestions.length)"
              class="workflow-grid"
              :ref="(el) => registerDetailSection('workflow', el)"
            >
              <section v-if="workflowStageNodes.length || workflowExecutionCards.length" class="workflow-panel workflow-stage-shell">
                <div class="meta-header">
                  <div>
                    <h4>{{ locale === 'en-US' ? 'Rigid Stage Machine' : '刚性状态机' }}</h4>
                    <p>
                      {{ locale === 'en-US'
                        ? 'Keep first-wave chain gates explicit so operators always know the current execution stage, next move, and rollback path.'
                        : '把首批链路门禁显式化，让操作员始终知道当前执行阶段、下一步和回退路径。' }}
                    </p>
                  </div>
                </div>

                <div v-if="workflowStageNodes.length" class="workflow-stage-grid">
                  <button
                    v-for="item in workflowStageNodes"
                    :key="item.key"
                    type="button"
                    :class="['workflow-stage-card', `is-${item.status}`, { clickable: Boolean(item.link) }]"
                    @click="item.link ? openResolvedLink(item.link) : null"
                  >
                    <div class="workflow-stage-top">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.badge }}</strong>
                    </div>
                    <p>{{ item.description }}</p>
                  </button>
                </div>

                <div v-if="workflowExecutionCards.length" class="workflow-execution-grid">
                  <component
                    :is="item.actionKey || item.link ? 'button' : 'article'"
                    v-for="item in workflowExecutionCards"
                    :key="item.key"
                    :type="item.actionKey || item.link ? 'button' : undefined"
                    :class="['workflow-execution-card', `tone-${item.tone}`, { clickable: Boolean(item.actionKey || item.link) }]"
                    @click="item.actionKey ? handleAction(item.actionKey) : item.link ? openResolvedLink(item.link) : null"
                  >
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                    <p>{{ item.description }}</p>
                  </component>
                </div>
              </section>

              <section v-if="workflowSnapshot.length" class="workflow-panel">
                <div class="meta-header">
                  <div>
                    <h4>{{ t('app.workflowSnapshot') }}</h4>
                    <p>{{ t('app.workflowHint') }}</p>
                  </div>
                </div>
                <div class="workflow-card-grid">
                  <article v-for="item in workflowSnapshot" :key="item.key" :class="['workflow-card', item.tone || 'info']">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </article>
                </div>
              </section>

              <section v-if="workflowAlerts.length" class="workflow-panel">
                <div class="meta-header">
                  <div>
                    <h4>{{ t('app.workflowAlerts') }}</h4>
                    <p>{{ t('app.workflowHint') }}</p>
                  </div>
                </div>
                <div class="workflow-alert-list">
                  <article v-for="(item, index) in workflowAlerts" :key="`${props.moduleKey}-alert-${index}`" class="workflow-alert">
                    {{ item }}
                  </article>
                </div>
              </section>

              <section v-if="nextSuggestions.length" class="workflow-panel">
                <div class="meta-header">
                  <div>
                    <h4>{{ t('app.nextSuggestions') }}</h4>
                    <p>{{ t('app.workflowHint') }}</p>
                  </div>
                </div>
                <div class="suggestion-list">
                  <button
                    v-for="item in nextSuggestions"
                    :key="item.key"
                    type="button"
                    class="suggestion-item"
                    @click="item.type === 'action' && item.actionKey ? handleAction(item.actionKey) : item.link ? openResolvedLink(item.link) : null"
                  >
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.type === 'action' ? t('app.executeSuggestedAction') : t('app.openRelatedObject') }}</span>
                  </button>
                </div>
              </section>
            </div>

            <div
              v-if="hasRecordDetailContent && isDetailSectionActive('record')"
              :ref="(el) => registerDetailSection('record', el)"
            >
              <div class="sheet-meta-panel">
                <div class="meta-header">
                  <div>
                    <h4>{{ locale === 'en-US' ? 'Primary Record Desk' : '主记录工作区' }}</h4>
                    <p>
                      {{ locale === 'en-US'
                        ? 'Edit the primary record, dynamic business context, and child rows without mixing in evidence or governance panels.'
                        : '只在这里处理主记录、动态业务上下文和子表，不再把证据区和治理区混在一起。' }}
                    </p>
                  </div>
                  <div class="document-actions">
                    <el-button v-if="supportsExtData" size="small" @click="openDetailSection('context')">
                      {{ locale === 'en-US' ? 'Open Context' : '打开上下文' }}
                    </el-button>
                    <el-button v-if="documentPresets.length" size="small" @click="openDetailSection('documents')">
                      {{ locale === 'en-US' ? 'Open Documents' : '打开文档区' }}
                    </el-button>
                    <el-button
                      v-if="workflowStageNodes.length || workflowExecutionCards.length || workflowSnapshot.length || workflowAlerts.length || nextSuggestions.length"
                      size="small"
                      @click="openDetailSection('workflow')"
                    >
                      {{ locale === 'en-US' ? 'Open Workflow' : '打开流程区' }}
                    </el-button>
                  </div>
                </div>
              </div>

              <section v-for="section in formSections" :key="section.key" class="field-section">
                <h3 class="field-section-title">{{ section.title }}</h3>
                <div class="sheet-grid">
                  <div
                    v-for="field in section.fields"
                    :key="field.key"
                    :class="['sheet-field', { 'is-wide': isWideField(field), 'is-code': isCodeField(field) }]"
                  >
                    <label>{{ resolveFieldLabel(field) }}</label>
                    <div class="field-input-stack">
                      <template v-if="isFieldEditable(field) && field.type === 'password'">
                        <el-input
                          v-model="activeRow[field.key]"
                          type="password"
                          show-password
                          :placeholder="inputPlaceholder(field)"
                          @click.stop
                        />
                      </template>
                      <template v-else-if="isFieldEditable(field) && field.type === 'text'">
                        <el-input
                          v-model="activeRow[field.key]"
                          :placeholder="inputPlaceholder(field)"
                          @click.stop
                        />
                      </template>
                      <template v-else-if="isFieldEditable(field) && field.type === 'textarea'">
                        <el-input
                          v-model="activeRow[field.key]"
                          type="textarea"
                          :rows="4"
                          :placeholder="inputPlaceholder(field)"
                          @click.stop
                        />
                      </template>
                      <template v-else-if="isFieldEditable(field) && field.type === 'number' && inferRelationModule(field)">
                        <el-select
                          v-model="activeRow[field.key]"
                          filterable
                          remote
                          clearable
                          :remote-method="(keyword: string) => searchFieldRelationOptions(field, keyword)"
                          :loading="relationOptionLoading[relationBucketKey('field', field.key)]"
                          :placeholder="inputPlaceholder(field)"
                          @visible-change="(visible: boolean) => handleFieldRelationVisibleChange(field, visible)"
                          @click.stop
                        >
                          <el-option
                            v-for="option in relationOptionList(relationBucketKey('field', field.key))"
                            :key="option.id"
                            :label="option.label"
                            :value="option.id"
                          />
                        </el-select>
                      </template>
                      <template v-else-if="isFieldEditable(field) && (field.type === 'number' || field.type === 'decimal')">
                        <el-input-number
                          v-model="activeRow[field.key]"
                          :controls="false"
                          :precision="field.type === 'decimal' ? field.precision || 2 : 0"
                          style="width: 100%"
                          @click.stop
                        />
                      </template>
                      <template v-else-if="isFieldEditable(field) && field.type === 'select'">
                        <el-select
                          v-model="activeRow[field.key]"
                          :placeholder="inputPlaceholder(field)"
                          clearable
                          @click.stop
                        >
                          <el-option
                            v-for="option in field.options || []"
                            :key="String(option.value)"
                            :label="option.label"
                            :value="option.value"
                          />
                        </el-select>
                      </template>
                      <template v-else-if="isFieldEditable(field) && field.type === 'switch'">
                        <el-switch v-model="activeRow[field.key]" @click.stop />
                      </template>
                      <template v-else-if="isFieldEditable(field) && (field.type === 'date' || field.type === 'datetime')">
                        <el-date-picker
                          v-model="activeRow[field.key]"
                          :type="field.type"
                          :value-format="field.type === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
                          :format="field.type === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
                          style="width: 100%"
                          @click.stop
                        />
                      </template>
                      <template v-else-if="field.formatter === 'tag'">
                        <el-tag size="small" effect="plain" :type="tagType(activeRow?.[field.key])">
                          {{ formatFieldValue(activeRow, field) }}
                        </el-tag>
                      </template>
                      <pre v-else-if="isWideField(field)" :class="['wide-field-value', { 'is-code': isCodeField(field) }]">{{ formatFieldValue(activeRow, field) }}</pre>
                      <p v-else>{{ formatFieldValue(activeRow, field) }}</p>
                      <div v-if="relationHint(field)" class="field-hint-row">
                        <p class="relation-hint">{{ relationHint(field) }}</p>
                        <el-button text size="small" @click="openRelationField(field)">{{ t('app.openRelatedObject') }}</el-button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div v-if="supportsExtData" class="sheet-ext-panel">
                <div v-if="extDataPresetSections.length" class="ext-knowledge-grid">
                  <section
                    v-for="section in extDataPresetSections"
                    :key="section.key"
                    class="ext-knowledge-card"
                  >
                    <div class="ext-header">
                      <div>
                        <h4>{{ section.title }}</h4>
                        <span>{{ section.description }}</span>
                      </div>
                    </div>
                    <div class="ext-preset-grid">
                      <div
                        v-for="field in section.fields"
                        :key="field.key"
                        class="ext-preset-row"
                      >
                        <label>{{ field.label }}</label>
                        <template v-if="canPersistRow">
                          <el-input
                            v-if="field.type !== 'textarea'"
                            v-model="extDataPresetDraft[field.key]"
                            :placeholder="field.placeholder"
                            @click.stop
                          />
                          <el-input
                            v-else
                            v-model="extDataPresetDraft[field.key]"
                            type="textarea"
                            :autosize="{ minRows: 2, maxRows: 4 }"
                            :placeholder="field.placeholder"
                            @click.stop
                          />
                        </template>
                        <template v-else>
                          <p class="ext-preset-value">{{ extDataPresetDraft[field.key] || '-' }}</p>
                        </template>
                      </div>
                    </div>
                  </section>
                </div>
                <div class="ext-header">
                  <div>
                    <h4>Ext Data</h4>
                    <span>{{ extDataDraftRows.length }} fields</span>
                  </div>
                  <el-button v-if="canPersistRow" size="small" @click.stop="addExtDataRow">Add Field</el-button>
                </div>
                <div v-if="extDataDraftRows.length" class="ext-editor-grid">
                  <div
                    v-for="(item, index) in extDataDraftRows"
                    :key="`${activeRow?.id || 'draft'}-ext-${index}`"
                    class="ext-editor-row"
                  >
                    <template v-if="canPersistRow">
                      <el-input v-model="item.key" placeholder="Field Key" @click.stop />
                      <el-input v-model="item.value" placeholder="Field Value" @click.stop />
                      <el-button text type="danger" @click.stop="removeExtDataRow(index)">Remove</el-button>
                    </template>
                    <template v-else>
                      <label>{{ item.key || 'Field' }}</label>
                      <p>{{ item.value || '-' }}</p>
                    </template>
                  </div>
                </div>
                <div v-else class="pro-placeholder">No dynamic fields yet.</div>
              </div>

              <div
                v-for="tab in config.odooNotebookTabs"
                :key="tab.key"
                class="sheet-notebook"
              >
                <div class="notebook-header">
                  <div>
                    <h4 class="notebook-title">{{ moduleTitle(tab.key as ModuleKey) }}</h4>
                    <p class="notebook-summary">{{ notebookSummary(tab) }}</p>
                    <p class="notebook-mode">{{ childModeTitle(tab) }} · {{ childModeDescription(tab) }}</p>
                  </div>
                  <el-button size="small" @click="openChildModule(tab)">{{ t('app.openRelatedList') }}</el-button>
                </div>
                <div v-if="childLoading[tab.key]" class="pro-placeholder">Loading related records...</div>
                <div v-else-if="(childTableRows[tab.key] || []).length" class="notebook-mini-table">
                  <div class="mini-row mini-head">
                    <span
                      v-for="field in moduleConfigMap[tab.key as ModuleKey].fields.filter((item) => item.list).slice(0, 4)"
                      :key="field.key"
                    >
                      {{ resolveFieldLabel(field) }}
                    </span>
                  </div>
                  <button
                    v-for="child in childTableRows[tab.key]"
                    :key="child.id"
                    type="button"
                    class="mini-row mini-row-button"
                    @click="openChildRow(tab, child)"
                  >
                    <span
                      v-for="field in moduleConfigMap[tab.key as ModuleKey].fields.filter((item) => item.list).slice(0, 4)"
                      :key="field.key"
                    >
                      {{ formatFieldValue(child, field, tab.key as ModuleKey) }}
                    </span>
                  </button>
                </div>
                <div v-else class="pro-placeholder">
                  <strong>{{ t('app.childEmptyTitle') }}</strong>
                  <p>{{ childEmptyMessage(tab) }}</p>
                </div>
              </div>
            </div>

            <div v-if="isDetailSectionActive('reminders')" :ref="(el) => registerDetailSection('reminders', el)">
              <ReminderSummaryPanel
              v-if="shouldShowRecordReminders && activeRow?.id"
              :module-key="props.moduleKey"
              :record-id="Number(activeRow.id)"
              :limit="3"
              :title="locale === 'en-US' ? 'Record Reminders' : '当前记录提醒'"
              :description="locale === 'en-US'
                ? 'Open risk items tied to this record before continuing downstream actions.'
                : '在继续处理下游动作前，先处理和当前记录直接相关的风险项。'"
              :empty-text="locale === 'en-US'
                ? 'No direct reminders for this record.'
                : '当前记录没有直接命中的提醒。'"
              />
            </div>

            <div v-if="isDetailSectionActive('timeline')" :ref="(el) => registerDetailSection('timeline', el)">
              <TimelinePanel
              v-if="shouldShowTimeline && activeRow?.id"
              :module-key="props.moduleKey"
              :record-id="Number(activeRow.id)"
              @updated="handleTimelineUpdated"
            />
            </div>
          </main>
        </div>
      </section>

      <div v-else class="pro-table-wrapper">
        <div
          v-for="row in tableData"
          :key="row.id"
          class="pro-item-group"
        >
          <div class="pro-row" @click="(event) => handleRowClick(row, event)">
            <div class="row-cell main-cell">{{ row.name || row.ref || row.model || row.id }}</div>
            <div
              v-for="field in visibleListFields"
              :key="field.key"
              class="row-cell sub-cell"
            >
              <template v-if="field.formatter === 'tag'">
                <el-tag size="small" effect="plain" :type="tagType(row[field.key])">
                  {{ formatFieldValue(row, field) }}
                </el-tag>
              </template>
              <template v-else>
                {{ formatFieldValue(row, field) }}
              </template>
            </div>
            <div class="row-cell status-cell">
              <el-tag size="small" effect="plain" :type="tagType(row[stateField])">
                {{ formatModuleStatus(config.key, stateField, row[stateField]) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!isCreating && !isDetailPage" class="pagination-wrap">
        <el-pagination
          background
          layout="prev, pager, next"
          :page-size="PAGE_SIZE"
          :total="total"
          :current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog
      v-model="csvImportDialogVisible"
      width="880px"
      :title="isEnglish ? `Import ${moduleDisplayTitle} CSV` : `导入${moduleDisplayTitle} CSV`"
      destroy-on-close
    >
      <div class="csv-import-dialog">
        <div class="csv-import-source">
          <strong>{{ csvImportSourceName || (isEnglish ? 'No file selected' : '未选择文件') }}</strong>
          <p>
            {{ isEnglish
              ? 'Use the exported template first. Extra ext_data columns can be added as preset field keys or with the ext.xxx prefix.'
              : '优先使用刚导出的模板。额外的 ext_data 列可以直接使用预设字段 key，或使用 ext.xxx 前缀。' }}
          </p>
          <small class="csv-import-source-meta">
            {{ isEnglish ? `${csvImportHeaders.length} header(s) detected` : `已识别 ${csvImportHeaders.length} 个表头` }}
          </small>
        </div>

        <div class="csv-import-stat-grid">
          <article class="csv-import-stat-card">
            <span>{{ isEnglish ? 'Total Rows' : '总行数' }}</span>
            <strong>{{ csvImportTotalRows }}</strong>
          </article>
          <article class="csv-import-stat-card ready">
            <span>{{ isEnglish ? 'Ready Rows' : '可导入行' }}</span>
            <strong>{{ csvImportReadyCount }}</strong>
          </article>
          <article class="csv-import-stat-card warning">
            <span>{{ isEnglish ? 'Invalid Rows' : '无效行' }}</span>
            <strong>{{ csvImportInvalidCount }}</strong>
          </article>
          <article class="csv-import-stat-card">
            <span>{{ isEnglish ? 'Skipped Blank' : '跳过空行' }}</span>
            <strong>{{ csvImportSkippedRows }}</strong>
          </article>
        </div>

        <div class="csv-import-chip-block">
          <label>{{ isEnglish ? 'Recognized Fields' : '识别到的标准字段' }}</label>
          <div class="csv-import-chip-list">
            <span v-for="item in csvImportRecognizedHeaders" :key="`field-${item}`">{{ item }}</span>
            <span v-if="!csvImportRecognizedHeaders.length" class="empty">
              {{ isEnglish ? 'None' : '无' }}
            </span>
          </div>
        </div>

        <div v-if="csvImportExtHeaders.length" class="csv-import-chip-block">
          <label>{{ isEnglish ? 'ext_data Fields' : 'ext_data 字段' }}</label>
          <div class="csv-import-chip-list ext">
            <span v-for="item in csvImportExtHeaders" :key="`ext-${item}`">{{ item }}</span>
          </div>
        </div>

        <div v-if="csvImportUnknownHeaders.length" class="csv-import-warning-box">
          <strong>{{ isEnglish ? 'Ignored Headers' : '将被忽略的表头' }}</strong>
          <div class="csv-import-chip-list warning">
            <span v-for="item in csvImportUnknownHeaders" :key="`unknown-${item}`">{{ item }}</span>
          </div>
        </div>

        <div class="csv-import-preview-section">
          <div class="csv-import-preview-header">
            <div>
              <strong>{{ isEnglish ? 'Preview' : '导入预览' }}</strong>
              <p>
                {{ isEnglish
                  ? 'The first rows are previewed before creation so required-field and header mistakes stay visible.'
                  : '创建前先预览前几行，避免必填项和表头错误直接落库。' }}
              </p>
            </div>
            <el-tag v-if="csvImportCompleted" type="success" effect="plain">
              {{ isEnglish ? `Imported ${csvImportSuccessCount}` : `已导入 ${csvImportSuccessCount}` }}
            </el-tag>
          </div>

          <div v-if="csvImportPreviewSample.length" class="csv-preview-list">
            <article
              v-for="item in csvImportPreviewSample"
              :key="`preview-${item.rowNumber}`"
              :class="['csv-preview-card', item.status]"
            >
              <div class="csv-preview-top">
                <div>
                  <span>#{{ item.rowNumber }}</span>
                  <strong>{{ item.title }}</strong>
                </div>
                <el-tag :type="item.status === 'ready' ? 'success' : 'danger'" effect="plain">
                  {{ item.status === 'ready'
                    ? (isEnglish ? 'Ready' : '可导入')
                    : (isEnglish ? 'Invalid' : '无效') }}
                </el-tag>
              </div>
              <p>{{ item.summary }}</p>
              <small>{{ item.reason }}</small>
            </article>
          </div>
          <div v-else class="pro-placeholder">
            <strong>{{ isEnglish ? 'No data rows found' : '没有发现数据行' }}</strong>
            <p>{{ isEnglish ? 'Only the header row is present in the selected file.' : '当前文件只有表头，没有实际数据行。' }}</p>
          </div>
        </div>

        <div v-if="csvImportFailureRows.length" class="csv-import-failure-section">
          <strong>{{ isEnglish ? 'Failed Rows' : '失败行' }}</strong>
          <div class="csv-import-failure-list">
            <article v-for="item in csvImportFailureRows" :key="`failure-${item.rowNumber}`" class="csv-import-failure-card">
              <span>#{{ item.rowNumber }} · {{ item.title }}</span>
              <p>{{ item.message }}</p>
            </article>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="reselectCsvImportFile">
            {{ isEnglish ? 'Choose Another File' : '重新选择文件' }}
          </el-button>
          <el-button @click="csvImportDialogVisible = false">
            {{ csvImportCompleted ? (isEnglish ? 'Close' : '关闭') : (isEnglish ? 'Cancel' : '取消') }}
          </el-button>
          <el-button
            v-if="!csvImportCompleted"
            type="primary"
            :loading="csvImportBusy"
            :disabled="!csvImportReadyCount"
            @click="runCsvImport"
          >
            {{ isEnglish ? `Import ${csvImportReadyCount} Row(s)` : `导入 ${csvImportReadyCount} 行` }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="uploadDialogVisible"
      width="520px"
      :title="`Import ${selectedDocumentPresetLabel}`"
      destroy-on-close
    >
      <div class="document-dialog-body">
        <div class="filter-item">
          <label>Document Category</label>
          <el-select v-model="selectedDocumentPreset" style="width: 100%">
            <el-option
              v-for="preset in documentPresets"
              :key="preset.key"
              :label="preset.label"
              :value="preset.key"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <label>Display Name</label>
          <el-input v-model="uploadDraft.displayName" placeholder="Display Name" />
        </div>
        <div class="filter-item">
          <label>Source File</label>
          <div class="document-picker-row">
            <el-input :model-value="uploadDraft.originalFileName" placeholder="Choose a local file" readonly />
            <el-button @click="pickDocumentFile">Choose File</el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">Cancel</el-button>
          <el-button type="primary" :loading="uploadBusy" @click="saveDocumentAttachment">Import</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
 </template>

<style scoped>
.pro-workspace { min-height: 100vh; display: flex; flex-direction: column; padding: 40px 80px; }
.pro-toolbar { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.pro-label { font-size: 11px; font-weight: 700; color: var(--pro-text-secondary); text-transform: uppercase; letter-spacing: 0.1em; }
.pro-title { font-size: 32px; font-weight: 800; margin: 4px 0 0; letter-spacing: -0.04em; }
.toolbar-actions { display: flex; gap: 12px; }

.context-panel,
.filter-panel { border: 1px solid var(--pro-border); border-radius: var(--radius-pro); background: var(--pro-surface, #fff); padding: 18px 20px; margin-bottom: 20px; }
.context-panel { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.context-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.context-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; background: var(--pro-border-soft); font-size: 12px; }
.context-chip strong { color: var(--pro-text-secondary); }

.filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.filter-item label { display: block; font-size: 11px; font-weight: 700; color: var(--pro-text-secondary); margin-bottom: 8px; text-transform: uppercase; }
.filter-actions { margin-top: 16px; display: flex; justify-content: flex-end; }
.client-failure-notice {
  margin-bottom: 20px;
}
.client-failure-notice.warning {
  border-style: solid;
  border-color: color-mix(in srgb, var(--app-warning) 35%, var(--app-border));
  background: color-mix(in srgb, var(--app-warning) 6%, var(--app-surface));
}
.client-failure-notice.danger {
  border-style: solid;
  border-color: color-mix(in srgb, var(--app-danger) 40%, var(--app-border));
  background: color-mix(in srgb, var(--app-danger) 5%, var(--app-surface));
}

.pro-content { display: flex; flex-direction: column; gap: 24px; }
.draft-sheet { border: 1px solid var(--pro-border); border-radius: var(--radius-pro); background: var(--pro-surface, #fff); box-shadow: var(--pro-shadow-lift); }
.pro-table-wrapper { display: flex; flex-direction: column; gap: 2px; }
.pro-item-group { border-radius: var(--radius-pro); transition: all 0.35s cubic-bezier(0.2, 0, 0, 1); border: 1px solid transparent; }
.pro-item-group.is-expanded { margin: 14px -12px; background: var(--pro-surface, #fff); border: 1px solid var(--pro-border); box-shadow: var(--pro-shadow-lift); }

.pro-row { display: flex; align-items: center; gap: 12px; padding: 16px 20px; cursor: pointer; border-radius: var(--radius-pro); }
.pro-row:hover { background: var(--pro-border-soft); }
.is-expanded .pro-row { border-bottom: 1px solid var(--pro-border-soft); background: color-mix(in srgb, var(--pro-border-soft) 65%, white); pointer-events: none; }

.row-cell { flex: 1; min-width: 0; font-size: 13px; font-weight: 500; }
.main-cell { font-weight: 700; flex: 2; }
.sub-cell { color: var(--pro-text-secondary); display: flex; align-items: center; }
.status-cell { display: flex; justify-content: flex-end; }

.pro-detail-sheet { overflow: hidden; }
.sheet-inner { padding: 36px; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; gap: 16px; }
.sheet-nav { display: flex; flex-direction: column; gap: 10px; }
.sheet-id { font-family: monospace; font-size: 11px; color: var(--pro-text-secondary); }
.sheet-steps { display: flex; align-items: center; gap: 8px; }
.step-node { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #b6bcc8; }
.step-node.active { color: var(--pro-text); }
.step-line { width: 24px; height: 1px; background: var(--pro-border); }
.sheet-stage-stack { display: flex; flex-direction: column; gap: 10px; }
.sheet-stage-rail {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 10px;
  min-width: min(860px, 100%);
}
.sheet-stage-node {
  border: 1px solid var(--pro-border);
  border-radius: 14px;
  padding: 12px 14px;
  background: var(--pro-surface, #fff);
  text-align: left;
  cursor: pointer;
  width: 100%;
}
.sheet-stage-node span {
  display: block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--pro-text-secondary);
}
.sheet-stage-node strong {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}
.sheet-stage-node.is-completed { border-color: color-mix(in srgb, var(--app-success) 35%, var(--pro-border)); background: color-mix(in srgb, var(--app-success) 6%, white); }
.sheet-stage-node.is-current { border-color: color-mix(in srgb, var(--app-warning) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-warning) 10%, white); }
.sheet-stage-node.is-blocked { border-color: color-mix(in srgb, var(--app-danger) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 4%, white); }
.sheet-stage-node.is-cancelled { border-color: color-mix(in srgb, var(--app-danger) 60%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 8%, white); }
.sheet-stage-caption { margin: 0; font-size: 12px; color: var(--pro-text-secondary); line-height: 1.6; }
.sheet-actions { display: flex; flex-wrap: wrap; gap: 8px; }

.sheet-title { font-size: 34px; font-weight: 900; letter-spacing: -0.05em; margin: 0 0 36px; }
.detail-section-nav { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 24px; }
.section-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--pro-border);
  border-radius: 999px;
  padding: 10px 14px;
  background: var(--pro-surface, #fff);
  color: var(--pro-text);
  cursor: pointer;
}
.section-chip span { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--pro-text-secondary); }
.section-chip strong { font-size: 13px; }
.section-chip.warning { border-color: color-mix(in srgb, var(--app-warning) 35%, var(--pro-border)); }
.section-chip.danger { border-color: color-mix(in srgb, var(--app-danger) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 4%, white); }
.section-chip.success { border-color: color-mix(in srgb, var(--app-success) 35%, var(--pro-border)); }
.section-chip.active {
  border-color: color-mix(in srgb, var(--app-primary) 55%, var(--pro-border));
  background: color-mix(in srgb, var(--app-primary) 8%, white);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-primary) 30%, transparent);
}
.detail-section-notice {
  margin-bottom: 24px;
}
.sheet-insights { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
.insight-card { border: 1px solid var(--pro-border); border-radius: 12px; padding: 16px; background: color-mix(in srgb, var(--pro-border-soft) 70%, white); }
.insight-card label { font-size: 10px; font-weight: 700; color: var(--pro-text-secondary); text-transform: uppercase; display: block; margin-bottom: 8px; }
.insight-card p { font-size: 16px; font-weight: 700; margin: 0; }
.context-cockpit-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
.context-cockpit-card { border: 1px solid var(--pro-border); border-radius: 14px; padding: 14px 16px; background: var(--pro-surface, #fff); }
.context-card-header h5 { margin: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; }
.context-card-header p { margin: 6px 0 0; font-size: 12px; color: var(--pro-text-secondary); line-height: 1.6; }
.context-chain-list,
.context-alert-list,
.context-template-list,
.context-coverage-list { margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
.context-chain-item,
.context-alert-item,
.context-template-item,
.context-coverage-row {
  border: 1px solid var(--pro-border);
  border-radius: 12px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--pro-border-soft) 45%, white);
  text-align: left;
}
.context-coverage-row,
.context-template-item {
  width: 100%;
  cursor: pointer;
}
.context-chain-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.context-chain-top strong,
.context-alert-item strong,
.context-template-item strong,
.context-coverage-row strong { font-size: 13px; }
.context-owner-grid { margin-top: 10px; display: grid; gap: 6px; font-size: 12px; color: var(--pro-text-secondary); }
.context-chain-note,
.context-alert-item p,
.context-template-item p,
.context-coverage-row p { margin: 8px 0 0; font-size: 12px; line-height: 1.6; color: var(--pro-text-secondary); }
.context-alert-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.context-alert-item.warning { border-color: color-mix(in srgb, var(--app-warning) 35%, var(--pro-border)); }
.context-alert-item.danger { border-color: color-mix(in srgb, var(--app-danger) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 4%, white); }

.sheet-meta-panel,
.workflow-panel { border: 1px solid var(--pro-border); border-radius: 16px; padding: 18px; background: color-mix(in srgb, var(--pro-border-soft) 55%, white); }
.sheet-meta-panel + .sheet-meta-panel,
.sheet-meta-panel + .workflow-grid,
.workflow-grid + .field-section { margin-top: 24px; }
.panel-compact-hint { margin: 14px 0 0; font-size: 12px; line-height: 1.6; color: var(--pro-text-secondary); }
.meta-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.meta-header h4 { margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; }
.meta-header p { margin: 4px 0 0; font-size: 12px; color: var(--pro-text-secondary); }
.meta-link-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.meta-link-card,
.suggestion-item { border: 1px solid var(--pro-border); border-radius: 14px; padding: 14px 16px; background: var(--pro-surface, #fff); cursor: pointer; text-align: left; }
.meta-link-card span,
.suggestion-item span { display: block; font-size: 11px; color: var(--pro-text-secondary); text-transform: uppercase; }
.meta-link-card strong,
.suggestion-item strong { display: block; margin-top: 8px; font-size: 16px; }
.meta-link-card p { margin: 8px 0 0; font-size: 12px; color: var(--pro-text-secondary); }
.meta-link-card.static-card.tone-success { border-color: color-mix(in srgb, var(--app-success) 35%, var(--pro-border)); }
.meta-link-card.static-card.tone-warning { border-color: color-mix(in srgb, var(--app-warning) 35%, var(--pro-border)); }
.meta-link-card.static-card.tone-danger { border-color: color-mix(in srgb, var(--app-danger) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 4%, white); }
.result-rail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-top: 16px; }
.result-rail-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--pro-border);
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--pro-surface, #fff);
}
.result-rail-card.tone-success { border-color: color-mix(in srgb, var(--app-success) 35%, var(--pro-border)); }
.result-rail-card.tone-warning { border-color: color-mix(in srgb, var(--app-warning) 35%, var(--pro-border)); background: color-mix(in srgb, var(--app-warning) 6%, white); }
.result-rail-card.tone-danger { border-color: color-mix(in srgb, var(--app-danger) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 4%, white); }
.result-rail-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.result-rail-top span {
  display: block;
  font-size: 11px;
  color: var(--pro-text-secondary);
  text-transform: uppercase;
}
.result-rail-top strong {
  display: block;
  margin-top: 8px;
  font-size: 16px;
  line-height: 1.4;
  word-break: break-word;
}
.result-rail-card p {
  margin: 0;
  min-height: 58px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--pro-text-secondary);
}
.result-pack-strip {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.result-pack-strip span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-warning) 10%, white);
  border: 1px solid color-mix(in srgb, var(--app-warning) 28%, var(--pro-border));
  color: var(--pro-text);
  font-size: 11px;
  font-weight: 700;
}
.result-pack-strip span.ready {
  background: color-mix(in srgb, var(--app-success) 10%, white);
  border-color: color-mix(in srgb, var(--app-success) 28%, var(--pro-border));
}
.record-cutover-risk {
  margin-top: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid color-mix(in srgb, var(--app-warning) 35%, var(--pro-border));
  border-radius: 14px;
  padding: 16px;
  background: color-mix(in srgb, var(--app-warning) 6%, white);
}
.record-cutover-risk-copy { flex: 1; min-width: 0; }
.record-cutover-risk-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.record-cutover-risk-copy p {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--pro-text-secondary);
}
.record-cutover-risk-copy span {
  display: block;
  margin-top: 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--pro-text-secondary);
  text-transform: uppercase;
}
.record-cutover-risk-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.review-checklist { display: flex; flex-direction: column; gap: 10px; }
.review-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--pro-border);
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--pro-surface, #fff);
}
.review-item.ready { border-color: color-mix(in srgb, var(--app-success) 35%, var(--pro-border)); }
.review-item.warning { border-color: color-mix(in srgb, var(--app-warning) 35%, var(--pro-border)); }
.review-item.missing { border-color: color-mix(in srgb, var(--app-danger) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 4%, white); }
.review-copy { flex: 1; min-width: 0; }
.review-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.review-title-row strong { font-size: 14px; }
.review-title-row p,
.review-copy p { margin: 8px 0 0; font-size: 12px; color: var(--pro-text-secondary); line-height: 1.6; }
.review-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pro-border-soft) 85%, white);
  font-size: 11px;
  font-weight: 700;
  color: var(--pro-text-secondary);
  text-transform: uppercase;
}
.exception-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.exception-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid var(--pro-border);
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--pro-surface, #fff);
}
.exception-card.warning { border-color: color-mix(in srgb, var(--app-warning) 35%, var(--pro-border)); }
.exception-card.danger { border-color: color-mix(in srgb, var(--app-danger) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 4%, white); }
.exception-card.success { border-color: color-mix(in srgb, var(--app-success) 35%, var(--pro-border)); }
.exception-copy strong { font-size: 14px; }
.exception-copy p { margin: 8px 0 0; font-size: 12px; color: var(--pro-text-secondary); line-height: 1.6; }
.document-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.document-missing-bar {
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--app-warning) 35%, var(--pro-border));
  background: color-mix(in srgb, var(--app-warning) 8%, white);
}
.document-missing-bar strong {
  display: block;
  color: var(--pro-text);
  font-size: 13px;
}
.document-missing-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.document-missing-list span {
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
.document-missing-list span.ready {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}
.document-preset-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.document-category-card { border: 1px solid var(--pro-border); border-radius: 14px; padding: 14px 16px; background: var(--pro-surface, #fff); }
.document-category-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.document-category-header strong { color: var(--pro-text); font-size: 14px; }
.document-category-header p { margin: 8px 0 0; font-size: 12px; color: var(--pro-text-secondary); line-height: 1.5; }
.document-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.document-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; width: 100%; border: 1px solid var(--pro-border); border-radius: 12px; padding: 10px 12px; background: color-mix(in srgb, var(--pro-border-soft) 45%, white); text-align: left; cursor: pointer; }
.document-row span { color: var(--pro-text); font-size: 13px; }
.document-row strong { color: var(--pro-text-secondary); font-size: 11px; text-transform: uppercase; }
.document-extra-list { margin-top: 18px; }
.workflow-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 24px; }
.workflow-stage-shell { grid-column: 1 / -1; }
.workflow-stage-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
.workflow-stage-card,
.workflow-execution-card {
  border: 1px solid var(--pro-border);
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--pro-surface, #fff);
  text-align: left;
  width: 100%;
}
.workflow-stage-card.clickable,
.workflow-execution-card.clickable { cursor: pointer; }
.workflow-stage-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.workflow-stage-card span,
.workflow-execution-card span {
  display: block;
  font-size: 11px;
  color: var(--pro-text-secondary);
  text-transform: uppercase;
}
.workflow-stage-card strong,
.workflow-execution-card strong {
  display: block;
  margin-top: 8px;
  font-size: 16px;
  line-height: 1.4;
  word-break: break-word;
}
.workflow-stage-card p,
.workflow-execution-card p {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--pro-text-secondary);
}
.workflow-stage-card.is-completed { border-color: color-mix(in srgb, var(--app-success) 35%, var(--pro-border)); background: color-mix(in srgb, var(--app-success) 6%, white); }
.workflow-stage-card.is-current { border-color: color-mix(in srgb, var(--app-warning) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-warning) 10%, white); }
.workflow-stage-card.is-blocked { border-color: color-mix(in srgb, var(--app-danger) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 4%, white); }
.workflow-stage-card.is-pending { background: color-mix(in srgb, var(--pro-border-soft) 60%, white); }
.workflow-stage-card.is-cancelled { border-color: color-mix(in srgb, var(--app-danger) 60%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 8%, white); }
.workflow-execution-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 16px; }
.workflow-execution-card.tone-success { border-color: color-mix(in srgb, var(--app-success) 35%, var(--pro-border)); }
.workflow-execution-card.tone-warning { border-color: color-mix(in srgb, var(--app-warning) 35%, var(--pro-border)); background: color-mix(in srgb, var(--app-warning) 6%, white); }
.workflow-execution-card.tone-danger { border-color: color-mix(in srgb, var(--app-danger) 45%, var(--pro-border)); background: color-mix(in srgb, var(--app-danger) 4%, white); }
.workflow-card-grid { display: grid; gap: 12px; }
.workflow-card { border-radius: 14px; padding: 14px 16px; border: 1px solid var(--pro-border); background: var(--pro-surface, #fff); }
.workflow-card.info { background: rgba(52, 152, 219, 0.06); }
.workflow-card.success { background: rgba(40, 167, 156, 0.08); }
.workflow-card.warning { background: rgba(245, 166, 35, 0.08); }
.workflow-card span { display: block; font-size: 11px; color: var(--pro-text-secondary); text-transform: uppercase; }
.workflow-card strong { display: block; margin-top: 8px; font-size: 16px; }
.workflow-alert-list,
.suggestion-list { display: flex; flex-direction: column; gap: 10px; }
.workflow-alert { border-radius: 14px; padding: 14px 16px; background: rgba(245, 166, 35, 0.1); color: var(--pro-text); font-size: 13px; line-height: 1.6; }

.field-section + .field-section { margin-top: 28px; }
.field-section-title { margin: 24px 0 18px; font-size: 13px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--pro-text-secondary); }
.sheet-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px 28px; }
.sheet-field.is-wide { grid-column: 1 / -1; }
.sheet-field label { font-size: 10px; font-weight: 700; color: var(--pro-text-secondary); text-transform: uppercase; margin-bottom: 8px; display: block; }
.sheet-field p { font-size: 15px; font-weight: 500; margin: 0; word-break: break-word; }
.field-input-stack { display: flex; flex-direction: column; gap: 8px; }
.sheet-field.is-code .field-input-stack :deep(textarea),
.sheet-field.is-code p { font-family: 'JetBrains Mono', 'Fira Code', monospace; line-height: 1.7; }
.sheet-field.is-code .field-input-stack :deep(textarea) { min-height: 220px; }
.wide-field-value { margin: 0; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--pro-border); background: color-mix(in srgb, var(--pro-border-soft) 55%, white); white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.7; }
.wide-field-value.is-code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
.field-hint-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.relation-hint { margin: 0; font-size: 12px; color: var(--pro-text-secondary); }

.sheet-ext-panel { margin-top: 36px; border: 1px solid var(--pro-border); border-radius: 14px; padding: 18px; background: color-mix(in srgb, var(--pro-border-soft) 55%, white); }
.ext-knowledge-grid { display: grid; gap: 16px; margin-bottom: 18px; }
.ext-knowledge-card { border: 1px solid var(--pro-border); border-radius: 14px; padding: 16px; background: var(--pro-surface, #fff); }
.ext-preset-grid { display: grid; gap: 12px; }
.ext-preset-row { display: grid; gap: 8px; }
.ext-preset-row label { font-size: 11px; font-weight: 700; color: var(--pro-text-secondary); text-transform: uppercase; }
.ext-preset-value { margin: 0; font-size: 14px; line-height: 1.6; word-break: break-word; }
.ext-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.ext-header > div { display: flex; flex-direction: column; gap: 4px; }
.ext-header h4 { margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; }
.ext-header span { font-size: 12px; color: var(--pro-text-secondary); }
.ext-editor-grid { display: grid; gap: 12px; }
.ext-editor-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto; gap: 12px; align-items: center; }
.ext-editor-row label { display: block; margin-bottom: 6px; font-size: 11px; font-weight: 700; color: var(--pro-text-secondary); text-transform: uppercase; }
.ext-editor-row p { margin: 0; font-size: 14px; word-break: break-word; }
.csv-import-dialog { display: flex; flex-direction: column; gap: 18px; }
.csv-import-source strong { display: block; font-size: 15px; }
.csv-import-source p,
.csv-import-preview-header p,
.csv-import-failure-card p { margin: 8px 0 0; font-size: 12px; line-height: 1.6; color: var(--pro-text-secondary); }
.csv-import-source-meta {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--pro-text-secondary);
  text-transform: uppercase;
}
.csv-import-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.csv-import-stat-card {
  border: 1px solid var(--pro-border);
  border-radius: 14px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--pro-border-soft) 45%, white);
}
.csv-import-stat-card span {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--pro-text-secondary);
  text-transform: uppercase;
}
.csv-import-stat-card strong {
  display: block;
  margin-top: 10px;
  font-size: 20px;
  line-height: 1;
}
.csv-import-stat-card.ready {
  border-color: color-mix(in srgb, var(--app-success) 32%, var(--pro-border));
}
.csv-import-stat-card.warning {
  border-color: color-mix(in srgb, var(--app-warning) 36%, var(--pro-border));
}
.csv-import-chip-block label,
.csv-import-failure-section strong,
.csv-import-preview-header strong {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: var(--pro-text-secondary);
  text-transform: uppercase;
}
.csv-import-chip-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.csv-import-chip-list span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--pro-border);
  background: color-mix(in srgb, var(--pro-border-soft) 55%, white);
  font-size: 11px;
  font-weight: 700;
}
.csv-import-chip-list.ext span {
  border-color: color-mix(in srgb, var(--app-success) 28%, var(--pro-border));
  background: color-mix(in srgb, var(--app-success) 8%, white);
}
.csv-import-chip-list.warning span {
  border-color: color-mix(in srgb, var(--app-warning) 32%, var(--pro-border));
  background: color-mix(in srgb, var(--app-warning) 8%, white);
}
.csv-import-chip-list span.empty {
  color: var(--pro-text-secondary);
}
.csv-import-warning-box,
.csv-import-preview-section,
.csv-import-failure-section {
  border: 1px solid var(--pro-border);
  border-radius: 14px;
  padding: 16px;
  background: var(--pro-surface, #fff);
}
.csv-import-warning-box {
  border-color: color-mix(in srgb, var(--app-warning) 36%, var(--pro-border));
  background: color-mix(in srgb, var(--app-warning) 6%, white);
}
.csv-import-warning-box strong {
  display: block;
  font-size: 13px;
}
.csv-import-preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.csv-preview-list,
.csv-import-failure-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.csv-preview-card,
.csv-import-failure-card {
  border: 1px solid var(--pro-border);
  border-radius: 12px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--pro-border-soft) 45%, white);
}
.csv-preview-card.ready {
  border-color: color-mix(in srgb, var(--app-success) 32%, var(--pro-border));
}
.csv-preview-card.invalid,
.csv-import-failure-card {
  border-color: color-mix(in srgb, var(--app-danger) 36%, var(--pro-border));
  background: color-mix(in srgb, var(--app-danger) 4%, white);
}
.csv-preview-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.csv-preview-top span {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--pro-text-secondary);
  text-transform: uppercase;
}
.csv-preview-top strong,
.csv-import-failure-card span {
  display: block;
  margin-top: 6px;
  font-size: 14px;
}
.csv-preview-card p {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
}
.csv-preview-card small {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: var(--pro-text-secondary);
}
.document-dialog-body { display: flex; flex-direction: column; gap: 16px; }
.document-picker-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; }

.sheet-notebook { margin-top: 44px; }
.notebook-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 16px; }
.notebook-title { font-size: 13px; font-weight: 800; margin: 0; text-transform: uppercase; border-bottom: 2px solid var(--pro-text); width: fit-content; padding-bottom: 4px; }
.notebook-summary,
.notebook-mode { margin: 8px 0 0; color: var(--pro-text-secondary); font-size: 12px; line-height: 1.5; }
.notebook-mini-table { border: 1px solid var(--pro-border); border-radius: 12px; overflow: hidden; }
.mini-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 12px 16px; border-top: 1px solid var(--pro-border-soft); font-size: 12px; }
.mini-row:first-child { border-top: 0; }
.mini-head { background: color-mix(in srgb, var(--pro-border-soft) 70%, white); font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--pro-text-secondary); }
.mini-row-button { width: 100%; border: 0; background: var(--pro-surface, #fff); text-align: left; cursor: pointer; }
.mini-row-button:hover { background: var(--pro-border-soft); }
.pro-placeholder { display: flex; flex-direction: column; gap: 6px; border: 1px dashed var(--pro-border); border-radius: 12px; padding: 18px; color: var(--pro-text-secondary); font-size: 13px; }
.pro-placeholder p,
.pro-placeholder strong { margin: 0; }

.pagination-wrap { display: flex; justify-content: flex-end; padding-bottom: 36px; }

@media (max-width: 1200px) {
  .pro-workspace { padding: 28px 24px; }
  .sheet-inner { padding: 24px; }
  .context-cockpit-grid,
  .workflow-grid { grid-template-columns: 1fr; }
  .sheet-stage-rail { min-width: 0; }
}

@media (max-width: 900px) {
  .sheet-header,
  .notebook-header,
  .context-panel,
  .document-category-header,
  .csv-import-preview-header,
  .document-picker-row,
  .review-item,
  .record-cutover-risk { flex-direction: column; align-items: stretch; }

  .ext-editor-row,
  .field-hint-row { grid-template-columns: 1fr; flex-direction: column; align-items: stretch; }

  .csv-import-stat-grid { grid-template-columns: 1fr; }

  .detail-section-nav { align-items: stretch; }
  .sheet-stage-rail,
  .workflow-stage-grid,
  .workflow-execution-grid { grid-template-columns: 1fr; }
}
</style>
