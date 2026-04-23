import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type StockLocationEntity = BaseEntity

const basePath = '/stock/stock-location'
export const stockLocationApiBase = basePath

export function listStockLocation(params: QueryParams) {
  return fetchEntityPage<StockLocationEntity>(basePath, params)
}

export const fetchStockLocationPage = listStockLocation

export function createStockLocation(payload: StockLocationEntity) {
  return createEntity<StockLocationEntity>(basePath, payload)
}

export function updateStockLocation(id: number, payload: StockLocationEntity) {
  return updateEntity<StockLocationEntity>(basePath, id, payload)
}

export function removeStockLocation(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteStockLocation = removeStockLocation

export const stockLocationModule = {
  key: 'stockLocation',
  title: 'Location',
  basePath,
}

