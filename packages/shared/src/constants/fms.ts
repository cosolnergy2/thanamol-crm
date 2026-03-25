export const SITE_TYPES = ['OFFICE', 'INDUSTRIAL', 'RESIDENTIAL', 'MIXED'] as const
export type SiteType = (typeof SITE_TYPES)[number]
