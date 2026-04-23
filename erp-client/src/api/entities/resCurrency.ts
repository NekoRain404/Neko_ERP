import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type ResCurrencyEntity = BaseEntity

const basePath = '/base/res-currency'
export const resCurrencyApiBase = basePath

export function listResCurrency(params: QueryParams) {
  return fetchEntityPage<ResCurrencyEntity>(basePath, params)
}

export const fetchResCurrencyPage = listResCurrency

export function createResCurrency(payload: ResCurrencyEntity) {
  return createEntity<ResCurrencyEntity>(basePath, payload)
}

export function updateResCurrency(id: number, payload: ResCurrencyEntity) {
  return updateEntity<ResCurrencyEntity>(basePath, id, payload)
}

export function removeResCurrency(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteResCurrency = removeResCurrency

export const resCurrencyModule = {
  key: 'resCurrency',
  title: 'Currency',
  basePath,
}

