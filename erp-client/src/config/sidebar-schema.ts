import type { ModuleKey } from '@/config/module-manifest'

export interface SidebarItemConfig {
  kind: 'module' | 'route'
  key: string
  moduleKey?: ModuleKey
  route: string
  icon: string
  zhLabel: string
  enLabel: string
}

export interface SidebarSectionConfig {
  key: string
  icon: string
  zhLabel: string
  enLabel: string
  items: SidebarItemConfig[]
}

export const sidebarSections: SidebarSectionConfig[] = [
  {
    key: 'dashboard',
    icon: 'Monitor',
    zhLabel: '工作台首页',
    enLabel: 'Dashboard',
    items: [{ kind: 'route', key: 'dashboard', route: '/', icon: 'Monitor', zhLabel: '总览', enLabel: 'Overview' }],
  },
  {
    key: 'sales',
    icon: 'Sell',
    zhLabel: '销售与客户',
    enLabel: 'Sales & CRM',
    items: [
      { kind: 'module', key: 'saleOrder', moduleKey: 'saleOrder', route: '/sale/sale-orders', icon: 'Sell', zhLabel: '销售订单', enLabel: 'Sales Orders' },
      { kind: 'module', key: 'crmLead', moduleKey: 'crmLead', route: '/base/crm-leads', icon: 'Opportunity', zhLabel: '商机/线索', enLabel: 'Leads & Opportunities' },
      { kind: 'module', key: 'crmStage', moduleKey: 'crmStage', route: '/base/crm-stages', icon: 'Histogram', zhLabel: '商机阶段', enLabel: 'Lead Stages' },
      { kind: 'module', key: 'resPartner', moduleKey: 'resPartner', route: '/base/res-partners', icon: 'Avatar', zhLabel: '业务伙伴', enLabel: 'Partners' },
    ],
  },
  {
    key: 'purchase',
    icon: 'ShoppingCart',
    zhLabel: '采购管理',
    enLabel: 'Purchase',
    items: [
      { kind: 'module', key: 'purchaseOrder', moduleKey: 'purchaseOrder', route: '/purchase/purchase-orders', icon: 'ShoppingCart', zhLabel: '采购订单', enLabel: 'Purchase Orders' },
    ],
  },
  {
    key: 'inventory',
    icon: 'Van',
    zhLabel: '库存与物流',
    enLabel: 'Inventory',
    items: [
      { kind: 'module', key: 'stockPicking', moduleKey: 'stockPicking', route: '/stock/stock-pickings', icon: 'Files', zhLabel: '库存调拨', enLabel: 'Transfers' },
      { kind: 'module', key: 'stockQuant', moduleKey: 'stockQuant', route: '/stock/stock-quants', icon: 'DataAnalysis', zhLabel: '当前库存量', enLabel: 'Stock On Hand' },
      { kind: 'module', key: 'stockWarehouse', moduleKey: 'stockWarehouse', route: '/stock/stock-warehouses', icon: 'House', zhLabel: '仓库配置', enLabel: 'Warehouses' },
      { kind: 'module', key: 'stockLocation', moduleKey: 'stockLocation', route: '/stock/stock-locations', icon: 'Location', zhLabel: '库位配置', enLabel: 'Locations' },
    ],
  },
  {
    key: 'manufacturing',
    icon: 'Tools',
    zhLabel: '制造管理',
    enLabel: 'Manufacturing',
    items: [
      { kind: 'module', key: 'mrpProduction', moduleKey: 'mrpProduction', route: '/mrp/mrp-productions', icon: 'Tools', zhLabel: '制造订单', enLabel: 'Manufacturing Orders' },
      { kind: 'module', key: 'mrpBom', moduleKey: 'mrpBom', route: '/mrp/mrp-boms', icon: 'CollectionTag', zhLabel: '物料清单', enLabel: 'Bills of Materials' },
    ],
  },
  {
    key: 'accounting',
    icon: 'Coin',
    zhLabel: '财务与会计',
    enLabel: 'Accounting',
    items: [
      { kind: 'module', key: 'accountMove', moduleKey: 'accountMove', route: '/account/account-moves', icon: 'Document', zhLabel: '会计凭证/发票', enLabel: 'Journal Entries / Invoices' },
      { kind: 'module', key: 'accountPayment', moduleKey: 'accountPayment', route: '/account/account-payments', icon: 'CreditCard', zhLabel: '收付款', enLabel: 'Payments' },
      { kind: 'module', key: 'accountAccount', moduleKey: 'accountAccount', route: '/account/account-accounts', icon: 'Postcard', zhLabel: '会计科目', enLabel: 'Accounts' },
      { kind: 'module', key: 'accountJournal', moduleKey: 'accountJournal', route: '/account/account-journals', icon: 'Notebook', zhLabel: '账簿/日记账', enLabel: 'Journals' },
    ],
  },
  {
    key: 'projects',
    icon: 'Management',
    zhLabel: '项目协作',
    enLabel: 'Projects',
    items: [
      { kind: 'module', key: 'projectProject', moduleKey: 'projectProject', route: '/base/project-projects', icon: 'Management', zhLabel: '项目列表', enLabel: 'Projects' },
      { kind: 'module', key: 'projectTask', moduleKey: 'projectTask', route: '/base/project-tasks', icon: 'Collection', zhLabel: '任务分配', enLabel: 'Tasks' },
    ],
  },
  {
    key: 'hr',
    icon: 'UserFilled',
    zhLabel: '人力资源',
    enLabel: 'Human Resources',
    items: [
      { kind: 'module', key: 'hrEmployee', moduleKey: 'hrEmployee', route: '/base/hr-employees', icon: 'User', zhLabel: '员工信息', enLabel: 'Employees' },
      { kind: 'module', key: 'hrDepartment', moduleKey: 'hrDepartment', route: '/base/hr-departments', icon: 'OfficeBuilding', zhLabel: '部门架构', enLabel: 'Departments' },
      { kind: 'module', key: 'hrJob', moduleKey: 'hrJob', route: '/base/hr-jobs', icon: 'Briefcase', zhLabel: '岗位职务', enLabel: 'Jobs' },
      { kind: 'module', key: 'hrAttendance', moduleKey: 'hrAttendance', route: '/base/hr-attendances', icon: 'Clock', zhLabel: '考勤记录', enLabel: 'Attendance' },
      { kind: 'module', key: 'hrLeave', moduleKey: 'hrLeave', route: '/base/hr-leaves', icon: 'Calendar', zhLabel: '休假申请', enLabel: 'Leaves' },
    ],
  },
  {
    key: 'master',
    icon: 'Box',
    zhLabel: '基础产品库',
    enLabel: 'Master Data',
    items: [
      { kind: 'module', key: 'productProduct', moduleKey: 'productProduct', route: '/product/product-products', icon: 'Goods', zhLabel: '产品档案', enLabel: 'Products' },
      { kind: 'module', key: 'productCategory', moduleKey: 'productCategory', route: '/product/product-categorys', icon: 'FolderOpened', zhLabel: '产品类别', enLabel: 'Product Categories' },
      { kind: 'module', key: 'resCompany', moduleKey: 'resCompany', route: '/base/res-companys', icon: 'OfficeBuilding', zhLabel: '公司信息', enLabel: 'Companies' },
      { kind: 'module', key: 'resCurrency', moduleKey: 'resCurrency', route: '/base/res-currencys', icon: 'Money', zhLabel: '币种配置', enLabel: 'Currencies' },
    ],
  },
  {
    key: 'system',
    icon: 'Setting',
    zhLabel: '系统管理',
    enLabel: 'System',
    items: [
      { kind: 'module', key: 'sysUser', moduleKey: 'sysUser', route: '/system/sys-users', icon: 'UserFilled', zhLabel: '用户管理', enLabel: 'Users' },
      { kind: 'module', key: 'sysRole', moduleKey: 'sysRole', route: '/system/sys-roles', icon: 'SetUp', zhLabel: '角色权限', enLabel: 'Roles' },
      { kind: 'module', key: 'sysScript', moduleKey: 'sysScript', route: '/system/sys-scripts', icon: 'MagicStick', zhLabel: '服务端脚本', enLabel: 'Server Scripts' },
      { kind: 'module', key: 'irLogging', moduleKey: 'irLogging', route: '/base/ir-loggings', icon: 'Memo', zhLabel: '审计日志', enLabel: 'Audit Logs' },
      { kind: 'module', key: 'irAttachment', moduleKey: 'irAttachment', route: '/base/ir-attachments', icon: 'Paperclip', zhLabel: '附件管理', enLabel: 'Attachments' },
    ],
  },
]

export function findSidebarSectionByModuleKey(moduleKey: ModuleKey) {
  return sidebarSections.find((section) => section.items.some((item) => item.moduleKey === moduleKey))
}
