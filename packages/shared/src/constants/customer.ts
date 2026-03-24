export const LEAD_SOURCES = ['Ads', 'Referral', 'Walk-in', 'Website', 'Event', 'Other'] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const INDUSTRIES = [
  'Manufacturing',
  'Logistics',
  'Retail',
  'Technology',
  'Real Estate',
  'Food & Beverage',
  'Healthcare',
  'Other',
] as const
export type Industry = (typeof INDUSTRIES)[number]

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '200+'] as const
export type CompanySize = (typeof COMPANY_SIZES)[number]

export const BUDGET_RANGES = ['Under 1M', '1-5M', '5-10M', '10-50M', '50M+'] as const
export type BudgetRange = (typeof BUDGET_RANGES)[number]
