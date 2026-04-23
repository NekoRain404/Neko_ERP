import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type MrpBomEntity = BaseEntity

const basePath = '/mrp/mrp-bom'
export const mrpBomApiBase = basePath

export function listMrpBom(params: QueryParams) {
  return fetchEntityPage<MrpBomEntity>(basePath, params)
}

export const fetchMrpBomPage = listMrpBom

export function createMrpBom(payload: MrpBomEntity) {
  return createEntity<MrpBomEntity>(basePath, payload)
}

export function updateMrpBom(id: number, payload: MrpBomEntity) {
  return updateEntity<MrpBomEntity>(basePath, id, payload)
}

export function removeMrpBom(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteMrpBom = removeMrpBom

export const mrpBomModule = {
  key: 'mrpBom',
  title: 'Mrp Bom',
  basePath,
}

