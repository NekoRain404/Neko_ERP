import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type StockInventoryLineEntity = BaseEntity

const basePath = '/stock/stock-inventory-line'
export const stockInventoryLineApiBase = basePath

export function listStockInventoryLine(params: QueryParams) {
  return fetchEntityPage<StockInventoryLineEntity>(basePath, params)
}

export const fetchStockInventoryLinePage = listStockInventoryLine

export function createStockInventoryLine(payload: StockInventoryLineEntity) {
  return createEntity<StockInventoryLineEntity>(basePath, payload)
}

export function updateStockInventoryLine(id: number, payload: StockInventoryLineEntity) {
  return updateEntity<StockInventoryLineEntity>(basePath, id, payload)
}

export function removeStockInventoryLine(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteStockInventoryLine = removeStockInventoryLine

export const stockInventoryLineModule = {
  key: 'stockInventoryLine',
  title: 'Inventory Line',
  basePath,
}

