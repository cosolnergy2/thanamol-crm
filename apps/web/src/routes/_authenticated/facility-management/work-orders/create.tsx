import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/PageHeader'
import { useCreateWorkOrder } from '@/hooks/useWorkOrders'
import { useProjects } from '@/hooks/useProjects'
import { useAssets } from '@/hooks/useAssets'
import { useVendors } from '@/hooks/useVendors'
import { useAuth } from '@/providers/AuthProvider'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { WorkOrderType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/work-orders/create')({
  component: WorkOrderCreatePage,
})

const WO_TYPES: Array<{ value: WorkOrderType; label: string }> = [
  { value: 'CORRECTIVE', label: 'Corrective' },
  { value: 'PREVENTIVE', label: 'Preventive' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'CALIBRATION', label: 'Calibration' },
]

const PRIORITIES: Array<{ value: string; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

type UserEntry = {
  id: string
  first_name: string
  last_name: string
  is_active: boolean
}

function WorkOrderCreatePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const createWO = useCreateWorkOrder()

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'CORRECTIVE' as WorkOrderType,
    priority: 'MEDIUM',
    projectId: '',
    assetId: '',
    scheduledDate: '',
    estimatedHours: '',
    costEstimate: '',
    assignedTo: '',
    vendorId: '',
    scheduledStart: '',
    scheduledEnd: '',
    budgetCode: '',
  })

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: assetsData } = useAssets({
    projectId: form.projectId || undefined,
    limit: 100,
  })
  const assets = assetsData?.data ?? []

  const { data: vendorsData } = useVendors({ limit: 100 })
  const vendors = vendorsData?.data ?? []

  const { data: usersData } = useQuery({
    queryKey: ['auth-users'],
    queryFn: () => apiGet<{ users: UserEntry[] }>('/auth/users'),
    staleTime: 60 * 1000,
  })
  const activeUsers = (usersData?.users ?? []).filter((u) => u.is_active)

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.projectId) {
      toast.error('Site is required')
      return
    }
    if (!currentUser) {
      toast.error('Not authenticated')
      return
    }

    try {
      await createWO.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        priority: form.priority,
        projectId: form.projectId,
        assetId: form.assetId && form.assetId !== '__all__' ? form.assetId : undefined,
        scheduledDate: form.scheduledDate || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        costEstimate: form.costEstimate ? Number(form.costEstimate) : undefined,
        assignedTo: form.assignedTo && form.assignedTo !== '__none__' ? form.assignedTo : undefined,
        vendorId: form.vendorId && form.vendorId !== '__none__' ? form.vendorId : undefined,
        scheduledStart: form.scheduledStart || undefined,
        scheduledEnd: form.scheduledEnd || undefined,
        budgetCode: form.budgetCode || undefined,
        createdBy: currentUser.id,
      })
      toast.success('Work order created')
      navigate({ to: '/facility-management/work-orders' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create work order')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Create Work Order" />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>WO Number</Label>
                <Input value="Auto-generated" disabled className="text-slate-400 bg-slate-50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="type">WO Type</Label>
                  <Select value={form.type} onValueChange={(v) => handleChange('type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WO_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => handleChange('priority', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="project">
                  Site <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => {
                    handleChange('projectId', v)
                    handleChange('assetId', '')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
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

              <div className="space-y-1.5">
                <Label htmlFor="asset">Asset (optional)</Label>
                <Select
                  value={form.assetId}
                  onValueChange={(v) => handleChange('assetId', v)}
                  disabled={!form.projectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">No specific asset</SelectItem>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.asset_number} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">
                  Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Work order title"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budgetCode">Budget Code</Label>
                <Input
                  id="budgetCode"
                  value={form.budgetCode}
                  onChange={(e) => handleChange('budgetCode', e.target.value)}
                  placeholder="MAINT-2026-01"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  placeholder="Describe the work to be done"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Assignment & Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="assignedTo">Assigned To (Technician)</Label>
                <Select
                  value={form.assignedTo}
                  onValueChange={(v) => handleChange('assignedTo', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {activeUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vendorId">Vendor (if outsourced)</Label>
                <Select
                  value={form.vendorId}
                  onValueChange={(v) => handleChange('vendorId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scheduledStart">Scheduled Start</Label>
                <Input
                  id="scheduledStart"
                  type="datetime-local"
                  value={form.scheduledStart}
                  onChange={(e) => handleChange('scheduledStart', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scheduledEnd">Scheduled End</Label>
                <Input
                  id="scheduledEnd"
                  type="datetime-local"
                  value={form.scheduledEnd}
                  onChange={(e) => handleChange('scheduledEnd', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="estimatedHours">Est. Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    value={form.estimatedHours}
                    onChange={(e) => handleChange('estimatedHours', e.target.value)}
                    min="0"
                    step="0.5"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="costEstimate">Cost Estimate</Label>
                  <Input
                    id="costEstimate"
                    type="number"
                    value={form.costEstimate}
                    onChange={(e) => handleChange('costEstimate', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/work-orders' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createWO.isPending}
          >
            {createWO.isPending ? 'Creating...' : 'Create Work Order'}
          </Button>
        </div>
      </form>
    </div>
  )
}
