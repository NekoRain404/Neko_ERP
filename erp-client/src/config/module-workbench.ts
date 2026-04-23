import type { ModuleKey } from '@/config/module-manifest'
import type { ModuleConfig } from '@/types/api'

export interface WorkbenchHighlightItem {
  label: string
  value: string
  description: string
}

export interface WorkbenchFocusItem {
  label: string
  description: string
}

export interface WorkbenchActionItem {
  label: string
  value: string
  description: string
}

export interface ModuleWorkbenchPreset {
  title: string
  description: string
  highlights: WorkbenchHighlightItem[]
  focusItems: WorkbenchFocusItem[]
  actionItems: WorkbenchActionItem[]
  note: string
}

export function buildModuleWorkbenchPreset(
  moduleKey: ModuleKey,
  config: ModuleConfig,
  isEnglish: boolean,
): ModuleWorkbenchPreset {
  // Derive a usable workbench shell from module config first, then reserve
  // custom views only for modules that truly need dedicated side workflows.
  const listFields = config.fields.filter((field) => field.list && field.key !== 'id').slice(0, 4)
  const filterFields = config.filters.slice(0, 3)
  const actionItems = config.odooActions.slice(0, 4)
  const notebookTabs = config.odooNotebookTabs.slice(0, 3)
  const summaryKeys = config.summaryKeys.slice(0, 3)
  const statusField = config.odooStatus?.fieldKey || 'state'
  const relationFieldCount = config.fields.filter((field) => Boolean(field.relation)).length
  const wideFieldCount = config.fields.filter((field) => field.type === 'textarea').length
  const formGroupCount = config.odooFormGroups.length || 1

  const fieldSummary = toSummary(
    listFields.map((field) => field.label || field.key),
    isEnglish ? 'List' : '列表',
  )
  const filterSummary = toSummary(
    filterFields.map((field) => field.label || field.fieldKey),
    isEnglish ? 'Manual Query' : '手动检索',
  )
  const actionSummary = toSummary(
    actionItems.map((item) => item.label),
    isEnglish ? 'No actions' : '暂无动作',
  )
  const notebookSummary = toSummary(
    notebookTabs.map((item) => item.title),
    isEnglish ? 'Primary record only' : '仅主记录',
  )
  const summaryFieldText = toSummary(summaryKeys, isEnglish ? 'Core fields' : '核心字段')
  const structureSummary = isEnglish
    ? `${formGroupCount} sections / ${relationFieldCount} relations / ${wideFieldCount} long fields`
    : `${formGroupCount} 个分区 / ${relationFieldCount} 个关系字段 / ${wideFieldCount} 个长文本字段`
  const moduleTitle = config.title || moduleKey

  return {
    title: isEnglish ? `${moduleTitle} Workbench` : `${moduleTitle}工作台`,
    description: isEnglish
      ? `Keep ${moduleTitle} on one desktop surface with list review, detail inspection, and Odoo-aligned actions.`
      : `将${moduleTitle}收敛到同一桌面工作台，统一处理列表审查、详情检查和 Odoo 对齐动作。`,
    highlights: [
      {
        label: isEnglish ? 'Core Surface' : '核心界面',
        value: moduleTitle,
        description: isEnglish
          ? `${moduleTitle} now uses the shared workbench shell so later Odoo migration can extend one consistent surface.`
          : `${moduleTitle}现已接入统一工作台壳层，后续补 Odoo 语义时沿用同一套界面骨架。`,
      },
      {
        label: isEnglish ? 'List Focus' : '列表重点',
        value: fieldSummary,
        description: isEnglish
          ? 'List columns stay centered on the most visible review fields instead of spreading the surface across detached pages.'
          : '列表优先聚焦最常用的审查字段，不再把工作流拆散到多个零散页面。',
      },
      {
        label: isEnglish ? 'Structure' : '结构覆盖',
        value: structureSummary,
        description: isEnglish
          ? 'Form sections, relation fields, and long-text areas are counted here so migration gaps stay visible while the shared shell expands.'
          : '这里直接展示表单分区、关系字段和长文本区域覆盖度，方便在共享壳层扩张时持续观察迁移缺口。',
      },
    ],
    focusItems: [
      {
        label: isEnglish ? 'Query Surface' : '检索面',
        description: isEnglish
          ? `Prioritize ${filterSummary} so operators can narrow records quickly before opening detail rows.`
          : `优先围绕${filterSummary}组织检索，让操作者先缩小范围再进入详情。`,
      },
      {
        label: isEnglish ? 'Status Gate' : '状态门禁',
        description: isEnglish
          ? `The detail panel continues to treat \`${statusField}\` as the workflow gate and only exposes actions that fit the current state.`
          : `详情面板继续以 \`${statusField}\` 作为流程门禁，只暴露当前状态允许的动作。`,
      },
      {
        label: isEnglish ? 'Detail Continuity' : '详情连续性',
        description: isEnglish
          ? `Notebook coverage: ${notebookSummary}. Summary fields remain ${summaryFieldText}.`
          : `明细连续性由 ${notebookSummary} 支撑，摘要字段持续围绕 ${summaryFieldText}。`,
      },
    ],
    actionItems: [
      {
        label: isEnglish ? 'Primary Actions' : '主动作',
        value: actionSummary,
        description: isEnglish
          ? 'Header actions are derived from the module configuration, so later action migration only needs config updates.'
          : '头部动作直接来自模块配置，后续迁移动作时优先改配置而不是重写页面。',
      },
      {
        label: isEnglish ? 'Child Drilldown' : '子级下钻',
        value: notebookSummary,
        description: isEnglish
          ? 'Related lines and execution tabs stay attached to the primary record to preserve the Odoo document chain.'
          : '相关明细和执行标签持续挂在主单据下，保持 Odoo 单据链不被打散。',
      },
      {
        label: isEnglish ? 'Summary Axis' : '摘要轴',
        value: summaryFieldText,
        description: isEnglish
          ? 'The workbench keeps the primary summary axis explicit so status review and side effects remain visible during migration.'
          : '工作台明确保留主摘要轴，便于在迁移过程中持续观察状态和副作用。',
      },
      {
        label: isEnglish ? 'Form Density' : '表单密度',
        value: structureSummary,
        description: isEnglish
          ? 'Use the same shell to host scripts, notes, and relation-heavy forms before deciding whether a module deserves a dedicated view.'
          : '先用同一套壳层承接脚本、备注和关系密集型表单，再决定模块是否真的需要独立视图。',
      },
    ],
    note: isEnglish
      ? `The shared shell is now active for ${moduleTitle}. Continue adding Odoo semantics through config, actions, and child tabs before creating dedicated views.`
      : `${moduleTitle}现已接入共享工作台。后续优先通过配置、动作和子标签继续补齐 Odoo 语义，再决定是否拆成独立视图。`,
  }
}

function toSummary(values: string[], fallback: string) {
  const normalized = values.map((value) => String(value).trim()).filter(Boolean)
  return normalized.length ? normalized.join(' / ') : fallback
}
