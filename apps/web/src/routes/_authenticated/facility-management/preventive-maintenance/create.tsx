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
import { useCreatePM } from '@/hooks/usePreventiveMaintenance'
import { useProjects } from '@/hooks/useProjects'
import { useAssets } from '@/hooks/useAssets'
import { useAuth } from '@/providers/AuthProvider'
import type { PMFrequency } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/preventive-maintenance/create'
)({
  component: PMCreatePage,
})

const PM_FREQUENCIES: Array<{ value: PMFrequency; label: string }> = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMI_ANNUAL', label: 'Semi-Annual' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'CUSTOM', label: 'Custom' },
]

function PMCreatePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const createPM = useCreatePM()

  const [form, setForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assetId: '',
    frequency: 'MONTHLY' as PMFrequency,
    customIntervalDays: '',
    nextDueDate: '',
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
      await createPM.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        projectId: form.projectId,
        assetId: form.assetId || undefined,
        frequency: form.frequency,
        customIntervalDays:
          form.frequency === 'CUSTOM' && form.customIntervalDays
            ? Number(form.customIntervalDays)
            : undefined,
        nextDueDate: form.nextDueDate || undefined,
        createdBy: currentUser.id,
      })
      toast.success('PM schedule created')
      navigate({ to: '/facility-management/preventive-maintenance' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create PM schedule')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Create PM Schedule" />

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
                  placeholder="PM schedule title"
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
                  placeholder="Describe the maintenance tasks"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => handleChange('frequency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PM_FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.frequency === 'CUSTOM' && (
                <div className="space-y-1.5">
                  <Label htmlFor="customIntervalDays">Interval (days)</Label>
                  <Input
                    id="customIntervalDays"
                    type="number"
                    value={form.customIntervalDays}
                    onChange={(e) => handleChange('customIntervalDays', e.target.value)}
                    min="1"
                    placeholder="e.g. 45"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="nextDueDate">Next Due Date</Label>
                <Input
                  id="nextDueDate"
                  type="date"
                  value={form.nextDueDate}
                  onChange={(e) => handleChange('nextDueDate', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Project & Asset</CardTitle>
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
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/preventive-maintenance' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createPM.isPending}
          >
            {createPM.isPending ? 'Creating...' : 'Create PM Schedule'}
          </Button>
        </div>
      </form>
    </div>
  )
}
