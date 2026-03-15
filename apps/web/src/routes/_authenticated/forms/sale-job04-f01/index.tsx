import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Pencil, Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { StatusBadge } from '@/components/StatusBadge'
import { useSaleJobs, useDeleteSaleJob } from '@/hooks/useSaleJobs'
import type { SaleJobStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/sale-job04-f01/')({
  component: SaleJob04F01ListPage,
})

const PAGE_SIZE = 20

function SaleJob04F01ListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SaleJobStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; formNumber: string } | null>(
    null,
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useSaleJobs({
    page,
    limit: PAGE_SIZE,
    status: statusFilter,
  })

  const deleteJob = useDeleteSaleJob()

  function handleFilterChange(setter: (v: SaleJobStatus | 'all') => void) {
    return (value: string) => {
      setter(value as SaleJobStatus | 'all')
      setPage(1)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteJob.mutateAsync(deleteTarget.id)
      toast.success('Sale job deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleteTarget(null)
    }
  }

  const jobs = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  const filtered = debouncedSearch
    ? jobs.filter(
        (j) =>
          j.form_number.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          j.customer?.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : jobs

  return (
    <div className="space-y-3">
      <PageHeader
        title="SALE-JOB04-F01: Sale Jobs"
        actions={
          <Link to="/forms/sale-job04-f01/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Sale Job
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by form number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={handleFilterChange(setStatusFilter)}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Form No.
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Project
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Created
                </TableHead>
                <TableHead className="text-center text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
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
                    <p className="text-slate-600">Failed to load sale jobs. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-600">No sale jobs found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((job) => (
                  <TableRow key={job.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <p className="text-[11px] font-light text-slate-800">{job.form_number}</p>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[10px] text-slate-500 font-extralight">
                        {job.customer?.name ?? job.customer_id}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[10px] text-slate-500 font-extralight">
                        {job.project?.name ?? '-'}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge value={job.status} variant="saleJobStatus" />
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[10px] text-slate-400 font-extralight">
                        {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link to="/forms/sale-job04-f01/$id" params={{ id: job.id }}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link to="/forms/sale-job04-f01/$id/edit" params={{ id: job.id }}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            setDeleteTarget({ id: job.id, formNumber: job.form_number })
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
            <DialogTitle>Delete Sale Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.formNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteJob.isPending}
            >
              {deleteJob.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
