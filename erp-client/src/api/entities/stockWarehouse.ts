import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type StockWarehouseEntity = BaseEntity

const basePath = '/stock/stock-warehouse'
export const stockWarehouseApiBase = basePath

export function listStockWarehouse(params: QueryParams) {
  return fetchEntityPage<StockWarehouseEntity>(basePath, params)
}

export const fetchStockWarehousePage = listStockWarehouse

export function createStockWarehouse(payload: StockWarehouseEntity) {
  return createEntity<StockWarehouseEntity>(basePath, payload)
}

export function updateStockWarehouse(id: number, payload: StockWarehouseEntity) {
  return updateEntity<StockWarehouseEntity>(basePath, id, payload)
}

export function removeStockWarehouse(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteStockWarehouse = removeStockWarehouse

export const stockWarehouseModule = {
  key: 'stockWarehouse',
  title: 'Warehouse',
  basePath,
}

