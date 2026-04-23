import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type CrmStageEntity = BaseEntity

const basePath = '/base/crm-stage'
export const crmStageApiBase = basePath

export function listCrmStage(params: QueryParams) {
  return fetchEntityPage<CrmStageEntity>(basePath, params)
}

export const fetchCrmStagePage = listCrmStage

export function createCrmStage(payload: CrmStageEntity) {
  return createEntity<CrmStageEntity>(basePath, payload)
}

export function updateCrmStage(id: number, payload: CrmStageEntity) {
  return updateEntity<CrmStageEntity>(basePath, id, payload)
}

export function removeCrmStage(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteCrmStage = removeCrmStage

export const crmStageModule = {
  key: 'crmStage',
  title: 'Crm Stage',
  basePath,
}

