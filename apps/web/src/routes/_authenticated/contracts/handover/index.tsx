import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Printer, Trash2, ClipboardList } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useHandovers, useDeleteHandover } from '@/hooks/useHandovers'
import type { HandoverStatus, HandoverType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/contracts/handover/')({
  component: HandoverListPage,
})

const HANDOVER_STATUS_CLASSES: Record<HandoverStatus, string> = {
  PENDING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const HANDOVER_TYPE_LABELS: Record<HandoverType, string> = {
  INITIAL: 'Initial',
  FINAL: 'Final',
  PARTIAL: 'Partial',
}

const PAGE_SIZE = 20

function HandoverListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useHandovers({
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const deleteHandover = useDeleteHandover()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteHandover.mutateAsync(deleteTarget.id)
      toast.success('Handover deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete handover')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handovers = data?.data ?? []
  const filteredHandovers = debouncedSearch
    ? handovers.filter(
        (h) =>
          h.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          h.contract_id.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : handovers
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="space-y-3">
      <PageHeader
        title="Handovers"
        actions={
          <Link to="/contracts/handover/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Handover
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
                placeholder="Search by contract ID..."
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
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
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
                  Contract
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Type
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Received By
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
                    <p className="text-slate-600">
                      Failed to load handovers. Please refresh and try again.
                    </p>
                  </TableCell>
                </TableRow>
              ) : filteredHandovers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <ClipboardList className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-600">No handovers found</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredHandovers.map((handover) => (
                  <TableRow
                    key={handover.id}
                    className="hover:bg-slate-50/50 border-slate-100"
                  >
                    <TableCell className="py-3">
                      <p className="font-light text-slate-800 text-[11px]">
                        {handover.contract_id.slice(0, 8)}...
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[11px] text-slate-600 font-extralight">
                        {new Date(handover.handover_date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[11px] text-slate-600 font-extralight">
                        {HANDOVER_TYPE_LABELS[handover.handover_type]}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${HANDOVER_STATUS_CLASSES[handover.status]} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {handover.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[11px] text-slate-600 font-extralight">
                        {handover.received_by ?? '-'}
                      </p>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link to="/contracts/handover/$id" params={{ id: handover.id }}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <ClipboardList className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link
                          to="/contracts/handover/$id/edit"
                          params={{ id: handover.id }}
                        >
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link
                          to="/contracts/handover/$id/print"
                          params={{ id: handover.id }}
                        >
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteTarget({ id: handover.id })}
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
            <DialogTitle>Delete Handover</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this handover? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteHandover.isPending}
            >
              {deleteHandover.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
