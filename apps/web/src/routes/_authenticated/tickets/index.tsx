import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, Ticket as TicketIcon, Pencil, Trash2 } from 'lucide-react'
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
import { useTickets, useDeleteTicket } from '@/hooks/useTickets'
import type { Ticket, TicketStatus, TicketPriority } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/tickets/')({
  component: TicketListPage,
})

const PAGE_SIZE = 20

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

function statusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case 'OPEN':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'IN_PROGRESS':
      return 'bg-teal-50 text-teal-700 border-teal-200'
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'CLOSED':
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

function priorityBadgeClass(priority: TicketPriority): string {
  switch (priority) {
    case 'URGENT':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'HIGH':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'LOW':
      return 'bg-slate-100 text-slate-500 border-slate-200'
  }
}

function TicketListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useTickets({
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
  })

  const deleteTicket = useDeleteTicket()

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteTicket.mutateAsync(deleteTarget.id)
      toast.success('Ticket deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete ticket')
    } finally {
      setDeleteTarget(null)
    }
  }

  const tickets = (data?.data ?? []).filter((t: Ticket) =>
    debouncedSearch
      ? t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (t.category ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
      : true,
  )

  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="space-y-3">
      <PageHeader
        title="Tickets"
        actions={
          <Link to="/tickets/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
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
                placeholder="Search title, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={handleFilterChange<TicketStatus | 'all'>(setStatusFilter)}
            >
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={handleFilterChange<TicketPriority | 'all'>(setPriorityFilter)}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
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
                  Ticket
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Category
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Priority
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
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
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-slate-600">Failed to load tickets. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <TicketIcon className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-600">
                        {debouncedSearch || statusFilter !== 'all' || priorityFilter !== 'all'
                          ? 'No tickets match your filters'
                          : 'No tickets yet'}
                      </p>
                      {!debouncedSearch && statusFilter === 'all' && priorityFilter === 'all' && (
                        <p className="text-sm text-slate-400 mt-1">
                          Click "New Ticket" to get started
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket: Ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-lg flex items-center justify-center">
                          <TicketIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="ml-2.5">
                          <p className="font-light text-slate-800 text-[11px]">{ticket.title}</p>
                          {ticket.description && (
                            <p className="text-[9px] text-slate-400 font-extralight mt-0.5 max-w-xs truncate">
                              {ticket.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] text-slate-600 font-extralight">
                        {ticket.category ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-4 px-1.5 font-extralight ${priorityBadgeClass(ticket.priority as TicketPriority)}`}
                      >
                        {PRIORITY_LABELS[ticket.priority as TicketPriority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-4 px-1.5 font-extralight ${statusBadgeClass(ticket.status as TicketStatus)}`}
                      >
                        {STATUS_LABELS[ticket.status as TicketStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            setDeleteTarget({ id: ticket.id, title: ticket.title })
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
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteTicket.isPending}
            >
              {deleteTicket.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
