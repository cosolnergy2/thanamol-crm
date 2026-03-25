export const SITE_TYPES = ['OFFICE', 'INDUSTRIAL', 'RESIDENTIAL', 'MIXED'] as const
export type SiteType = (typeof SITE_TYPES)[number]

export const PETTY_CASH_CATEGORIES = [
  'OFFICE_SUPPLIES',
  'TRANSPORTATION',
  'MEALS',
  'MAINTENANCE',
  'CLEANING',
  'OTHER',
] as const
export type PettyCashCategory = (typeof PETTY_CASH_CATEGORIES)[number]
