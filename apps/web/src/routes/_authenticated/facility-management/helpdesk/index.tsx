import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Headphones, Eye } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useHelpdeskTickets } from '@/hooks/useHelpdesk'
import { useProjects } from '@/hooks/useProjects'
import type { TicketStatus, TicketPriority, HelpdeskTicket } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/helpdesk/')({
  component: HelpdeskListPage,
})

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

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-teal-50 text-teal-700 border-teal-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
}

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-600 border-amber-200',
  LOW: 'bg-slate-100 text-slate-500 border-slate-200',
}

const PAGE_SIZE = 20

function HelpdeskListPage() {
  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState<TicketStatus | 'all'>('all')
  const [priority, setPriority] = useState<TicketPriority | 'all'>('all')
  const [page, setPage] = useState(1)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data, isLoading, isError } = useHelpdeskTickets({
    page,
    limit: PAGE_SIZE,
    projectId: projectId || undefined,
    status: status !== 'all' ? status : undefined,
    priority: priority !== 'all' ? priority : undefined,
  })

  const tickets = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Helpdesk"
        actions={
          <Link to="/facility-management/helpdesk/create">
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
            <Select
              value={projectId || 'all'}
              onValueChange={(v) => {
                setProjectId(v === 'all' ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-52">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={handleFilterChange<TicketStatus | 'all'>(setStatus)}
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
              value={priority}
              onValueChange={handleFilterChange<TicketPriority | 'all'>(setPriority)}
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
                  Project / Site
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
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-slate-600">Failed to load tickets. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Headphones className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-600">No helpdesk tickets found</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Click "New Ticket" to create the first one
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket: HelpdeskTicket) => (
                  <TableRow key={ticket.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-600 rounded-lg flex items-center justify-center">
                          <Headphones className="w-4 h-4 text-white" />
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
                      <div>
                        <p className="text-[11px] text-slate-600 font-extralight">
                          {ticket.project?.name ?? '-'}
                        </p>
                        {ticket.site && (
                          <p className="text-[9px] text-slate-400 font-extralight">{ticket.site}</p>
                        )}
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
                        className={`text-[9px] h-4 px-1.5 font-extralight ${PRIORITY_COLORS[ticket.priority as TicketPriority]}`}
                      >
                        {PRIORITY_LABELS[ticket.priority as TicketPriority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-4 px-1.5 font-extralight ${STATUS_COLORS[ticket.status as TicketStatus]}`}
                      >
                        {STATUS_LABELS[ticket.status as TicketStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <Link to="/facility-management/helpdesk/$ticketId" params={{ ticketId: ticket.id }}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
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
    </div>
  )
}
