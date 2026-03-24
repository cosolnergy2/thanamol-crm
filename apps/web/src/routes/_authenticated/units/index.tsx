import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Package, Edit, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUnits, useCreateUnit, useUpdateUnit } from '@/hooks/useUnits'
import { useProjects } from '@/hooks/useProjects'
import { LEASE_TYPES } from '@thanamol/shared'
import type { UnitWithProject, UnitStatus, CreateUnitRequest, UpdateUnitRequest } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/units/')({
  component: UnitListPage,
})

const UNIT_STATUSES: UnitStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD', 'RENTED', 'UNDER_MAINTENANCE']
const UNIT_TYPES = ['Warehouse', 'Commercial', 'Office', 'Other'] as const

const STATUS_CLASSES: Record<UnitStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-200',
  RENTED: 'bg-blue-100 text-blue-700 border-blue-200',
  SOLD: 'bg-purple-100 text-purple-700 border-purple-200',
  UNDER_MAINTENANCE: 'bg-slate-100 text-slate-700 border-slate-200',
}

const TYPE_CLASSES: Record<string, string> = {
  Warehouse: 'bg-indigo-100 text-indigo-700',
  Commercial: 'bg-purple-100 text-purple-700',
  Office: 'bg-pink-100 text-pink-700',
  Other: 'bg-slate-100 text-slate-700',
}

const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  RENTED: 'Rented',
  SOLD: 'Sold',
  UNDER_MAINTENANCE: 'Maintenance',
}

type UnitFormData = Partial<CreateUnitRequest & { id?: string }>

const EMPTY_FORM: UnitFormData = {
  projectId: '',
  unitNumber: '',
  type: 'Warehouse',
  status: 'AVAILABLE',
  hasSprinkler: false,
  commonFeeWaived: false,
  waterRateActual: false,
  electricityRateActual: false,
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium tracking-widest text-slate-500 uppercase border-b border-slate-100 pb-1">
        {title}
      </h3>
      {children}
    </div>
  )
}

function UnitFormDialog({
  open,
  onOpenChange,
  editingUnit,
  projects,
  allUnits,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingUnit: UnitWithProject | null
  projects: { id: string; name: string; code: string }[]
  allUnits: UnitWithProject[]
}) {
  const [formData, setFormData] = useState<UnitFormData>(
    editingUnit
      ? {
          projectId: editingUnit.project_id,
          unitNumber: editingUnit.unit_number,
          floor: editingUnit.floor ?? undefined,
          building: editingUnit.building ?? undefined,
          type: editingUnit.type,
          areaSqm: editingUnit.area_sqm ?? undefined,
          price: editingUnit.price ?? undefined,
          status: editingUnit.status,
          zone: editingUnit.zone ?? undefined,
          location: editingUnit.location ?? undefined,
          officeAreaSqm: editingUnit.office_area_sqm ?? undefined,
          floorLoad: editingUnit.floor_load ?? undefined,
          electricalLoad: editingUnit.electrical_load ?? undefined,
          ceilingHeight: editingUnit.ceiling_height ?? undefined,
          leaseType: editingUnit.lease_type ?? undefined,
          floorPlanUrl: editingUnit.floor_plan_url ?? undefined,
          hasSprinkler: editingUnit.has_sprinkler,
          rentPerSqm: editingUnit.rent_per_sqm ?? undefined,
          commonFee: editingUnit.common_fee ?? undefined,
          commonFeeWaived: editingUnit.common_fee_waived,
          waterRate: editingUnit.water_rate ?? undefined,
          waterRateActual: editingUnit.water_rate_actual,
          electricityRate: editingUnit.electricity_rate ?? undefined,
          electricityRateActual: editingUnit.electricity_rate_actual,
          depositMonths: editingUnit.deposit_months ?? undefined,
          advanceRentMonths: editingUnit.advance_rent_months ?? undefined,
        }
      : EMPTY_FORM,
  )

  const createUnit = useCreateUnit()
  const updateUnit = useUpdateUnit()

  const isPending = editingUnit ? updateUnit.isPending : createUnit.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingUnit) {
      const data: UpdateUnitRequest = {
        unitNumber: formData.unitNumber,
        floor: formData.floor,
        building: formData.building,
        type: formData.type,
        areaSqm: formData.areaSqm,
        price: formData.price,
        status: formData.status,
        zone: formData.zone,
        location: formData.location,
        officeAreaSqm: formData.officeAreaSqm,
        floorLoad: formData.floorLoad,
        electricalLoad: formData.electricalLoad,
        ceilingHeight: formData.ceilingHeight,
        leaseType: formData.leaseType,
        floorPlanUrl: formData.floorPlanUrl,
        hasSprinkler: formData.hasSprinkler,
        rentPerSqm: formData.rentPerSqm,
        commonFee: formData.commonFee,
        commonFeeWaived: formData.commonFeeWaived,
        waterRate: formData.waterRate,
        waterRateActual: formData.waterRateActual,
        electricityRate: formData.electricityRate,
        electricityRateActual: formData.electricityRateActual,
        depositMonths: formData.depositMonths,
        advanceRentMonths: formData.advanceRentMonths,
      }
      updateUnit.mutate({ id: editingUnit.id, data }, { onSuccess: () => onOpenChange(false) })
    } else {
      const data: CreateUnitRequest = {
        projectId: formData.projectId!,
        unitNumber: formData.unitNumber!,
        type: formData.type!,
        floor: formData.floor,
        building: formData.building,
        areaSqm: formData.areaSqm,
        price: formData.price,
        status: formData.status,
        zone: formData.zone,
        location: formData.location,
        officeAreaSqm: formData.officeAreaSqm,
        floorLoad: formData.floorLoad,
        electricalLoad: formData.electricalLoad,
        ceilingHeight: formData.ceilingHeight,
        leaseType: formData.leaseType,
        floorPlanUrl: formData.floorPlanUrl,
        hasSprinkler: formData.hasSprinkler,
        rentPerSqm: formData.rentPerSqm,
        commonFee: formData.commonFee,
        commonFeeWaived: formData.commonFeeWaived,
        waterRate: formData.waterRate,
        waterRateActual: formData.waterRateActual,
        electricityRate: formData.electricityRate,
        electricityRateActual: formData.electricityRateActual,
        depositMonths: formData.depositMonths,
        advanceRentMonths: formData.advanceRentMonths,
      }
      createUnit.mutate(data, { onSuccess: () => onOpenChange(false) })
    }
  }

  function field<K extends keyof UnitFormData>(key: K, value: UnitFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function numericField(key: keyof UnitFormData, raw: string, isInt = false) {
    if (!raw) {
      field(key, undefined)
      return
    }
    const n = isInt ? parseInt(raw, 10) : parseFloat(raw)
    if (!isNaN(n)) field(key, n as UnitFormData[typeof key])
  }

  const projectUnitsForParent = allUnits.filter(
    (u) => u.project_id === formData.projectId && u.id !== editingUnit?.id,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          <DialogDescription>
            {editingUnit ? 'Update unit details' : 'Fill in the unit details'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">

            <FormSection title="Basic Info">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project *</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(v) => field('projectId', v)}
                  disabled={Boolean(editingUnit)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitNumber">Unit Number *</Label>
                  <Input
                    id="unitNumber"
                    value={formData.unitNumber ?? ''}
                    onChange={(e) => field('unitNumber', e.target.value)}
                    placeholder="A-101"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(v) => field('type', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status ?? 'AVAILABLE'}
                    onValueChange={(v) => field('status', v as UnitStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {UNIT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={formData.floor ?? ''}
                    onChange={(e) => numericField('floor', e.target.value, true)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="building">Building</Label>
                  <Input
                    id="building"
                    value={formData.building ?? ''}
                    onChange={(e) => field('building', e.target.value || undefined)}
                    placeholder="Building A"
                  />
                </div>
              </div>

              {!editingUnit && formData.projectId && projectUnitsForParent.length > 0 && (
                <p className="text-xs text-slate-400 font-extralight">
                  {projectUnitsForParent.length} existing units in this project
                </p>
              )}
            </FormSection>

            <FormSection title="Location & Physical">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zone">Zone</Label>
                  <Input
                    id="zone"
                    value={formData.zone ?? ''}
                    onChange={(e) => field('zone', e.target.value || undefined)}
                    placeholder="Zone A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location ?? ''}
                    onChange={(e) => field('location', e.target.value || undefined)}
                    placeholder="North wing"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="areaSqm">Area (sqm)</Label>
                  <Input
                    id="areaSqm"
                    type="number"
                    value={formData.areaSqm ?? ''}
                    onChange={(e) => numericField('areaSqm', e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officeAreaSqm">Office Area (sqm)</Label>
                  <Input
                    id="officeAreaSqm"
                    type="number"
                    value={formData.officeAreaSqm ?? ''}
                    onChange={(e) => numericField('officeAreaSqm', e.target.value)}
                    placeholder="20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ceilingHeight">Ceiling Height (m)</Label>
                  <Input
                    id="ceilingHeight"
                    type="number"
                    value={formData.ceilingHeight ?? ''}
                    onChange={(e) => numericField('ceilingHeight', e.target.value)}
                    placeholder="5.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floorLoad">Floor Load</Label>
                  <Input
                    id="floorLoad"
                    value={formData.floorLoad ?? ''}
                    onChange={(e) => field('floorLoad', e.target.value || undefined)}
                    placeholder="1,000 kg/sqm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="electricalLoad">Electrical Load</Label>
                  <Input
                    id="electricalLoad"
                    value={formData.electricalLoad ?? ''}
                    onChange={(e) => field('electricalLoad', e.target.value || undefined)}
                    placeholder="30 kVA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseType">Lease Type</Label>
                  <Select
                    value={formData.leaseType ?? ''}
                    onValueChange={(v) => field('leaseType', v || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lease type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEASE_TYPES.map((lt) => (
                        <SelectItem key={lt} value={lt}>
                          {lt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="floorPlanUrl">Floor Plan URL</Label>
                <Input
                  id="floorPlanUrl"
                  value={formData.floorPlanUrl ?? ''}
                  onChange={(e) => field('floorPlanUrl', e.target.value || undefined)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasSprinkler"
                  checked={formData.hasSprinkler ?? false}
                  onCheckedChange={(checked) => field('hasSprinkler', Boolean(checked))}
                />
                <Label htmlFor="hasSprinkler" className="cursor-pointer font-normal">
                  Has Sprinkler
                </Label>
              </div>
            </FormSection>

            <FormSection title="Pricing">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (THB/month)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price ?? ''}
                    onChange={(e) => numericField('price', e.target.value)}
                    placeholder="50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentPerSqm">Rent per sqm (THB)</Label>
                  <Input
                    id="rentPerSqm"
                    type="number"
                    value={formData.rentPerSqm ?? ''}
                    onChange={(e) => numericField('rentPerSqm', e.target.value)}
                    placeholder="150"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commonFee">Common Fee (THB/month)</Label>
                  <Input
                    id="commonFee"
                    type="number"
                    value={formData.commonFee ?? ''}
                    onChange={(e) => numericField('commonFee', e.target.value)}
                    placeholder="2000"
                    disabled={formData.commonFeeWaived}
                    className={formData.commonFeeWaived ? 'opacity-40' : ''}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="commonFeeWaived"
                      checked={formData.commonFeeWaived ?? false}
                      onCheckedChange={(checked) => field('commonFeeWaived', Boolean(checked))}
                    />
                    <Label htmlFor="commonFeeWaived" className="cursor-pointer font-normal text-xs text-slate-500">
                      No charge
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waterRate">Water Rate (THB/unit)</Label>
                  <Input
                    id="waterRate"
                    type="number"
                    value={formData.waterRate ?? ''}
                    onChange={(e) => numericField('waterRate', e.target.value)}
                    placeholder="18"
                    disabled={formData.waterRateActual}
                    className={formData.waterRateActual ? 'opacity-40' : ''}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="waterRateActual"
                      checked={formData.waterRateActual ?? false}
                      onCheckedChange={(checked) => field('waterRateActual', Boolean(checked))}
                    />
                    <Label htmlFor="waterRateActual" className="cursor-pointer font-normal text-xs text-slate-500">
                      Pay actual
                    </Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="electricityRate">Electricity Rate (THB/unit)</Label>
                  <Input
                    id="electricityRate"
                    type="number"
                    value={formData.electricityRate ?? ''}
                    onChange={(e) => numericField('electricityRate', e.target.value)}
                    placeholder="4.5"
                    disabled={formData.electricityRateActual}
                    className={formData.electricityRateActual ? 'opacity-40' : ''}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="electricityRateActual"
                      checked={formData.electricityRateActual ?? false}
                      onCheckedChange={(checked) => field('electricityRateActual', Boolean(checked))}
                    />
                    <Label htmlFor="electricityRateActual" className="cursor-pointer font-normal text-xs text-slate-500">
                      Pay actual
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositMonths">Deposit (months)</Label>
                  <Input
                    id="depositMonths"
                    type="number"
                    value={formData.depositMonths ?? ''}
                    onChange={(e) => numericField('depositMonths', e.target.value, true)}
                    placeholder="2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="advanceRentMonths">Advance Rent (months)</Label>
                  <Input
                    id="advanceRentMonths"
                    type="number"
                    value={formData.advanceRentMonths ?? ''}
                    onChange={(e) => numericField('advanceRentMonths', e.target.value, true)}
                    placeholder="1"
                  />
                </div>
              </div>
            </FormSection>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isPending}
            >
              {isPending ? 'Saving...' : editingUnit ? 'Save Changes' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UnitCardSkeleton() {
  return (
    <Card className="border border-slate-100">
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-1.5 mt-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  )
}

function UnitListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<UnitWithProject | null>(null)

  const filters = {
    ...(projectFilter !== 'all' && { projectId: projectFilter }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(typeFilter !== 'all' && { type: typeFilter }),
    ...(search && { search }),
    page,
    limit: 20,
  }

  const { data, isLoading, isError } = useUnits(filters)
  const { data: projectsData } = useProjects({ limit: 100 })

  const units = data?.data ?? []
  const pagination = data?.pagination
  const projects = projectsData?.data ?? []

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => {
      setter(v)
      setPage(1)
    }
  }

  function openAddDialog() {
    setEditingUnit(null)
    setDialogOpen(true)
  }

  function openEditDialog(unit: UnitWithProject) {
    setEditingUnit(unit)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Units
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
        </div>
        <Button onClick={openAddDialog} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Unit
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search unit number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Select value={projectFilter} onValueChange={handleFilterChange(setProjectFilter)}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={handleFilterChange(setTypeFilter)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {UNIT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {UNIT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {UNIT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load units. Please refresh the page or try again.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <UnitCardSkeleton key={i} />)
        ) : units.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-extralight">No units found</p>
          </div>
        ) : (
          units.map((unit) => (
            <Card
              key={unit.id}
              className="hover:shadow-sm transition-shadow border border-slate-100 bg-white/90"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-light tracking-wider text-slate-700">
                      {unit.unit_number}
                    </CardTitle>
                    <p className="text-[10px] text-slate-400 font-extralight mt-0.5">
                      <Building2 className="inline w-3 h-3 mr-1" />
                      {unit.project.code} — {unit.project.name}
                    </p>
                    <div className="flex items-center mt-1.5 space-x-1.5">
                      <Badge
                        variant="outline"
                        className={`${TYPE_CLASSES[unit.type] ?? TYPE_CLASSES.Other} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {unit.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${STATUS_CLASSES[unit.status]} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {UNIT_STATUS_LABELS[unit.status]}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(unit)}
                    className="text-indigo-600 hover:bg-indigo-50 h-7 w-7"
                    aria-label="Edit unit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-0">
                {unit.building && (
                  <p className="text-[11px] text-slate-600 font-extralight">{unit.building}</p>
                )}
                {unit.floor !== null && (
                  <p className="text-[11px] text-slate-600 font-extralight">Floor {unit.floor}</p>
                )}
                {unit.area_sqm !== null && (
                  <p className="text-[11px] text-slate-600 font-extralight">
                    {unit.area_sqm} sqm
                  </p>
                )}
                {unit.price !== null && (
                  <p className="text-[11px] font-light text-slate-800">
                    ฿{unit.price.toLocaleString()}/mo
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400 font-extralight">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <UnitFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingUnit(null)
        }}
        editingUnit={editingUnit}
        projects={projects.map((p) => ({ id: p.id, name: p.name, code: p.code }))}
        allUnits={units}
      />
    </div>
  )
}
