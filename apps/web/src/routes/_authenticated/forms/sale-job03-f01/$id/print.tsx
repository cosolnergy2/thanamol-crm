import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePreHandoverInspectionById } from '@/hooks/usePreHandoverInspections'
import type { InspectionStatus, InspectionItem } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job03-f01/$id/print')({
  component: PreHandoverInspectionPrintPage,
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

function PreHandoverInspectionPrintPage() {
  const { id } = Route.useParams()
  const { data, isLoading, isError } = usePreHandoverInspectionById(id)
  const inspection = data?.inspection
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
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

  const items = Array.isArray(inspection.items) ? (inspection.items as InspectionItem[]) : []

  const categories = Array.from(new Set(items.map((i) => i.category_number))).map(
    (catNum) => ({
      category_number: catNum,
      category_name: items.find((i) => i.category_number === catNum)?.category_name ?? '',
      items: items.filter((i) => i.category_number === catNum),
    }),
  )

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>

      <div className="no-print flex items-center gap-2 mb-4">
        <Link to="/forms/sale-job03-f01/$id" params={{ id }}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      <div ref={printRef} className="print-container max-w-4xl mx-auto bg-white p-8 shadow-sm border border-slate-100">
        <div className="text-center border-b border-slate-200 pb-4 mb-6">
          <h1 className="text-lg font-semibold text-slate-900 tracking-wide">
            SALE-JOB03-F01: Pre-Handover Inspection Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {inspection.contract.contract_number}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
          <div>
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Contract No.
            </p>
            <p className="font-light text-slate-800">{inspection.contract.contract_number}</p>
          </div>
          <div>
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Contract Type
            </p>
            <p className="font-light text-slate-800">{inspection.contract.type}</p>
          </div>
          <div>
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Inspection Date
            </p>
            <p className="font-light text-slate-800">
              {format(new Date(inspection.inspection_date), 'd MMM yyyy')}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Inspector
            </p>
            <p className="font-light text-slate-800">{inspection.inspector}</p>
          </div>
          <div>
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Contract Status
            </p>
            <p className="font-light text-slate-800">{inspection.contract.status}</p>
          </div>
          <div>
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Overall Status
            </p>
            <Badge
              variant="outline"
              className={`${STATUS_COLORS[inspection.overall_status as InspectionStatus] ?? ''} text-[10px] font-light`}
            >
              {STATUS_LABELS[inspection.overall_status as InspectionStatus]}
            </Badge>
          </div>
          <div>
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Created
            </p>
            <p className="font-light text-slate-800">
              {format(new Date(inspection.created_at), 'd MMM yyyy')}
            </p>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-light tracking-wider text-slate-700 border-b border-slate-200 pb-2 mb-3">
              SECTION 3: รายการตรวจสอบ
            </h2>
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.category_number}>
                  <h3 className="text-xs font-medium text-slate-700 mb-2 border-l-4 border-indigo-400 pl-2">
                    {cat.category_number} {cat.category_name}
                  </h3>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-200 px-2 py-1 text-left font-light text-slate-500 w-1/3">
                          รายการ
                        </th>
                        <th className="border border-slate-200 px-2 py-1 text-left font-light text-slate-500 w-1/6">
                          สถานะ
                        </th>
                        <th className="border border-slate-200 px-2 py-1 text-left font-light text-slate-500 w-1/4">
                          ผู้รับผิดชอบ
                        </th>
                        <th className="border border-slate-200 px-2 py-1 text-left font-light text-slate-500">
                          สภาพไม่ปกติ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.items.map((item) => (
                        <tr key={item.number}>
                          <td className="border border-slate-200 px-2 py-1 font-light text-slate-700">
                            {item.number} {item.name}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 font-light text-slate-700">
                            {item.status === 'normal' ? 'ปกติ' : 'ไม่ปกติ'}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 font-light text-slate-700">
                            {item.responsible_person || '-'}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 font-light text-slate-700">
                            {item.abnormal_condition || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {inspection.notes && (
          <div className="mb-6">
            <h2 className="text-sm font-light tracking-wider text-slate-700 border-b border-slate-200 pb-2 mb-3">
              SECTION 5: Notes
            </h2>
            <p className="text-sm font-light text-slate-700 whitespace-pre-wrap">
              {inspection.notes}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-12 pt-4 border-t border-slate-200">
          <div className="text-center">
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 mt-8" />
            <p className="text-xs font-light text-slate-500">ผู้ตรวจสอบ / Inspector</p>
            <p className="text-xs font-light text-slate-400 mt-1">{inspection.inspector}</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-400 w-48 mx-auto mb-2 mt-8" />
            <p className="text-xs font-light text-slate-500">ผู้รับมอบ / Recipient</p>
            <p className="text-xs font-light text-slate-400 mt-1">&nbsp;</p>
          </div>
        </div>
      </div>
    </>
  )
}
