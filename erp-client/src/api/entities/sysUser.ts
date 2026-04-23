import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type SysUserEntity = BaseEntity

const basePath = '/system/sys-user'
export const sysUserApiBase = basePath

export function listSysUser(params: QueryParams) {
  return fetchEntityPage<SysUserEntity>(basePath, params)
}

export const fetchSysUserPage = listSysUser

export function createSysUser(payload: SysUserEntity) {
  return createEntity<SysUserEntity>(basePath, payload)
}

export function updateSysUser(id: number, payload: SysUserEntity) {
  return updateEntity<SysUserEntity>(basePath, id, payload)
}

export function removeSysUser(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteSysUser = removeSysUser

export const sysUserModule = {
  key: 'sysUser',
  title: 'User',
  basePath,
}

