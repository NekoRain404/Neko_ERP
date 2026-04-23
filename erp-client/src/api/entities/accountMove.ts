import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type AccountMoveEntity = BaseEntity

const basePath = '/account/account-move'
export const accountMoveApiBase = basePath

export function listAccountMove(params: QueryParams) {
  return fetchEntityPage<AccountMoveEntity>(basePath, params)
}

export const fetchAccountMovePage = listAccountMove

export function createAccountMove(payload: AccountMoveEntity) {
  return createEntity<AccountMoveEntity>(basePath, payload)
}

export function updateAccountMove(id: number, payload: AccountMoveEntity) {
  return updateEntity<AccountMoveEntity>(basePath, id, payload)
}

export function removeAccountMove(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteAccountMove = removeAccountMove

export const accountMoveModule = {
  key: 'accountMove',
  title: 'Journal Entry',
  basePath,
}

