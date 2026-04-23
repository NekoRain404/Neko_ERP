import http from '@/api/http'
import type { ApiResult } from '@/types/api'
import type { ModuleKey } from '@/config/module-manifest'

export interface FinancialTraceCockpitRecord {
  id: number
  ref: string
  state?: string | null
  status: 'ready' | 'warning' | 'missing'
  originRef?: string | null
  invoiceRef?: string | null
  paymentRef?: string | null
  paymentState?: string | null
  journalEntryRef?: string | null
  reversedEntryRef?: string | null
  reversedFromRef?: string | null
  reconcileContext?: string | null
  lineCount?: number | null
  matchedLineCount?: number | null
  openLineCount?: number | null
  noteCount?: number | null
  attachmentCount?: number | null
  logCount?: number | null
  amount?: number | null
  warningKeys?: string[]
  missingKeys?: string[]
}

export interface FinancialTraceLink {
  relationType: string
  label: string
  moduleKey: ModuleKey | string
  recordId: number
  ref?: string | null
}

export interface FinancialTraceCockpit {
  moduleKey: ModuleKey | string
  recordCount: number
  readyCount: number
  warningCount: number
  missingCount: number
  evidenceReadyCount: number
  noteCount: number
  attachmentCount: number
  logCount: number
  warningKeys: string[]
  missingKeys: string[]
  records: FinancialTraceCockpitRecord[]
}

export interface FinancialTraceDetail {
  moduleKey: ModuleKey | string
  record: FinancialTraceCockpitRecord
  explanationLines: string[]
  settlementLines: string[]
  relatedLinks: FinancialTraceLink[]
}

export async function fetchFinancialTraceCockpit(moduleKey: ModuleKey, limit = 8) {
  const response = await http.get<ApiResult<FinancialTraceCockpit>>('/account/financial-trace/cockpit', {
    params: {
      moduleKey,
      limit,
    },
  })
  return response.data.data
}

export async function fetchFinancialTraceDetail(moduleKey: ModuleKey, id: number) {
  const response = await http.get<ApiResult<FinancialTraceDetail>>('/account/financial-trace/detail', {
    params: {
      moduleKey,
      id,
    },
  })
  return response.data.data
}
