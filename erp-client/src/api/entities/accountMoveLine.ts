import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type AccountMoveLineEntity = BaseEntity

const basePath = '/account/account-move-line'
export const accountMoveLineApiBase = basePath

export function listAccountMoveLine(params: QueryParams) {
  return fetchEntityPage<AccountMoveLineEntity>(basePath, params)
}

export const fetchAccountMoveLinePage = listAccountMoveLine

export function createAccountMoveLine(payload: AccountMoveLineEntity) {
  return createEntity<AccountMoveLineEntity>(basePath, payload)
}

export function updateAccountMoveLine(id: number, payload: AccountMoveLineEntity) {
  return updateEntity<AccountMoveLineEntity>(basePath, id, payload)
}

export function removeAccountMoveLine(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteAccountMoveLine = removeAccountMoveLine

export const accountMoveLineModule = {
  key: 'accountMoveLine',
  title: 'Journal Item',
  basePath,
}

