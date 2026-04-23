import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type AccountInvoiceEntity = BaseEntity

const basePath = '/account/account-invoice'
export const accountInvoiceApiBase = basePath

export function listAccountInvoice(params: QueryParams) {
  return fetchEntityPage<AccountInvoiceEntity>(basePath, params)
}

export const fetchAccountInvoicePage = listAccountInvoice

export function createAccountInvoice(payload: AccountInvoiceEntity) {
  return createEntity<AccountInvoiceEntity>(basePath, payload)
}

export function updateAccountInvoice(id: number, payload: AccountInvoiceEntity) {
  return updateEntity<AccountInvoiceEntity>(basePath, id, payload)
}

export function removeAccountInvoice(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteAccountInvoice = removeAccountInvoice

export const accountInvoiceModule = {
  key: 'accountInvoice',
  title: 'Invoice',
  basePath,
}

