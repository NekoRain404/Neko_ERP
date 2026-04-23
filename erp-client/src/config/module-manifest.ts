export type ModuleKey =
  | 'accountAccount'
  | 'accountInvoice'
  | 'accountJournal'
  | 'accountMove'
  | 'accountMoveLine'
  | 'accountPayment'
  | 'crmLead'
  | 'crmStage'
  | 'hrAttendance'
  | 'hrDepartment'
  | 'hrEmployee'
  | 'hrJob'
  | 'hrLeave'
  | 'irAttachment'
  | 'irLogging'
  | 'mrpBom'
  | 'mrpBomLine'
  | 'mrpProduction'
  | 'productCategory'
  | 'productPricelist'
  | 'productProduct'
  | 'productTemplate'
  | 'projectProject'
  | 'projectTask'
  | 'purchaseOrder'
  | 'purchaseOrderLine'
  | 'resCompany'
  | 'resCurrency'
  | 'resPartner'
  | 'saleOrder'
  | 'saleOrderLine'
  | 'stockInventory'
  | 'stockInventoryLine'
  | 'stockLocation'
  | 'stockMove'
  | 'stockPicking'
  | 'stockQuant'
  | 'stockWarehouse'
  | 'sysRole'
  | 'sysScript'
  | 'sysUser'

export interface ModuleManifestItem {
  key: ModuleKey
  title: string
  group: string
  description: string
  route: string
  apiBase: string
  hidden?: boolean
  parentModuleKey?: ModuleKey
  parentFieldKey?: string
}

export const moduleManifests: ModuleManifestItem[] = [
  { key: 'accountAccount', title: 'Account', group: '财务', description: 'Account模块。', route: '/account/account-accounts', apiBase: '/account/account-account' },
  { key: 'accountInvoice', title: 'Invoice', group: '财务', description: 'Invoice模块。', route: '/account/account-invoices', apiBase: '/account/account-invoice' },
  { key: 'accountJournal', title: 'Journal', group: '财务', description: 'Journal模块。', route: '/account/account-journals', apiBase: '/account/account-journal' },
  { key: 'accountMove', title: 'Journal Entry', group: '财务', description: 'Journal Entry模块。', route: '/account/account-moves', apiBase: '/account/account-move' },
  { key: 'accountMoveLine', title: 'Journal Item', group: '财务', description: 'Journal Item模块。', route: '/account/account-move-lines', apiBase: '/account/account-move-line', hidden: true, parentModuleKey: 'accountMove', parentFieldKey: 'moveId' },
  { key: 'accountPayment', title: 'Payment', group: '财务', description: 'Payment模块。', route: '/account/account-payments', apiBase: '/account/account-payment' },
  { key: 'crmLead', title: 'Crm Lead', group: '基础资料', description: 'Crm Lead模块。', route: '/base/crm-leads', apiBase: '/base/crm-lead' },
  { key: 'crmStage', title: 'Crm Stage', group: '基础资料', description: 'Crm Stage模块。', route: '/base/crm-stages', apiBase: '/base/crm-stage' },
  { key: 'hrAttendance', title: 'Hr Attendance', group: '基础资料', description: 'Hr Attendance模块。', route: '/base/hr-attendances', apiBase: '/base/hr-attendance' },
  { key: 'hrDepartment', title: 'Hr Department', group: '基础资料', description: 'Hr Department模块。', route: '/base/hr-departments', apiBase: '/base/hr-department' },
  { key: 'hrEmployee', title: 'Hr Employee', group: '基础资料', description: 'Hr Employee模块。', route: '/base/hr-employees', apiBase: '/base/hr-employee' },
  { key: 'hrJob', title: 'Hr Job', group: '基础资料', description: 'Hr Job模块。', route: '/base/hr-jobs', apiBase: '/base/hr-job' },
  { key: 'hrLeave', title: 'Hr Leave', group: '基础资料', description: 'Hr Leave模块。', route: '/base/hr-leaves', apiBase: '/base/hr-leave' },
  { key: 'irAttachment', title: 'Ir Attachment', group: '基础资料', description: 'Ir Attachment模块。', route: '/base/ir-attachments', apiBase: '/base/ir-attachment' },
  { key: 'irLogging', title: 'Ir Logging', group: '基础资料', description: 'Ir Logging模块。', route: '/base/ir-loggings', apiBase: '/base/ir-logging' },
  { key: 'mrpBom', title: 'Mrp Bom', group: 'Mrp', description: 'Mrp Bom模块。', route: '/mrp/mrp-boms', apiBase: '/mrp/mrp-bom' },
  { key: 'mrpBomLine', title: 'Mrp Bom Line', group: 'Mrp', description: 'Mrp Bom Line模块。', route: '/mrp/mrp-bom-lines', apiBase: '/mrp/mrp-bom-line', hidden: true, parentModuleKey: 'mrpBom', parentFieldKey: 'bomId' },
  { key: 'mrpProduction', title: 'Mrp Production', group: 'Mrp', description: 'Mrp Production模块。', route: '/mrp/mrp-productions', apiBase: '/mrp/mrp-production' },
  { key: 'productCategory', title: 'Product Category', group: '产品中心', description: 'Product Category模块。', route: '/product/product-categorys', apiBase: '/product/product-category' },
  { key: 'productPricelist', title: 'Pricelist', group: '产品中心', description: 'Pricelist模块。', route: '/product/product-pricelists', apiBase: '/product/product-pricelist' },
  { key: 'productProduct', title: 'Product Variant', group: '产品中心', description: 'Product Variant模块。', route: '/product/product-products', apiBase: '/product/product-product' },
  { key: 'productTemplate', title: 'Product Template', group: '产品中心', description: 'Product Template模块。', route: '/product/product-templates', apiBase: '/product/product-template' },
  { key: 'projectProject', title: 'Project Project', group: '基础资料', description: 'Project Project模块。', route: '/base/project-projects', apiBase: '/base/project-project' },
  { key: 'projectTask', title: 'Project Task', group: '基础资料', description: 'Project Task模块。', route: '/base/project-tasks', apiBase: '/base/project-task' },
  { key: 'purchaseOrder', title: 'Purchase Order', group: '采购', description: 'Purchase Order模块。', route: '/purchase/purchase-orders', apiBase: '/purchase/purchase-order' },
  { key: 'purchaseOrderLine', title: 'Purchase Order Line', group: '采购', description: 'Purchase Order Line模块。', route: '/purchase/purchase-order-lines', apiBase: '/purchase/purchase-order-line', hidden: true, parentModuleKey: 'purchaseOrder', parentFieldKey: 'orderId' },
  { key: 'resCompany', title: 'Company', group: '基础资料', description: 'Company模块。', route: '/base/res-companys', apiBase: '/base/res-company' },
  { key: 'resCurrency', title: 'Currency', group: '基础资料', description: 'Currency模块。', route: '/base/res-currencys', apiBase: '/base/res-currency' },
  { key: 'resPartner', title: 'Partner', group: '基础资料', description: 'Partner模块。', route: '/base/res-partners', apiBase: '/base/res-partner' },
  { key: 'saleOrder', title: 'Sales Order', group: '销售', description: 'Sales Order模块。', route: '/sale/sale-orders', apiBase: '/sale/sale-order' },
  { key: 'saleOrderLine', title: 'Sales Order Line', group: '销售', description: 'Sales Order Line模块。', route: '/sale/sale-order-lines', apiBase: '/sale/sale-order-line', hidden: true, parentModuleKey: 'saleOrder', parentFieldKey: 'orderId' },
  { key: 'stockInventory', title: 'Inventory', group: '库存', description: 'Inventory模块。', route: '/stock/stock-inventorys', apiBase: '/stock/stock-inventory' },
  { key: 'stockInventoryLine', title: 'Inventory Line', group: '库存', description: 'Inventory Line模块。', route: '/stock/stock-inventory-lines', apiBase: '/stock/stock-inventory-line', hidden: true, parentModuleKey: 'stockInventory', parentFieldKey: 'inventoryId' },
  { key: 'stockLocation', title: 'Location', group: '库存', description: 'Location模块。', route: '/stock/stock-locations', apiBase: '/stock/stock-location' },
  { key: 'stockMove', title: 'Stock Move', group: '库存', description: 'Stock Move模块。', route: '/stock/stock-moves', apiBase: '/stock/stock-move', hidden: true, parentModuleKey: 'stockPicking', parentFieldKey: 'pickingId' },
  { key: 'stockPicking', title: 'Transfer', group: '库存', description: 'Transfer模块。', route: '/stock/stock-pickings', apiBase: '/stock/stock-picking' },
  { key: 'stockQuant', title: 'Quant', group: '库存', description: 'Quant模块。', route: '/stock/stock-quants', apiBase: '/stock/stock-quant' },
  { key: 'stockWarehouse', title: 'Warehouse', group: '库存', description: 'Warehouse模块。', route: '/stock/stock-warehouses', apiBase: '/stock/stock-warehouse' },
  { key: 'sysRole', title: 'Role', group: '系统管理', description: 'Role模块。', route: '/system/sys-roles', apiBase: '/system/sys-role' },
  { key: 'sysScript', title: 'Server Script', group: '系统管理', description: 'Server Script模块。', route: '/system/sys-scripts', apiBase: '/system/sys-script' },
  { key: 'sysUser', title: 'User', group: '系统管理', description: 'User模块。', route: '/system/sys-users', apiBase: '/system/sys-user' },
]

export const visibleModuleManifests = moduleManifests.filter((config) => !config.hidden)

export const moduleManifestMap = Object.fromEntries(
  moduleManifests.map((config) => [config.key, config]),
) as Record<ModuleKey, ModuleManifestItem>
