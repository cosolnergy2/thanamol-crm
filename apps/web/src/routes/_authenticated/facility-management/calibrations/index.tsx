import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Gauge, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/PageHeader'
import { useCalibrations, useCreateCalibration, useDeleteCalibration } from '@/hooks/useCalibrations'
import { useAssets } from '@/hooks/useAssets'
import { useProjects } from '@/hooks/useProjects'
import type { CalibrationStatus, CalibrationWithAsset } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/calibrations/')({
  component: CalibrationListPage,
})

const CALIBRATION_STATUSES: Array<{ value: CalibrationStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'OVERDUE', label: 'Overdue' },
]

const STATUS_COLORS: Record<CalibrationStatus, string> = {
  PENDING: 'bg-slate-50 text-slate-600 border-slate-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  PASSED: 'bg-teal-50 text-teal-700 border-teal-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  OVERDUE: 'bg-orange-50 text-orange-700 border-orange-200',
}

type CalibrationFormState = {
  assetId: string
  calibrationDate: string
  nextCalibrationDate: string
  performedBy: string
  status: CalibrationStatus
  notes: string
}

const EMPTY_FORM: CalibrationFormState = {
  assetId: '',
  calibrationDate: '',
  nextCalibrationDate: '',
  performedBy: '',
  status: 'PENDING',
  notes: '',
}

function CalibrationListPage() {
  const [projectId, setProjectId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CalibrationFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: assetsData } = useAssets({
    projectId: projectId || undefined,
    limit: 100,
  })
  const assets = assetsData?.data ?? []

  const { data: calibrationsData, isLoading, isError } = useCalibrations({
    projectId: projectId || undefined,
    status: statusFilter as CalibrationStatus || undefined,
  })

  const createCalibration = useCreateCalibration()
  const deleteCalibration = useDeleteCalibration()

  const calibrations: CalibrationWithAsset[] = calibrationsData?.data ?? []
  const total = calibrationsData?.pagination.total ?? 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.assetId || !form.calibrationDate) {
      toast.error('Asset and calibration date are required')
      return
    }
    try {
      await createCalibration.mutateAsync({
        assetId: form.assetId,
        calibrationDate: form.calibrationDate,
        nextCalibrationDate: form.nextCalibrationDate || undefined,
        performedBy: form.performedBy || undefined,
        status: form.status,
        notes: form.notes || undefined,
      })
      toast.success('Calibration record created')
      setShowForm(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create calibration record')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteCalibration.mutateAsync(deleteTarget.id)
      toast.success('Calibration record deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete calibration record')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Calibration Records"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Quick Add
            </Button>
            <Link to="/facility-management/calibrations/create">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Calibration
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={projectId} onValueChange={(v) => {
              setProjectId(v)
              setForm((p) => ({ ...p, assetId: '' }))
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                {CALIBRATION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-extralight">
              {total} record{total !== 1 ? 's' : ''}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Asset
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Calibration Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Next Due
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Performed By
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
                    <p className="text-slate-600">Failed to load calibration records.</p>
                  </TableCell>
                </TableRow>
              ) : calibrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Gauge className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No calibration records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                calibrations.map((cal) => (
                  <TableRow key={cal.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell>
                      <div>
                        <p className="text-sm text-slate-700 font-light">{cal.asset.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{cal.asset.asset_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {new Date(cal.calibration_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {cal.next_calibration_date
                        ? new Date(cal.next_calibration_date).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {cal.performed_by ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATUS_COLORS[cal.status as CalibrationStatus] ?? ''}`}
                      >
                        {cal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to="/facility-management/calibrations/$calibrationId"
                          params={{ calibrationId: cal.id }}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                            aria-label="View calibration record"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          onClick={() => setDeleteTarget({ id: cal.id })}
                          aria-label="Delete calibration record"
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

      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) { setShowForm(false); setForm(EMPTY_FORM) }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Calibration Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cal-asset">
                Asset <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={form.assetId}
                onValueChange={(v) => setForm((p) => ({ ...p, assetId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.asset_number} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cal-date">
                  Calibration Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="cal-date"
                  type="date"
                  value={form.calibrationDate}
                  onChange={(e) => setForm((p) => ({ ...p, calibrationDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="next-cal-date">Next Due Date</Label>
                <Input
                  id="next-cal-date"
                  type="date"
                  value={form.nextCalibrationDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nextCalibrationDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="performed-by">Performed By</Label>
                <Input
                  id="performed-by"
                  value={form.performedBy}
                  onChange={(e) => setForm((p) => ({ ...p, performedBy: e.target.value }))}
                  placeholder="Technician name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cal-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as CalibrationStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALIBRATION_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-notes">Notes</Label>
              <Textarea
                id="cal-notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                placeholder="Optional notes"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setForm(EMPTY_FORM)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={createCalibration.isPending}
              >
                {createCalibration.isPending ? 'Saving...' : 'Add Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Calibration Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this calibration record?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCalibration.isPending}
            >
              {deleteCalibration.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
