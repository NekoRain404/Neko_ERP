import type { ModuleKey } from '@/config/module-manifest'
import type { ModuleConfig } from '@/types/api'

let moduleConfigMapPromise: Promise<Record<ModuleKey, ModuleConfig>> | null = null

export function loadModuleConfigMap() {
  if (!moduleConfigMapPromise) {
    moduleConfigMapPromise = import('@/config/modules').then(
      ({ moduleConfigMap }) => moduleConfigMap as Record<ModuleKey, ModuleConfig>,
    )
  }
  return moduleConfigMapPromise
}

export async function loadModuleConfig(moduleKey: ModuleKey) {
  const moduleConfigMap = await loadModuleConfigMap()
  return moduleConfigMap[moduleKey]
}
