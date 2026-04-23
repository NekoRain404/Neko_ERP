import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type ProductCategoryEntity = BaseEntity

const basePath = '/product/product-category'
export const productCategoryApiBase = basePath

export function listProductCategory(params: QueryParams) {
  return fetchEntityPage<ProductCategoryEntity>(basePath, params)
}

export const fetchProductCategoryPage = listProductCategory

export function createProductCategory(payload: ProductCategoryEntity) {
  return createEntity<ProductCategoryEntity>(basePath, payload)
}

export function updateProductCategory(id: number, payload: ProductCategoryEntity) {
  return updateEntity<ProductCategoryEntity>(basePath, id, payload)
}

export function removeProductCategory(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteProductCategory = removeProductCategory

export const productCategoryModule = {
  key: 'productCategory',
  title: 'Product Category',
  basePath,
}

