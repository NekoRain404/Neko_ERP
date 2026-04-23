import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type ProductTemplateEntity = BaseEntity

const basePath = '/product/product-template'
export const productTemplateApiBase = basePath

export function listProductTemplate(params: QueryParams) {
  return fetchEntityPage<ProductTemplateEntity>(basePath, params)
}

export const fetchProductTemplatePage = listProductTemplate

export function createProductTemplate(payload: ProductTemplateEntity) {
  return createEntity<ProductTemplateEntity>(basePath, payload)
}

export function updateProductTemplate(id: number, payload: ProductTemplateEntity) {
  return updateEntity<ProductTemplateEntity>(basePath, id, payload)
}

export function removeProductTemplate(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteProductTemplate = removeProductTemplate

export const productTemplateModule = {
  key: 'productTemplate',
  title: 'Product Template',
  basePath,
}

