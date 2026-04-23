import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type HrJobEntity = BaseEntity

const basePath = '/base/hr-job'
export const hrJobApiBase = basePath

export function listHrJob(params: QueryParams) {
  return fetchEntityPage<HrJobEntity>(basePath, params)
}

export const fetchHrJobPage = listHrJob

export function createHrJob(payload: HrJobEntity) {
  return createEntity<HrJobEntity>(basePath, payload)
}

export function updateHrJob(id: number, payload: HrJobEntity) {
  return updateEntity<HrJobEntity>(basePath, id, payload)
}

export function removeHrJob(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteHrJob = removeHrJob

export const hrJobModule = {
  key: 'hrJob',
  title: 'Hr Job',
  basePath,
}

