import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type StockInventoryEntity = BaseEntity

const basePath = '/stock/stock-inventory'
export const stockInventoryApiBase = basePath

export function listStockInventory(params: QueryParams) {
  return fetchEntityPage<StockInventoryEntity>(basePath, params)
}

export const fetchStockInventoryPage = listStockInventory

export function createStockInventory(payload: StockInventoryEntity) {
  return createEntity<StockInventoryEntity>(basePath, payload)
}

export function updateStockInventory(id: number, payload: StockInventoryEntity) {
  return updateEntity<StockInventoryEntity>(basePath, id, payload)
}

export function removeStockInventory(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteStockInventory = removeStockInventory

export const stockInventoryModule = {
  key: 'stockInventory',
  title: 'Inventory',
  basePath,
}

