import type { BaseEntity } from '@/types/api'

export interface SysUserEntity extends BaseEntity {
  id: number
  username?: string
  password?: string
  realName?: string
  email?: string
  phone?: string
  partnerId?: number
  status?: number
  createTime?: string
  updateTime?: string
  deleted?: number
}

export interface SysRoleEntity extends BaseEntity {
  id: number
  roleCode?: string
  roleName?: string
  status?: number
  remark?: string
  createTime?: string
  updateTime?: string
  deleted?: number
}

export interface ResPartnerEntity extends BaseEntity {
  id: number
  name?: string
  type?: string
  parentId?: number
  companyName?: string
  phone?: string
  mobile?: string
  email?: string
  website?: string
  vat?: string
  city?: string
  street?: string
  street2?: string
  zip?: string
  creditLimit?: number | string
  comment?: string
  active?: boolean
  isCompany?: boolean
  userId?: number
  salespersonId?: number
  customerRank?: number
  supplierRank?: number
  createUid?: number
  createDate?: string
  writeUid?: number
  writeDate?: string
}

export interface ProductTemplateEntity extends BaseEntity {
  id: number
  name?: string
  type?: string
  uomId?: number
  uomPoId?: number
  categId?: number
  companyId?: number
  listPrice?: number | string
  standardPrice?: number | string
  volume?: number | string
  weight?: number | string
  barcode?: string
  defaultCode?: string
  description?: string
  descriptionPurchase?: string
  descriptionSale?: string
  saleOk?: boolean
  purchaseOk?: boolean
  state?: string
  createUid?: number
  createDate?: string
  writeUid?: number
  writeDate?: string
}

export interface ProductProductEntity extends BaseEntity {
  id: number
  defaultCode?: string
  active?: boolean
  productTmplId?: number
  barcode?: string
  combinationIndices?: string
  standardPrice?: number | string
  volume?: number | string
  weight?: number | string
  imageVariant1920?: string
  imageVariant1024?: string
  imageVariant512?: string
  imageVariant256?: string
  imageVariant128?: string
  canImageVariant1024BeZoomed?: boolean
  writeDate?: string
  isFavorite?: boolean
  isInSelectedSectionOfOrder?: boolean
}

export interface SaleOrderEntity extends BaseEntity {
  id: number
  name?: string
  clientOrderRef?: string
  partnerId?: number
  partnerInvoiceId?: number
  partnerShippingId?: number
  dateOrder?: string
  commitmentDate?: string
  validityDate?: string
  state?: string
  userId?: number
  companyId?: number
  amountUntaxed?: number | string
  amountTax?: number | string
  amountTotal?: number | string
  paymentTerms?: string
  note?: string
  invoiced?: boolean
  locked?: boolean
  createUid?: number
  createDate?: string
  writeUid?: number
  writeDate?: string
}

export interface SaleOrderLineEntity extends BaseEntity {
  id: number
  orderId?: number
  name?: string
  productId?: number
  productUomQty?: number | string
  qtyDelivered?: number | string
  qtyInvoiced?: number | string
  priceUnit?: number | string
  priceSubtotal?: number | string
  priceTax?: number | string
  priceTotal?: number | string
  discount?: number | string
  state?: string
  sequence?: number
  createUid?: number
  createDate?: string
  writeUid?: number
  writeDate?: string
}

export interface PurchaseOrderEntity extends BaseEntity {
  id: number
  name?: string
  partnerId?: number
  dateOrder?: string
  dateApprove?: string
  datePlanned?: string
  state?: string
  companyId?: number
  amountUntaxed?: number | string
  amountTax?: number | string
  amountTotal?: number | string
  paymentTerms?: string
  notes?: string
  userId?: number
  createUid?: number
  createDate?: string
  writeUid?: number
  writeDate?: string
}

export interface PurchaseOrderLineEntity extends BaseEntity {
  id: number
  name?: string
  sequence?: number
  productQty?: number | string
  productUomQty?: number | string
  datePlanned?: string
  discount?: number | string
  productUomId?: number
  productId?: number
  priceUnit?: number | string
  priceSubtotal?: number | string
  priceTotal?: number | string
  priceTax?: number | string
  orderId?: number
  companyId?: number
  qtyInvoiced?: number | string
  qtyReceivedMethod?: string
  qtyReceived?: number | string
  qtyReceivedManual?: number | string
  qtyToInvoice?: number | string
  partnerId?: number
  displayType?: string
  isDownpayment?: boolean
  technicalPriceUnit?: number | string
}

export interface StockPickingEntity extends BaseEntity {
  id: number
  name?: string
  origin?: string
  partnerId?: number
  pickingTypeId?: number
  locationId?: number
  locationDestId?: number
  state?: string
  scheduledDate?: string
  dateDone?: string
  companyId?: number
  userId?: number
  saleId?: number
  purchaseId?: number
  isLocked?: boolean
  note?: string
  createUid?: number
  createDate?: string
  writeUid?: number
  writeDate?: string
}

export interface StockMoveEntity extends BaseEntity {
  id: number
  sequence?: number
  priority?: string
  date?: string
  dateDeadline?: string
  companyId?: number
  productId?: number
  descriptionPickingManual?: string
  productQty?: number | string
  productUomQty?: number | string
  productUom?: number
  locationId?: number
  locationDestId?: number
  locationFinalId?: number
  partnerId?: number
  pickingId?: number
  state?: string
  picked?: boolean
  priceUnit?: number | string
  origin?: string
  procureMethod?: string
  scrapId?: number
  procurementValues?: string
  ruleId?: number
  propagateCancel?: boolean
  delayAlertDate?: string
  pickingTypeId?: number
  isInventory?: boolean
  inventoryName?: string
  originReturnedMoveId?: number
  restrictPartnerId?: number
  warehouseId?: number
  quantity?: number | string
  additional?: boolean
  reference?: string
  nextSerial?: string
  nextSerialCount?: number
  orderpointId?: number
  reservationDate?: string
  packagingUomId?: number
  packagingUomQty?: number | string
}

export interface StockQuantEntity extends BaseEntity {
  id: number
  productId?: number
  companyId?: number
  locationId?: number
  lotId?: number
  packageId?: number
  ownerId?: number
  quantity?: number | string
  reservedQuantity?: number | string
  inDate?: string
  onHand?: boolean
  inventoryQuantity?: number | string
  inventoryDiffQuantity?: number | string
  inventoryDate?: string
  inventoryQuantitySet?: boolean
  userId?: number
}

export interface AccountMoveEntity extends BaseEntity {
  id: number
  name?: string
  ref?: string
  date?: string
  state?: string
  moveType?: string
  journalId?: number
  journalGroupId?: number
  companyId?: number
  originPaymentId?: number
  statementLineId?: number
  taxCashBasisRecId?: number
  taxCashBasisOriginMoveId?: number
  alwaysTaxExigible?: boolean
  autoPost?: string
  autoPostUntil?: string
  autoPostOriginId?: number
  checked?: boolean
  postedBefore?: boolean
  madeSequenceGap?: boolean
  showNameWarning?: boolean
  secureSequenceNumber?: number
  inalterableHash?: string
  invoiceDate?: string
  invoiceDateDue?: string
  deliveryDate?: string
  taxableSupplyDate?: string
  invoicePaymentTermId?: number
  partnerId?: number
  commercialPartnerId?: number
  partnerShippingId?: number
  partnerBankId?: number
  fiscalPositionId?: number
  paymentReference?: string
  qrCodeMethod?: string
  preferredPaymentMethodLineId?: number
  currencyId?: number
  invoiceCurrencyRate?: number | string
  amountUntaxed?: number | string
  amountTax?: number | string
  amountTotal?: number | string
  amountResidual?: number | string
  amountUntaxedSigned?: number | string
  amountUntaxedInCurrencySigned?: number | string
  amountTaxSigned?: number | string
  amountTotalSigned?: number | string
  amountTotalInCurrencySigned?: number | string
  amountResidualSigned?: number | string
  paymentState?: string
  reversedEntryId?: number
  invoiceVendorBillId?: number
  invoiceSourceEmail?: string
  invoicePartnerDisplayName?: string
  isManuallyModified?: boolean
  quickEditTotalAmount?: number | string
  narration?: string
  isMoveSent?: boolean
  invoiceUserId?: number
  invoiceOrigin?: string
  invoiceIncotermId?: number
  incotermLocation?: string
  invoiceCashRoundingId?: number
  sendingData?: string
  invoicePdfReportFile?: string
  showUpdateFpos?: boolean
}

export interface AccountMoveLineEntity extends BaseEntity {
  id: number
  moveId?: number
  journalId?: number
  journalGroupId?: number
  companyId?: number
  companyCurrencyId?: number
  moveName?: string
  parentState?: string
  date?: string
  invoiceDate?: string
  ref?: string
  isStorno?: boolean
  sequence?: number
  accountId?: number
  searchAccountId?: number
  name?: string
  debit?: number | string
  credit?: number | string
  balance?: number | string
  amountCurrency?: number | string
  currencyId?: number
  partnerId?: number
  isImported?: boolean
  reconcileModelId?: number
  paymentId?: number
  statementLineId?: number
  statementId?: number
  groupTaxId?: number
  taxLineId?: number
  taxGroupId?: number
  taxBaseAmount?: number | string
  taxRepartitionLineId?: number
  extraTaxData?: string
  amountResidual?: number | string
  amountResidualCurrency?: number | string
  reconciled?: boolean
  fullReconcileId?: number
  matchingNumber?: string
  displayType?: string
  collapseComposition?: boolean
  collapsePrices?: boolean
  productId?: number
  productUomId?: number
  quantity?: number | string
  dateMaturity?: string
  priceUnit?: number | string
  priceSubtotal?: number | string
  priceTotal?: number | string
  discount?: number | string
  deductibleAmount?: number | string
  analyticDistribution?: string
  discountDate?: string
  discountAmountCurrency?: number | string
  discountBalance?: number | string
  noFollowup?: boolean
}

export interface AccountInvoiceEntity extends BaseEntity {
  id: number
  name?: string
  partnerId?: number
  invoiceDate?: string
  dueDate?: string
  state?: string
  companyId?: number
  amountUntaxed?: number | string
  amountTax?: number | string
  amountTotal?: number | string
  paymentState?: string
  createUid?: number
  createDate?: string
  writeUid?: number
  writeDate?: string
}

export interface ModuleEntityMap {
  sysUser: SysUserEntity
  sysRole: SysRoleEntity
  resPartner: ResPartnerEntity
  productTemplate: ProductTemplateEntity
  productProduct: ProductProductEntity
  saleOrder: SaleOrderEntity
  saleOrderLine: SaleOrderLineEntity
  purchaseOrder: PurchaseOrderEntity
  purchaseOrderLine: PurchaseOrderLineEntity
  stockPicking: StockPickingEntity
  stockMove: StockMoveEntity
  stockQuant: StockQuantEntity
  accountMove: AccountMoveEntity
  accountMoveLine: AccountMoveLineEntity
  accountInvoice: AccountInvoiceEntity
}

