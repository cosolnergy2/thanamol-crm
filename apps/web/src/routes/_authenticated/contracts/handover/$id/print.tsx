import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useHandoverById } from '@/hooks/useHandovers'
import type { HandoverStatus, HandoverType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/contracts/handover/$id/print')({
  component: HandoverPrintPage,
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

function HandoverPrintPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: handover, isLoading, isError } = useHandoverById(id)

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-4xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (isError || !handover) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 print:hidden shadow-sm">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/contracts/handover' })}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="max-w-5xl mx-auto p-8">
          <p className="text-slate-500">Handover not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Controls — hidden on print */}
      <div className="sticky top-0 bg-white border-b border-slate-200 p-4 print:hidden shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/contracts/handover/$id" params={{ id }}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable content */}
      <div id="printable-content" className="max-w-5xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          {/* Document header */}
          <div className="text-center mb-8 border-b border-slate-200 pb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">HANDOVER DOCUMENT</h1>
            <p className="text-slate-600">ใบส่งมอบพื้นที่</p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light mb-1">
                Contract ID
              </p>
              <p className="font-medium text-slate-900">{handover.contract_id}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light mb-1">
                Handover Date
              </p>
              <p className="font-medium text-slate-900">
                {new Date(handover.handover_date).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light mb-1">
                Type
              </p>
              <p className="font-medium text-slate-900">
                {HANDOVER_TYPE_LABELS[handover.handover_type]}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light mb-1">
                Status
              </p>
              <Badge
                variant="outline"
                className={`${HANDOVER_STATUS_CLASSES[handover.status]} text-xs font-light`}
              >
                {handover.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light mb-1">
                Received By
              </p>
              <p className="font-medium text-slate-900">{handover.received_by ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-light mb-1">
                Handed By
              </p>
              <p className="font-medium text-slate-900">{handover.handed_by ?? '-'}</p>
            </div>
          </div>

          {/* Checklist */}
          {Array.isArray(handover.checklist) && handover.checklist.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-4">
                Checklist
              </h2>
              <div className="space-y-2">
                {(handover.checklist as Array<Record<string, unknown>>).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 border border-slate-200 rounded"
                  >
                    <div className="w-4 h-4 border-2 border-slate-400 rounded flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700">{JSON.stringify(item)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {handover.notes && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-4">
                Notes
              </h2>
              <p className="text-slate-700 whitespace-pre-wrap text-sm">{handover.notes}</p>
            </div>
          )}

          {/* Signature section */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-slate-200">
            <div className="text-center">
              <div className="border-t border-slate-400 mt-16 pt-2">
                <p className="text-sm text-slate-600">
                  {handover.handed_by || 'Sender Signature'}
                </p>
                <p className="text-xs text-slate-400">ผู้ส่งมอบ</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 mt-16 pt-2">
                <p className="text-sm text-slate-600">
                  {handover.received_by || 'Recipient Signature'}
                </p>
                <p className="text-xs text-slate-400">ผู้รับมอบ</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-content,
          #printable-content * {
            visibility: visible;
          }
          #printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  )
}
