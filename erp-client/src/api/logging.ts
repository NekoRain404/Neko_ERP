import { fetchEntityPage } from '@/api/modules'
import type { BaseEntity } from '@/types/api'
import http from '@/api/http'
import type { ApiResult } from '@/types/api'

export interface LoggingActivityRecord extends BaseEntity {
  id: number
  createDate: string
  type: string
  name: string
  level: string
  message: string
  metadata?: string | null
  resModel?: string | null
  resId?: number | null
  userId?: number | null
}

export async function fetchRecentActivityLogs(size = 20) {
  return fetchEntityPage<LoggingActivityRecord>('/base/ir-logging', {
    current: 1,
    size,
  })
}

export async function fetchIncrementalActivityLogs(params: {
  sinceId?: number
  size?: number
  type?: string
  resModel?: string
}) {
  const response = await http.get<ApiResult<LoggingActivityRecord[]>>('/base/ir-logging/recent', {
    params: {
      current: 1,
      size: params.size ?? 20,
      sinceId: params.sinceId,
      type: params.type,
      resModel: params.resModel,
    },
  })
  return response.data.data
}
