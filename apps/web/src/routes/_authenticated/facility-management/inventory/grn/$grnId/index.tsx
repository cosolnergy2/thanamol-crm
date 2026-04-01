import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGRN } from '@/hooks/useGRN'
import type { GRNItem, GRNStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/grn/$grnId/'
)({
  component: GRNDetailPage,
})

const STATUS_CONFIG: Record<GRNStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  RECEIVED: { label: 'Received', className: 'bg-blue-100 text-blue-700' },
  INSPECTED: { label: 'Inspected', className: 'bg-amber-100 text-amber-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
}

function GRNDetailPage() {
  const { grnId } = Route.useParams()
  const { data, isLoading, isError } = useGRN(grnId)
  const grn = data?.grn

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        Loading...
      </div>
    )
  }

  if (isError || !grn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Package className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500">GRN not found.</p>
        <Link
          to="/facility-management/inventory/grn"
          className="text-indigo-600 hover:underline text-sm"
        >
          Back to GRNs
        </Link>
      </div>
    )
  }

  const items = grn.items as GRNItem[]
  const totalValue = items.reduce(
    (sum, i) => sum + (i.unit_cost ?? 0) * i.quantity,
    0
  )
  const statusConfig = STATUS_CONFIG[grn.status]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/facility-management/inventory/grn">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              {grn.grn_number}
            </h1>
            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Goods Received Note Detail
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">GRN Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="GRN Number" value={grn.grn_number} />
            <DetailRow label="Supplier" value={grn.supplier_name} />
            <DetailRow
              label="Received Date"
              value={new Date(grn.received_date).toLocaleDateString()}
            />
            <DetailRow
              label="Received By"
              value={
                grn.receiver
                  ? `${grn.receiver.first_name} ${grn.receiver.last_name}`
                  : '—'
              }
            />
            <DetailRow label="Project" value={grn.project?.name ?? '—'} />
            <DetailRow label="PO Reference" value={grn.po_id ?? '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Quality Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 shrink-0">Status</span>
              <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
            </div>
            <DetailRow label="QC Status" value={grn.qc_status ?? '—'} />
            <DetailRow label="Inspection Notes" value={grn.inspection_notes ?? '—'} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Items Received</CardTitle>
            {totalValue > 0 && (
              <span className="text-sm text-slate-500">
                Total Value:{' '}
                <span className="font-medium text-slate-700">
                  ฿{totalValue.toLocaleString()}
                </span>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {items.length === 0 ? (
            <p className="text-slate-400 text-sm py-6 text-center">No items recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{item.item_code || '—'}</TableCell>
                    <TableCell className="text-sm">{item.item_name}</TableCell>
                    <TableCell className="text-right text-sm">
                      <Badge variant="outline">{item.quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {item.unit_of_measure ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-600">
                      {item.unit_cost != null ? `฿${item.unit_cost.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {item.unit_cost != null
                        ? `฿${(item.unit_cost * item.quantity).toLocaleString()}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 text-right">{value}</span>
    </div>
  )
}
