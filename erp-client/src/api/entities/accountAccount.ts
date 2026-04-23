import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type AccountAccountEntity = BaseEntity

const basePath = '/account/account-account'
export const accountAccountApiBase = basePath

export function listAccountAccount(params: QueryParams) {
  return fetchEntityPage<AccountAccountEntity>(basePath, params)
}

export const fetchAccountAccountPage = listAccountAccount

export function createAccountAccount(payload: AccountAccountEntity) {
  return createEntity<AccountAccountEntity>(basePath, payload)
}

export function updateAccountAccount(id: number, payload: AccountAccountEntity) {
  return updateEntity<AccountAccountEntity>(basePath, id, payload)
}

export function removeAccountAccount(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteAccountAccount = removeAccountAccount

export const accountAccountModule = {
  key: 'accountAccount',
  title: 'Account',
  basePath,
}

