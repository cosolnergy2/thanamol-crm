export const SITE_TYPES = ['OFFICE', 'INDUSTRIAL', 'RESIDENTIAL', 'MIXED'] as const
export type SiteType = (typeof SITE_TYPES)[number]

export const UNITS_OF_MEASURE = ['piece', 'kg', 'liter', 'meter', 'box', 'set', 'roll', 'can'] as const

export const STOCK_MOVEMENT_TYPES = ['RECEIVED', 'ISSUED', 'RETURNED', 'ADJUSTED', 'TRANSFERRED'] as const

export const GRN_STATUSES = ['DRAFT', 'RECEIVED', 'INSPECTED', 'ACCEPTED', 'REJECTED'] as const

export const BUDGET_LINE_CATEGORIES = [
  'MAINTENANCE',
  'UTILITIES',
  'SECURITY',
  'CLEANING',
  'LANDSCAPING',
  'PROCUREMENT',
  'CAPEX',
  'OTHER',
] as const

export type BudgetLineCategory = (typeof BUDGET_LINE_CATEGORIES)[number]

export const BUDGET_TRANSACTION_TYPES = ['COMMITMENT', 'ACTUAL', 'REVERSAL'] as const
