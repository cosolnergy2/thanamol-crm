import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { useInventoryItems } from '@/hooks/useInventory'
import { useAuth } from '@/providers/AuthProvider'
import { ASSET_SCOPE_TYPES, PM_TRIGGER_TYPES } from '@thanamol/shared'
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

type ChecklistTask = {
  id: string
  name: string
  description: string
  duration_minutes: number | ''
}

type SparePart = {
  id: string
  itemId: string
  quantity: number | ''
}

function generateRowId(): string {
  return Math.random().toString(36).slice(2)
}

function PMCreatePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const createPM = useCreatePM()

  const [form, setForm] = useState({
    title: '',
    projectId: '',
    assetId: '',
    scopeType: '',
    triggerType: '',
    frequency: 'MONTHLY' as PMFrequency,
    customIntervalDays: '',
    nextDueDate: '',
    estimatedDuration: '',
    autoCreateWo: false,
    autoWoDaysBefore: '7',
  })

  const [checklist, setChecklist] = useState<ChecklistTask[]>([])
  const [spareParts, setSpareParts] = useState<SparePart[]>([])

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: assetsData } = useAssets({ projectId: form.projectId || undefined, limit: 100 })
  const assets = assetsData?.data ?? []

  const selectedAsset = assets.find((a) => a.id === form.assetId)
  const assetCategory = selectedAsset?.category?.name ?? null

  const { data: inventoryData } = useInventoryItems({ limit: 200 })
  const inventoryItems = inventoryData?.data ?? []

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function addChecklistTask() {
    setChecklist((prev) => [
      ...prev,
      { id: generateRowId(), name: '', description: '', duration_minutes: '' },
    ])
  }

  function updateChecklistTask(id: string, field: keyof Omit<ChecklistTask, 'id'>, value: string) {
    setChecklist((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              [field]: field === 'duration_minutes' ? (value === '' ? '' : Number(value)) : value,
            }
          : task
      )
    )
  }

  function removeChecklistTask(id: string) {
    setChecklist((prev) => prev.filter((t) => t.id !== id))
  }

  function addSparePart() {
    setSpareParts((prev) => [...prev, { id: generateRowId(), itemId: '', quantity: '' }])
  }

  function updateSparePart(id: string, field: keyof Omit<SparePart, 'id'>, value: string) {
    setSpareParts((prev) =>
      prev.map((part) =>
        part.id === id
          ? { ...part, [field]: field === 'quantity' ? (value === '' ? '' : Number(value)) : value }
          : part
      )
    )
  }

  function removeSparePart(id: string) {
    setSpareParts((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('PM Name is required')
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

    const checklistPayload = checklist
      .filter((t) => t.name.trim())
      .map(({ id: _id, ...rest }) => ({
        ...rest,
        duration_minutes: rest.duration_minutes === '' ? null : rest.duration_minutes,
      }))

    const sparePartsPayload = spareParts
      .filter((p) => p.itemId)
      .map(({ id: _id, ...rest }) => ({
        ...rest,
        quantity: rest.quantity === '' ? 1 : rest.quantity,
      }))

    try {
      await createPM.mutateAsync({
        title: form.title,
        projectId: form.projectId,
        assetId: form.assetId || undefined,
        scopeType: form.scopeType || undefined,
        triggerType: form.triggerType || undefined,
        frequency: form.frequency,
        customIntervalDays:
          form.frequency === 'CUSTOM' && form.customIntervalDays
            ? Number(form.customIntervalDays)
            : undefined,
        nextDueDate: form.nextDueDate || undefined,
        estimatedDuration: form.estimatedDuration ? Number(form.estimatedDuration) : undefined,
        checklist: checklistPayload.length ? checklistPayload : undefined,
        spareParts: sparePartsPayload.length ? sparePartsPayload : undefined,
        autoCreateWo: form.autoCreateWo,
        autoWoDaysBefore:
          form.autoCreateWo && form.autoWoDaysBefore ? Number(form.autoWoDaysBefore) : undefined,
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>PM Code</Label>
              <Input value="Auto-generated" disabled className="text-slate-400 bg-slate-50" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">
                PM Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="PM schedule name"
                required
              />
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
                <SelectTrigger id="project">
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
              <Label htmlFor="scopeType">Scope Type</Label>
              <Select
                value={form.scopeType}
                onValueChange={(v) => handleChange('scopeType', v)}
              >
                <SelectTrigger id="scopeType">
                  <SelectValue placeholder="Select scope type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_SCOPE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
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
                <SelectTrigger id="asset">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific asset</SelectItem>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.asset_number} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Asset Category</Label>
              <Input
                value={assetCategory ?? ''}
                placeholder="Auto-filled from asset"
                disabled
                className="text-slate-400 bg-slate-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule & Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600">
              Schedule & Frequency
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select
                value={form.triggerType}
                onValueChange={(v) => handleChange('triggerType', v)}
              >
                <SelectTrigger id="triggerType">
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  {PM_TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="frequency">Frequency Type</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => handleChange('frequency', v)}
              >
                <SelectTrigger id="frequency">
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

            <div className="space-y-1.5">
              <Label htmlFor="estimatedDuration">Estimated Duration (hours)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                value={form.estimatedDuration}
                onChange={(e) => handleChange('estimatedDuration', e.target.value)}
                min="0"
                step="0.5"
                placeholder="e.g. 2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Checklist */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-light text-slate-600">
              Maintenance Checklist / Tasks
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addChecklistTask}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Task
            </Button>
          </CardHeader>
          <CardContent>
            {checklist.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No tasks added yet. Click "+ Add Task" to add checklist items.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_100px_32px] gap-2 text-[10px] text-slate-400 uppercase tracking-wide px-1">
                  <span>Task Name</span>
                  <span>Description</span>
                  <span>Duration (min)</span>
                  <span />
                </div>
                {checklist.map((task) => (
                  <div
                    key={task.id}
                    className="grid grid-cols-[1fr_1fr_100px_32px] gap-2 items-center"
                  >
                    <Input
                      value={task.name}
                      onChange={(e) => updateChecklistTask(task.id, 'name', e.target.value)}
                      placeholder="Task name"
                      className="h-8 text-xs"
                    />
                    <Input
                      value={task.description}
                      onChange={(e) =>
                        updateChecklistTask(task.id, 'description', e.target.value)
                      }
                      placeholder="Description"
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      value={task.duration_minutes}
                      onChange={(e) =>
                        updateChecklistTask(task.id, 'duration_minutes', e.target.value)
                      }
                      placeholder="mins"
                      min="0"
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-rose-500"
                      onClick={() => removeChecklistTask(task.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Required Spare Parts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-light text-slate-600">
              Required Spare Parts
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSparePart}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Part
            </Button>
          </CardHeader>
          <CardContent>
            {spareParts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No spare parts added yet. Click "+ Add Part" to add required items.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_120px_32px] gap-2 text-[10px] text-slate-400 uppercase tracking-wide px-1">
                  <span>Item</span>
                  <span>Quantity</span>
                  <span />
                </div>
                {spareParts.map((part) => (
                  <div
                    key={part.id}
                    className="grid grid-cols-[1fr_120px_32px] gap-2 items-center"
                  >
                    <Select
                      value={part.itemId}
                      onValueChange={(v) => updateSparePart(part.id, 'itemId', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.item_code} — {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={part.quantity}
                      onChange={(e) => updateSparePart(part.id, 'quantity', e.target.value)}
                      placeholder="Qty"
                      min="1"
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-rose-500"
                      onClick={() => removeSparePart(part.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto Work Order Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-light text-slate-600">
              Auto Work Order Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="autoCreateWo"
                checked={form.autoCreateWo}
                onCheckedChange={(checked) => handleChange('autoCreateWo', checked)}
              />
              <Label htmlFor="autoCreateWo" className="cursor-pointer">
                Auto-generate Work Orders
              </Label>
            </div>

            {form.autoCreateWo && (
              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="autoWoDaysBefore">Generate WO (days before due date)</Label>
                <Input
                  id="autoWoDaysBefore"
                  type="number"
                  value={form.autoWoDaysBefore}
                  onChange={(e) => handleChange('autoWoDaysBefore', e.target.value)}
                  min="1"
                  placeholder="7"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
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
