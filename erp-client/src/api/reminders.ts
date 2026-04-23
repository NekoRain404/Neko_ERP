import http from '@/api/http'
import type { ApiResult } from '@/types/api'

export interface ReminderRecord {
  id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  content: string
  moduleKey: string
  recordId?: number | null
  relatedRef?: string | null
  createdAt?: string | null
}

export async function fetchReminders(params?: {
  limit?: number
  moduleKey?: string
  recordId?: number | null
}) {
  const response = await http.get<ApiResult<ReminderRecord[]>>('/system/reminders', {
    params: {
      limit: params?.limit ?? 20,
      moduleKey: params?.moduleKey,
      recordId: params?.recordId ?? undefined,
    },
  })
  return response.data.data || []
}
