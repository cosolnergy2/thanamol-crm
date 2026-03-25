import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Flame, AlertCircle, Search, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
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
  useFireEquipment,
  useCreateFireEquipment,
  useUpdateFireEquipment,
  useDeleteFireEquipment,
} from '@/hooks/useFireEquipment'
import { useProjects } from '@/hooks/useProjects'
import { FIRE_EQUIPMENT_TYPES } from '@thanamol/shared'
import type { FireEquipmentWithRelations } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/compliance/fire-equipment'
)({
  component: FireEquipmentPage,
})

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-teal-50 text-teal-700 border-teal-200',
  INACTIVE: 'bg-slate-50 text-slate-600 border-slate-200',
  UNDER_MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
  DECOMMISSIONED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  UNDER_MAINTENANCE: 'Under Maintenance',
  DECOMMISSIONED: 'Decommissioned',
}

type FormState = {
  equipmentNumber: string
  type: string
  projectId: string
  zoneId: string
  locationDetail: string
  lastInspectionDate: string
  nextInspectionDate: string
  status: string
  notes: string
}

const DEFAULT_FORM: FormState = {
  equipmentNumber: '',
  type: 'Fire Extinguisher',
  projectId: '',
  zoneId: '',
  locationDetail: '',
  lastInspectionDate: '',
  nextInspectionDate: '',
  status: 'ACTIVE',
  notes: '',
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function FireEquipmentPage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FireEquipmentWithRelations | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: equipmentData, isLoading } = useFireEquipment({
    projectId: projectId || undefined,
    status: statusFilter as 'all' || undefined,
    search: search || undefined,
  })
  const equipment = equipmentData?.data ?? []

  const createMutation = useCreateFireEquipment()
  const updateMutation = useUpdateFireEquipment(editingItem?.id ?? '')
  const deleteMutation = useDeleteFireEquipment()

  const dueSoon = equipment.filter((e) => {
    if (!e.next_inspection_date) return false
    const d = daysUntil(e.next_inspection_date)
    return d >= 0 && d <= 30
  })

  function openCreate() {
    setEditingItem(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(item: FireEquipmentWithRelations) {
    setEditingItem(item)
    setForm({
      equipmentNumber: item.equipment_number,
      type: item.type,
      projectId: item.project_id,
      zoneId: item.zone_id ?? '',
      locationDetail: item.location_detail ?? '',
      lastInspectionDate: item.last_inspection_date
        ? item.last_inspection_date.slice(0, 10)
        : '',
      nextInspectionDate: item.next_inspection_date
        ? item.next_inspection_date.slice(0, 10)
        : '',
      status: item.status,
      notes: item.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.equipmentNumber || !form.type || !form.projectId) {
      toast.error('Equipment number, type, and project are required')
      return
    }

    if (editingItem) {
      await updateMutation.mutateAsync({
        equipmentNumber: form.equipmentNumber,
        type: form.type,
        zoneId: form.zoneId || undefined,
        locationDetail: form.locationDetail || undefined,
        lastInspectionDate: form.lastInspectionDate || undefined,
        nextInspectionDate: form.nextInspectionDate || undefined,
        status: form.status as 'ACTIVE',
        notes: form.notes || undefined,
      })
      toast.success('Equipment updated')
    } else {
      await createMutation.mutateAsync({
        equipmentNumber: form.equipmentNumber,
        type: form.type,
        projectId: form.projectId,
        zoneId: form.zoneId || undefined,
        locationDetail: form.locationDetail || undefined,
        lastInspectionDate: form.lastInspectionDate || undefined,
        nextInspectionDate: form.nextInspectionDate || undefined,
        status: form.status as 'ACTIVE',
        notes: form.notes || undefined,
      })
      toast.success('Equipment added')
    }
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!deletingId) return
    await deleteMutation.mutateAsync(deletingId)
    toast.success('Equipment deleted')
    setDeleteDialogOpen(false)
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fire Equipment Register"
        subtitle="อุปกรณ์ดับเพลิงและความปลอดภัย"
        actions={
          <Button onClick={openCreate} className="bg-rose-600 hover:bg-rose-700 gap-2">
            <Plus className="w-4 h-4" />
            Add Equipment
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Equipment</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  {equipmentData?.pagination.total ?? 0}
                </p>
              </div>
              <Flame className="w-8 h-8 text-rose-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Due for Inspection (30 days)</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{dueSoon.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Active</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  {equipment.filter((e) => e.status === 'ACTIVE').length}
                </p>
              </div>
              <Flame className="w-8 h-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Inspection</TableHead>
                  <TableHead>Next Inspection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      No equipment found
                    </TableCell>
                  </TableRow>
                ) : (
                  equipment.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-mono text-sm">{eq.equipment_number}</TableCell>
                      <TableCell>{eq.type}</TableCell>
                      <TableCell className="text-sm">{eq.project.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {eq.location_detail ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {eq.last_inspection_date
                          ? format(new Date(eq.last_inspection_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {eq.next_inspection_date ? (
                          <span
                            className={
                              daysUntil(eq.next_inspection_date) <= 30 &&
                              daysUntil(eq.next_inspection_date) >= 0
                                ? 'text-amber-600 font-medium'
                                : daysUntil(eq.next_inspection_date) < 0
                                  ? 'text-rose-600 font-medium'
                                  : ''
                            }
                          >
                            {format(new Date(eq.next_inspection_date), 'dd/MM/yyyy')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[eq.status] ?? 'bg-slate-50 text-slate-600'}
                        >
                          {STATUS_LABELS[eq.status] ?? eq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(eq)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setDeletingId(eq.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Fire Equipment' : 'Add Fire Equipment'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update equipment details' : 'Register new fire safety equipment'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Equipment Number *</Label>
              <Input
                value={form.equipmentNumber}
                onChange={(e) => setForm({ ...form, equipmentNumber: e.target.value })}
                placeholder="e.g., FE-0001"
              />
            </div>
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIRE_EQUIPMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editingItem && (
              <div className="space-y-1">
                <Label>Project *</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Location Detail</Label>
              <Input
                value={form.locationDetail}
                onChange={(e) => setForm({ ...form, locationDetail: e.target.value })}
                placeholder="e.g., Floor 1, Corridor A"
              />
            </div>
            <div className="space-y-1">
              <Label>Last Inspection Date</Label>
              <Input
                type="date"
                value={form.lastInspectionDate}
                onChange={(e) => setForm({ ...form, lastInspectionDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Next Inspection Date</Label>
              <Input
                type="date"
                value={form.nextInspectionDate}
                onChange={(e) => setForm({ ...form, nextInspectionDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingItem ? 'Update' : 'Add Equipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The equipment record will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
