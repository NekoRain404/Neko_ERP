import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type ProjectTaskEntity = BaseEntity

const basePath = '/base/project-task'
export const projectTaskApiBase = basePath

export function listProjectTask(params: QueryParams) {
  return fetchEntityPage<ProjectTaskEntity>(basePath, params)
}

export const fetchProjectTaskPage = listProjectTask

export function createProjectTask(payload: ProjectTaskEntity) {
  return createEntity<ProjectTaskEntity>(basePath, payload)
}

export function updateProjectTask(id: number, payload: ProjectTaskEntity) {
  return updateEntity<ProjectTaskEntity>(basePath, id, payload)
}

export function removeProjectTask(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteProjectTask = removeProjectTask

export const projectTaskModule = {
  key: 'projectTask',
  title: 'Project Task',
  basePath,
}

