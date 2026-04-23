import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type MrpBomLineEntity = BaseEntity

const basePath = '/mrp/mrp-bom-line'
export const mrpBomLineApiBase = basePath

export function listMrpBomLine(params: QueryParams) {
  return fetchEntityPage<MrpBomLineEntity>(basePath, params)
}

export const fetchMrpBomLinePage = listMrpBomLine

export function createMrpBomLine(payload: MrpBomLineEntity) {
  return createEntity<MrpBomLineEntity>(basePath, payload)
}

export function updateMrpBomLine(id: number, payload: MrpBomLineEntity) {
  return updateEntity<MrpBomLineEntity>(basePath, id, payload)
}

export function removeMrpBomLine(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteMrpBomLine = removeMrpBomLine

export const mrpBomLineModule = {
  key: 'mrpBomLine',
  title: 'Mrp Bom Line',
  basePath,
}

