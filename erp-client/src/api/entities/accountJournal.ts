import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type AccountJournalEntity = BaseEntity

const basePath = '/account/account-journal'
export const accountJournalApiBase = basePath

export function listAccountJournal(params: QueryParams) {
  return fetchEntityPage<AccountJournalEntity>(basePath, params)
}

export const fetchAccountJournalPage = listAccountJournal

export function createAccountJournal(payload: AccountJournalEntity) {
  return createEntity<AccountJournalEntity>(basePath, payload)
}

export function updateAccountJournal(id: number, payload: AccountJournalEntity) {
  return updateEntity<AccountJournalEntity>(basePath, id, payload)
}

export function removeAccountJournal(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteAccountJournal = removeAccountJournal

export const accountJournalModule = {
  key: 'accountJournal',
  title: 'Journal',
  basePath,
}

