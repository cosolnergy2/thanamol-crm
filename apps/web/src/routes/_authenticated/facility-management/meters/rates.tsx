import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  useUtilityRates,
  useCreateUtilityRate,
  useUpdateUtilityRate,
  useDeleteUtilityRate,
} from '@/hooks/useMeters'
import { useProjects } from '@/hooks/useProjects'
import type { CreateUtilityRateRequest, FmsMeterType, UtilityRate } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/meters/rates')({
  component: UtilityRatesPage,
})

const METER_TYPE_OPTIONS: { value: FmsMeterType; label: string }[] = [
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'WATER', label: 'Water' },
  { value: 'GAS', label: 'Gas' },
]

const METER_TYPE_COLORS: Record<FmsMeterType, string> = {
  ELECTRICITY: 'bg-amber-50 text-amber-700 border-amber-200',
  WATER: 'bg-teal-50 text-teal-700 border-teal-200',
  GAS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

type RateFormValues = {
  projectId: string
  meterType: FmsMeterType
  tierName: string
  minUsage: string
  maxUsage: string
  ratePerUnit: string
}

const EMPTY_FORM: RateFormValues = {
  projectId: '',
  meterType: 'ELECTRICITY',
  tierName: '',
  minUsage: '0',
  maxUsage: '',
  ratePerUnit: '',
}

function UtilityRatesPage() {
  const [projectId, setProjectId] = useState('')
  const [meterType, setMeterType] = useState<FmsMeterType | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<UtilityRate | null>(null)
  const [form, setForm] = useState<RateFormValues>(EMPTY_FORM)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data, isLoading, isError } = useUtilityRates({
    projectId: projectId || undefined,
    meterType: meterType !== 'all' ? meterType : undefined,
  })

  const createMutation = useCreateUtilityRate()
  const updateMutation = useUpdateUtilityRate()
  const deleteMutation = useDeleteUtilityRate()

  const rates = data?.data ?? []

  function openCreate() {
    setEditingRate(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(rate: UtilityRate) {
    setEditingRate(rate)
    setForm({
      projectId: rate.project_id,
      meterType: rate.meter_type,
      tierName: rate.tier_name,
      minUsage: String(rate.min_usage),
      maxUsage: rate.max_usage != null ? String(rate.max_usage) : '',
      ratePerUnit: String(rate.rate_per_unit),
    })
    setDialogOpen(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this utility rate?')) return
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Rate deleted'),
      onError: () => toast.error('Failed to delete rate'),
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.projectId || !form.tierName || !form.ratePerUnit) {
      toast.error('Project, tier name, and rate are required.')
      return
    }

    const payload: CreateUtilityRateRequest = {
      projectId: form.projectId,
      meterType: form.meterType,
      tierName: form.tierName,
      minUsage: Number(form.minUsage),
      maxUsage: form.maxUsage ? Number(form.maxUsage) : undefined,
      ratePerUnit: Number(form.ratePerUnit),
    }

    if (editingRate) {
      const { projectId: _skip, ...updatePayload } = payload
      updateMutation.mutate(
        { id: editingRate.id, data: updatePayload },
        {
          onSuccess: () => {
            toast.success('Rate updated')
            setDialogOpen(false)
          },
          onError: () => toast.error('Failed to update rate'),
        },
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Rate created')
          setDialogOpen(false)
        },
        onError: () => toast.error('Failed to create rate'),
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-3">
      <PageHeader
        title="Utility Rates"
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Rate
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select
              value={projectId || 'all'}
              onValueChange={(v) => setProjectId(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-full md:w-52">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={meterType}
              onValueChange={(v) => setMeterType(v as FmsMeterType | 'all')}
            >
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {METER_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-slate-500">Failed to load utility rates.</div>
          ) : rates.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No utility rates configured.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Tier Name</TableHead>
                  <TableHead className="text-right">Min Usage</TableHead>
                  <TableHead className="text-right">Max Usage</TableHead>
                  <TableHead className="text-right">Rate / Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>
                      <Badge className={`text-xs ${METER_TYPE_COLORS[rate.meter_type]}`} variant="outline">
                        {rate.meter_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{rate.tier_name}</TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {rate.min_usage.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {rate.max_usage != null ? rate.max_usage.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {rate.rate_per_unit.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(rate)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-600 hover:text-rose-700"
                          onClick={() => handleDelete(rate.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Utility Rate' : 'New Utility Rate'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Project *</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
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
              <Label>Meter Type *</Label>
              <Select
                value={form.meterType}
                onValueChange={(v) => setForm((f) => ({ ...f, meterType: v as FmsMeterType }))}
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
              <Label>Tier Name *</Label>
              <Input
                value={form.tierName}
                onChange={(e) => setForm((f) => ({ ...f, tierName: e.target.value }))}
                placeholder="e.g. Base Tier, Peak Tier"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Usage</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minUsage}
                  onChange={(e) => setForm((f) => ({ ...f, minUsage: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Usage</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maxUsage}
                  onChange={(e) => setForm((f) => ({ ...f, maxUsage: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Rate Per Unit *</Label>
              <Input
                type="number"
                min="0"
                step="0.0001"
                value={form.ratePerUnit}
                onChange={(e) => setForm((f) => ({ ...f, ratePerUnit: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={isPending}
              >
                {isPending ? 'Saving...' : editingRate ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
