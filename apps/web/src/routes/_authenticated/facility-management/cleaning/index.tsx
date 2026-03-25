import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
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
  useCleaningChecklists,
  useCreateCleaningChecklist,
  useDeleteCleaningChecklist,
} from '@/hooks/useCleaningChecklists'
import { useProjects } from '@/hooks/useProjects'
import { useZones } from '@/hooks/useZones'
import { CLEANING_STATUSES } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/cleaning/')({
  component: CleaningChecklistPage,
})

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
}

function CleaningChecklistPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; date: string } | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: zonesData } = useZones({ projectId: selectedProjectId })
  const zones = zonesData?.data ?? []

  const { data: checklistsData, isLoading } = useCleaningChecklists({ projectId: selectedProjectId })
  const checklists = checklistsData?.data ?? []

  const createChecklist = useCreateCleaningChecklist()
  const deleteChecklist = useDeleteCleaningChecklist()

  const [form, setForm] = useState({
    checklistDate: '',
    zoneId: '',
    completedBy: '',
    status: 'PENDING',
    notes: '',
  })

  async function handleCreate() {
    if (!selectedProjectId || !form.checklistDate) {
      toast.error('Project and checklist date are required')
      return
    }
    try {
      await createChecklist.mutateAsync({
        projectId: selectedProjectId,
        checklistDate: form.checklistDate,
        zoneId: form.zoneId || undefined,
        completedBy: form.completedBy || undefined,
        status: form.status,
        notes: form.notes || undefined,
      })
      toast.success('Cleaning checklist created')
      setShowCreateDialog(false)
      setForm({ checklistDate: '', zoneId: '', completedBy: '', status: 'PENDING', notes: '' })
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
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Date</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Zone</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Completed By</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedProjectId ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">Select a project to view checklists</p>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-slate-400 font-light">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : checklists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">No checklists found</p>
                  </TableCell>
                </TableRow>
              ) : (
                checklists.map((checklist) => (
                  <TableRow key={checklist.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(checklist.checklist_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {(checklist as { zone?: { name: string } }).zone?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{checklist.completed_by ?? '—'}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Cleaning Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Checklist Date *</Label>
              <Input
                type="date"
                value={form.checklistDate}
                onChange={(e) => setForm({ ...form, checklistDate: e.target.value })}
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
              <Label>Completed By</Label>
              <Input
                value={form.completedBy}
                onChange={(e) => setForm({ ...form, completedBy: e.target.value })}
                placeholder="Staff name"
                className="mt-1"
              />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
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
