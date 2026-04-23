import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type ResCompanyEntity = BaseEntity

const basePath = '/base/res-company'
export const resCompanyApiBase = basePath

export function listResCompany(params: QueryParams) {
  return fetchEntityPage<ResCompanyEntity>(basePath, params)
}

export const fetchResCompanyPage = listResCompany

export function createResCompany(payload: ResCompanyEntity) {
  return createEntity<ResCompanyEntity>(basePath, payload)
}

export function updateResCompany(id: number, payload: ResCompanyEntity) {
  return updateEntity<ResCompanyEntity>(basePath, id, payload)
}

export function removeResCompany(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteResCompany = removeResCompany

export const resCompanyModule = {
  key: 'resCompany',
  title: 'Company',
  basePath,
}

