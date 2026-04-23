import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type SysRoleEntity = BaseEntity

const basePath = '/system/sys-role'
export const sysRoleApiBase = basePath

export function listSysRole(params: QueryParams) {
  return fetchEntityPage<SysRoleEntity>(basePath, params)
}

export const fetchSysRolePage = listSysRole

export function createSysRole(payload: SysRoleEntity) {
  return createEntity<SysRoleEntity>(basePath, payload)
}

export function updateSysRole(id: number, payload: SysRoleEntity) {
  return updateEntity<SysRoleEntity>(basePath, id, payload)
}

export function removeSysRole(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteSysRole = removeSysRole

export const sysRoleModule = {
  key: 'sysRole',
  title: 'Role',
  basePath,
}

