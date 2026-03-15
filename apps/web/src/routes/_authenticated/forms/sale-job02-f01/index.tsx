import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  FileText,
  Eye,
  Edit,
  Trash2,
  Printer,
} from 'lucide-react'
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
  useLeaseAgreements,
  useDeleteLeaseAgreement,
} from '@/hooks/useLeaseAgreements'
import type { LeaseStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job02-f01/')({
  component: LeaseAgreementListPage,
})

const PAGE_SIZE = 20

const STATUS_COLORS: Record<LeaseStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
  TERMINATED: 'bg-rose-100 text-rose-700 border-rose-200',
}

const STATUS_LABELS: Record<LeaseStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
}

function LeaseAgreementListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; contractNumber: string } | null>(
    null,
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useLeaseAgreements({
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const deleteAgreement = useDeleteLeaseAgreement()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteAgreement.mutateAsync(deleteTarget.id)
      toast.success('Lease agreement deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lease agreement')
    } finally {
      setDeleteTarget(null)
    }
  }

  const agreements = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  const filteredAgreements = debouncedSearch
    ? agreements.filter((a) =>
        a.contract.contract_number.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : agreements

  const stats = [
    { label: 'Total', value: data?.pagination.total ?? 0, color: 'text-slate-900' },
    {
      label: 'Active',
      value: agreements.filter((a) => a.status === 'ACTIVE').length,
      color: 'text-emerald-600',
    },
    {
      label: 'Draft',
      value: agreements.filter((a) => a.status === 'DRAFT').length,
      color: 'text-amber-600',
    },
    {
      label: 'Expired',
      value: agreements.filter((a) => a.status === 'EXPIRED').length,
      color: 'text-slate-500',
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="SALE-JOB02-F01: Lease Agreement"
        actions={
          <Link to="/forms/sale-job02-f01/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Lease Agreement
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
                placeholder="Search contract number..."
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
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
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
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Created
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Updated
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-slate-600">Failed to load lease agreements. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : filteredAgreements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No lease agreements found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgreements.map((agreement) => (
                  <TableRow key={agreement.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <FileText className="w-3.5 h-3.5 text-slate-400 mr-2" />
                        <span className="font-light text-slate-800 text-[11px]">
                          {agreement.contract.contract_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${STATUS_COLORS[agreement.status as LeaseStatus] ?? ''} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {STATUS_LABELS[agreement.status as LeaseStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] text-slate-500 font-extralight">
                        {format(new Date(agreement.created_at), 'd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] text-slate-500 font-extralight">
                        {format(new Date(agreement.updated_at), 'd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1">
                        {agreement.status === 'DRAFT' && (
                          <Link
                            to="/forms/sale-job02-f01/$id/edit"
                            params={{ id: agreement.id }}
                          >
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                        <Link
                          to="/forms/sale-job02-f01/$id"
                          params={{ id: agreement.id }}
                        >
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link
                          to="/forms/sale-job02-f01/$id/print"
                          params={{ id: agreement.id }}
                        >
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          </Button>
                        </Link>
                        {agreement.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() =>
                              setDeleteTarget({
                                id: agreement.id,
                                contractNumber: agreement.contract.contract_number,
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
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
            <DialogTitle>Delete Lease Agreement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the lease agreement for{' '}
              <strong>{deleteTarget?.contractNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteAgreement.isPending}
            >
              {deleteAgreement.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
