import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Recycle, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/PageHeader'
import {
  useWasteRecords,
  useCreateWasteRecord,
  useDeleteWasteRecord,
} from '@/hooks/useWasteRecords'
import { useProjects } from '@/hooks/useProjects'
import { WASTE_TYPES, WASTE_UNITS } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/waste/')({
  component: WasteRecordPage,
})

const WASTE_TYPE_COLORS: Record<string, string> = {
  GENERAL: 'bg-slate-100 text-slate-700',
  RECYCLABLE: 'bg-teal-100 text-teal-700',
  HAZARDOUS: 'bg-red-100 text-red-700',
  ORGANIC: 'bg-green-100 text-green-700',
}

const EMPTY_FORM = {
  recordDate: '',
  wasteType: 'GENERAL',
  volume: '',
  unit: 'kg',
  disposalMethod: '',
  notes: '',
}

function WasteRecordPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [filterWasteType, setFilterWasteType] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; date: string } | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: recordsData, isLoading } = useWasteRecords({
    projectId: selectedProjectId,
    wasteType: filterWasteType || undefined,
  })
  const records = recordsData?.data ?? []

  const createRecord = useCreateWasteRecord()
  const deleteRecord = useDeleteWasteRecord()

  function resetForm() {
    setForm(EMPTY_FORM)
  }

  async function handleCreate() {
    if (!selectedProjectId || !form.recordDate || !form.volume) {
      toast.error('Project, record date, and volume are required')
      return
    }
    const volumeNum = parseFloat(form.volume)
    if (isNaN(volumeNum) || volumeNum <= 0) {
      toast.error('Volume must be a positive number')
      return
    }
    try {
      await createRecord.mutateAsync({
        recordDate: form.recordDate,
        projectId: selectedProjectId,
        wasteType: form.wasteType,
        volume: volumeNum,
        unit: form.unit,
        disposalMethod: form.disposalMethod || undefined,
        notes: form.notes || undefined,
      })
      toast.success('Waste record created')
      setShowCreateDialog(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create waste record')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteRecord.mutateAsync(deleteTarget.id)
      toast.success('Waste record deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete waste record')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Waste Records"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Record
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4 flex flex-col md:flex-row gap-3">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full md:w-72">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterWasteType} onValueChange={setFilterWasteType}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All waste types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {WASTE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Date</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Waste Type</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Volume</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Disposal Method</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedProjectId ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Recycle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">Select a project to view waste records</p>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-slate-400 font-light">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Recycle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">No waste records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(record.record_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className={WASTE_TYPE_COLORS[record.waste_type] ?? 'bg-slate-100 text-slate-700'}>
                        {record.waste_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {record.volume} {record.unit}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {record.disposal_method ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        onClick={() =>
                          setDeleteTarget({
                            id: record.id,
                            date: format(new Date(record.record_date), 'dd/MM/yyyy'),
                          })
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Waste Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Record Date *</Label>
              <Input
                type="date"
                value={form.recordDate}
                onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Waste Type *</Label>
              <Select value={form.wasteType} onValueChange={(v) => setForm({ ...form, wasteType: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Volume *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div className="w-28">
                <Label>Unit *</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WASTE_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Disposal Method</Label>
              <Input
                value={form.disposalMethod}
                onChange={(e) => setForm({ ...form, disposalMethod: e.target.value })}
                placeholder="e.g. Municipal collection"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleCreate}
              disabled={createRecord.isPending}
            >
              {createRecord.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Waste Record</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Delete waste record for <strong>{deleteTarget?.date}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteRecord.isPending}
            >
              {deleteRecord.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
