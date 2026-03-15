import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Calendar, Eye, Edit, Trash2, Printer } from 'lucide-react'
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
  useCommercialQuotations,
  useDeleteCommercialQuotation,
} from '@/hooks/useCommercialQuotations'
import type { CommercialQuotation, QuotationStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/quotations/commercial/')({
  component: CommercialQuotationListPage,
})

const PAGE_SIZE = 20

const STATUS_COLORS: Record<QuotationStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  EXPIRED: 'bg-amber-50 text-amber-600 border-amber-200',
}

function CommercialQuotationListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useCommercialQuotations({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? (statusFilter as QuotationStatus) : 'all',
  })

  const deleteMutation = useDeleteCommercialQuotation()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Quotation deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete quotation')
    } finally {
      setDeleteTarget(null)
    }
  }

  const quotations: CommercialQuotation[] = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  const stats = [
    { label: 'Total', value: data?.pagination.total ?? 0, color: 'text-slate-900' },
    { label: 'Sent', value: quotations.filter((q: CommercialQuotation) => q.status === 'SENT').length, color: 'text-indigo-600' },
    { label: 'Approved', value: quotations.filter((q: CommercialQuotation) => q.status === 'APPROVED').length, color: 'text-teal-600' },
    { label: 'Rejected', value: quotations.filter((q: CommercialQuotation) => q.status === 'REJECTED').length, color: 'text-rose-600' },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="Commercial Quotations"
        actions={
          <Link to="/quotations/commercial/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Quotation
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
                placeholder="Search quotation number..."
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
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Number
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Total Amount
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
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
                    <p className="text-slate-600">Failed to load quotations. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No commercial quotations found</p>
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation) => (
                  <TableRow key={quotation.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <FileText className="w-3.5 h-3.5 text-slate-400 mr-2" />
                        <span className="font-light text-slate-800 text-[11px]">
                          {quotation.quotation_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center text-[10px] text-slate-500 font-extralight">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(quotation.created_at), 'd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] font-light text-slate-800">
                        ฿{quotation.total_amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${STATUS_COLORS[quotation.status as QuotationStatus] ?? ''} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {quotation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1">
                        {quotation.status === 'DRAFT' && (
                          <Link
                            to="/quotations/commercial/$id/edit"
                            params={{ id: quotation.id }}
                          >
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                        <Link to="/quotations/commercial/$id" params={{ id: quotation.id }}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link
                          to="/quotations/commercial/$id/print"
                          params={{ id: quotation.id }}
                        >
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            setDeleteTarget({
                              id: quotation.id,
                              number: quotation.quotation_number,
                            })
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
            <DialogTitle>Delete Quotation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.number}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
