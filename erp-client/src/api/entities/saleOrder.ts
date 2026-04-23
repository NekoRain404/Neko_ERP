import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type SaleOrderEntity = BaseEntity

const basePath = '/sale/sale-order'
export const saleOrderApiBase = basePath

export function listSaleOrder(params: QueryParams) {
  return fetchEntityPage<SaleOrderEntity>(basePath, params)
}

export const fetchSaleOrderPage = listSaleOrder

export function createSaleOrder(payload: SaleOrderEntity) {
  return createEntity<SaleOrderEntity>(basePath, payload)
}

export function updateSaleOrder(id: number, payload: SaleOrderEntity) {
  return updateEntity<SaleOrderEntity>(basePath, id, payload)
}

export function removeSaleOrder(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteSaleOrder = removeSaleOrder

export const saleOrderModule = {
  key: 'saleOrder',
  title: 'Sales Order',
  basePath,
}

