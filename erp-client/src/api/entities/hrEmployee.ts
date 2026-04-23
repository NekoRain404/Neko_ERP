import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type HrEmployeeEntity = BaseEntity

const basePath = '/base/hr-employee'
export const hrEmployeeApiBase = basePath

export function listHrEmployee(params: QueryParams) {
  return fetchEntityPage<HrEmployeeEntity>(basePath, params)
}

export const fetchHrEmployeePage = listHrEmployee

export function createHrEmployee(payload: HrEmployeeEntity) {
  return createEntity<HrEmployeeEntity>(basePath, payload)
}

export function updateHrEmployee(id: number, payload: HrEmployeeEntity) {
  return updateEntity<HrEmployeeEntity>(basePath, id, payload)
}

export function removeHrEmployee(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteHrEmployee = removeHrEmployee

export const hrEmployeeModule = {
  key: 'hrEmployee',
  title: 'Hr Employee',
  basePath,
}

