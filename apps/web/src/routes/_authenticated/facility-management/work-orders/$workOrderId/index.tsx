import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Wrench, Play, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  useWorkOrder,
  useStartWorkOrder,
  useCompleteWorkOrder,
  useCancelWorkOrder,
} from '@/hooks/useWorkOrders'
import type { WorkOrderStatus, WorkOrderType } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/work-orders/$workOrderId/'
)({
  component: WorkOrderDetailPage,
})

const WO_STATUS_COLORS: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-slate-50 text-slate-600 border-slate-200',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  ON_HOLD: 'bg-orange-50 text-orange-700 border-orange-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const WO_TYPE_LABELS: Record<WorkOrderType, string> = {
  CORRECTIVE: 'Corrective',
  PREVENTIVE: 'Preventive',
  EMERGENCY: 'Emergency',
  INSPECTION: 'Inspection',
  CALIBRATION: 'Calibration',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
  MEDIUM: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
}

function WorkOrderDetailPage() {
  const { workOrderId } = Route.useParams()
  const { data, isLoading, isError } = useWorkOrder(workOrderId)
  const wo = data?.workOrder

  const startWO = useStartWorkOrder(workOrderId)
  const completeWO = useCompleteWorkOrder(workOrderId)
  const cancelWO = useCancelWorkOrder(workOrderId)

  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [actualHours, setActualHours] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  async function handleStart() {
    try {
      await startWO.mutateAsync()
      toast.success('Work order started')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start work order')
    }
  }

  async function handleComplete() {
    try {
      await completeWO.mutateAsync({
        completionNotes: completionNotes || undefined,
        actualHours: actualHours ? Number(actualHours) : undefined,
      })
      toast.success('Work order completed')
      setShowCompleteDialog(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete work order')
    }
  }

  async function handleCancel() {
    try {
      await cancelWO.mutateAsync(cancelReason || undefined)
      toast.success('Work order cancelled')
      setShowCancelDialog(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel work order')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !wo) {
    return (
      <div className="text-center py-16">
        <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600">Work order not found</p>
        <Link to="/facility-management/work-orders">
          <Button variant="link" className="mt-2">
            Back to Work Orders
          </Button>
        </Link>
      </div>
    )
  }

  const status = wo.status as WorkOrderStatus
  const canStart = status === 'OPEN' || status === 'ASSIGNED'
  const canComplete = status === 'IN_PROGRESS' || status === 'ASSIGNED'
  const canCancel = status !== 'COMPLETED' && status !== 'CANCELLED'

  return (
    <div className="space-y-4">
      <PageHeader title={wo.title} />

      <div className="flex flex-wrap items-center gap-2 -mt-2 mb-2">
        <span className="font-mono text-xs text-slate-500">{wo.wo_number}</span>
        <Badge
          variant="outline"
          className={`text-[10px] ${WO_STATUS_COLORS[status] ?? ''}`}
        >
          {status.replace('_', ' ')}
        </Badge>
        <Badge
          variant="outline"
          className={`text-[10px] ${PRIORITY_COLORS[wo.priority] ?? ''}`}
        >
          {wo.priority}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {canStart && (
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={handleStart}
            disabled={startWO.isPending}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Start
          </Button>
        )}
        {canComplete && (
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => setShowCompleteDialog(true)}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            Complete
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            className="border-rose-300 text-rose-600 hover:bg-rose-50"
            onClick={() => setShowCancelDialog(true)}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Cancel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-400" />
              Work Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Type', value: WO_TYPE_LABELS[wo.type as WorkOrderType] ?? wo.type },
              { label: 'Project', value: wo.project.name },
              { label: 'Asset', value: wo.asset?.name },
              {
                label: 'Assigned To',
                value: wo.assignee
                  ? `${wo.assignee.first_name} ${wo.assignee.last_name}`
                  : null,
              },
              {
                label: 'Created By',
                value: `${wo.creator.first_name} ${wo.creator.last_name}`,
              },
              {
                label: 'Scheduled Date',
                value: wo.scheduled_date
                  ? new Date(wo.scheduled_date).toLocaleDateString()
                  : null,
              },
              {
                label: 'Est. Hours',
                value: wo.estimated_hours != null ? `${wo.estimated_hours}h` : null,
              },
              {
                label: 'Actual Hours',
                value: wo.actual_hours != null ? `${wo.actual_hours}h` : null,
              },
              {
                label: 'Cost Estimate',
                value: wo.cost_estimate != null ? `฿${wo.cost_estimate.toLocaleString()}` : null,
              },
              {
                label: 'Actual Cost',
                value: wo.actual_cost != null ? `฿${wo.actual_cost.toLocaleString()}` : null,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start">
                <span className="text-xs text-slate-400 font-extralight">{label}</span>
                <span className="text-xs text-slate-700 font-light text-right">
                  {value ?? '—'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: 'Created',
                value: new Date(wo.created_at).toLocaleDateString(),
              },
              {
                label: 'Started',
                value: wo.started_at ? new Date(wo.started_at).toLocaleDateString() : null,
              },
              {
                label: 'Completed',
                value: wo.completed_at ? new Date(wo.completed_at).toLocaleDateString() : null,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start">
                <span className="text-xs text-slate-400 font-extralight">{label}</span>
                <span className="text-xs text-slate-700 font-light">{value ?? '—'}</span>
              </div>
            ))}

            {wo.description && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
                  Description
                </p>
                <p className="text-xs text-slate-600 font-light">{wo.description}</p>
              </div>
            )}

            {wo.completion_notes && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
                  Completion Notes
                </p>
                <p className="text-xs text-slate-600 font-light">{wo.completion_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="completionNotes">Completion Notes</Label>
              <Textarea
                id="completionNotes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Describe what was done..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="actualHours">Actual Hours</Label>
              <Input
                id="actualHours"
                type="number"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                min="0"
                step="0.5"
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleComplete}
              disabled={completeWO.isPending}
            >
              {completeWO.isPending ? 'Completing...' : 'Mark Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cancelReason">Reason (optional)</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelWO.isPending}
            >
              {cancelWO.isPending ? 'Cancelling...' : 'Cancel WO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
