import type { ModuleKey } from '@/config/module-manifest'
import type { ModuleViewLoader } from '@/views/modules/generated'

const customModuleViewMap: Partial<Record<ModuleKey, ModuleViewLoader>> = {
  sysUser: () => import('@/views/modules/custom/SystemUsersView.vue'),
  sysRole: () => import('@/views/modules/custom/SystemRolesView.vue'),
  sysScript: () => import('@/views/modules/custom/SysScriptsView.vue'),
  accountMove: () => import('@/views/modules/custom/AccountMovesView.vue'),
  accountInvoice: () => import('@/views/modules/custom/AccountInvoicesView.vue'),
  accountPayment: () => import('@/views/modules/custom/AccountPaymentsView.vue'),
  mrpBom: () => import('@/views/modules/custom/MrpBomsView.vue'),
  mrpProduction: () => import('@/views/modules/custom/MrpProductionsView.vue'),
  purchaseOrder: () => import('@/views/modules/custom/PurchaseOrdersView.vue'),
  resCompany: () => import('@/views/modules/custom/FirstWaveMasterDataView.vue'),
  resPartner: () => import('@/views/modules/custom/ResPartnersView.vue'),
  productCategory: () => import('@/views/modules/custom/FirstWaveMasterDataView.vue'),
  productPricelist: () => import('@/views/modules/custom/FirstWaveMasterDataView.vue'),
  productProduct: () => import('@/views/modules/custom/FirstWaveMasterDataView.vue'),
  productTemplate: () => import('@/views/modules/custom/FirstWaveMasterDataView.vue'),
  saleOrder: () => import('@/views/modules/custom/SaleOrdersView.vue'),
  stockInventory: () => import('@/views/modules/custom/StockInventoriesView.vue'),
  stockPicking: () => import('@/views/modules/custom/StockPickingsView.vue'),
}

const genericModuleViewLoader: ModuleViewLoader = () => import('@/views/EntityModuleView.vue')

export function resolveModuleView(moduleKey: ModuleKey): ModuleViewLoader {
  return customModuleViewMap[moduleKey] ?? genericModuleViewLoader
}
