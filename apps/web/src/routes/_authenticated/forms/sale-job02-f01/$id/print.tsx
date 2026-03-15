import { createFileRoute, Link } from '@tanstack/react-router'
import { Printer, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeaseAgreementById } from '@/hooks/useLeaseAgreements'
import type { LeaseStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job02-f01/$id/print')({
  component: LeaseAgreementPrintPage,
})

const STATUS_LABELS: Record<LeaseStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
}

function LeaseAgreementPrintPage() {
  const { id } = Route.useParams()
  const { data, isLoading, isError } = useLeaseAgreementById(id)
  const agreement = data?.leaseAgreement

  if (isLoading) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-60 w-full" />
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

  const hasLeaseTerms = Object.keys(agreement.lease_terms).length > 0

  return (
    <div>
      <div className="print:hidden flex gap-2 mb-6 p-4">
        <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Link to="/forms/sale-job02-f01/$id" params={{ id }}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="printable-section p-8 max-w-4xl mx-auto bg-white">
        <div className="text-center border-b pb-6 mb-6">
          <h1 className="text-2xl font-light text-slate-900 tracking-wide">LEASE AGREEMENT</h1>
          <p className="text-lg text-indigo-600 font-light mt-1">
            {agreement.contract.contract_number}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Status: {STATUS_LABELS[agreement.status as LeaseStatus] ?? agreement.status}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Contract Reference
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Contract Number</p>
                <p className="text-sm text-slate-800">{agreement.contract.contract_number}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Contract Type</p>
                <p className="text-sm text-slate-800">{agreement.contract.type}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Contract Status</p>
                <p className="text-sm text-slate-800">{agreement.contract.status}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Agreement Details
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Lease Status</p>
                <p className="text-sm text-slate-800">
                  {STATUS_LABELS[agreement.status as LeaseStatus] ?? agreement.status}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Created Date</p>
                <p className="text-sm text-slate-800">
                  {format(new Date(agreement.created_at), 'd MMMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Last Updated</p>
                <p className="text-sm text-slate-800">
                  {format(new Date(agreement.updated_at), 'd MMMM yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {hasLeaseTerms && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Lease Terms
            </h2>
            <div className="space-y-2">
              {Object.entries(agreement.lease_terms).map(([key, value]) => (
                <div key={key} className="flex gap-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide w-40 shrink-0">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-slate-700">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {agreement.special_conditions && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Special Conditions
            </h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {agreement.special_conditions}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-16 pt-8 border-t">
          <div className="text-center">
            <div className="border-b border-slate-400 mb-2 pb-8"></div>
            <p className="text-xs text-slate-500">Lessor Signature</p>
            <p className="text-sm text-slate-800 mt-1">PropertyFlow CRM</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-400 mb-2 pb-8"></div>
            <p className="text-xs text-slate-500">Lessee Signature</p>
            <p className="text-sm text-slate-800 mt-1">_______________</p>
          </div>
        </div>

        <div className="text-center mt-8 text-[10px] text-slate-400">
          Generated on {format(new Date(), 'd MMMM yyyy')} — Ref: {agreement.id}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-section, .printable-section * { visibility: visible; }
          .printable-section { position: absolute; left: 0; top: 0; width: 100%; }
          @page {
            size: A4 portrait;
            margin: 2cm 2.5cm;
          }
        }
      `}</style>
    </div>
  )
}
