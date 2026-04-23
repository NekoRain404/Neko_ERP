import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type ProductProductEntity = BaseEntity

const basePath = '/product/product-product'
export const productProductApiBase = basePath

export function listProductProduct(params: QueryParams) {
  return fetchEntityPage<ProductProductEntity>(basePath, params)
}

export const fetchProductProductPage = listProductProduct

export function createProductProduct(payload: ProductProductEntity) {
  return createEntity<ProductProductEntity>(basePath, payload)
}

export function updateProductProduct(id: number, payload: ProductProductEntity) {
  return updateEntity<ProductProductEntity>(basePath, id, payload)
}

export function removeProductProduct(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteProductProduct = removeProductProduct

export const productProductModule = {
  key: 'productProduct',
  title: 'Product Variant',
  basePath,
}

