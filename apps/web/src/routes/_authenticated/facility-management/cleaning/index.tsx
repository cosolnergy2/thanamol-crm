import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Sparkles, Trash2, PlusCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  useCleaningChecklists,
  useCreateCleaningChecklist,
  useDeleteCleaningChecklist,
} from '@/hooks/useCleaningChecklists'
import { useProjects } from '@/hooks/useProjects'
import { useZones } from '@/hooks/useZones'
import { useUsers } from '@/hooks/useUsers'
import { CLEANING_STATUSES, CLEANING_SHIFTS } from '@thanamol/shared'
import type { CleaningArea } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/cleaning/')({
  component: CleaningChecklistPage,
})

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
}

const QUALITY_SCORE_OPTIONS = [
  { value: 5, label: '5 - Excellent' },
  { value: 4, label: '4 - Good' },
  { value: 3, label: '3 - Fair' },
  { value: 2, label: '2 - Poor' },
  { value: 1, label: '1 - Critical' },
] as const

const DEFAULT_FORM = {
  checklistDate: '',
  siteId: '',
  zoneId: '',
  shift: '',
  cleanerId: '',
  supervisorId: '',
  status: 'PENDING',
  notes: '',
}

function createDefaultTask() {
  return { task_name: '', completed: false, quality_score: 5 }
}

function createDefaultArea(): CleaningArea {
  return { area_name: '', tasks: [createDefaultTask()] }
}

function CleaningChecklistPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; date: string } | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: zonesData } = useZones({ projectId: selectedProjectId })
  const zones = zonesData?.data ?? []

  const { data: usersData } = useUsers()
  const users = usersData?.users ?? []

  const { data: checklistsData, isLoading } = useCleaningChecklists({ projectId: selectedProjectId })
  const checklists = checklistsData?.data ?? []

  const createChecklist = useCreateCleaningChecklist()
  const deleteChecklist = useDeleteCleaningChecklist()

  const [form, setForm] = useState(DEFAULT_FORM)
  const [cleaningAreas, setCleaningAreas] = useState<CleaningArea[]>([])

  function addArea() {
    setCleaningAreas((prev) => [...prev, createDefaultArea()])
  }

  function removeArea(areaIndex: number) {
    setCleaningAreas((prev) => prev.filter((_, i) => i !== areaIndex))
  }

  function updateAreaName(areaIndex: number, name: string) {
    setCleaningAreas((prev) =>
      prev.map((area, i) => (i === areaIndex ? { ...area, area_name: name } : area)),
    )
  }

  function addTask(areaIndex: number) {
    setCleaningAreas((prev) =>
      prev.map((area, i) =>
        i === areaIndex ? { ...area, tasks: [...area.tasks, createDefaultTask()] } : area,
      ),
    )
  }

  function removeTask(areaIndex: number, taskIndex: number) {
    setCleaningAreas((prev) =>
      prev.map((area, i) =>
        i === areaIndex
          ? { ...area, tasks: area.tasks.filter((_, ti) => ti !== taskIndex) }
          : area,
      ),
    )
  }

  function updateTask(
    areaIndex: number,
    taskIndex: number,
    field: 'task_name' | 'completed' | 'quality_score',
    value: string | boolean | number,
  ) {
    setCleaningAreas((prev) =>
      prev.map((area, i) =>
        i === areaIndex
          ? {
              ...area,
              tasks: area.tasks.map((task, ti) =>
                ti === taskIndex ? { ...task, [field]: value } : task,
              ),
            }
          : area,
      ),
    )
  }

  async function handleCreate() {
    if (!selectedProjectId || !form.checklistDate) {
      toast.error('Project and checklist date are required')
      return
    }
    try {
      await createChecklist.mutateAsync({
        projectId: selectedProjectId,
        siteId: form.siteId || undefined,
        zoneId: form.zoneId || undefined,
        checklistDate: form.checklistDate,
        shift: form.shift || undefined,
        cleanerId: form.cleanerId || undefined,
        supervisorId: form.supervisorId || undefined,
        status: form.status,
        notes: form.notes || undefined,
        cleaningAreas: cleaningAreas.length > 0 ? cleaningAreas : undefined,
      })
      toast.success('Cleaning checklist created')
      setShowCreateDialog(false)
      setForm(DEFAULT_FORM)
      setCleaningAreas([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create checklist')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteChecklist.mutateAsync(deleteTarget.id)
      toast.success('Checklist deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete checklist')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Cleaning Checklists"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Checklist
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Number</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Date</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Shift</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Zone</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedProjectId ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">Select a project to view checklists</p>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-slate-400 font-light">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : checklists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">No checklists found</p>
                  </TableCell>
                </TableRow>
              ) : (
                checklists.map((checklist) => (
                  <TableRow key={checklist.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {checklist.checklist_number ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(checklist.checklist_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {checklist.shift ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {(checklist as { zone?: { name: string } }).zone?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[checklist.status] ?? 'bg-slate-100 text-slate-700'}>
                        {checklist.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        onClick={() =>
                          setDeleteTarget({
                            id: checklist.id,
                            date: format(new Date(checklist.checklist_date), 'dd/MM/yyyy'),
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Cleaning Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-slate-500 text-xs">Checklist Number</Label>
              <p className="text-xs text-slate-400 mt-1 italic">Auto-generated on save</p>
            </div>

            <div>
              <Label>Checklist Date *</Label>
              <Input
                type="date"
                value={form.checklistDate}
                onChange={(e) => setForm({ ...form, checklistDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Site</Label>
              <Input
                value={form.siteId}
                onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                placeholder="Site name or ID"
                className="mt-1"
              />
            </div>

            {zones.length > 0 && (
              <div>
                <Label>Zone</Label>
                <Select value={form.zoneId} onValueChange={(v) => setForm({ ...form, zoneId: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select zone (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Shift</Label>
              <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select shift (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {CLEANING_SHIFTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cleaner</Label>
              <Select value={form.cleanerId} onValueChange={(v) => setForm({ ...form, cleanerId: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select cleaner (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Supervisor</Label>
              <Select value={form.supervisorId} onValueChange={(v) => setForm({ ...form, supervisorId: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select supervisor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLEANING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold text-slate-700">Areas &amp; Tasks</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addArea}
                  className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Add Area
                </Button>
              </div>

              {cleaningAreas.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">
                  No areas added. Click &quot;Add Area&quot; to begin.
                </p>
              )}

              <div className="space-y-4">
                {cleaningAreas.map((area, areaIndex) => (
                  <div key={areaIndex} className="border border-slate-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={area.area_name}
                        onChange={(e) => updateAreaName(areaIndex, e.target.value)}
                        placeholder="Area name (e.g. Lobby)"
                        className="flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 shrink-0"
                        onClick={() => removeArea(areaIndex)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-2 pl-2">
                      {area.tasks.map((task, taskIndex) => (
                        <div key={taskIndex} className="flex items-center gap-2">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) =>
                              updateTask(areaIndex, taskIndex, 'completed', Boolean(checked))
                            }
                          />
                          <Input
                            value={task.task_name}
                            onChange={(e) =>
                              updateTask(areaIndex, taskIndex, 'task_name', e.target.value)
                            }
                            placeholder="Task name"
                            className="flex-1 text-sm h-8"
                          />
                          <Select
                            value={String(task.quality_score)}
                            onValueChange={(v) =>
                              updateTask(areaIndex, taskIndex, 'quality_score', Number(v))
                            }
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUALITY_SCORE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={String(opt.value)}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 shrink-0"
                            onClick={() => removeTask(areaIndex, taskIndex)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addTask(areaIndex)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 pl-2"
                    >
                      <PlusCircle className="w-3 h-3 mr-1" />
                      Add Task
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setForm(DEFAULT_FORM)
                setCleaningAreas([])
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleCreate}
              disabled={createChecklist.isPending}
            >
              {createChecklist.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Checklist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Delete checklist for <strong>{deleteTarget?.date}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteChecklist.isPending}>
              {deleteChecklist.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
