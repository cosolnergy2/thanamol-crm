export const INCIDENT_TYPES = [
  'Safety',
  'Security',
  'Fire',
  'Environmental',
  'Property Damage',
  'Injury',
  'Near Miss',
  'Other',
] as const
export type IncidentType = (typeof INCIDENT_TYPES)[number]

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

// Asset dropdowns
export const ASSET_SCOPE_TYPES = ['Company', 'Project', 'Central', 'SITE', 'UNIT'] as const
export const ASSET_CRITICALITIES = ['Critical', 'High', 'Normal', 'Low'] as const
export const ASSET_CONDITION_SCORES = [
  { value: 5, label: '5 - Excellent' },
  { value: 4, label: '4 - Good' },
  { value: 3, label: '3 - Fair' },
  { value: 2, label: '2 - Poor' },
  { value: 1, label: '1 - Critical' },
] as const
export const ASSET_LIFECYCLE_STATUSES = ['Operational', 'Under Maintenance', 'Out of Service', 'Decommissioned'] as const

// PM dropdowns
export const PM_TRIGGER_TYPES = ['Time-Based', 'Condition-Based'] as const

// Calibration dropdowns
export const CALIBRATION_TYPES = ['Internal', 'External', 'Factory'] as const

// Inventory dropdowns
export const INVENTORY_ITEM_TYPES = ['Spare Part', 'Consumable', 'Tool', 'Equipment'] as const

// Stock Issue
export const STOCK_ISSUE_PURPOSES = ['General Use', 'Maintenance', 'Project', 'Emergency'] as const

// GRN
export const QC_STATUSES = ['Pass', 'Fail', 'Partial'] as const

// PR
export const PR_PURPOSES = ['Stock Replenishment', 'งานซ่อม/Work Order', 'Project', 'Emergency', 'Service Contract', 'อื่นๆ'] as const
export const PR_ITEM_TYPES = ['วัสดุ', 'ค่าแรง', 'งานเหมา', 'งานวิศวกรรม', 'งานบริการ', 'Asset', 'Inventory', 'PM', 'อื่นๆ'] as const

// PO
export const PO_TYPES = ['Goods', 'Service', 'Rental'] as const

// Vendor
export const VENDOR_TYPES = ['Supplier', 'Contractor', 'Service Provider', 'Consultant'] as const
export const VENDOR_SERVICE_TAGS = ['HVAC', 'Electrical', 'Plumbing', 'Cleaning', 'Security', 'Landscaping', 'IT', 'Fire Safety', 'Elevator', 'General'] as const
export const VENDOR_SUPPLIER_TYPES = ['Supplier ทั่วไป', 'Supplier เฉพาะทาง'] as const
export const VENDOR_RATING_LEVELS = ['สูง', 'กลาง', 'ต่ำ'] as const
export const VENDOR_CONTRACT_TYPES = ['Service Agreement', 'Maintenance', 'Supply', 'Rental', 'Consulting'] as const
export const VENDOR_SERVICE_CATEGORIES = ['HVAC', 'Electrical', 'Plumbing', 'Cleaning', 'Security', 'Landscaping', 'IT', 'Fire Safety', 'Elevator', 'General'] as const
export const VENDOR_PAYMENT_TERMS = ['30 Days', '45 Days', '60 Days', '90 Days', 'COD', 'Advance Payment'] as const

export const LANDSCAPE_TASK_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const
export type LandscapeTaskStatus = (typeof LANDSCAPE_TASK_STATUSES)[number]

export const WASTE_TYPES = ['GENERAL', 'RECYCLABLE', 'HAZARDOUS', 'ORGANIC'] as const
export type WasteType = (typeof WASTE_TYPES)[number]

export const WASTE_UNITS = ['kg', 'ton', 'm3'] as const
export type WasteUnit = (typeof WASTE_UNITS)[number]

export const PPE_OPTIONS = [
  'Hard Hat',
  'Safety Glasses',
  'High Vis Vest',
  'Gloves',
  'Safety Shoes',
  'Ear Protection',
  'Respirator',
  'Fall Protection',
] as const
export type PpeOption = (typeof PPE_OPTIONS)[number]
