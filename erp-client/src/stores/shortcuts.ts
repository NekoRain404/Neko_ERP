import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type ShortcutActionKey =
  | 'openCommandPalette'
  | 'openSettings'
  | 'backToList'
  | 'newRecord'
  | 'saveRecord'
  | 'exportDesk'
  | 'printDesk'
  | 'exportList'
  | 'importCsv'
  | 'refreshView'

export interface ShortcutDefinition {
  key: ShortcutActionKey
  zhLabel: string
  enLabel: string
  zhDesc: string
  enDesc: string
  defaultBinding: string
}

const SHORTCUTS_STORAGE_KEY = 'neko_erp_shortcuts'

export const SHORTCUT_EVENT_MAP: Record<ShortcutActionKey, string> = {
  openCommandPalette: 'neko-shortcut:toggle-command-palette',
  openSettings: 'neko-shortcut:open-settings',
  backToList: 'neko-shortcut:back-to-list',
  newRecord: 'neko-shortcut:new-record',
  saveRecord: 'neko-shortcut:save-record',
  exportDesk: 'neko-shortcut:export-desk',
  printDesk: 'neko-shortcut:print-desk',
  exportList: 'neko-shortcut:export-list',
  importCsv: 'neko-shortcut:import-csv',
  refreshView: 'neko-shortcut:refresh-view',
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    key: 'openCommandPalette',
    zhLabel: '打开命令台',
    enLabel: 'Open Command Palette',
    zhDesc: '快速搜索模块、最近对象和关键动作。',
    enDesc: 'Quickly search modules, recent objects, and core actions.',
    defaultBinding: 'Ctrl+K',
  },
  {
    key: 'openSettings',
    zhLabel: '打开设置',
    enLabel: 'Open Settings',
    zhDesc: '直接进入设置页，调整连接、主题和切换配置。',
    enDesc: 'Open settings directly for connection, theme, and cutover controls.',
    defaultBinding: 'Ctrl+,',
  },
  {
    key: 'backToList',
    zhLabel: '返回列表',
    enLabel: 'Back To List',
    zhDesc: '在详情页或新建页返回当前模块列表。',
    enDesc: 'Return from detail or create page back to the current module list.',
    defaultBinding: 'Alt+Left',
  },
  {
    key: 'newRecord',
    zhLabel: '新建记录',
    enLabel: 'New Record',
    zhDesc: '在当前模块中直接新建一条记录。',
    enDesc: 'Create a new record directly inside the current module.',
    defaultBinding: 'Ctrl+N',
  },
  {
    key: 'saveRecord',
    zhLabel: '保存当前表单',
    enLabel: 'Save Current Form',
    zhDesc: '保存当前详情页或新建页中的表单内容。',
    enDesc: 'Save the active form from detail or create page.',
    defaultBinding: 'Ctrl+S',
  },
  {
    key: 'exportDesk',
    zhLabel: '导出当前工作区',
    enLabel: 'Export Current Desk',
    zhDesc: '把当前详情工作区导出为交接或核对文档。',
    enDesc: 'Export the active detail desk for handoff or review.',
    defaultBinding: 'Ctrl+Shift+E',
  },
  {
    key: 'printDesk',
    zhLabel: '打印当前工作区',
    enLabel: 'Print Current Desk',
    zhDesc: '打印当前详情工作区，便于现场核对或签批。',
    enDesc: 'Print the active detail desk for review or sign-off.',
    defaultBinding: 'Ctrl+P',
  },
  {
    key: 'exportList',
    zhLabel: '导出当前列表',
    enLabel: 'Export Current List',
    zhDesc: '导出当前筛选后的列表结果。',
    enDesc: 'Export the currently filtered list result.',
    defaultBinding: 'Ctrl+Alt+E',
  },
  {
    key: 'importCsv',
    zhLabel: '批量导入 CSV',
    enLabel: 'Import CSV',
    zhDesc: '打开当前模块的 CSV 模板导入流程。',
    enDesc: 'Open the CSV import flow for the current module.',
    defaultBinding: 'Ctrl+Alt+I',
  },
  {
    key: 'refreshView',
    zhLabel: '刷新当前页面',
    enLabel: 'Refresh Current View',
    zhDesc: '刷新当前列表或详情页数据。',
    enDesc: 'Refresh the current list or detail page data.',
    defaultBinding: 'F5',
  },
]

export const useShortcutStore = defineStore('shortcuts', () => {
  const bindings = ref<Record<ShortcutActionKey, string>>(loadShortcutBindings())

  const rows = computed(() =>
    SHORTCUT_DEFINITIONS.map((definition) => ({
      ...definition,
      binding: bindings.value[definition.key] || definition.defaultBinding,
    })),
  )

  function bindingFor(actionKey: ShortcutActionKey) {
    return bindings.value[actionKey] || SHORTCUT_DEFINITIONS.find((item) => item.key === actionKey)?.defaultBinding || ''
  }

  function setBinding(actionKey: ShortcutActionKey, binding: string) {
    bindings.value = {
      ...bindings.value,
      [actionKey]: normalizeBindingText(binding),
    }
    persistShortcutBindings(bindings.value)
  }

  function resetBinding(actionKey: ShortcutActionKey) {
    const fallback = SHORTCUT_DEFINITIONS.find((item) => item.key === actionKey)?.defaultBinding || ''
    setBinding(actionKey, fallback)
  }

  function resetAllBindings() {
    bindings.value = loadDefaultBindings()
    persistShortcutBindings(bindings.value)
  }

  return {
    bindingFor,
    bindings,
    resetAllBindings,
    resetBinding,
    rows,
    setBinding,
  }
})

export function matchesShortcutBinding(binding: string, event: KeyboardEvent) {
  const parsed = parseShortcutBinding(binding)
  if (!parsed) return false

  const requiresPrimary = parsed.modifiers.has('ctrl')
  const primaryPressed = event.ctrlKey || event.metaKey
  if (requiresPrimary !== primaryPressed) return false
  if (parsed.modifiers.has('shift') !== event.shiftKey) return false
  if (parsed.modifiers.has('alt') !== event.altKey) return false

  return parsed.key === normalizeEventKey(event)
}

export function shortcutAllowedWhileTyping(actionKey: ShortcutActionKey) {
  return ['openCommandPalette', 'saveRecord'].includes(actionKey)
}

export function formatShortcutBinding(event: KeyboardEvent) {
  const key = normalizeEventKey(event)
  if (!key || isModifierKey(key)) return ''

  const parts: string[] = []
  // Keep Ctrl as the primary label so the same binding text works on Windows and macOS.
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')
  parts.push(formatBindingKey(key))
  return parts.join('+')
}

export function isTypingElement(target: EventTarget | null) {
  const element = target as HTMLElement | null
  if (!element) return false
  const tagName = element.tagName?.toLowerCase()
  return Boolean(
    element.isContentEditable ||
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select',
  )
}

function loadShortcutBindings() {
  const defaults = loadDefaultBindings()
  if (typeof window === 'undefined') return defaults
  const raw = window.localStorage.getItem(SHORTCUTS_STORAGE_KEY)
  if (!raw) return defaults
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaults
    return {
      ...defaults,
      ...parsed,
    }
  } catch {
    return defaults
  }
}

function loadDefaultBindings() {
  return SHORTCUT_DEFINITIONS.reduce<Record<ShortcutActionKey, string>>((acc, definition) => {
    acc[definition.key] = definition.defaultBinding
    return acc
  }, {} as Record<ShortcutActionKey, string>)
}

function persistShortcutBindings(bindings: Record<ShortcutActionKey, string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(bindings))
}

function normalizeBindingText(binding: string) {
  return String(binding || '').trim() || 'Ctrl+K'
}

function parseShortcutBinding(binding: string) {
  const parts = String(binding || '')
    .split('+')
    .map((item) => item.trim())
    .filter(Boolean)
  if (!parts.length) return null
  const key = normalizeShortcutKey(parts[parts.length - 1])
  if (!key) return null
  const modifiers = new Set(parts.slice(0, -1).map((item) => item.toLowerCase()))
  return { key, modifiers }
}

function normalizeShortcutKey(raw: string) {
  const key = raw.trim().toLowerCase()
  if (!key) return ''
  if (key === 'esc' || key === 'escape') return 'escape'
  if (key === 'left' || key === 'arrowleft') return 'left'
  if (key === 'right' || key === 'arrowright') return 'right'
  if (key === 'up' || key === 'arrowup') return 'up'
  if (key === 'down' || key === 'arrowdown') return 'down'
  if (key === 'comma') return ','
  return key
}

function normalizeEventKey(event: KeyboardEvent) {
  const key = String(event.key || '').toLowerCase()
  if (key === 'escape') return 'escape'
  if (key === 'arrowleft') return 'left'
  if (key === 'arrowright') return 'right'
  if (key === 'arrowup') return 'up'
  if (key === 'arrowdown') return 'down'
  if (key === ' ') return 'space'
  return key
}

function isModifierKey(key: string) {
  return ['control', 'meta', 'shift', 'alt'].includes(key)
}

function formatBindingKey(key: string) {
  if (key === 'escape') return 'Escape'
  if (key === 'left') return 'Left'
  if (key === 'right') return 'Right'
  if (key === 'up') return 'Up'
  if (key === 'down') return 'Down'
  if (key === 'space') return 'Space'
  if (key === ',') return ','
  if (/^f\d{1,2}$/.test(key)) return key.toUpperCase()
  return key.length === 1 ? key.toUpperCase() : key
}
