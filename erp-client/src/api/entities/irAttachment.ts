import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type IrAttachmentEntity = BaseEntity

const basePath = '/base/ir-attachment'
export const irAttachmentApiBase = basePath

export function listIrAttachment(params: QueryParams) {
  return fetchEntityPage<IrAttachmentEntity>(basePath, params)
}

export const fetchIrAttachmentPage = listIrAttachment

export function createIrAttachment(payload: IrAttachmentEntity) {
  return createEntity<IrAttachmentEntity>(basePath, payload)
}

export function updateIrAttachment(id: number, payload: IrAttachmentEntity) {
  return updateEntity<IrAttachmentEntity>(basePath, id, payload)
}

export function removeIrAttachment(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteIrAttachment = removeIrAttachment

export const irAttachmentModule = {
  key: 'irAttachment',
  title: 'Ir Attachment',
  basePath,
}

