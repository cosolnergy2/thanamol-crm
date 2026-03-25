import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  usePreventiveMaintenance,
  useUpdatePM,
  useGeneratePMWorkOrder,
} from '@/hooks/usePreventiveMaintenance'
import type { PMFrequency } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/preventive-maintenance/$pmId/'
)({
  component: PMDetailPage,
})

const PM_FREQUENCY_LABELS: Record<PMFrequency, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Semi-Annual',
  ANNUAL: 'Annual',
  CUSTOM: 'Custom',
}

function PMDetailPage() {
  const { pmId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = usePreventiveMaintenance(pmId)
  const pm = data?.pm

  const updatePM = useUpdatePM(pmId)
  const generateWO = useGeneratePMWorkOrder(pmId)

  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')

  async function handleToggleActive() {
    if (!pm) return
    try {
      await updatePM.mutateAsync({ isActive: !pm.is_active })
      toast.success(pm.is_active ? 'PM schedule deactivated' : 'PM schedule activated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update PM schedule')
    }
  }

  async function handleGenerateWO() {
    try {
      const result = await generateWO.mutateAsync(scheduledDate || undefined)
      const wo = result.workOrder as Record<string, unknown>
      toast.success(`Work order ${wo.wo_number} created`)
      setShowGenerateDialog(false)
      navigate({ to: `/facility-management/work-orders/${wo.id as string}` })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate work order')
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

  if (isError || !pm) {
    return (
      <div className="text-center py-16">
        <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600">PM schedule not found</p>
        <Link to="/facility-management/preventive-maintenance">
          <Button variant="link" className="mt-2">
            Back to PM Schedules
          </Button>
        </Link>
      </div>
    )
  }

  const logs = (pm.logs as Array<Record<string, unknown>>) ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title={pm.title}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
              disabled={updatePM.isPending}
            >
              {pm.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            {pm.is_active && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowGenerateDialog(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Generate WO
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-3 -mt-2 mb-2">
        <span className="font-mono text-xs text-slate-500">{pm.pm_number}</span>
        <Badge
          variant="outline"
          className={`text-[10px] ${
            pm.is_active
              ? 'bg-teal-50 text-teal-700 border-teal-200'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}
        >
          {pm.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
          {PM_FREQUENCY_LABELS[pm.frequency as PMFrequency] ?? pm.frequency}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-400" />
              Schedule Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Project', value: pm.project.name },
              { label: 'Asset', value: pm.asset?.name },
              { label: 'Frequency', value: PM_FREQUENCY_LABELS[pm.frequency as PMFrequency] },
              {
                label: 'Custom Interval',
                value: pm.custom_interval_days ? `${pm.custom_interval_days} days` : null,
              },
              {
                label: 'Next Due',
                value: pm.next_due_date
                  ? new Date(pm.next_due_date).toLocaleDateString()
                  : null,
              },
              {
                label: 'Last Completed',
                value: pm.last_completed_date
                  ? new Date(pm.last_completed_date).toLocaleDateString()
                  : null,
              },
              {
                label: 'Assigned To',
                value: pm.assignee
                  ? `${pm.assignee.first_name} ${pm.assignee.last_name}`
                  : null,
              },
              {
                label: 'Created By',
                value: `${pm.creator.first_name} ${pm.creator.last_name}`,
              },
              {
                label: 'Total Logs',
                value: String(pm._count.logs),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start">
                <span className="text-xs text-slate-400 font-extralight">{label}</span>
                <span className="text-xs text-slate-700 font-light text-right">
                  {value ?? '—'}
                </span>
              </div>
            ))}

            {pm.description && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
                  Description
                </p>
                <p className="text-xs text-slate-600 font-light">{pm.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600">Execution Log</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No execution logs yet</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id as string}
                    className="flex items-center justify-between text-xs border-b border-slate-50 pb-2"
                  >
                    <span className="text-slate-600">
                      {new Date(log.scheduled_date as string).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      {log.status as string}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="scheduledDate">Scheduled Date (optional)</Label>
            <Input
              id="scheduledDate"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleGenerateWO}
              disabled={generateWO.isPending}
            >
              {generateWO.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
