import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Package, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGRNList, useAcceptGRN } from '@/hooks/useGRN'
import type { GRNStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/grn/'
)({
  component: GRNListPage,
})

const STATUS_CONFIG: Record<GRNStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  RECEIVED: { label: 'Received', className: 'bg-blue-100 text-blue-700' },
  INSPECTED: { label: 'Inspected', className: 'bg-amber-100 text-amber-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
}

function GRNListPage() {
  const [statusFilter, setStatusFilter] = useState<GRNStatus | 'all'>('all')
  const { data, isLoading } = useGRNList({
    status: statusFilter,
  })
  const grns = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Goods Received Notes
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Receive goods into inventory
          </p>
        </div>
        <Link to="/facility-management/inventory/grn/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Receive Goods
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as GRNStatus | 'all')}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <SelectItem key={status} value={status}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>QC Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : grns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No goods received notes found</p>
                  </TableCell>
                </TableRow>
              ) : (
                grns.map((grn) => {
                  const items = grn.items as Array<unknown>
                  const config = STATUS_CONFIG[grn.status]
                  return (
                    <TableRow key={grn.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-mono text-sm font-medium">
                        <Link
                          to="/facility-management/inventory/grn/$grnId"
                          params={{ grnId: grn.id }}
                          className="text-indigo-600 hover:underline"
                        >
                          {grn.grn_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{grn.supplier_name}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(grn.received_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{grn.project?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {grn.qc_status ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.className}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {grn.status !== 'ACCEPTED' && grn.status !== 'REJECTED' && (
                          <AcceptGRNButton grnId={grn.id} />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function AcceptGRNButton({ grnId }: { grnId: string }) {
  const acceptGRN = useAcceptGRN(grnId)
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
      onClick={() => acceptGRN.mutate({})}
      disabled={acceptGRN.isPending}
    >
      <CheckCircle className="w-3.5 h-3.5" />
      Accept
    </Button>
  )
}
