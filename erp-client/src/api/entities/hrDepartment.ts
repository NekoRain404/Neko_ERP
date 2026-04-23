import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type HrDepartmentEntity = BaseEntity

const basePath = '/base/hr-department'
export const hrDepartmentApiBase = basePath

export function listHrDepartment(params: QueryParams) {
  return fetchEntityPage<HrDepartmentEntity>(basePath, params)
}

export const fetchHrDepartmentPage = listHrDepartment

export function createHrDepartment(payload: HrDepartmentEntity) {
  return createEntity<HrDepartmentEntity>(basePath, payload)
}

export function updateHrDepartment(id: number, payload: HrDepartmentEntity) {
  return updateEntity<HrDepartmentEntity>(basePath, id, payload)
}

export function removeHrDepartment(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteHrDepartment = removeHrDepartment

export const hrDepartmentModule = {
  key: 'hrDepartment',
  title: 'Hr Department',
  basePath,
}

