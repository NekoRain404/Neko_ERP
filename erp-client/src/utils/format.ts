const STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  sale: 'Sale Order',
  purchase: 'Purchase Order',
  confirmed: 'Waiting',
  confirm: 'Confirmed',
  validate: 'Approved',
  posted: 'Posted',
  reversed: 'Reversed',
  refuse: 'Refused',
  assigned: 'Ready',
  done: 'Done',
  cancel: 'Cancelled',
  active: 'Active',
  open: 'Open',
  matched: 'Matched',
  cancelled: 'Cancelled',
  gain: 'Gain',
  loss: 'Loss',
  match: 'Match',
  component: 'Component',
  finished: 'Finished',
}

const MODULE_STATUS_LABELS: Record<string, Record<string, Record<string, string>>> = {
  crmLead: {
    priority: {
      '0': 'New',
      '1': 'Qualified',
      '2': 'Proposition',
      '3': 'Won',
    },
  },
  projectTask: {
    stageId: {
      '0': 'Cancelled',
      '1': 'Planned',
      '2': 'In Progress',
      '3': 'Done',
    },
  },
  sysUser: {
    status: {
      '0': 'Disabled',
      '1': 'Enabled',
    },
  },
  sysRole: {
    status: {
      '0': 'Disabled',
      '1': 'Enabled',
    },
  },
  sysScript: {
    status: {
      '0': 'Disabled',
      '1': 'Enabled',
    },
  },
  accountMoveLine: {
    reconciled: {
      draft: 'Draft',
      open: 'Open',
      matched: 'Matched',
      reversed: 'Reversed',
      cancelled: 'Cancelled',
    },
  },
  stockInventoryLine: {
    differenceState: {
      match: 'Match',
      gain: 'Gain',
      loss: 'Loss',
    },
  },
  stockMove: {
    moveRole: {
      component: 'Component',
      finished: 'Finished',
    },
  },
}

export function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

export function formatAmount(value?: number | string) {
  if (value === undefined || value === null || value === '') return '-'
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return String(value)
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue)
}

export function formatState(value?: string) {
  if (!value) return STATE_LABELS.draft
  return STATE_LABELS[value] || value
}

export function formatModuleStatus(moduleKey: string, fieldKey: string, value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '-'
  const moduleMap = MODULE_STATUS_LABELS[moduleKey]?.[fieldKey]
  if (moduleMap) {
    return moduleMap[String(value)] || String(value)
  }
  if (fieldKey === 'state' && typeof value === 'string') {
    return formatState(value)
  }
  if (fieldKey === 'paymentType') {
    return String(value) === 'outbound' ? 'Vendor Payment' : String(value) === 'inbound' ? 'Customer Payment' : String(value)
  }
  return String(value)
}

export function formatBoolean(value?: boolean | string | number | null) {
  if (value === undefined || value === null || value === '') return '-'
  return value === true || value === 'true' || value === 1 ? '是' : '否'
}

export function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN')
}
