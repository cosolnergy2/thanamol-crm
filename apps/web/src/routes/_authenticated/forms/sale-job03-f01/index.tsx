import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Eye, Edit, Trash2, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  usePreHandoverInspections,
  useDeletePreHandoverInspection,
} from '@/hooks/usePreHandoverInspections'
import type { InspectionStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job03-f01/')({
  component: PreHandoverInspectionListPage,
})

const PAGE_SIZE = 20

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

function PreHandoverInspectionListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; inspector: string } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = usePreHandoverInspections({
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const deleteInspection = useDeletePreHandoverInspection()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteInspection.mutateAsync(deleteTarget.id)
      toast.success('Inspection deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete inspection')
    } finally {
      setDeleteTarget(null)
    }
  }

  const inspections = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  const filteredInspections = debouncedSearch
    ? inspections.filter(
        (i) =>
          i.inspector.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          i.contract.contract_number.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : inspections

  const stats = [
    { label: 'Total', value: data?.pagination.total ?? 0, color: 'text-slate-900' },
    {
      label: 'Pass',
      value: inspections.filter((i) => i.overall_status === 'PASS').length,
      color: 'text-emerald-600',
    },
    {
      label: 'Conditional',
      value: inspections.filter((i) => i.overall_status === 'CONDITIONAL').length,
      color: 'text-amber-600',
    },
    {
      label: 'Fail',
      value: inspections.filter((i) => i.overall_status === 'FAIL').length,
      color: 'text-rose-600',
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="SALE-JOB03-F01: Pre-Handover Inspection"
        actions={
          <Link to="/forms/sale-job03-f01/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Inspection
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <Card key={index} className="border border-slate-100 bg-white/90">
            <CardContent className="pt-5 pb-5">
              <div className="text-center">
                <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  {stat.label}
                </p>
                <p className={`text-3xl font-extralight mt-1.5 ${stat.color}`}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search inspector or contract number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PASS">Pass</SelectItem>
                <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                <SelectItem value="FAIL">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Contract No.
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Inspector
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Inspection Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Created
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-slate-600">Failed to load inspections. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : filteredInspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No inspections found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInspections.map((inspection) => (
                  <TableRow
                    key={inspection.id}
                    className="hover:bg-slate-50/50 border-slate-100"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <FileText className="w-3.5 h-3.5 text-slate-400 mr-2" />
                        <span className="font-light text-slate-800 text-[11px]">
                          {inspection.contract.contract_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] font-light text-slate-700">
                        {inspection.inspector}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] text-slate-500 font-extralight">
                        {format(new Date(inspection.inspection_date), 'd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${STATUS_COLORS[inspection.overall_status as InspectionStatus] ?? ''} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {STATUS_LABELS[inspection.overall_status as InspectionStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] text-slate-500 font-extralight">
                        {format(new Date(inspection.created_at), 'd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          to="/forms/sale-job03-f01/$id/edit"
                          params={{ id: inspection.id }}
                        >
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link to="/forms/sale-job03-f01/$id" params={{ id: inspection.id }}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link
                          to="/forms/sale-job03-f01/$id/print"
                          params={{ id: inspection.id }}
                        >
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            setDeleteTarget({ id: inspection.id, inspector: inspection.inspector })
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[11px] text-slate-400 font-extralight">
            Page {page} of {totalPages} — {data?.pagination.total ?? 0} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Inspection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the inspection by{' '}
              <strong>{deleteTarget?.inspector}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteInspection.isPending}
            >
              {deleteInspection.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
