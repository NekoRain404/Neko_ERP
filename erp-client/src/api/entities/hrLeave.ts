import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type HrLeaveEntity = BaseEntity

const basePath = '/base/hr-leave'
export const hrLeaveApiBase = basePath

export function listHrLeave(params: QueryParams) {
  return fetchEntityPage<HrLeaveEntity>(basePath, params)
}

export const fetchHrLeavePage = listHrLeave

export function createHrLeave(payload: HrLeaveEntity) {
  return createEntity<HrLeaveEntity>(basePath, payload)
}

export function updateHrLeave(id: number, payload: HrLeaveEntity) {
  return updateEntity<HrLeaveEntity>(basePath, id, payload)
}

export function removeHrLeave(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteHrLeave = removeHrLeave

export const hrLeaveModule = {
  key: 'hrLeave',
  title: 'Hr Leave',
  basePath,
}

