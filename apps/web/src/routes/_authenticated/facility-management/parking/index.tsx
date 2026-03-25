import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Car, Trash2, Link2Off } from 'lucide-react'
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
  useParkingSlots,
  useCreateParkingSlot,
  useDeleteParkingSlot,
  useAssignParkingSlot,
  useReleaseParkingSlot,
} from '@/hooks/useParkingSlots'
import { useProjects } from '@/hooks/useProjects'

export const Route = createFileRoute('/_authenticated/facility-management/parking/')({
  component: ParkingManagementPage,
})

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  OCCUPIED: 'bg-blue-100 text-blue-700',
  RESERVED: 'bg-yellow-100 text-yellow-700',
  MAINTENANCE: 'bg-orange-100 text-orange-700',
}

function ParkingManagementPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [assignTarget, setAssignTarget] = useState<{ id: string; slotNumber: string } | null>(null)
  const [assignVehiclePlate, setAssignVehiclePlate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; slotNumber: string } | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: slotsData, isLoading } = useParkingSlots({ projectId: selectedProjectId })
  const slots = slotsData?.data ?? []

  const createSlot = useCreateParkingSlot()
  const deleteSlot = useDeleteParkingSlot()
  const assignSlot = useAssignParkingSlot(assignTarget?.id ?? '')
  const releaseSlotMutation = useReleaseParkingSlot(assignTarget?.id ?? '')

  const [form, setForm] = useState({
    slotNumber: '',
    slotType: '',
    monthlyFee: '',
    notes: '',
  })

  const availableCount = slots.filter((s) => s.status === 'AVAILABLE').length
  const occupiedCount = slots.filter((s) => s.status === 'OCCUPIED').length

  async function handleCreate() {
    if (!selectedProjectId || !form.slotNumber) {
      toast.error('Project and slot number are required')
      return
    }
    try {
      await createSlot.mutateAsync({
        projectId: selectedProjectId,
        slotNumber: form.slotNumber,
        slotType: form.slotType || undefined,
        monthlyFee: form.monthlyFee ? Number(form.monthlyFee) : undefined,
        notes: form.notes || undefined,
      })
      toast.success('Parking slot created')
      setShowCreateDialog(false)
      setForm({ slotNumber: '', slotType: '', monthlyFee: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create slot')
    }
  }

  async function handleAssign() {
    if (!assignTarget) return
    try {
      await assignSlot.mutateAsync({ vehiclePlate: assignVehiclePlate || undefined })
      toast.success('Parking slot assigned')
      setAssignTarget(null)
      setAssignVehiclePlate('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign slot')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteSlot.mutateAsync(deleteTarget.id)
      toast.success('Slot deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete slot')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Parking Management"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Slot
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

      {selectedProjectId && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total</p>
                  <p className="text-2xl font-light text-slate-700 mt-1">{slots.length}</p>
                </div>
                <Car className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Available</p>
              <p className="text-2xl font-light text-green-600 mt-1">{availableCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Occupied</p>
              <p className="text-2xl font-light text-blue-600 mt-1">{occupiedCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Slot No.</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Type</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Vehicle</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Fee/mo</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedProjectId ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">Select a project to view parking slots</p>
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-slate-400 font-light">Loading...</p>
                  </TableCell>
                </TableRow>
              ) : slots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-light">No parking slots found</p>
                  </TableCell>
                </TableRow>
              ) : (
                slots.map((slot) => (
                  <ParkingSlotRow
                    key={slot.id}
                    slot={slot}
                    statusColors={STATUS_COLORS}
                    onAssign={() => setAssignTarget({ id: slot.id, slotNumber: slot.slot_number })}
                    onDelete={() => setDeleteTarget({ id: slot.id, slotNumber: slot.slot_number })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Parking Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Slot Number *</Label>
              <Input
                value={form.slotNumber}
                onChange={(e) => setForm({ ...form, slotNumber: e.target.value })}
                placeholder="e.g. P-001"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.slotType} onValueChange={(v) => setForm({ ...form, slotType: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Car">Car</SelectItem>
                  <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="Handicap">Handicap</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monthly Fee (THB)</Label>
              <Input
                type="number"
                value={form.monthlyFee}
                onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
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
              disabled={createSlot.isPending}
            >
              {createSlot.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => { if (!open) { setAssignTarget(null); setAssignVehiclePlate('') } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Slot {assignTarget?.slotNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Vehicle Plate</Label>
              <Input
                value={assignVehiclePlate}
                onChange={(e) => setAssignVehiclePlate(e.target.value)}
                placeholder="License plate"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignTarget(null); setAssignVehiclePlate('') }}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleAssign}
              disabled={assignSlot.isPending}
            >
              {assignSlot.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Slot</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Delete slot <strong>{deleteTarget?.slotNumber}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSlot.isPending}>
              {deleteSlot.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ParkingSlotRow({
  slot,
  statusColors,
  onAssign,
  onDelete,
}: {
  slot: { id: string; slot_number: string; slot_type: string | null; vehicle_plate: string | null; monthly_fee: number | null; status: string }
  statusColors: Record<string, string>
  onAssign: () => void
  onDelete: () => void
}) {
  const releaseSlot = useReleaseParkingSlot(slot.id)

  async function handleRelease() {
    try {
      await releaseSlot.mutateAsync()
      toast.success('Slot released')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to release slot')
    }
  }

  return (
    <TableRow className="hover:bg-slate-50/50 border-slate-100">
      <TableCell className="font-mono text-sm text-slate-700">{slot.slot_number}</TableCell>
      <TableCell className="text-xs text-slate-500">{slot.slot_type ?? '—'}</TableCell>
      <TableCell className="text-xs text-slate-500">{slot.vehicle_plate ?? '—'}</TableCell>
      <TableCell className="text-xs text-slate-500">
        {slot.monthly_fee != null ? `฿${slot.monthly_fee.toLocaleString()}` : '—'}
      </TableCell>
      <TableCell>
        <Badge className={statusColors[slot.status] ?? 'bg-slate-100 text-slate-700'}>
          {slot.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          {slot.status === 'AVAILABLE' && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAssign}>
              Assign
            </Button>
          )}
          {slot.status === 'OCCUPIED' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleRelease}
              disabled={releaseSlot.isPending}
            >
              <Link2Off className="w-3 h-3 mr-1" />
              Release
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-rose-600"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
