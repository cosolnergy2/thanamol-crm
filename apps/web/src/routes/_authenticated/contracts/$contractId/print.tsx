import { createFileRoute, Link } from '@tanstack/react-router'
import { Printer, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useContractById } from '@/hooks/useContracts'

export const Route = createFileRoute('/_authenticated/contracts/$contractId/print')({
  component: ContractPrintPage,
})

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Sale',
  LEASE: 'Lease',
  RENTAL: 'Rental',
}

function ContractPrintPage() {
  const { contractId } = Route.useParams()
  const { data, isLoading, isError } = useContractById(contractId)
  const contract = data?.contract

  if (isLoading) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (isError || !contract) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Contract not found.</p>
        <Link to="/contracts">
          <Button variant="outline" className="mt-4">
            Back to Contracts
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="print:hidden flex gap-2 mb-6 p-4">
        <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Link to="/contracts/$contractId" params={{ contractId }}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="printable-section p-8 max-w-4xl mx-auto bg-white">
        <div className="text-center border-b pb-6 mb-6">
          <h1 className="text-2xl font-light text-slate-900 tracking-wide">CONTRACT</h1>
          <p className="text-lg text-indigo-600 font-light mt-1">{contract.contract_number}</p>
          <p className="text-sm text-slate-500 mt-1">
            {TYPE_LABELS[contract.type] ?? contract.type} Contract
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Party Information
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Customer</p>
                <p className="text-sm text-slate-800">{contract.customer?.name ?? '—'}</p>
              </div>
              {contract.customer?.email && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-slate-800">{contract.customer.email}</p>
                </div>
              )}
              {contract.customer?.phone && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Phone</p>
                  <p className="text-sm text-slate-800">{contract.customer.phone}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Property Details
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Project</p>
                <p className="text-sm text-slate-800">{contract.project?.name ?? '—'}</p>
              </div>
              {contract.unit && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Unit</p>
                  <p className="text-sm text-slate-800">
                    {contract.unit.unit_number}
                    {contract.unit.floor ? ` — Floor ${contract.unit.floor}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Contract Period
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Start Date</p>
                <p className="text-sm text-slate-800">
                  {format(new Date(contract.start_date), 'd MMMM yyyy')}
                </p>
              </div>
              {contract.end_date && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">End Date</p>
                  <p className="text-sm text-slate-800">
                    {format(new Date(contract.end_date), 'd MMMM yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Financial Summary
            </h2>
            <div className="space-y-2">
              {contract.value != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Contract Value</span>
                  <span className="text-slate-800">฿{contract.value.toLocaleString()}</span>
                </div>
              )}
              {contract.monthly_rent != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Monthly Rent</span>
                  <span className="text-slate-800">฿{contract.monthly_rent.toLocaleString()}</span>
                </div>
              )}
              {contract.deposit_amount != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Deposit</span>
                  <span className="text-slate-800">฿{contract.deposit_amount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {contract.terms && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Terms &amp; Conditions
            </h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {contract.terms}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-16 pt-8 border-t">
          <div className="text-center">
            <div className="border-b border-slate-400 mb-2 pb-8"></div>
            <p className="text-xs text-slate-500">Customer Signature</p>
            <p className="text-sm text-slate-800 mt-1">{contract.customer?.name ?? '_______________'}</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-400 mb-2 pb-8"></div>
            <p className="text-xs text-slate-500">Authorized Signature</p>
            <p className="text-sm text-slate-800 mt-1">PropertyFlow CRM</p>
          </div>
        </div>

        <div className="text-center mt-8 text-[10px] text-slate-400">
          Generated on {format(new Date(), 'd MMMM yyyy')} — Status: {contract.status.replace('_', ' ')}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-section, .printable-section * { visibility: visible; }
          .printable-section { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}
