import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type PurchaseOrderLineEntity = BaseEntity

const basePath = '/purchase/purchase-order-line'
export const purchaseOrderLineApiBase = basePath

export function listPurchaseOrderLine(params: QueryParams) {
  return fetchEntityPage<PurchaseOrderLineEntity>(basePath, params)
}

export const fetchPurchaseOrderLinePage = listPurchaseOrderLine

export function createPurchaseOrderLine(payload: PurchaseOrderLineEntity) {
  return createEntity<PurchaseOrderLineEntity>(basePath, payload)
}

export function updatePurchaseOrderLine(id: number, payload: PurchaseOrderLineEntity) {
  return updateEntity<PurchaseOrderLineEntity>(basePath, id, payload)
}

export function removePurchaseOrderLine(id: number) {
  return deleteEntity(basePath, id)
}

export const deletePurchaseOrderLine = removePurchaseOrderLine

export const purchaseOrderLineModule = {
  key: 'purchaseOrderLine',
  title: 'Purchase Order Line',
  basePath,
}

