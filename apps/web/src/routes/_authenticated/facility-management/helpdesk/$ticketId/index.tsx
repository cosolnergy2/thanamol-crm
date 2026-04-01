import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Wrench, CheckCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  useHelpdeskTicket,
  useUpdateHelpdeskTicketStatus,
  useCreateWorkOrderFromTicket,
} from '@/hooks/useHelpdesk'
import { useAuth } from '@/providers/AuthProvider'
import { useProjects } from '@/hooks/useProjects'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TicketStatus, TicketPriority } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/helpdesk/$ticketId/',
)({
  component: HelpdeskDetailPage,
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

function HelpdeskDetailPage() {
  const { ticketId } = Route.useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const { data, isLoading, isError } = useHelpdeskTicket(ticketId)
  const updateStatus = useUpdateHelpdeskTicketStatus()
  const createWorkOrder = useCreateWorkOrderFromTicket()

  const [createWODialogOpen, setCreateWODialogOpen] = useState(false)
  const [woProjectId, setWoProjectId] = useState('')
  const [woNotes, setWoNotes] = useState('')

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const ticket = data?.ticket

  async function handleStatusChange(newStatus: TicketStatus) {
    try {
      await updateStatus.mutateAsync({ id: ticketId, status: newStatus })
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handleCreateWorkOrder() {
    if (!currentUser) {
      toast.error('You must be logged in to create a work order')
      return
    }
    if (!woProjectId) {
      toast.error('Please select a project for the work order')
      return
    }
    try {
      const result = await createWorkOrder.mutateAsync({
        ticketId,
        data: {
          projectId: woProjectId,
          createdBy: currentUser.id,
          description: woNotes || undefined,
        },
      })
      toast.success('Work order created successfully')
      setCreateWODialogOpen(false)
      // Navigate to the created work order
      const wo = result.workOrder as { id: string }
      navigate({ to: '/facility-management/work-orders/$workOrderId', params: { workOrderId: wo.id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create work order')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-slate-600">Ticket not found or failed to load.</p>
        <Link to="/facility-management/helpdesk">
          <Button variant="link" className="mt-2 p-0">
            Back to Helpdesk
          </Button>
        </Link>
      </div>
    )
  }

  const status = ticket.status as TicketStatus
  const priority = ticket.priority as TicketPriority
  const canCreateWO = !ticket.work_order_id
  const isResolved = status === 'RESOLVED' || status === 'CLOSED'

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/facility-management/helpdesk' })}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <PageHeader title="Service Request" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-light text-slate-800">{ticket.title}</CardTitle>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className={`text-[9px] h-5 px-2 font-extralight ${PRIORITY_COLORS[priority]}`}
              >
                {PRIORITY_LABELS[priority]}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[9px] h-5 px-2 font-extralight ${STATUS_COLORS[status]}`}
              >
                {STATUS_LABELS[status]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.description && (
            <p className="text-sm text-slate-600 font-light leading-relaxed">
              {ticket.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
                Project
              </p>
              <p className="text-sm text-slate-700 font-light">{ticket.project?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
                Site
              </p>
              <p className="text-sm text-slate-700 font-light">{ticket.site ?? '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
                Category
              </p>
              <p className="text-sm text-slate-700 font-light">{ticket.category ?? '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
                Requester
              </p>
              <p className="text-sm text-slate-700 font-light">
                {ticket.requester
                  ? `${ticket.requester.first_name} ${ticket.requester.last_name}`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
                Assigned To
              </p>
              <p className="text-sm text-slate-700 font-light">
                {ticket.assignee
                  ? `${ticket.assignee.first_name} ${ticket.assignee.last_name}`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
                Work Order
              </p>
              {ticket.work_order_id ? (
                <Link
                  to="/facility-management/work-orders/$workOrderId"
                  params={{ workOrderId: ticket.work_order_id }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-light"
                >
                  View Work Order
                </Link>
              ) : (
                <p className="text-sm text-slate-400 font-light">Not linked</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
              Created
            </p>
            <p className="text-sm text-slate-600 font-light">
              {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light text-slate-700">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {status === 'OPEN' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={updateStatus.isPending}
                className="text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Mark In Progress
              </Button>
            )}
            {(status === 'OPEN' || status === 'IN_PROGRESS') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('RESOLVED')}
                disabled={updateStatus.isPending}
                className="text-teal-700 border-teal-200 hover:bg-teal-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Resolved
              </Button>
            )}
            {!isResolved && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('CLOSED')}
                disabled={updateStatus.isPending}
                className="text-slate-600 border-slate-200 hover:bg-slate-50"
              >
                Close Ticket
              </Button>
            )}
            {canCreateWO && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setCreateWODialogOpen(true)}
              >
                <Wrench className="w-4 h-4 mr-2" />
                Create Work Order
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={createWODialogOpen} onOpenChange={setCreateWODialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="woProject">
                Project <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={woProjectId || 'none'}
                onValueChange={(v) => setWoProjectId(v === 'none' ? '' : v)}
              >
                <SelectTrigger id="woProject">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select project...</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="woNotes">Additional Notes</Label>
              <Textarea
                id="woNotes"
                value={woNotes}
                onChange={(e) => setWoNotes(e.target.value)}
                placeholder="Optional notes for the work order"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateWODialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleCreateWorkOrder}
              disabled={createWorkOrder.isPending || !woProjectId}
            >
              {createWorkOrder.isPending ? 'Creating...' : 'Create Work Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
