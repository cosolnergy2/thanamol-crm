import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
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
import { useCreateFmsMeterReading } from '@/hooks/useMeters'
import { useProjects } from '@/hooks/useProjects'
import type { CreateFmsMeterReadingRequest, FmsMeterType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/meters/create')({
  component: MeterCreatePage,
})

const METER_TYPE_OPTIONS: { value: FmsMeterType; label: string }[] = [
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'WATER', label: 'Water' },
  { value: 'GAS', label: 'Gas' },
]

const UNIT_OPTIONS: Record<FmsMeterType, string> = {
  ELECTRICITY: 'kWh',
  WATER: 'm3',
  GAS: 'm3',
}

type MeterFormValues = {
  projectId: string
  meterType: FmsMeterType
  location: string
  readingDate: string
  value: string
  previousValue: string
  unit: string
  notes: string
}

const EMPTY_FORM: MeterFormValues = {
  projectId: '',
  meterType: 'ELECTRICITY',
  location: '',
  readingDate: new Date().toISOString().slice(0, 10),
  value: '',
  previousValue: '',
  unit: 'kWh',
  notes: '',
}

function MeterCreatePage() {
  const navigate = useNavigate()
  const createMutation = useCreateFmsMeterReading()
  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const [form, setForm] = useState<MeterFormValues>(EMPTY_FORM)

  function updateField(field: keyof MeterFormValues, value: string) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'meterType') {
        updated.unit = UNIT_OPTIONS[value as FmsMeterType]
      }
      return updated
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.projectId || !form.value || !form.readingDate) {
      toast.error('Project, reading date, and value are required.')
      return
    }

    const payload: CreateFmsMeterReadingRequest = {
      projectId: form.projectId,
      meterType: form.meterType,
      location: form.location || undefined,
      readingDate: form.readingDate,
      value: Number(form.value),
      previousValue: form.previousValue ? Number(form.previousValue) : undefined,
      unit: form.unit,
      notes: form.notes || undefined,
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Meter reading recorded')
        navigate({ to: '/facility-management/meters' })
      },
      onError: () => toast.error('Failed to record meter reading'),
    })
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/meters' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-semibold">New Meter Reading</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reading Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Project *</Label>
                <Select value={form.projectId} onValueChange={(v) => updateField('projectId', v)}>
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
                <Label>Meter Type *</Label>
                <Select
                  value={form.meterType}
                  onValueChange={(v) => updateField('meterType', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METER_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Reading Date *</Label>
                <Input
                  type="date"
                  value={form.readingDate}
                  onChange={(e) => updateField('readingDate', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="e.g. Building A, Floor 3"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Current Value *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => updateField('value', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Previous Value</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.previousValue}
                  onChange={(e) => updateField('previousValue', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => updateField('unit', e.target.value)}
                  placeholder="kWh, m3, etc."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={3}
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Saving...' : 'Save Reading'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: '/facility-management/meters' })}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
