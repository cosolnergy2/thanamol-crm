import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { PageHeader } from '@/components/PageHeader'
import {
  useTaskStatuses,
  useCreateTaskStatus,
  useUpdateTaskStatus,
  useDeleteTaskStatus,
} from '@/hooks/useTaskConfig'
import type { TaskStatusConfig, CreateTaskStatusRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/tasks/status-settings')({
  component: TaskStatusConfigSettingsPage,
})

type StatusFormValues = {
  name: string
  color: string
  order: string
  isDefault: boolean
  isClosed: boolean
}

const EMPTY_FORM: StatusFormValues = {
  name: '',
  color: '#6366f1',
  order: '0',
  isDefault: false,
  isClosed: false,
}

function TaskStatusConfigSettingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<TaskStatusConfig | null>(null)
  const [form, setForm] = useState<StatusFormValues>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, isError } = useTaskStatuses()
  const createStatus = useCreateTaskStatus()
  const updateStatus = useUpdateTaskStatus()
  const deleteStatus = useDeleteTaskStatus()

  const statuses = data?.data ?? []

  function openCreateDialog() {
    setEditingStatus(null)
    setForm({ ...EMPTY_FORM, order: String(statuses.length) })
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(status: TaskStatusConfig) {
    setEditingStatus(status)
    setForm({
      name: status.name,
      color: status.color,
      order: String(status.order),
      isDefault: status.is_default,
      isClosed: status.is_closed,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError('Status name is required')
      return
    }

    const payload: CreateTaskStatusRequest = {
      name: form.name.trim(),
      color: form.color,
      order: parseInt(form.order, 10) || 0,
      isDefault: form.isDefault,
      isClosed: form.isClosed,
    }

    try {
      if (editingStatus) {
        await updateStatus.mutateAsync({ id: editingStatus.id, data: payload })
        toast.success('Status updated successfully')
      } else {
        await createStatus.mutateAsync(payload)
        toast.success('Status created successfully')
      }
      setDialogOpen(false)
      setEditingStatus(null)
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save status')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteStatus.mutateAsync(deleteTarget.id)
      toast.success('Status deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete status')
    } finally {
      setDeleteTarget(null)
    }
  }

  const isMutating = createStatus.isPending || updateStatus.isPending

  return (
    <div className="space-y-3">
      <PageHeader
        title="Task Status Settings"
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Status
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase w-10"></TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Order
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Default
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Closed
                </TableHead>
                <TableHead className="text-center text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-slate-600">Failed to load statuses. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : statuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-slate-600">No custom statuses yet</p>
                    <p className="text-sm text-slate-400 mt-1">Click "Add Status" to create one</p>
                  </TableCell>
                </TableRow>
              ) : (
                statuses.map((status) => (
                  <TableRow key={status.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-[11px] font-light text-slate-800">{status.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] text-slate-600 font-extralight">
                        {status.order}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      {status.is_default && (
                        <Badge
                          variant="outline"
                          className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] h-4 px-1.5 font-extralight"
                        >
                          Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      {status.is_closed && (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] h-4 px-1.5 font-extralight"
                        >
                          Closed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditDialog(status)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteTarget({ id: status.id, name: status.name })}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStatus ? 'Edit Status' : 'Add New Status'}</DialogTitle>
            <DialogDescription>
              {editingStatus ? 'Update task status settings' : 'Create a custom task status'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="statusName">
                  Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="statusName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="In Review"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statusColor">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="statusColor"
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-slate-200"
                    />
                    <Input
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statusOrder">Order</Label>
                  <Input
                    id="statusOrder"
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="statusDefault">Set as default</Label>
                <Switch
                  id="statusDefault"
                  checked={form.isDefault}
                  onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="statusClosed">Mark as closed</Label>
                <Switch
                  id="statusClosed"
                  checked={form.isClosed}
                  onCheckedChange={(checked) => setForm({ ...form, isClosed: checked })}
                />
              </div>

              {formError && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                  {formError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  setEditingStatus(null)
                  setFormError(null)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isMutating}>
                {isMutating ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteStatus.isPending}
            >
              {deleteStatus.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
