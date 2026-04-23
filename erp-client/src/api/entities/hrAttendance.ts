import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type HrAttendanceEntity = BaseEntity

const basePath = '/base/hr-attendance'
export const hrAttendanceApiBase = basePath

export function listHrAttendance(params: QueryParams) {
  return fetchEntityPage<HrAttendanceEntity>(basePath, params)
}

export const fetchHrAttendancePage = listHrAttendance

export function createHrAttendance(payload: HrAttendanceEntity) {
  return createEntity<HrAttendanceEntity>(basePath, payload)
}

export function updateHrAttendance(id: number, payload: HrAttendanceEntity) {
  return updateEntity<HrAttendanceEntity>(basePath, id, payload)
}

export function removeHrAttendance(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteHrAttendance = removeHrAttendance

export const hrAttendanceModule = {
  key: 'hrAttendance',
  title: 'Hr Attendance',
  basePath,
}

