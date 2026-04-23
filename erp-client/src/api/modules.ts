import http from '@/api/http'
import type { ApiResult, BaseEntity, PageData, QueryParams } from '@/types/api'

export async function fetchEntityPage<T extends BaseEntity>(
  basePath: string,
  params: QueryParams,
) {
  const response = await http.get<ApiResult<PageData<T>>>(`${basePath}/list`, { params })
  return response.data.data
}

export async function fetchEntityById<T extends BaseEntity>(basePath: string, id: number) {
  const response = await http.get<ApiResult<T>>(`${basePath}/${id}`)
  return response.data.data
}

export async function executeEntityAction(basePath: string, id: number, action: string) {
  const response = await http.post<ApiResult<boolean>>(`${basePath}/${id}/actions/${action}`)
  return response.data.data
}

export async function createEntity<T extends BaseEntity>(basePath: string, payload: T) {
  const response = await http.post<ApiResult<boolean>>(basePath, payload)
  return response.data.data
}

export async function updateEntity<T extends BaseEntity>(
  basePath: string,
  id: number,
  payload: T,
) {
  const response = await http.put<ApiResult<boolean>>(`${basePath}/${id}`, payload)
  return response.data.data
}

export async function deleteEntity(basePath: string, id: number) {
  const response = await http.delete<ApiResult<boolean>>(`${basePath}/${id}`)
  return response.data.data
}
