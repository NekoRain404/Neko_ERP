import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type CrmLeadEntity = BaseEntity

const basePath = '/base/crm-lead'
export const crmLeadApiBase = basePath

export function listCrmLead(params: QueryParams) {
  return fetchEntityPage<CrmLeadEntity>(basePath, params)
}

export const fetchCrmLeadPage = listCrmLead

export function createCrmLead(payload: CrmLeadEntity) {
  return createEntity<CrmLeadEntity>(basePath, payload)
}

export function updateCrmLead(id: number, payload: CrmLeadEntity) {
  return updateEntity<CrmLeadEntity>(basePath, id, payload)
}

export function removeCrmLead(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteCrmLead = removeCrmLead

export const crmLeadModule = {
  key: 'crmLead',
  title: 'Crm Lead',
  basePath,
}

