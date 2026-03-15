import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Zap, Droplets, Flame, Pencil, Trash2, Gauge } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  useMeterRecords,
  useCreateMeterRecord,
  useUpdateMeterRecord,
  useDeleteMeterRecord,
} from '@/hooks/useMeterRecords'
import { useUnits } from '@/hooks/useUnits'
import type { MeterType, MeterRecord, CreateMeterRecordRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/utilities/meter-reading')({
  component: MeterReadingPage,
})

const METER_TYPE_LABELS: Record<MeterType, string> = {
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  GAS: 'Gas',
}

const METER_TYPE_COLORS: Record<MeterType, string> = {
  ELECTRICITY: 'bg-amber-100 text-amber-700 border-amber-200',
  WATER: 'bg-sky-100 text-sky-700 border-sky-200',
  GAS: 'bg-orange-100 text-orange-700 border-orange-200',
}

function MeterTypeIcon({ type, className }: { type: MeterType; className?: string }) {
  if (type === 'ELECTRICITY') return <Zap className={className} />
  if (type === 'WATER') return <Droplets className={className} />
  return <Flame className={className} />
}

type MeterRecordFormValues = {
  unitId: string
  meterType: MeterType
  previousReading: string
  currentReading: string
  readingDate: string
  amount: string
  billingPeriod: string
}

const EMPTY_FORM: MeterRecordFormValues = {
  unitId: '',
  meterType: 'ELECTRICITY',
  previousReading: '0',
  currentReading: '0',
  readingDate: new Date().toISOString().slice(0, 10),
  amount: '0',
  billingPeriod: new Date().toISOString().slice(0, 7),
}

const PAGE_SIZE = 20

function MeterReadingPage() {
  const [unitFilter, setUnitFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<MeterType | 'all'>('all')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MeterRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MeterRecord | null>(null)
  const [form, setForm] = useState<MeterRecordFormValues>(EMPTY_FORM)

  const { data: unitsData } = useUnits({ limit: 200 })
  const units = unitsData?.data ?? []

  const { data, isLoading, isError } = useMeterRecords({
    page,
    limit: PAGE_SIZE,
    unitId: unitFilter !== 'all' ? unitFilter : undefined,
    meterType: typeFilter !== 'all' ? typeFilter : undefined,
  })

  const createMeterRecord = useCreateMeterRecord()
  const updateMeterRecord = useUpdateMeterRecord()
  const deleteMeterRecord = useDeleteMeterRecord()

  const records = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  function openCreateDialog() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEditDialog(record: MeterRecord) {
    setEditTarget(record)
    setForm({
      unitId: record.unit_id,
      meterType: record.meter_type,
      previousReading: String(record.previous_reading),
      currentReading: String(record.current_reading),
      readingDate: record.reading_date.slice(0, 10),
      amount: String(record.amount),
      billingPeriod: record.billing_period,
    })
    setDialogOpen(true)
  }

  function handleFormChange(field: keyof MeterRecordFormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function buildRequest(): CreateMeterRecordRequest {
    return {
      unitId: form.unitId,
      meterType: form.meterType,
      previousReading: parseFloat(form.previousReading) || 0,
      currentReading: parseFloat(form.currentReading) || 0,
      readingDate: new Date(form.readingDate).toISOString(),
      amount: parseFloat(form.amount) || 0,
      billingPeriod: form.billingPeriod,
    }
  }

  async function handleSubmit() {
    if (!form.unitId) {
      toast.error('Please select a unit')
      return
    }
    try {
      if (editTarget) {
        await updateMeterRecord.mutateAsync({ id: editTarget.id, data: buildRequest() })
        toast.success('Meter record updated')
      } else {
        await createMeterRecord.mutateAsync(buildRequest())
        toast.success('Meter record created')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save meter record')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteMeterRecord.mutateAsync(deleteTarget.id)
      toast.success('Meter record deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete meter record')
    } finally {
      setDeleteTarget(null)
    }
  }

  const isPending = createMeterRecord.isPending || updateMeterRecord.isPending
  const calculatedUsage =
    Math.max(0, (parseFloat(form.currentReading) || 0) - (parseFloat(form.previousReading) || 0))

  return (
    <div className="space-y-3">
      <PageHeader
        title="Meter Reading"
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Reading
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <Select
              value={unitFilter}
              onValueChange={(v) => {
                setUnitFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.unit_number}
                    {unit.building ? ` (${unit.building})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as MeterType | 'all')
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                <SelectItem value="WATER">Water</SelectItem>
                <SelectItem value="GAS">Gas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Unit
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Type
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Billing Period
                </TableHead>
                <TableHead className="text-right text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Prev Reading
                </TableHead>
                <TableHead className="text-right text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Curr Reading
                </TableHead>
                <TableHead className="text-right text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Usage
                </TableHead>
                <TableHead className="text-right text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Amount
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Reading Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-slate-600">Failed to load meter records. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Gauge className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No meter records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <span className="text-[11px] font-light text-slate-800">
                        {record.unit_id}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${METER_TYPE_COLORS[record.meter_type]} text-[9px] h-4 px-1.5 font-extralight flex items-center gap-1 w-fit`}
                      >
                        <MeterTypeIcon type={record.meter_type} className="w-2.5 h-2.5" />
                        {METER_TYPE_LABELS[record.meter_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] text-slate-600 font-extralight">
                        {record.billing_period}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="font-mono text-[11px] text-slate-600">
                        {record.previous_reading.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="font-mono text-[11px] text-slate-600">
                        {record.current_reading.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="font-mono text-[11px] font-light text-teal-700">
                        {record.usage.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="text-[11px] font-light text-slate-800">
                        ฿{record.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] text-slate-500 font-extralight">
                        {format(new Date(record.reading_date), 'd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditDialog(record)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteTarget(record)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Meter Reading' : 'Add Meter Reading'}</DialogTitle>
            <DialogDescription>
              {editTarget
                ? 'Update the meter reading details below.'
                : 'Enter the meter reading details for a unit.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="unitId">Unit</Label>
                <Select
                  value={form.unitId}
                  onValueChange={(v) => handleFormChange('unitId', v)}
                >
                  <SelectTrigger id="unitId">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.unit_number}
                        {unit.building ? ` (${unit.building})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="meterType">Meter Type</Label>
                <Select
                  value={form.meterType}
                  onValueChange={(v) => handleFormChange('meterType', v as MeterType)}
                >
                  <SelectTrigger id="meterType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                    <SelectItem value="WATER">Water</SelectItem>
                    <SelectItem value="GAS">Gas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="billingPeriod">Billing Period</Label>
                <Input
                  id="billingPeriod"
                  type="month"
                  value={form.billingPeriod}
                  onChange={(e) => handleFormChange('billingPeriod', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="previousReading">Previous Reading</Label>
                <Input
                  id="previousReading"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.previousReading}
                  onChange={(e) => handleFormChange('previousReading', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="currentReading">Current Reading</Label>
                <Input
                  id="currentReading"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.currentReading}
                  onChange={(e) => handleFormChange('currentReading', e.target.value)}
                />
              </div>

              <div>
                <Label>Calculated Usage</Label>
                <div className="h-9 flex items-center px-3 rounded-md border border-slate-200 bg-teal-50 font-mono text-sm text-teal-700">
                  {calculatedUsage.toLocaleString()} units
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Amount (฿)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="readingDate">Reading Date</Label>
                <Input
                  id="readingDate"
                  type="date"
                  value={form.readingDate}
                  onChange={(e) => handleFormChange('readingDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? 'Saving...' : editTarget ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Meter Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this meter record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMeterRecord.isPending}
            >
              {deleteMeterRecord.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
