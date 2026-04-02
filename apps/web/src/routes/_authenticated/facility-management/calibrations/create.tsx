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
import { useCreateCalibration } from '@/hooks/useCalibrations'
import { useAssets } from '@/hooks/useAssets'
import { CALIBRATION_TYPES } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/calibrations/create'
)({
  component: CalibrationCreatePage,
})

const TODAY = new Date().toISOString().split('T')[0]

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

function CalibrationCreatePage() {
  const navigate = useNavigate()
  const createCalibration = useCreateCalibration()
  const { data: assetsData } = useAssets({ limit: 200 })
  const assets = assetsData?.data ?? []

  const [form, setForm] = useState({
    calibrationNumber: 'CAL-XXXXX',
    assetId: '',
    calibrationDate: TODAY,
    frequencyDays: 365,
    nextCalibrationDate: addDays(TODAY, 365),
    calibrationType: '',
    calibrationStandard: '',
    performedBy: '',
    certificateNumber: '',
    cost: 0,
    notes: '',
    status: 'PENDING',
  })

  const [results, setResults] = useState<ResultRow[]>([])

  useEffect(() => {
    if (form.calibrationDate && form.frequencyDays) {
      setForm((prev) => ({
        ...prev,
        nextCalibrationDate: addDays(prev.calibrationDate, prev.frequencyDays),
      }))
    }
  }, [form.calibrationDate, form.frequencyDays])

  function addResultRow() {
    setResults((prev) => [
      ...prev,
      { _key: Date.now(), parameter: '', standard: 0, measured: 0, tolerance: 0 },
    ])
  }

  function removeResultRow(key: number) {
    setResults((prev) => prev.filter((r) => r._key !== key))
  }

  function updateResultRow(key: number, field: keyof Omit<ResultRow, '_key'>, value: string | number) {
    setResults((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.assetId) {
      toast.error('Asset is required')
      return
    }

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
      await createCalibration.mutateAsync({
        assetId: form.assetId,
        calibrationDate: form.calibrationDate,
        nextCalibrationDate: form.nextCalibrationDate || undefined,
        performedBy: form.performedBy || undefined,
        status: form.status as 'PENDING',
        notes: form.notes || undefined,
        frequencyDays: form.frequencyDays || undefined,
        calibrationType: form.calibrationType || undefined,
        calibrationStandard: form.calibrationStandard || undefined,
        certificateNumber: form.certificateNumber || undefined,
        cost: form.cost,
        results: serializedResults.length > 0 ? serializedResults : undefined,
      })
      toast.success('Calibration record created')
      navigate({ to: '/facility-management/calibrations' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create calibration record')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/calibrations' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Create Calibration
          </h1>
          <p className="text-sm text-slate-500 mt-1">บันทึกการสอบเทียบใหม่</p>
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
              <Label htmlFor="calibration-number">Calibration Number</Label>
              <Input
                id="calibration-number"
                value={form.calibrationNumber}
                readOnly
                className="bg-slate-50 text-slate-500 font-mono"
                placeholder="Auto-generated on save"
              />
            </div>

            <div>
              <Label htmlFor="asset-id">
                Asset <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={form.assetId}
                onValueChange={(v) => setForm((p) => ({ ...p, assetId: v }))}
              >
                <SelectTrigger id="asset-id">
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

            <div>
              <Label htmlFor="calibration-date">
                Calibration Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="calibration-date"
                type="date"
                required
                value={form.calibrationDate}
                onChange={(e) => setForm((p) => ({ ...p, calibrationDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="frequency-days">Frequency (Days)</Label>
              <Input
                id="frequency-days"
                type="number"
                min={1}
                value={form.frequencyDays}
                onChange={(e) =>
                  setForm((p) => ({ ...p, frequencyDays: Number(e.target.value) }))
                }
              />
            </div>

            <div>
              <Label htmlFor="next-calibration-date">Next Calibration Date</Label>
              <Input
                id="next-calibration-date"
                type="date"
                value={form.nextCalibrationDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nextCalibrationDate: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="calibration-type">Calibration Type</Label>
              <Select
                value={form.calibrationType}
                onValueChange={(v) => setForm((p) => ({ ...p, calibrationType: v }))}
              >
                <SelectTrigger id="calibration-type">
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
              <Label htmlFor="calibration-standard">Calibration Standard</Label>
              <Input
                id="calibration-standard"
                value={form.calibrationStandard}
                onChange={(e) =>
                  setForm((p) => ({ ...p, calibrationStandard: e.target.value }))
                }
                placeholder="ISO 17025, NIST, etc."
              />
            </div>

            <div>
              <Label htmlFor="performed-by">Performed By</Label>
              <Input
                id="performed-by"
                value={form.performedBy}
                onChange={(e) => setForm((p) => ({ ...p, performedBy: e.target.value }))}
                placeholder="Technician name"
              />
            </div>

            <div>
              <Label htmlFor="certificate-number">Certificate Number</Label>
              <Input
                id="certificate-number"
                value={form.certificateNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, certificateNumber: e.target.value }))
                }
                placeholder="e.g. CERT-2026-001"
              />
            </div>

            <div>
              <Label htmlFor="cost">Cost (฿)</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-700">Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="notes">Notes / Remarks</Label>
            <Textarea
              id="notes"
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
                No results added. Click "Add Result" to add measurement rows.
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
                            className={
                              status === 'Pass'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }
                            variant="outline"
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
            onClick={() => navigate({ to: '/facility-management/calibrations' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            disabled={createCalibration.isPending}
          >
            <Save className="w-4 h-4" />
            {createCalibration.isPending ? 'Saving...' : 'Create Calibration'}
          </Button>
        </div>
      </form>
    </div>
  )
}
