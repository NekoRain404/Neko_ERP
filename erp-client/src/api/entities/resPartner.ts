import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type ResPartnerEntity = BaseEntity

const basePath = '/base/res-partner'
export const resPartnerApiBase = basePath

export function listResPartner(params: QueryParams) {
  return fetchEntityPage<ResPartnerEntity>(basePath, params)
}

export const fetchResPartnerPage = listResPartner

export function createResPartner(payload: ResPartnerEntity) {
  return createEntity<ResPartnerEntity>(basePath, payload)
}

export function updateResPartner(id: number, payload: ResPartnerEntity) {
  return updateEntity<ResPartnerEntity>(basePath, id, payload)
}

export function removeResPartner(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteResPartner = removeResPartner

export const resPartnerModule = {
  key: 'resPartner',
  title: 'Partner',
  basePath,
}

