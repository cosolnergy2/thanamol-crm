import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Printer, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCommercialQuotation } from '@/hooks/useCommercialQuotations'
import type { QuotationItem } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/quotations/commercial/$id/print')({
  component: PrintCommercialQuotationPage,
})

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return new Intl.NumberFormat('th-TH').format(amount)
}

function PrintCommercialQuotationPage() {
  const { id } = Route.useParams()
  const { data, isLoading, isError } = useCommercialQuotation(id)
  const quotation = data?.quotation
  const items: QuotationItem[] = Array.isArray(quotation?.items) ? quotation!.items : []

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <p className="text-slate-600 mb-4">Quotation not found</p>
        <Link to="/quotations/commercial">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to list
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Screen-only toolbar */}
      <div className="print:hidden bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/quotations/commercial/$id" params={{ id }}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Print Quotation</p>
            <p className="text-xs text-slate-500">{quotation.quotation_number}</p>
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

      {/* Printable document */}
      <div className="printable-section max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
        {/* Document header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Commercial Quotation</h1>
            <p className="text-slate-500 mt-1">ใบเสนอราคาเชิงพาณิชย์</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-indigo-700">{quotation.quotation_number}</p>
            <p className="text-sm text-slate-500 mt-1">Date: {formatDate(quotation.created_at)}</p>
          </div>
        </div>

        {/* Customer & Project info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Customer / ลูกค้า
            </p>
            <p className="font-semibold text-slate-900">{quotation.customer?.name ?? '-'}</p>
            {quotation.customer?.phone && (
              <p className="text-sm text-slate-600 mt-1">Tel: {quotation.customer.phone}</p>
            )}
            {quotation.customer?.email && (
              <p className="text-sm text-slate-600">Email: {quotation.customer.email}</p>
            )}
          </div>
          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Project / โครงการ
            </p>
            <p className="font-semibold text-slate-900">{quotation.project?.name ?? '-'}</p>
            {quotation.project?.code && (
              <p className="text-sm text-slate-600 mt-1">Code: {quotation.project.code}</p>
            )}
          </div>
        </div>

        {/* Line items */}
        {items.length > 0 && (
          <div className="mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 border border-slate-200">
                    Description
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700 border border-slate-200 w-20">
                    Qty
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700 border border-slate-200 w-36">
                    Unit Price
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700 border border-slate-200 w-36">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-3 px-4 border border-slate-200 text-slate-700">
                      {item.description}
                    </td>
                    <td className="py-3 px-4 border border-slate-200 text-right text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 border border-slate-200 text-right text-slate-600">
                      ฿{formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3 px-4 border border-slate-200 text-right font-medium text-slate-700">
                      ฿{formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td
                    colSpan={3}
                    className="py-3 px-4 border border-slate-200 text-right font-semibold text-slate-700"
                  >
                    Total Amount
                  </td>
                  <td className="py-3 px-4 border border-slate-200 text-right font-bold text-indigo-700 text-base">
                    ฿{formatCurrency(quotation.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Terms */}
        {quotation.terms && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Terms
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap border border-slate-200 rounded p-3">
              {quotation.terms}
            </p>
          </div>
        )}

        {/* Conditions */}
        {quotation.conditions && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Conditions
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap border border-slate-200 rounded p-3">
              {quotation.conditions}
            </p>
          </div>
        )}

        {/* Signature area */}
        <div className="mt-16 grid grid-cols-2 gap-16">
          <div className="text-center">
            <div className="border-b border-slate-400 mb-2 pb-8" />
            <p className="text-sm text-slate-600">Authorized Signature</p>
            <p className="text-xs text-slate-500 mt-1">Date: ________________</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-400 mb-2 pb-8" />
            <p className="text-sm text-slate-600">Customer Signature</p>
            <p className="text-xs text-slate-500 mt-1">Date: ________________</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
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
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}
