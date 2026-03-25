import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Shield, AlertCircle, Search, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'
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
  useInsurancePolicies,
  useCreateInsurancePolicy,
  useUpdateInsurancePolicy,
  useDeleteInsurancePolicy,
} from '@/hooks/useInsurancePolicies'
import { useProjects } from '@/hooks/useProjects'
import { INSURANCE_TYPES } from '@thanamol/shared'
import type { InsurancePolicyStatus, InsurancePolicyWithRelations } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/compliance/insurance'
)({
  component: InsurancePage,
})

const STATUS_LABELS: Record<InsurancePolicyStatus, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  PENDING_RENEWAL: 'Pending Renewal',
}

const STATUS_COLORS: Record<InsurancePolicyStatus, string> = {
  ACTIVE: 'bg-teal-50 text-teal-700 border-teal-200',
  EXPIRED: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  PENDING_RENEWAL: 'bg-amber-50 text-amber-700 border-amber-200',
}

type FormState = {
  policyNumber: string
  provider: string
  type: string
  projectId: string
  premium: string
  startDate: string
  endDate: string
  status: InsurancePolicyStatus
  documentUrl: string
  notes: string
}

const DEFAULT_FORM: FormState = {
  policyNumber: '',
  provider: '',
  type: 'Property',
  projectId: '',
  premium: '',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
  documentUrl: '',
  notes: '',
}

function InsurancePage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InsurancePolicyWithRelations | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: policiesData, isLoading } = useInsurancePolicies({
    projectId: projectId || undefined,
    status: (statusFilter || undefined) as InsurancePolicyStatus | undefined,
    search: search || undefined,
  })
  const policies = policiesData?.data ?? []

  const createMutation = useCreateInsurancePolicy()
  const updateMutation = useUpdateInsurancePolicy(editingItem?.id ?? '')
  const deleteMutation = useDeleteInsurancePolicy()

  const active = policies.filter((p) => p.status === 'ACTIVE')
  const expiringSoon = policies.filter((p) => {
    if (p.status !== 'ACTIVE') return false
    const days = differenceInDays(new Date(p.end_date), new Date())
    return days >= 0 && days <= 60
  })

  function openCreate() {
    setEditingItem(null)
    setForm(DEFAULT_FORM)
    setDialogOpen(true)
  }

  function openEdit(item: InsurancePolicyWithRelations) {
    setEditingItem(item)
    setForm({
      policyNumber: item.policy_number,
      provider: item.provider,
      type: item.type,
      projectId: item.project_id ?? '',
      premium: item.premium !== null ? String(item.premium) : '',
      startDate: item.start_date.slice(0, 10),
      endDate: item.end_date.slice(0, 10),
      status: item.status,
      documentUrl: item.document_url ?? '',
      notes: item.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.policyNumber || !form.provider || !form.startDate || !form.endDate) {
      toast.error('Policy number, provider, start and end dates are required')
      return
    }

    const payload = {
      policyNumber: form.policyNumber,
      provider: form.provider,
      type: form.type,
      projectId: form.projectId || undefined,
      premium: form.premium ? Number(form.premium) : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      documentUrl: form.documentUrl || undefined,
      notes: form.notes || undefined,
    }

    if (editingItem) {
      await updateMutation.mutateAsync(payload)
      toast.success('Policy updated')
    } else {
      await createMutation.mutateAsync(payload)
      toast.success('Policy added')
    }
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!deletingId) return
    await deleteMutation.mutateAsync(deletingId)
    toast.success('Policy deleted')
    setDeleteDialogOpen(false)
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Register"
        subtitle="ทะเบียนกรมธรรม์ประกัน"
        actions={
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Add Policy
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Active Policies</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{active.length}</p>
              </div>
              <Shield className="w-8 h-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Expiring Soon (60 days)</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{expiringSoon.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-light text-slate-700 mt-1">
                  {policiesData?.pagination.total ?? 0}
                </p>
              </div>
              <Shield className="w-8 h-8 text-slate-400" />
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
                placeholder="Search policies..."
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
                  <TableHead>Policy #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      No policies found
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-mono text-sm">{policy.policy_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{policy.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{policy.provider}</TableCell>
                      <TableCell className="text-sm">{policy.project?.name ?? '-'}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {policy.premium !== null
                          ? `฿${policy.premium.toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(policy.start_date), 'dd/MM/yy')} –{' '}
                        {format(new Date(policy.end_date), 'dd/MM/yy')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[policy.status as InsurancePolicyStatus]}
                        >
                          {STATUS_LABELS[policy.status as InsurancePolicyStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(policy)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setDeletingId(policy.id)
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
            <DialogTitle>{editingItem ? 'Edit Policy' : 'Add Insurance Policy'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update policy details' : 'Register a new insurance policy'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>Policy Number *</Label>
              <Input
                value={form.policyNumber}
                onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Provider *</Label>
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Project</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Premium (฿)</Label>
              <Input
                type="number"
                value={form.premium}
                onChange={(e) => setForm({ ...form, premium: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as InsurancePolicyStatus })}
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
            <div className="space-y-1">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Document URL</Label>
              <Input
                value={form.documentUrl}
                onChange={(e) => setForm({ ...form, documentUrl: e.target.value })}
                placeholder="https://..."
              />
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
              {editingItem ? 'Update' : 'Add Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Policy</DialogTitle>
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
