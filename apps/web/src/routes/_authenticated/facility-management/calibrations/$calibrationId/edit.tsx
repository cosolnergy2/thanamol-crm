import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useCalibration, useUpdateCalibration } from '@/hooks/useCalibrations'
import { CALIBRATION_TYPES } from '@thanamol/shared'
import type { CalibrationStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/calibrations/$calibrationId/edit'
)({
  component: CalibrationEditPage,
})

const CALIBRATION_STATUSES: Array<{ value: CalibrationStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'OVERDUE', label: 'Overdue' },
]

type ResultRow = {
  _key: number
  parameter: string
  standard: number
  measured: number
  tolerance: number
}

function calcDeviation(measured: number, standard: number): number {
  return measured - standard
}

function calcStatus(deviation: number, tolerance: number): 'Pass' | 'Fail' {
  return Math.abs(deviation) <= tolerance ? 'Pass' : 'Fail'
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr || !days) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

type StoredResultRow = {
  parameter: string
  standard: number
  measured: number
  deviation: number
  tolerance: number
  status: string
}

function CalibrationEditPage() {
  const navigate = useNavigate()
  const { calibrationId } = Route.useParams()
  const { data, isLoading } = useCalibration(calibrationId)
  const updateCalibration = useUpdateCalibration(calibrationId)

  const [form, setForm] = useState({
    calibrationDate: '',
    frequencyDays: 365,
    nextCalibrationDate: '',
    calibrationType: '',
    calibrationStandard: '',
    performedBy: '',
    certificateNumber: '',
    cost: 0,
    notes: '',
    status: 'PENDING' as CalibrationStatus,
  })

  const [results, setResults] = useState<ResultRow[]>([])
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (data?.calibration && !initialized) {
      const cal = data.calibration
      setForm({
        calibrationDate: toDateInputValue(cal.calibration_date),
        frequencyDays: cal.frequency_days ?? 365,
        nextCalibrationDate: toDateInputValue(cal.next_calibration_date),
        calibrationType: cal.calibration_type ?? '',
        calibrationStandard: cal.calibration_standard ?? '',
        performedBy: cal.performed_by ?? '',
        certificateNumber: cal.certificate_number ?? '',
        cost: cal.cost ?? 0,
        notes: cal.notes ?? '',
        status: cal.status as CalibrationStatus,
      })

      const stored: StoredResultRow[] = Array.isArray(cal.results)
        ? (cal.results as StoredResultRow[])
        : []
      setResults(
        stored.map((r, i) => ({
          _key: i,
          parameter: r.parameter,
          standard: r.standard,
          measured: r.measured,
          tolerance: r.tolerance,
        }))
      )
      setInitialized(true)
    }
  }, [data, initialized])

  useEffect(() => {
    if (initialized && form.calibrationDate && form.frequencyDays) {
      setForm((prev) => ({
        ...prev,
        nextCalibrationDate: addDays(prev.calibrationDate, prev.frequencyDays),
      }))
    }
  }, [form.calibrationDate, form.frequencyDays, initialized])

  function addResultRow() {
    setResults((prev) => [
      ...prev,
      { _key: Date.now(), parameter: '', standard: 0, measured: 0, tolerance: 0 },
    ])
  }

  function removeResultRow(key: number) {
    setResults((prev) => prev.filter((r) => r._key !== key))
  }

  function updateResultRow(
    key: number,
    field: keyof Omit<ResultRow, '_key'>,
    value: string | number
  ) {
    setResults((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const serializedResults = results.map(({ _key: _, ...r }) => {
      const deviation = calcDeviation(r.measured, r.standard)
      return {
        parameter: r.parameter,
        standard: r.standard,
        measured: r.measured,
        deviation,
        tolerance: r.tolerance,
        status: calcStatus(deviation, r.tolerance),
      }
    })

    try {
      await updateCalibration.mutateAsync({
        calibrationDate: form.calibrationDate,
        nextCalibrationDate: form.nextCalibrationDate || undefined,
        performedBy: form.performedBy || undefined,
        status: form.status,
        notes: form.notes || undefined,
        frequencyDays: form.frequencyDays || undefined,
        calibrationType: form.calibrationType || undefined,
        calibrationStandard: form.calibrationStandard || undefined,
        certificateNumber: form.certificateNumber || undefined,
        cost: form.cost,
        results: serializedResults,
      })
      toast.success('Calibration record updated')
      navigate({
        to: '/facility-management/calibrations/$calibrationId',
        params: { calibrationId },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update calibration record')
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-slate-400">Loading...</div>
  }
  if (!data?.calibration) {
    return <div className="py-12 text-center text-slate-400">Calibration record not found</div>
  }

  const { calibration } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            navigate({
              to: '/facility-management/calibrations/$calibrationId',
              params: { calibrationId },
            })
          }
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Edit Calibration
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">
            {calibration.calibration_number ?? 'N/A'} — {calibration.asset.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Calibration Number</Label>
              <Input
                value={calibration.calibration_number ?? 'N/A'}
                readOnly
                className="bg-slate-50 text-slate-500 font-mono"
              />
            </div>

            <div>
              <Label>Asset</Label>
              <Input
                value={`${calibration.asset.asset_number} — ${calibration.asset.name}`}
                readOnly
                className="bg-slate-50 text-slate-500"
              />
            </div>

            <div>
              <Label htmlFor="edit-calibration-date">
                Calibration Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-calibration-date"
                type="date"
                required
                value={form.calibrationDate}
                onChange={(e) => setForm((p) => ({ ...p, calibrationDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-frequency-days">Frequency (Days)</Label>
              <Input
                id="edit-frequency-days"
                type="number"
                min={1}
                value={form.frequencyDays}
                onChange={(e) =>
                  setForm((p) => ({ ...p, frequencyDays: Number(e.target.value) }))
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-next-calibration-date">Next Calibration Date</Label>
              <Input
                id="edit-next-calibration-date"
                type="date"
                value={form.nextCalibrationDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nextCalibrationDate: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-calibration-type">Calibration Type</Label>
              <Select
                value={form.calibrationType}
                onValueChange={(v) => setForm((p) => ({ ...p, calibrationType: v }))}
              >
                <SelectTrigger id="edit-calibration-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CALIBRATION_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {ct}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="edit-calibration-standard">Calibration Standard</Label>
              <Input
                id="edit-calibration-standard"
                value={form.calibrationStandard}
                onChange={(e) =>
                  setForm((p) => ({ ...p, calibrationStandard: e.target.value }))
                }
                placeholder="ISO 17025, NIST, etc."
              />
            </div>

            <div>
              <Label htmlFor="edit-performed-by">Performed By</Label>
              <Input
                id="edit-performed-by"
                value={form.performedBy}
                onChange={(e) => setForm((p) => ({ ...p, performedBy: e.target.value }))}
                placeholder="Technician name"
              />
            </div>

            <div>
              <Label htmlFor="edit-certificate-number">Certificate Number</Label>
              <Input
                id="edit-certificate-number"
                value={form.certificateNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, certificateNumber: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-cost">Cost (฿)</Label>
              <Input
                id="edit-cost"
                type="number"
                min={0}
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v as CalibrationStatus }))}
              >
                <SelectTrigger id="edit-status">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="edit-notes">Notes / Remarks</Label>
            <Textarea
              id="edit-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional remarks"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-slate-700">
                Calibration Results
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addResultRow}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Result
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {results.length === 0 ? (
              <p className="text-slate-400 text-center py-6 text-sm">
                No results. Click "Add Result" to add measurement rows.
              </p>
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
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => {
                    const deviation = calcDeviation(row.measured, row.standard)
                    const status = calcStatus(deviation, row.tolerance)
                    return (
                      <TableRow key={row._key} className="border-slate-100">
                        <TableCell>
                          <Input
                            value={row.parameter}
                            onChange={(e) =>
                              updateResultRow(row._key, 'parameter', e.target.value)
                            }
                            placeholder="e.g. Temperature"
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            value={row.standard}
                            onChange={(e) =>
                              updateResultRow(row._key, 'standard', Number(e.target.value))
                            }
                            className="h-8 text-sm w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            value={row.measured}
                            onChange={(e) =>
                              updateResultRow(row._key, 'measured', Number(e.target.value))
                            }
                            className="h-8 text-sm w-24"
                          />
                        </TableCell>
                        <TableCell className="text-sm font-mono text-slate-600">
                          {deviation.toFixed(3)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            min={0}
                            value={row.tolerance}
                            onChange={(e) =>
                              updateResultRow(row._key, 'tolerance', Number(e.target.value))
                            }
                            className="h-8 text-sm w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              status === 'Pass'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                            onClick={() => removeResultRow(row._key)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({
                to: '/facility-management/calibrations/$calibrationId',
                params: { calibrationId },
              })
            }
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            disabled={updateCalibration.isPending}
          >
            <Save className="w-4 h-4" />
            {updateCalibration.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
