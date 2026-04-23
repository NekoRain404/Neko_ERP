import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type SaleOrderLineEntity = BaseEntity

const basePath = '/sale/sale-order-line'
export const saleOrderLineApiBase = basePath

export function listSaleOrderLine(params: QueryParams) {
  return fetchEntityPage<SaleOrderLineEntity>(basePath, params)
}

export const fetchSaleOrderLinePage = listSaleOrderLine

export function createSaleOrderLine(payload: SaleOrderLineEntity) {
  return createEntity<SaleOrderLineEntity>(basePath, payload)
}

export function updateSaleOrderLine(id: number, payload: SaleOrderLineEntity) {
  return updateEntity<SaleOrderLineEntity>(basePath, id, payload)
}

export function removeSaleOrderLine(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteSaleOrderLine = removeSaleOrderLine

export const saleOrderLineModule = {
  key: 'saleOrderLine',
  title: 'Sales Order Line',
  basePath,
}

