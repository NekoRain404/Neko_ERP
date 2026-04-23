import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type ProductPricelistEntity = BaseEntity

const basePath = '/product/product-pricelist'
export const productPricelistApiBase = basePath

export function listProductPricelist(params: QueryParams) {
  return fetchEntityPage<ProductPricelistEntity>(basePath, params)
}

export const fetchProductPricelistPage = listProductPricelist

export function createProductPricelist(payload: ProductPricelistEntity) {
  return createEntity<ProductPricelistEntity>(basePath, payload)
}

export function updateProductPricelist(id: number, payload: ProductPricelistEntity) {
  return updateEntity<ProductPricelistEntity>(basePath, id, payload)
}

export function removeProductPricelist(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteProductPricelist = removeProductPricelist

export const productPricelistModule = {
  key: 'productPricelist',
  title: 'Pricelist',
  basePath,
}

