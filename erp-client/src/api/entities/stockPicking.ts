import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type StockPickingEntity = BaseEntity

const basePath = '/stock/stock-picking'
export const stockPickingApiBase = basePath

export function listStockPicking(params: QueryParams) {
  return fetchEntityPage<StockPickingEntity>(basePath, params)
}

export const fetchStockPickingPage = listStockPicking

export function createStockPicking(payload: StockPickingEntity) {
  return createEntity<StockPickingEntity>(basePath, payload)
}

export function updateStockPicking(id: number, payload: StockPickingEntity) {
  return updateEntity<StockPickingEntity>(basePath, id, payload)
}

export function removeStockPicking(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteStockPicking = removeStockPicking

export const stockPickingModule = {
  key: 'stockPicking',
  title: 'Transfer',
  basePath,
}

