import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type StockMoveEntity = BaseEntity

const basePath = '/stock/stock-move'
export const stockMoveApiBase = basePath

export function listStockMove(params: QueryParams) {
  return fetchEntityPage<StockMoveEntity>(basePath, params)
}

export const fetchStockMovePage = listStockMove

export function createStockMove(payload: StockMoveEntity) {
  return createEntity<StockMoveEntity>(basePath, payload)
}

export function updateStockMove(id: number, payload: StockMoveEntity) {
  return updateEntity<StockMoveEntity>(basePath, id, payload)
}

export function removeStockMove(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteStockMove = removeStockMove

export const stockMoveModule = {
  key: 'stockMove',
  title: 'Stock Move',
  basePath,
}

