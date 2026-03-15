import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Edit, Printer, ClipboardCheck } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { usePreHandoverInspectionById } from '@/hooks/usePreHandoverInspections'
import { InspectionChecklist } from '../-components/InspectionChecklist'
import type { InspectionStatus, InspectionItem } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job03-f01/$id/')({
  component: PreHandoverInspectionDetailPage,
})

const STATUS_COLORS: Record<InspectionStatus, string> = {
  PASS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  FAIL: 'bg-rose-100 text-rose-700 border-rose-200',
  CONDITIONAL: 'bg-amber-100 text-amber-700 border-amber-200',
}

const STATUS_LABELS: Record<InspectionStatus, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  CONDITIONAL: 'Conditional',
}

function PreHandoverInspectionDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = usePreHandoverInspectionById(id)
  const inspection = data?.inspection

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !inspection) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Inspection not found.</p>
        <Link to="/forms/sale-job03-f01">
          <Button variant="outline" className="mt-4">
            Back to List
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title={inspection.contract.contract_number}
        actions={
          <div className="flex gap-2">
            <Link to="/forms/sale-job03-f01/$id/edit" params={{ id }}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Link to="/forms/sale-job03-f01/$id/print" params={{ id }}>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/forms/sale-job03-f01' })}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Status
            </p>
            <Badge
              variant="outline"
              className={`${STATUS_COLORS[inspection.overall_status as InspectionStatus] ?? ''} text-[10px] font-light`}
            >
              {STATUS_LABELS[inspection.overall_status as InspectionStatus]}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Contract Type
            </p>
            <span className="text-sm font-light text-slate-700">{inspection.contract.type}</span>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Inspection Date
            </p>
            <span className="text-sm font-light text-slate-700">
              {format(new Date(inspection.inspection_date), 'd MMM yyyy')}
            </span>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Created
            </p>
            <span className="text-sm font-light text-slate-700">
              {format(new Date(inspection.created_at), 'd MMM yyyy')}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
            <ClipboardCheck className="w-4 h-4 mr-2 text-indigo-600" />
            SECTION 1: Document Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
                Contract Number
              </Label>
              <p className="text-sm font-light text-slate-800 mt-1">
                {inspection.contract.contract_number}
              </p>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
                Contract Status
              </Label>
              <p className="text-sm font-light text-slate-800 mt-1">
                {inspection.contract.status}
              </p>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
                Inspector
              </Label>
              <p className="text-sm font-light text-slate-800 mt-1">{inspection.inspector}</p>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
                Overall Status
              </Label>
              <Badge
                variant="outline"
                className={`${STATUS_COLORS[inspection.overall_status as InspectionStatus] ?? ''} text-[10px] font-light mt-1`}
              >
                {STATUS_LABELS[inspection.overall_status as InspectionStatus]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {Array.isArray(inspection.items) && inspection.items.length > 0 && (
        <InspectionChecklist
          items={inspection.items as InspectionItem[]}
          onChange={() => {}}
          readOnly
        />
      )}

      {inspection.notes && (
        <Card>
          <CardContent className="pt-4">
            <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Notes</Label>
            <p className="text-sm font-light text-slate-700 mt-2 whitespace-pre-wrap">
              {inspection.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
