import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type StockQuantEntity = BaseEntity

const basePath = '/stock/stock-quant'
export const stockQuantApiBase = basePath

export function listStockQuant(params: QueryParams) {
  return fetchEntityPage<StockQuantEntity>(basePath, params)
}

export const fetchStockQuantPage = listStockQuant

export function createStockQuant(payload: StockQuantEntity) {
  return createEntity<StockQuantEntity>(basePath, payload)
}

export function updateStockQuant(id: number, payload: StockQuantEntity) {
  return updateEntity<StockQuantEntity>(basePath, id, payload)
}

export function removeStockQuant(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteStockQuant = removeStockQuant

export const stockQuantModule = {
  key: 'stockQuant',
  title: 'Quant',
  basePath,
}

