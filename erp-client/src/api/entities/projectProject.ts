import { createEntity, deleteEntity, fetchEntityPage, updateEntity } from '@/api/modules'
import type { BaseEntity, QueryParams } from '@/types/api'

export type ProjectProjectEntity = BaseEntity

const basePath = '/base/project-project'
export const projectProjectApiBase = basePath

export function listProjectProject(params: QueryParams) {
  return fetchEntityPage<ProjectProjectEntity>(basePath, params)
}

export const fetchProjectProjectPage = listProjectProject

export function createProjectProject(payload: ProjectProjectEntity) {
  return createEntity<ProjectProjectEntity>(basePath, payload)
}

export function updateProjectProject(id: number, payload: ProjectProjectEntity) {
  return updateEntity<ProjectProjectEntity>(basePath, id, payload)
}

export function removeProjectProject(id: number) {
  return deleteEntity(basePath, id)
}

export const deleteProjectProject = removeProjectProject

export const projectProjectModule = {
  key: 'projectProject',
  title: 'Project Project',
  basePath,
}

