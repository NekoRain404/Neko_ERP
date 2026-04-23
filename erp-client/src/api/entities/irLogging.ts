import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type IrLoggingEntity = BaseEntity

const basePath = '/base/ir-logging'
export const irLoggingApiBase = basePath

export function listIrLogging(params: QueryParams) {
  return fetchEntityPage<IrLoggingEntity>(basePath, params)
}

export const fetchIrLoggingPage = listIrLogging

export function createIrLogging(payload: IrLoggingEntity) {
  return createEntity<IrLoggingEntity>(basePath, payload)
}

export function updateIrLogging(id: number, payload: IrLoggingEntity) {
  return updateEntity<IrLoggingEntity>(basePath, id, payload)
}

export function removeIrLogging(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteIrLogging = removeIrLogging

export const irLoggingModule = {
  key: 'irLogging',
  title: 'Ir Logging',
  basePath,
}

