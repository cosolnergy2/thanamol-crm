export const ACCOUNT_TYPES = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'COST_OF_SALES',
  'OPERATING_EXPENSE',
  'OTHER_INCOME',
  'OTHER_EXPENSE',
] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const ACCOUNT_TYPE_LABELS: Record<AccountType, { en: string; th: string; color: string }> = {
  ASSET: { en: 'Asset', th: 'สินทรัพย์', color: 'bg-blue-100 text-blue-700' },
  LIABILITY: { en: 'Liability', th: 'หนี้สิน', color: 'bg-red-100 text-red-700' },
  EQUITY: { en: 'Equity', th: 'ส่วนของผู้ถือหุ้น', color: 'bg-purple-100 text-purple-700' },
  REVENUE: { en: 'Revenue', th: 'รายได้', color: 'bg-green-100 text-green-700' },
  COST_OF_SALES: { en: 'Cost of Sales', th: 'ต้นทุนขาย', color: 'bg-orange-100 text-orange-700' },
  OPERATING_EXPENSE: { en: 'Operating Expense', th: 'ค่าใช้จ่ายดำเนินงาน', color: 'bg-yellow-100 text-yellow-700' },
  OTHER_INCOME: { en: 'Other Income', th: 'รายได้อื่น', color: 'bg-teal-100 text-teal-700' },
  OTHER_EXPENSE: { en: 'Other Expense', th: 'ค่าใช้จ่ายอื่น', color: 'bg-rose-100 text-rose-700' },
}

export const NORMAL_BALANCES = ['DEBIT', 'CREDIT'] as const
export type NormalBalance = (typeof NORMAL_BALANCES)[number]

export const CASH_FLOW_CATEGORIES = ['OPERATING', 'INVESTING', 'FINANCING', 'NONE'] as const
export type CashFlowCategory = (typeof CASH_FLOW_CATEGORIES)[number]

export const VAT_TYPES = ['NONE', 'VAT7', 'VAT0', 'EXEMPT'] as const
export type VatType = (typeof VAT_TYPES)[number]

export const ACCOUNTING_PERIOD_STATUSES = ['OPEN', 'SOFT_CLOSED', 'HARD_CLOSED'] as const
export type AccountingPeriodStatus = (typeof ACCOUNTING_PERIOD_STATUSES)[number]

export const JOURNAL_TYPES = [
  'GENERAL',
  'CASH_RECEIPT',
  'CASH_PAYMENT',
  'PURCHASE',
  'SALES',
  'ADJUSTMENT',
  'REVERSING',
  'ACCRUAL',
  'DEPRECIATION',
  'CLOSING',
] as const
export type JournalType = (typeof JOURNAL_TYPES)[number]

export const JOURNAL_TYPE_LABELS: Record<JournalType, { en: string; th: string }> = {
  GENERAL: { en: 'General Journal', th: 'สมุดรายวันทั่วไป' },
  CASH_RECEIPT: { en: 'Cash Receipt', th: 'สมุดรับเงินสด' },
  CASH_PAYMENT: { en: 'Cash Payment', th: 'สมุดจ่ายเงินสด' },
  PURCHASE: { en: 'Purchase Journal', th: 'สมุดซื้อ' },
  SALES: { en: 'Sales Journal', th: 'สมุดขาย' },
  ADJUSTMENT: { en: 'Adjusting', th: 'รายการปรับปรุง' },
  REVERSING: { en: 'Reversing', th: 'รายการกลับรายการ' },
  ACCRUAL: { en: 'Accrual', th: 'ค้างรับค้างจ่าย' },
  DEPRECIATION: { en: 'Depreciation', th: 'ค่าเสื่อมราคา' },
  CLOSING: { en: 'Closing', th: 'ปิดบัญชี' },
}

export const JOURNAL_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED'] as const
export type JournalStatus = (typeof JOURNAL_STATUSES)[number]

export const JOURNAL_STATUS_LABELS: Record<JournalStatus, { en: string; th: string; color: string }> = {
  DRAFT: { en: 'Draft', th: 'ร่าง', color: 'bg-slate-100 text-slate-600' },
  SUBMITTED: { en: 'Submitted', th: 'รอตรวจสอบ', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { en: 'Approved', th: 'อนุมัติ', color: 'bg-blue-100 text-blue-700' },
  POSTED: { en: 'Posted', th: 'บันทึกแล้ว', color: 'bg-green-100 text-green-700' },
  CANCELLED: { en: 'Cancelled', th: 'ยกเลิก', color: 'bg-red-100 text-red-700' },
}

export const PERIOD_STATUS_LABELS: Record<AccountingPeriodStatus, { en: string; th: string; color: string }> = {
  OPEN: { en: 'Open', th: 'เปิด', color: 'bg-green-100 text-green-700' },
  SOFT_CLOSED: { en: 'Soft Closed', th: 'ปิดชั่วคราว', color: 'bg-yellow-100 text-yellow-700' },
  HARD_CLOSED: { en: 'Hard Closed', th: 'ปิดถาวร', color: 'bg-red-100 text-red-700' },
}

export const MONTHS_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
] as const
