import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ClipboardCheck, Calendar, Users, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useEmergencyDrill, useCompleteDrill, useDeleteEmergencyDrill } from '@/hooks/useEmergencyDrills'
import type { DrillStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/emergency/drills/$drillId/'
)({
  component: EmergencyDrillDetailPage,
})

const STATUS_LABELS: Record<DrillStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const STATUS_COLORS: Record<DrillStatus, string> = {
  SCHEDULED: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

type CompleteFormState = {
  actualDate: string
  findings: string
}

function EmergencyDrillDetailPage() {
  const { drillId } = Route.useParams()
  const navigate = useNavigate()
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [completeForm, setCompleteForm] = useState<CompleteFormState>({
    actualDate: new Date().toISOString().slice(0, 10),
    findings: '',
  })

  const { data, isLoading } = useEmergencyDrill(drillId)
  const drill = data?.drill

  const completeMutation = useCompleteDrill(drillId)
  const deleteMutation = useDeleteEmergencyDrill()

  async function handleComplete() {
    if (!completeForm.actualDate) {
      toast.error('Actual date is required')
      return
    }

    await completeMutation.mutateAsync({
      actualDate: completeForm.actualDate,
      findings: completeForm.findings || undefined,
    })

    toast.success('Drill marked as completed')
    setShowCompleteDialog(false)
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync(drillId)
    toast.success('Drill deleted')
    navigate({ to: '/facility-management/emergency/drills' })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!drill) {
    return (
      <div className="text-center py-12 text-slate-500">
        <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Emergency drill not found</p>
      </div>
    )
  }

  const participants = (drill.participants as string[]) ?? []
  const correctiveActions = (drill.corrective_actions as string[]) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/emergency/drills' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              {drill.drill_type}
            </h1>
            <Badge variant="outline" className={STATUS_COLORS[drill.status as DrillStatus]}>
              {STATUS_LABELS[drill.status as DrillStatus]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">{drill.project.name}</p>
        </div>

        <div className="flex gap-2">
          {drill.status === 'SCHEDULED' && (
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => setShowCompleteDialog(true)}
            >
              Mark Completed
            </Button>
          )}
          <Button
            variant="outline"
            className="border-rose-300 text-rose-600 hover:bg-rose-50"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {drill.findings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <FileText className="w-4 h-4" />
                  Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-line">{drill.findings}</p>
              </CardContent>
            </Card>
          )}

          {correctiveActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <ClipboardCheck className="w-4 h-4" />
                  Corrective Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {correctiveActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-teal-500 mt-0.5">•</span>
                      <span>{String(action)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {participants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Users className="w-4 h-4" />
                  Participants ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {participants.map((participant, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {String(participant)}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Calendar className="w-4 h-4" />
                Drill Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Plan</p>
                <Link
                  to="/facility-management/emergency/plans/$planId"
                  params={{ planId: drill.plan_id }}
                  className="text-indigo-600 hover:underline"
                >
                  {drill.plan.title}
                </Link>
              </div>
              <div>
                <p className="text-xs text-slate-400">Project</p>
                <p className="text-slate-700">{drill.project.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Scheduled Date</p>
                <p className="text-slate-700">
                  {format(new Date(drill.scheduled_date), 'dd/MM/yyyy')}
                </p>
              </div>
              {drill.actual_date && (
                <div>
                  <p className="text-xs text-slate-400">Actual Date</p>
                  <p className="text-slate-700">
                    {format(new Date(drill.actual_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400">Created</p>
                <p className="text-slate-700">{format(new Date(drill.created_at), 'dd/MM/yyyy')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Drill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Actual Date *</Label>
              <Input
                type="date"
                value={completeForm.actualDate}
                onChange={(e) => setCompleteForm({ ...completeForm, actualDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Findings</Label>
              <Textarea
                value={completeForm.findings}
                onChange={(e) => setCompleteForm({ ...completeForm, findings: e.target.value })}
                placeholder="Observations, issues found, outcomes..."
                rows={4}
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
              disabled={completeMutation.isPending}
            >
              Confirm Completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
