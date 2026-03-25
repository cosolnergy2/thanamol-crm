import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, ShieldCheck, AlertCircle, Search, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
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
  useContractorSafetyRecords,
  useCreateContractorSafety,
  useUpdateContractorSafety,
  useToggleContractorClearance,
  useDeleteContractorSafety,
} from '@/hooks/useContractorSafety'
import { useProjects } from '@/hooks/useProjects'
import type { ContractorSafetyWithRelations } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/compliance/contractors'
)({
  component: ContractorsPage,
})

type FormState = {
  contractorName: string
  projectId: string
  safetyInductionDate: string
  safetyCertUrl: string
  notes: string
}

const DEFAULT_FORM: FormState = {
  contractorName: '',
  projectId: '',
  safetyInductionDate: '',
  safetyCertUrl: '',
  notes: '',
}

function ContractorsPage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clearedFilter, setClearedFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContractorSafetyWithRelations | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: contractorsData, isLoading } = useContractorSafetyRecords({
    projectId: projectId || undefined,
    isCleared:
      clearedFilter === 'true' ? true : clearedFilter === 'false' ? false : undefined,
    search: search || undefined,
  })
  const contractors = contractorsData?.data ?? []

  const createMutation = useCreateContractorSafety()
  const updateMutation = useUpdateContractorSafety(editingItem?.id ?? '')
  const deleteMutation = useDeleteContractorSafety()

  const cleared = contractors.filter((c) => c.is_cleared)

  function openCreate() {
    setEditingItem(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(item: ContractorSafetyWithRelations) {
    setEditingItem(item)
    setForm({
      contractorName: item.contractor_name,
      projectId: item.project_id,
      safetyInductionDate: item.safety_induction_date
        ? item.safety_induction_date.slice(0, 10)
        : '',
      safetyCertUrl: item.safety_cert_url ?? '',
      notes: item.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.contractorName || !form.projectId) {
      toast.error('Contractor name and project are required')
      return
    }

    if (editingItem) {
      await updateMutation.mutateAsync({
        contractorName: form.contractorName,
        safetyInductionDate: form.safetyInductionDate || undefined,
        safetyCertUrl: form.safetyCertUrl || undefined,
        notes: form.notes || undefined,
      })
      toast.success('Record updated')
    } else {
      await createMutation.mutateAsync({
        contractorName: form.contractorName,
        projectId: form.projectId,
        safetyInductionDate: form.safetyInductionDate || undefined,
        safetyCertUrl: form.safetyCertUrl || undefined,
        notes: form.notes || undefined,
      })
      toast.success('Contractor safety record added')
    }
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!deletingId) return
    await deleteMutation.mutateAsync(deletingId)
    toast.success('Record deleted')
    setDeleteDialogOpen(false)
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractor Safety"
        subtitle="การรับรองความปลอดภัยผู้รับเหมา"
        actions={
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Add Record
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Records</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  {contractorsData?.pagination.total ?? 0}
                </p>
              </div>
              <ShieldCheck className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Cleared</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{cleared.length}</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Not Cleared</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  {contractors.length - cleared.length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
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
                placeholder="Search contractors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={projectId || '__all__'} onValueChange={(v) => setProjectId(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clearedFilter || '__all__'} onValueChange={(v) => setClearedFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Clearance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="true">Cleared</SelectItem>
                <SelectItem value="false">Not Cleared</SelectItem>
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
                  <TableHead>Contractor</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Induction Date</TableHead>
                  <TableHead>Safety Cert</TableHead>
                  <TableHead>Clearance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  contractors.map((c) => (
                    <ContractorRow
                      key={c.id}
                      contractor={c}
                      onEdit={() => openEdit(c)}
                      onDelete={() => {
                        setDeletingId(c.id)
                        setDeleteDialogOpen(true)
                      }}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Contractor Record' : 'Add Contractor Safety Record'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update safety clearance record' : 'Register contractor safety clearance'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Contractor Name *</Label>
              <Input
                value={form.contractorName}
                onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
              />
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
              <Label>Safety Induction Date</Label>
              <Input
                type="date"
                value={form.safetyInductionDate}
                onChange={(e) => setForm({ ...form, safetyInductionDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Safety Certificate URL</Label>
              <Input
                value={form.safetyCertUrl}
                onChange={(e) => setForm({ ...form, safetyCertUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
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
              {editingItem ? 'Update' : 'Add Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
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

function ContractorRow({
  contractor,
  onEdit,
  onDelete,
}: {
  contractor: ContractorSafetyWithRelations
  onEdit: () => void
  onDelete: () => void
}) {
  const toggleMutation = useToggleContractorClearance(contractor.id)

  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{contractor.contractor_name}</TableCell>
      <TableCell className="text-sm">{contractor.project.name}</TableCell>
      <TableCell className="text-sm">
        {contractor.safety_induction_date
          ? format(new Date(contractor.safety_induction_date), 'dd/MM/yyyy')
          : '-'}
      </TableCell>
      <TableCell className="text-sm">
        {contractor.safety_cert_url ? (
          <a
            href={contractor.safety_cert_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline text-xs"
          >
            View
          </a>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          className={
            contractor.is_cleared
              ? 'text-teal-600 hover:text-teal-700'
              : 'text-slate-400 hover:text-slate-600'
          }
          onClick={async () => {
            await toggleMutation.mutateAsync()
            toast.success(contractor.is_cleared ? 'Clearance revoked' : 'Clearance granted')
          }}
          disabled={toggleMutation.isPending}
        >
          {contractor.is_cleared ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="ml-1">{contractor.is_cleared ? 'Cleared' : 'Not Cleared'}</span>
        </Button>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
