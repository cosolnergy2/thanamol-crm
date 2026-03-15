import { Badge } from '@/components/ui/badge'

const CUSTOMER_STATUS_CLASSES: Record<string, string> = {
  PROSPECT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ACTIVE: 'bg-teal-50 text-teal-700 border-teal-200',
  INACTIVE: 'bg-slate-100 text-slate-700 border-slate-200',
}

const CUSTOMER_TYPE_CLASSES: Record<string, string> = {
  INDIVIDUAL: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  COMPANY: 'bg-teal-100 text-teal-700 border-teal-200',
}

const COMPANY_STATUS_CLASSES: Record<string, string> = {
  ACTIVE: 'bg-teal-50 text-teal-700 border-teal-200',
  INACTIVE: 'bg-slate-100 text-slate-700 border-slate-200',
}

const DEAL_STAGE_CLASSES: Record<string, string> = {
  PROSPECTING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  QUALIFICATION: 'bg-teal-50 text-teal-700 border-teal-200',
  PROPOSAL: 'bg-amber-50 text-amber-700 border-amber-200',
  NEGOTIATION: 'bg-orange-50 text-orange-700 border-orange-200',
  CLOSED_WON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED_LOST: 'bg-rose-50 text-rose-700 border-rose-200',
}

const MEETING_STATUS_CLASSES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  FINALIZED: 'bg-teal-50 text-teal-700 border-teal-200',
  DISTRIBUTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

const WAREHOUSE_STATUS_CLASSES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  REVIEWED: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const SALE_JOB_STATUS_CLASSES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

type StatusBadgeVariant =
  | 'customerStatus'
  | 'customerType'
  | 'companyStatus'
  | 'dealStage'
  | 'meetingStatus'
  | 'warehouseStatus'
  | 'saleJobStatus'
  | 'default'

type StatusBadgeProps = {
  value: string
  variant: StatusBadgeVariant
}

const CLASS_MAP: Record<StatusBadgeVariant, Record<string, string>> = {
  customerStatus: CUSTOMER_STATUS_CLASSES,
  customerType: CUSTOMER_TYPE_CLASSES,
  companyStatus: COMPANY_STATUS_CLASSES,
  dealStage: DEAL_STAGE_CLASSES,
  meetingStatus: MEETING_STATUS_CLASSES,
  warehouseStatus: WAREHOUSE_STATUS_CLASSES,
  saleJobStatus: SALE_JOB_STATUS_CLASSES,
  default: {},
}

export function StatusBadge({ value, variant }: StatusBadgeProps) {
  const classes = CLASS_MAP[variant]
  const className = classes[value] ?? 'bg-slate-100 text-slate-600 border-slate-200'

  return (
    <Badge
      variant="outline"
      className={`${className} text-[9px] h-4 px-1.5 font-extralight`}
    >
      {value}
    </Badge>
  )
}
