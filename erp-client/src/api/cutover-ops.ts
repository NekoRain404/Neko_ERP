import http from '@/api/http'
import type { ApiResult } from '@/types/api'
import type {
  CutoverCloseTaskRecord,
  CutoverFinanceBatchReviewRecord,
  CutoverFinanceResultPackRecord,
  CutoverOpsBoard,
  CutoverRoleDeskTaskRecord,
} from '@/utils/cutover-ops'
import { normalizeCutoverOpsBoard as normalizeBoard } from '@/utils/cutover-ops'

export async function createRoleDeskTask(payload: Omit<CutoverRoleDeskTaskRecord, 'id' | 'createdAt' | 'slaStatus'> & { id?: string; createdAt?: string; slaStatus?: string }) {
  const response = await http.post<ApiResult<CutoverRoleDeskTaskRecord>>('/system/cutover-ops/role-desk-tasks', payload)
  return response.data.data
}

export async function createFinanceBatchReview(payload: Omit<CutoverFinanceBatchReviewRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const response = await http.post<ApiResult<CutoverFinanceBatchReviewRecord>>('/system/cutover-ops/finance-batch-reviews', payload)
  return response.data.data
}

export async function createFinanceResultPack(payload: Omit<CutoverFinanceResultPackRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const response = await http.post<ApiResult<CutoverFinanceResultPackRecord>>('/system/cutover-ops/finance-result-packs', payload)
  return response.data.data
}

export async function createCloseTask(payload: Omit<CutoverCloseTaskRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const response = await http.post<ApiResult<CutoverCloseTaskRecord>>('/system/cutover-ops/close-tasks', payload)
  return response.data.data
}

export async function fetchCutoverOpsBoard(limit = 240): Promise<CutoverOpsBoard> {
  const response = await http.get<ApiResult<unknown>>('/system/cutover-ops/board', {
    params: { limit },
  })
  return normalizeBoard(response.data.data)
}
