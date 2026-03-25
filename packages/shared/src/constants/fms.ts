export const SITE_TYPES = ['OFFICE', 'INDUSTRIAL', 'RESIDENTIAL', 'MIXED'] as const
export type SiteType = (typeof SITE_TYPES)[number]

export const SERVICE_TYPES = [
  'LANDSCAPE',
  'WASTE',
  'PEST_CONTROL',
  'ELEVATOR',
  'HVAC',
  'FIRE_SYSTEM',
  'OTHER',
] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export const PATROL_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'MISSED'] as const
export const VISITOR_STATUSES = ['EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'] as const
export const KEY_STATUSES = ['AVAILABLE', 'ISSUED', 'LOST', 'DAMAGED'] as const
export const PARKING_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'] as const
export const CLEANING_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const
export const PETTY_CASH_CATEGORIES = [
  'OFFICE_SUPPLIES',
  'TRANSPORTATION',
  'MEALS',
  'MAINTENANCE',
  'CLEANING',
  'OTHER',
] as const
export type PettyCashCategory = (typeof PETTY_CASH_CATEGORIES)[number]
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
