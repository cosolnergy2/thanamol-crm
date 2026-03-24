export const LEASE_TYPES = ['Monthly', 'Yearly', 'Long-term', 'Flexible'] as const

export type LeaseType = (typeof LEASE_TYPES)[number]
