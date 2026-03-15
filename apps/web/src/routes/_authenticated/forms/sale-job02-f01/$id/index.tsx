import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Edit, Printer, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useLeaseAgreementById } from '@/hooks/useLeaseAgreements'
import type { LeaseStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job02-f01/$id/')({
  component: LeaseAgreementDetailPage,
})

const STATUS_COLORS: Record<LeaseStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
  TERMINATED: 'bg-rose-100 text-rose-700 border-rose-200',
}

const STATUS_LABELS: Record<LeaseStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
}

function LeaseAgreementDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useLeaseAgreementById(id)
  const agreement = data?.leaseAgreement

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !agreement) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Lease agreement not found.</p>
        <Link to="/forms/sale-job02-f01">
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
        title={agreement.contract.contract_number}
        actions={
          <div className="flex gap-2">
            {agreement.status === 'DRAFT' && (
              <Link to="/forms/sale-job02-f01/$id/edit" params={{ id }}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
            <Link to="/forms/sale-job02-f01/$id/print" params={{ id }}>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/forms/sale-job02-f01' })}
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
              className={`${STATUS_COLORS[agreement.status as LeaseStatus] ?? ''} text-[10px] font-light`}
            >
              {STATUS_LABELS[agreement.status as LeaseStatus]}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Contract Type
            </p>
            <span className="text-sm font-light text-slate-700">{agreement.contract.type}</span>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Created
            </p>
            <span className="text-sm font-light text-slate-700">
              {format(new Date(agreement.created_at), 'd MMM yyyy')}
            </span>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Updated
            </p>
            <span className="text-sm font-light text-slate-700">
              {format(new Date(agreement.updated_at), 'd MMM yyyy')}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
            <FileText className="w-4 h-4 mr-2 text-indigo-600" />
            Contract Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
                Contract Number
              </Label>
              <p className="text-sm font-light text-slate-800 mt-1">
                {agreement.contract.contract_number}
              </p>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
                Contract Status
              </Label>
              <p className="text-sm font-light text-slate-800 mt-1">{agreement.contract.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(agreement.lease_terms).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Lease Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm font-mono text-slate-700 bg-slate-50 p-4 rounded-md overflow-auto">
              {JSON.stringify(agreement.lease_terms, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {agreement.special_conditions && (
        <Card>
          <CardContent className="pt-4">
            <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
              Special Conditions
            </Label>
            <p className="text-sm font-light text-slate-700 mt-2 whitespace-pre-wrap">
              {agreement.special_conditions}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
