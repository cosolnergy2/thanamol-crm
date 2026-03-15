import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Edit, Printer, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useHandoverById } from '@/hooks/useHandovers'
import type { HandoverStatus, HandoverType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/contracts/handover/$id/')({
  component: HandoverDetailPage,
})

const HANDOVER_STATUS_CLASSES: Record<HandoverStatus, string> = {
  PENDING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const HANDOVER_TYPE_LABELS: Record<HandoverType, string> = {
  INITIAL: 'Initial',
  FINAL: 'Final',
  PARTIAL: 'Partial',
}

function HandoverDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: handover, isLoading, isError } = useHandoverById(id)

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-4xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !handover) {
    return (
      <div className="space-y-3 max-w-4xl">
        <div className="flex items-center space-x-3 mb-4">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate({ to: '/contracts/handover' })}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-slate-500">Handover not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Link to="/contracts/handover">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              Handover Detail
            </h1>
            <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/contracts/handover/$id/print" params={{ id }}>
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </Link>
          <Link to="/contracts/handover/$id/edit" params={{ id }}>
            <Button className="bg-indigo-600 hover:bg-indigo-700" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
            <ClipboardList className="w-4 h-4 mr-2 text-indigo-600" />
            Handover Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
                Status
              </p>
              <Badge
                variant="outline"
                className={`${HANDOVER_STATUS_CLASSES[handover.status]} text-[9px] h-4 px-1.5 font-extralight`}
              >
                {handover.status}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
                Type
              </p>
              <p className="font-light text-slate-800 text-sm">
                {HANDOVER_TYPE_LABELS[handover.handover_type]}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
                Contract
              </p>
              <p className="font-light text-slate-800 text-sm">{handover.contract_id}</p>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
                Handover Date
              </p>
              <p className="font-light text-slate-800 text-sm">
                {new Date(handover.handover_date).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
                Received By
              </p>
              <p className="font-light text-slate-800 text-sm">
                {handover.received_by ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
                Handed By
              </p>
              <p className="font-light text-slate-800 text-sm">
                {handover.handed_by ?? '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {handover.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-slate-700 whitespace-pre-wrap text-sm font-light">
              {handover.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {Array.isArray(handover.checklist) && handover.checklist.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {(handover.checklist as Array<Record<string, unknown>>).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-slate-200 rounded-lg bg-slate-50/50"
                >
                  <p className="text-sm font-light text-slate-700">
                    {JSON.stringify(item)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between px-2 py-2">
        <p className="text-[10px] text-slate-400 font-extralight">
          Created: {new Date(handover.created_at).toLocaleString('th-TH')}
        </p>
        <p className="text-[10px] text-slate-400 font-extralight">
          Updated: {new Date(handover.updated_at).toLocaleString('th-TH')}
        </p>
      </div>
    </div>
  )
}
