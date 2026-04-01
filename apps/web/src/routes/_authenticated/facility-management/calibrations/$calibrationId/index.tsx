import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useState } from 'react'
import { useCalibration, useDeleteCalibration } from '@/hooks/useCalibrations'
import type { CalibrationStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/calibrations/$calibrationId/'
)({
  component: CalibrationDetailPage,
})

const STATUS_COLORS: Record<CalibrationStatus, string> = {
  PENDING: 'bg-slate-50 text-slate-600 border-slate-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  PASSED: 'bg-teal-50 text-teal-700 border-teal-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  OVERDUE: 'bg-orange-50 text-orange-700 border-orange-200',
}

type ResultRow = {
  parameter: string
  standard: number
  measured: number
  deviation: number
  tolerance: number
  status: string
}

function CalibrationDetailPage() {
  const navigate = useNavigate()
  const { calibrationId } = Route.useParams()
  const { data, isLoading } = useCalibration(calibrationId)
  const deleteCalibration = useDeleteCalibration()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  if (isLoading) {
    return <div className="py-12 text-center text-slate-400">Loading...</div>
  }
  if (!data?.calibration) {
    return <div className="py-12 text-center text-slate-400">Calibration record not found</div>
  }

  const { calibration } = data
  const results: ResultRow[] = Array.isArray(calibration.results)
    ? (calibration.results as ResultRow[])
    : []

  async function handleDelete() {
    try {
      await deleteCalibration.mutateAsync(calibrationId)
      toast.success('Calibration record deleted')
      navigate({ to: '/facility-management/calibrations' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate({ to: '/facility-management/calibrations' })}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase font-mono">
                {calibration.calibration_number ?? 'N/A'}
              </h1>
              <Badge
                variant="outline"
                className={STATUS_COLORS[calibration.status as CalibrationStatus] ?? ''}
              >
                {calibration.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">{calibration.asset.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/facility-management/calibrations/$calibrationId/edit"
            params={{ calibrationId }}
          >
            <Button variant="outline" className="gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">
              Calibration Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Asset</p>
                <p className="text-slate-700 font-medium">{calibration.asset.name}</p>
                <p className="text-xs text-slate-400 font-mono">{calibration.asset.asset_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Calibration Type</p>
                <p className="text-slate-700">{calibration.calibration_type ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Calibration Date</p>
                <p className="text-slate-700">
                  {new Date(calibration.calibration_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Next Due Date</p>
                <p className="text-slate-700">
                  {calibration.next_calibration_date
                    ? new Date(calibration.next_calibration_date).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Frequency (Days)</p>
                <p className="text-slate-700">
                  {calibration.frequency_days != null ? calibration.frequency_days : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Performed By</p>
                <p className="text-slate-700">{calibration.performed_by ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">
              Certification & Cost
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">
                  Certificate Number
                </p>
                <p className="text-slate-700">{calibration.certificate_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Cost</p>
                <p className="text-slate-700">
                  {calibration.cost != null ? `฿${calibration.cost.toLocaleString()}` : '—'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide">
                  Calibration Standard
                </p>
                <p className="text-slate-700">{calibration.calibration_standard ?? '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Remarks</p>
                <p className="text-slate-700">{calibration.notes ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-slate-700">
            Calibration Results
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {results.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-sm">No calibration results recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Parameter
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Standard
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Measured
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Deviation
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Tolerance
                  </TableHead>
                  <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row, i) => (
                  <TableRow key={i} className="border-slate-100">
                    <TableCell className="text-sm text-slate-700">{row.parameter}</TableCell>
                    <TableCell className="text-sm font-mono">{row.standard}</TableCell>
                    <TableCell className="text-sm font-mono">{row.measured}</TableCell>
                    <TableCell className="text-sm font-mono text-slate-600">
                      {typeof row.deviation === 'number' ? row.deviation.toFixed(3) : '—'}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{row.tolerance}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.status === 'Pass'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Calibration Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this calibration record? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
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
