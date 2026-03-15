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

type StatusBadgeVariant = 'customerStatus' | 'customerType' | 'companyStatus'

type StatusBadgeProps = {
  value: string
  variant: StatusBadgeVariant
}

const CLASS_MAP: Record<StatusBadgeVariant, Record<string, string>> = {
  customerStatus: CUSTOMER_STATUS_CLASSES,
  customerType: CUSTOMER_TYPE_CLASSES,
  companyStatus: COMPANY_STATUS_CLASSES,
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
