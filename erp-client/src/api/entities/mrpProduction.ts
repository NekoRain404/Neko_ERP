import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type MrpProductionEntity = BaseEntity

const basePath = '/mrp/mrp-production'
export const mrpProductionApiBase = basePath

export function listMrpProduction(params: QueryParams) {
  return fetchEntityPage<MrpProductionEntity>(basePath, params)
}

export const fetchMrpProductionPage = listMrpProduction

export function createMrpProduction(payload: MrpProductionEntity) {
  return createEntity<MrpProductionEntity>(basePath, payload)
}

export function updateMrpProduction(id: number, payload: MrpProductionEntity) {
  return updateEntity<MrpProductionEntity>(basePath, id, payload)
}

export function removeMrpProduction(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteMrpProduction = removeMrpProduction

export const mrpProductionModule = {
  key: 'mrpProduction',
  title: 'Mrp Production',
  basePath,
}

