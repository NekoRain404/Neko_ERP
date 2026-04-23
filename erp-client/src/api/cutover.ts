import http from '@/api/http'
import type { ApiResult } from '@/types/api'

export interface RemoteCutoverConfig {
  configKey: string
  configData: Record<string, any>
  updatedTime?: string | null
  updatedBy?: string | null
}

export async function fetchCurrentCutoverConfig() {
  const response = await http.get<ApiResult<RemoteCutoverConfig | null>>('/system/cutover-config/current')
  return response.data.data || null
}

export async function saveCurrentCutoverConfig(configData: Record<string, any>, updatedBy?: string) {
  const response = await http.put<ApiResult<RemoteCutoverConfig>>('/system/cutover-config/current', {
    configData,
    updatedBy,
  })
  return response.data.data
}
