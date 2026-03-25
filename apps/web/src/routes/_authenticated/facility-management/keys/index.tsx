import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Key, CheckCircle, Clock, AlertCircle, Trash2, CornerUpLeft } from 'lucide-react'
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
  useKeyRecords,
  useCreateKeyRecord,
  useDeleteKeyRecord,
} from '@/hooks/useKeyRecords'
import { useProjects } from '@/hooks/useProjects'
import type { KeyRecord } from '@thanamol/shared'
import { IssueKeyButton, ReturnKeyButton } from './-key-action-buttons'

export const Route = createFileRoute('/_authenticated/facility-management/keys/')({
  component: KeyManagementPage,
})

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  LOST: 'bg-red-100 text-red-700',
  DAMAGED: 'bg-orange-100 text-orange-700',
}

function KeyManagementPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; keyNumber: string } | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: keyRecordsData, isLoading } = useKeyRecords({ projectId: selectedProjectId })
  const keyRecords = keyRecordsData?.data ?? []

  const createKeyRecord = useCreateKeyRecord()
  const deleteKeyRecord = useDeleteKeyRecord()

  const [form, setForm] = useState({
    keyNumber: '',
    keyType: '',
    notes: '',
  })

  const availableCount = keyRecords.filter((k) => k.status === 'AVAILABLE').length
  const issuedCount = keyRecords.filter((k) => k.status === 'ISSUED').length
  const lostDamagedCount = keyRecords.filter(
    (k) => k.status === 'LOST' || k.status === 'DAMAGED',
  ).length

  async function handleCreate() {
    if (!selectedProjectId || !form.keyNumber) {
      toast.error('Project and key number are required')
      return
    }
    try {
      await createKeyRecord.mutateAsync({
        projectId: selectedProjectId,
        keyNumber: form.keyNumber,
        keyType: form.keyType || undefined,
        notes: form.notes || undefined,
      })
      toast.success('Key registered')
      setShowCreateDialog(false)
      setForm({ keyNumber: '', keyType: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register key')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteKeyRecord.mutateAsync(deleteTarget.id)
      toast.success('Key deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete key')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Key Management"
        actions={
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Key
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={keyRecords.length} icon={<Key className="w-8 h-8 text-indigo-400" />} />
          <StatCard label="Available" value={availableCount} icon={<CheckCircle className="w-8 h-8 text-green-400" />} />
          <StatCard label="Issued" value={issuedCount} icon={<Clock className="w-8 h-8 text-orange-400" />} />
          <StatCard label="Lost/Damaged" value={lostDamagedCount} icon={<AlertCircle className="w-8 h-8 text-red-400" />} />
        </div>
      )}

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Key No.</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Type</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Assigned To</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Issued</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedProjectId ? (
                <EmptyState colSpan={6} icon={<Key className="w-12 h-12 text-slate-300 mx-auto mb-3" />} message="Select a project to view keys" />
              ) : isLoading ? (
                <LoadingState colSpan={6} />
              ) : keyRecords.length === 0 ? (
                <EmptyState colSpan={6} icon={<Key className="w-12 h-12 text-slate-300 mx-auto mb-3" />} message="No keys registered" />
              ) : (
                keyRecords.map((key) => (
                  <KeyRow
                    key={key.id}
                    keyRecord={key}
                    statusColors={STATUS_COLORS}
                    onDelete={() => setDeleteTarget({ id: key.id, keyNumber: key.key_number })}
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
            <DialogTitle>Register Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Key Number *</Label>
              <Input
                value={form.keyNumber}
                onChange={(e) => setForm({ ...form, keyNumber: e.target.value })}
                placeholder="e.g. KEY-001"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Key Type</Label>
              <Select value={form.keyType} onValueChange={(v) => setForm({ ...form, keyType: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unit Key">Unit Key</SelectItem>
                  <SelectItem value="Common Area">Common Area</SelectItem>
                  <SelectItem value="Equipment Room">Equipment Room</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Gate">Gate</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
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
              disabled={createKeyRecord.isPending}
            >
              {createKeyRecord.isPending ? 'Registering...' : 'Register'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Delete key <strong>{deleteTarget?.keyNumber}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteKeyRecord.isPending}>
              {deleteKeyRecord.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-light text-slate-700 mt-1">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ colSpan, icon, message }: { colSpan: number; icon: React.ReactNode; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-12">
        {icon}
        <p className="text-slate-500 font-light">{message}</p>
      </TableCell>
    </TableRow>
  )
}

function LoadingState({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8">
        <p className="text-slate-400 font-light">Loading...</p>
      </TableCell>
    </TableRow>
  )
}

function KeyRow({
  keyRecord,
  statusColors,
  onDelete,
}: {
  keyRecord: KeyRecord
  statusColors: Record<string, string>
  onDelete: () => void
}) {
  return (
    <TableRow className="hover:bg-slate-50/50 border-slate-100">
      <TableCell className="font-mono text-sm text-slate-700">{keyRecord.key_number}</TableCell>
      <TableCell className="text-xs text-slate-500">{keyRecord.key_type ?? '—'}</TableCell>
      <TableCell className="text-xs text-slate-500">{keyRecord.assigned_to ?? '—'}</TableCell>
      <TableCell className="text-xs text-slate-500">
        {keyRecord.issued_date ? format(new Date(keyRecord.issued_date), 'dd/MM/yyyy') : '—'}
      </TableCell>
      <TableCell>
        <Badge className={statusColors[keyRecord.status] ?? 'bg-slate-100 text-slate-700'}>
          {keyRecord.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          {keyRecord.status === 'AVAILABLE' && <IssueKeyButton keyId={keyRecord.id} />}
          {keyRecord.status === 'ISSUED' && <ReturnKeyButton keyId={keyRecord.id} />}
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
