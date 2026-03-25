import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Shield, Trash2 } from 'lucide-react'
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
import { useSecurityPatrols, useCreateSecurityPatrol, useDeleteSecurityPatrol } from '@/hooks/useSecurityPatrols'
import { useProjects } from '@/hooks/useProjects'
import type { PatrolStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/security/')({
  component: SecurityPatrolPage,
})

const PATROL_STATUS_COLORS: Record<PatrolStatus, string> = {
  SCHEDULED: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  MISSED: 'bg-red-100 text-red-700',
}

function SecurityPatrolPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; routeName: string } | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: patrolsData, isLoading } = useSecurityPatrols({ projectId: selectedProjectId })
  const patrols = patrolsData?.data ?? []

  const createPatrol = useCreateSecurityPatrol()
  const deletePatrol = useDeleteSecurityPatrol()

  const [form, setForm] = useState({
    routeName: '',
    patrolDate: '',
    guardName: '',
    notes: '',
    status: 'SCHEDULED' as PatrolStatus,
  })

  async function handleCreate() {
    if (!selectedProjectId || !form.routeName || !form.patrolDate) {
      toast.error('Project, route name, and patrol date are required')
      return
    }
    try {
      await createPatrol.mutateAsync({
        projectId: selectedProjectId,
        routeName: form.routeName,
        patrolDate: form.patrolDate,
        guardName: form.guardName || undefined,
        notes: form.notes || undefined,
        status: form.status,
      })
      toast.success('Security patrol created')
      setShowCreateDialog(false)
      setForm({ routeName: '', patrolDate: '', guardName: '', notes: '', status: 'SCHEDULED' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create patrol')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deletePatrol.mutateAsync(deleteTarget.id)
      toast.success('Patrol deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete patrol')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Security Patrols"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Patrol
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
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Route</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Date</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Guard</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedProjectId ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">Select a project to view patrols</p>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-slate-400 font-light">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : patrols.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">No patrols found</p>
                  </TableCell>
                </TableRow>
              ) : (
                patrols.map((patrol) => (
                  <TableRow key={patrol.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="text-sm font-light text-slate-700">{patrol.route_name}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(patrol.patrol_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{patrol.guard_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={PATROL_STATUS_COLORS[patrol.status as PatrolStatus]}>
                        {patrol.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        onClick={() => setDeleteTarget({ id: patrol.id, routeName: patrol.route_name })}
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
            <DialogTitle>New Security Patrol</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Route Name *</Label>
              <Input
                value={form.routeName}
                onChange={(e) => setForm({ ...form, routeName: e.target.value })}
                placeholder="e.g. Building A - Floor 1"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Patrol Date *</Label>
              <Input
                type="datetime-local"
                value={form.patrolDate}
                onChange={(e) => setForm({ ...form, patrolDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Guard Name</Label>
              <Input
                value={form.guardName}
                onChange={(e) => setForm({ ...form, guardName: e.target.value })}
                placeholder="Guard name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PatrolStatus })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="MISSED">Missed</SelectItem>
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
              disabled={createPatrol.isPending}
            >
              {createPatrol.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patrol</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Delete patrol for route <strong>{deleteTarget?.routeName}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePatrol.isPending}>
              {deletePatrol.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
