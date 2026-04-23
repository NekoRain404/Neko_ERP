import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type PurchaseOrderEntity = BaseEntity

const basePath = '/purchase/purchase-order'
export const purchaseOrderApiBase = basePath

export function listPurchaseOrder(params: QueryParams) {
  return fetchEntityPage<PurchaseOrderEntity>(basePath, params)
}

export const fetchPurchaseOrderPage = listPurchaseOrder

export function createPurchaseOrder(payload: PurchaseOrderEntity) {
  return createEntity<PurchaseOrderEntity>(basePath, payload)
}

export function updatePurchaseOrder(id: number, payload: PurchaseOrderEntity) {
  return updateEntity<PurchaseOrderEntity>(basePath, id, payload)
}

export function removePurchaseOrder(id: number) {
  return deleteEntity(basePath, id)
}

export const deletePurchaseOrder = removePurchaseOrder

export const purchaseOrderModule = {
  key: 'purchaseOrder',
  title: 'Purchase Order',
  basePath,
}

