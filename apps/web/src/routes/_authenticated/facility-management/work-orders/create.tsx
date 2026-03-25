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
import { useAuth } from '@/providers/AuthProvider'
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

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

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
  })

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: assetsData } = useAssets({
    projectId: form.projectId || undefined,
    limit: 100,
  })
  const assets = assetsData?.data ?? []

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
      toast.error('Project is required')
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
        assetId: form.assetId || undefined,
        scheduledDate: form.scheduledDate || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        costEstimate: form.costEstimate ? Number(form.costEstimate) : undefined,
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
              <CardTitle className="text-sm font-light text-slate-600">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  placeholder="Describe the work to be done"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Type</Label>
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
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Location & Asset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="project">
                  Project <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => {
                    handleChange('projectId', v)
                    handleChange('assetId', '')
                  }}
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
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => handleChange('scheduledDate', e.target.value)}
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
