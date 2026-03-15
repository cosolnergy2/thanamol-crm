import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { useQuotation } from '@/hooks/useQuotations'

export const Route = createFileRoute('/_authenticated/quotations/$quotationId/print')({
  component: PrintQuotationPage,
})

function PrintQuotationPage() {
  const { quotationId } = Route.useParams()
  const { data, isLoading } = useQuotation(quotationId)
  const quotation = data?.quotation

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-slate-500 mb-4">Quotation not found</p>
        <Link to="/quotations">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotations
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Screen-only toolbar */}
      <div className="print:hidden bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/quotations/$quotationId" params={{ quotationId }}>
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-slate-900">Print Quotation</h1>
            <p className="text-sm text-slate-500">{quotation.quotation_number}</p>
          </div>
        </div>
        <Button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Printable content */}
      <div className="printable-section max-w-4xl mx-auto p-8 print:p-6 print:max-w-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-indigo-600">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700 tracking-wide">QUOTATION</h1>
            <p className="text-slate-500 mt-1">ใบเสนอราคา</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-slate-900">{quotation.quotation_number}</p>
            <p className="text-sm text-slate-500 mt-1">
              Date: {format(new Date(quotation.created_at), 'd MMM yyyy')}
            </p>
            {quotation.valid_until && (
              <p className="text-sm text-slate-500">
                Valid Until: {format(new Date(quotation.valid_until), 'd MMM yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Customer + Project Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mb-2">
              Bill To
            </p>
            <p className="font-semibold text-slate-900 text-lg">
              {quotation.customer?.name ?? '—'}
            </p>
            {quotation.customer?.email && (
              <p className="text-sm text-slate-600 mt-1">{quotation.customer.email}</p>
            )}
            {quotation.customer?.phone && (
              <p className="text-sm text-slate-600">{quotation.customer.phone}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mb-2">
              Project
            </p>
            <p className="font-semibold text-slate-900">{quotation.project?.name ?? '—'}</p>
            {quotation.project?.code && (
              <p className="text-sm text-slate-500 mt-1">Code: {quotation.project.code}</p>
            )}
            {quotation.unit && (
              <p className="text-sm text-slate-500">
                Unit: {quotation.unit.unit_number}
                {quotation.unit.floor ? ` — Floor ${quotation.unit.floor}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-indigo-600 text-white">
              <th className="py-3 px-4 text-left text-[11px] font-semibold tracking-wider uppercase">
                Description
              </th>
              <th className="py-3 px-4 text-right text-[11px] font-semibold tracking-wider uppercase w-20">
                Qty
              </th>
              <th className="py-3 px-4 text-right text-[11px] font-semibold tracking-wider uppercase w-32">
                Unit Price
              </th>
              <th className="py-3 px-4 text-right text-[11px] font-semibold tracking-wider uppercase w-32">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {(quotation.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400 text-sm">
                  No items
                </td>
              </tr>
            ) : (
              quotation.items.map((item, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                >
                  <td className="py-3 px-4 text-sm text-slate-700">{item.description}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 text-right">{item.quantity}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 text-right">
                    ฿{item.unit_price.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700 text-right">
                    ฿{item.amount.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600 py-1 border-b border-slate-100">
              <span>Subtotal</span>
              <span>฿{quotation.total_amount.toLocaleString()}</span>
            </div>
            {quotation.discount > 0 && (
              <div className="flex justify-between text-slate-600 py-1 border-b border-slate-100">
                <span>Discount</span>
                <span>— ฿{quotation.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 py-1 border-b border-slate-100">
              <span>VAT 7%</span>
              <span>฿{quotation.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 py-2 bg-indigo-50 px-3 rounded">
              <span>Grand Total</span>
              <span>฿{quotation.grand_total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quotation.notes && (
          <div className="mb-8 p-4 border border-slate-200 rounded bg-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mb-2">
              Notes
            </p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{quotation.notes}</p>
          </div>
        )}

        {/* Signature Block */}
        <div className="grid grid-cols-2 gap-16 mt-12 pt-8 border-t border-slate-200">
          <div className="text-center">
            <div className="h-16 border-b border-slate-300 mb-2" />
            <p className="text-xs text-slate-500">Authorized Signature</p>
            <p className="text-xs text-slate-400 mt-1">Date: ___________</p>
          </div>
          <div className="text-center">
            <div className="h-16 border-b border-slate-300 mb-2" />
            <p className="text-xs text-slate-500">Customer Acceptance</p>
            <p className="text-xs text-slate-400 mt-1">Date: ___________</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .printable-section,
          .printable-section * {
            visibility: visible;
          }
          .printable-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}
