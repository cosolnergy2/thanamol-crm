import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Wrench, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  useServiceLogs,
  useCreateServiceLog,
  useDeleteServiceLog,
} from '@/hooks/useServiceLogs'
import { useProjects } from '@/hooks/useProjects'
import { SERVICE_TYPES } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/services/')({
  component: ServiceLogsPage,
})

function ServiceLogsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string } | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: logsData, isLoading } = useServiceLogs({ projectId: selectedProjectId })
  const logs = logsData?.data ?? []

  const createLog = useCreateServiceLog()
  const deleteLog = useDeleteServiceLog()

  const [form, setForm] = useState({
    serviceType: '',
    provider: '',
    serviceDate: '',
    nextServiceDate: '',
    cost: '',
    notes: '',
  })

  async function handleCreate() {
    if (!selectedProjectId || !form.serviceType || !form.serviceDate) {
      toast.error('Project, service type, and date are required')
      return
    }
    try {
      await createLog.mutateAsync({
        projectId: selectedProjectId,
        serviceType: form.serviceType,
        provider: form.provider || undefined,
        serviceDate: form.serviceDate,
        nextServiceDate: form.nextServiceDate || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        notes: form.notes || undefined,
      })
      toast.success('Service log created')
      setShowCreateDialog(false)
      setForm({ serviceType: '', provider: '', serviceDate: '', nextServiceDate: '', cost: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create service log')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteLog.mutateAsync(deleteTarget.id)
      toast.success('Service log deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete service log')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Service Logs"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Log Service
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
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Type</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Provider</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Date</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Next Service</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">Cost</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedProjectId ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">Select a project to view service logs</p>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-slate-400 font-light">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">No service logs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="text-sm font-light text-slate-700">{log.service_type}</TableCell>
                    <TableCell className="text-xs text-slate-500">{log.provider ?? '—'}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(log.service_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {log.next_service_date
                        ? format(new Date(log.next_service_date), 'dd/MM/yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 text-right">
                      {log.cost != null ? `฿${log.cost.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        onClick={() =>
                          setDeleteTarget({ id: log.id, type: log.service_type })
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
            <DialogTitle>Log Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Service Type *</Label>
              <Select
                value={form.serviceType}
                onValueChange={(v) => setForm({ ...form, serviceType: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Provider / Contractor</Label>
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="Company or person"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service Date *</Label>
                <Input
                  type="date"
                  value={form.serviceDate}
                  onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Next Service Date</Label>
                <Input
                  type="date"
                  value={form.nextServiceDate}
                  onChange={(e) => setForm({ ...form, nextServiceDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Cost (THB)</Label>
              <Input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="0"
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
              disabled={createLog.isPending}
            >
              {createLog.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service Log</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Delete <strong>{deleteTarget?.type}</strong> service log? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLog.isPending}>
              {deleteLog.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
