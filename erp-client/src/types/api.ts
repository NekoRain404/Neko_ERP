export interface ApiResult<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

export interface PageData<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages?: number
}

export type EntityValue = string | number | boolean | null | undefined

export interface BaseEntity {
  id?: number
  [key: string]: EntityValue
}

export interface QueryParams {
  current: number
  size: number
  keyword?: string
  [key: string]: string | number | boolean | undefined
}

export type FieldType =
  | 'text'
  | 'password'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'select'
  | 'switch'

export interface FieldOption {
  label: string
  value: string | number | boolean
}

export interface ModuleFieldConfig {
  key: string
  label: string
  type: FieldType
  list?: boolean
  form?: boolean
  readonly?: boolean
  required?: boolean
  width?: number
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  placeholder?: string
  options?: FieldOption[]
  formatter?: 'amount' | 'date' | 'datetime' | 'boolean' | 'tag'
  relation?: string
  min?: number
  precision?: number
}

export interface ModuleFieldGroupConfig {
  key: string
  title: string
  fields: string[]
}

export interface ModuleFilterConfig {
  key: string
  label: string
  fieldKey: string
  type: Extract<FieldType, 'text' | 'number' | 'date' | 'datetime' | 'select'>
  placeholder?: string
  options?: FieldOption[]
}

export interface ModuleDetailConfig {
  key: string
  title: string
  fields: string[]
}

export interface OdooActionConfig {
  key: string
  label: string
  type?: 'primary' | 'default' | 'success' | 'warning' | 'danger'
  visibleStates?: Array<string | number>
  confirmMessage?: string
}

export interface OdooStatusConfig {
  fieldKey: string
  visible: Array<string | number>
}

export interface OdooNotebookTabConfig {
  key: string
  title: string
  fields: string[]
  parentFieldKey?: string
}

export interface ModuleConfig {
  key: string
  title: string
  group: string
  description: string
  route: string
  apiBase: string
  keywordPlaceholder: string
  summaryKeys: string[]
  filters: ModuleFilterConfig[]
  fieldGroups: ModuleFieldGroupConfig[]
  detailSections: ModuleDetailConfig[]
  odooActions: OdooActionConfig[]
  odooStatus?: OdooStatusConfig
  odooEditableStates?: Array<string | number>
  odooEditableFieldsByState?: Record<string, string[]>
  odooFormGroups: ModuleFieldGroupConfig[]
  odooNotebookTabs: OdooNotebookTabConfig[]
  fields: ModuleFieldConfig[]
}
