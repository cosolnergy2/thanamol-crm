export const RATE_TYPES = ['Fixed', 'Actual'] as const
export type RateType = (typeof RATE_TYPES)[number]

export const RESPONSIBILITY_OPTIONS = ['N/A', 'Lessor', 'Lessee', 'Shared 50/50'] as const
export type ResponsibilityOption = (typeof RESPONSIBILITY_OPTIONS)[number]

export const DEPOSIT_DECORATION_OPTIONS = ['None', 'Yes'] as const
export type DepositDecorationOption = (typeof DEPOSIT_DECORATION_OPTIONS)[number]

export const DURATION_UNITS = ['เดือน', 'ปี'] as const
export type DurationUnit = (typeof DURATION_UNITS)[number]

export const RENT_CALC_UNITS = ['บาท/ตร.ม.', 'บาท/เดือน'] as const
export type RentCalcUnit = (typeof RENT_CALC_UNITS)[number]
