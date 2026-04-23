import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type AccountPaymentEntity = BaseEntity

const basePath = '/account/account-payment'
export const accountPaymentApiBase = basePath

export function listAccountPayment(params: QueryParams) {
  return fetchEntityPage<AccountPaymentEntity>(basePath, params)
}

export const fetchAccountPaymentPage = listAccountPayment

export function createAccountPayment(payload: AccountPaymentEntity) {
  return createEntity<AccountPaymentEntity>(basePath, payload)
}

export function updateAccountPayment(id: number, payload: AccountPaymentEntity) {
  return updateEntity<AccountPaymentEntity>(basePath, id, payload)
}

export function removeAccountPayment(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteAccountPayment = removeAccountPayment

export const accountPaymentModule = {
  key: 'accountPayment',
  title: 'Payment',
  basePath,
}

