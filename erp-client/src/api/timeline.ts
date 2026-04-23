import http from '@/api/http'
import type { ApiResult } from '@/types/api'
import type { ModuleKey } from '@/config/module-manifest'

export interface TimelineActivity {
  timestamp?: string
  type: string
  title: string
  content: string
  author?: string
  relatedRef?: string
}

export async function fetchTimeline(moduleKey: ModuleKey, id: number) {
  const response = await http.get<ApiResult<TimelineActivity[]>>('/system/timeline', {
    params: { moduleKey, id },
  })
  return response.data.data || []
}

export async function createTimelineNote(moduleKey: ModuleKey, id: number, content: string, authorName: string) {
  const response = await http.post<ApiResult<number>>('/system/timeline/note', {
    moduleKey,
    id,
    content,
    authorName,
  })
  return response.data.data
}
