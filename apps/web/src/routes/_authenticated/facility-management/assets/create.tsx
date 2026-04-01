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
import { useCreateAsset, useAssetCategories } from '@/hooks/useAssets'
import { useProjects } from '@/hooks/useProjects'
import { useZones } from '@/hooks/useZones'
import { useVendors } from '@/hooks/useVendors'
import type { AssetStatus } from '@thanamol/shared'
import {
  ASSET_SCOPE_TYPES,
  ASSET_CRITICALITIES,
  ASSET_CONDITION_SCORES,
  ASSET_LIFECYCLE_STATUSES,
} from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/assets/create')({
  component: AssetCreatePage,
})

const ASSET_STATUSES: Array<{ value: AssetStatus; label: string }> = [
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
  { value: 'DISPOSED', label: 'Disposed' },
  { value: 'IN_STORAGE', label: 'In Storage' },
]

const EXTRA_ASSET_CATEGORIES = ['Officer', 'Other'] as const

function AssetCreatePage() {
  const navigate = useNavigate()
  const createAsset = useCreateAsset()

  const [form, setForm] = useState({
    name: '',
    description: '',
    projectId: '',
    categoryId: '',
    zoneId: '',
    unitId: '',
    locationDetail: '',
    status: 'OPERATIONAL' as AssetStatus,
    // Ownership & classification
    scopeType: '',
    criticality: '',
    lifecycleStatus: '',
    conditionScore: '',
    // Technical details
    manufacturer: '',
    brand: '',
    modelName: '',
    serialNumber: '',
    supplierId: '',
    supplierPhone: '',
    purchaseCost: '',
    purchaseDate: '',
    installDate: '',
    warrantyExpiry: '',
    // Additional
    specifications: '',
    notes: '',
    imageUrl: '',
  })

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: categoriesData } = useAssetCategories({ limit: 100 })
  const categories = categoriesData?.data ?? []

  const { data: zonesData } = useZones({ projectId: form.projectId })
  const zones = zonesData?.data ?? []

  const { data: vendorsData } = useVendors({ limit: 100 })
  const vendors = vendorsData?.data ?? []

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!form.projectId) {
      toast.error('Project is required')
      return
    }

    try {
      await createAsset.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        projectId: form.projectId,
        categoryId: form.categoryId || undefined,
        zoneId: form.zoneId || undefined,
        unitId: form.unitId || undefined,
        locationDetail: form.locationDetail || undefined,
        status: form.status,
        scopeType: form.scopeType || undefined,
        criticality: form.criticality || undefined,
        lifecycleStatus: form.lifecycleStatus || undefined,
        conditionScore: form.conditionScore ? Number(form.conditionScore) : undefined,
        manufacturer: form.manufacturer || undefined,
        brand: form.brand || undefined,
        modelName: form.modelName || undefined,
        serialNumber: form.serialNumber || undefined,
        supplierId: form.supplierId || undefined,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        installDate: form.installDate || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        specifications: form.specifications
          ? { notes: form.specifications }
          : undefined,
        photos: form.imageUrl ? [form.imageUrl] : undefined,
      })
      toast.success('Asset created successfully')
      navigate({ to: '/facility-management/assets' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create asset')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Create Asset" />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Asset name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Description"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={form.categoryId} onValueChange={(v) => handleChange('categoryId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {EXTRA_ASSET_CATEGORIES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="criticality">Criticality</Label>
                  <Select value={form.criticality} onValueChange={(v) => handleChange('criticality', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select criticality" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CRITICALITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conditionScore">Condition Score</Label>
                  <Select
                    value={form.conditionScore}
                    onValueChange={(v) => handleChange('conditionScore', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CONDITION_SCORES.map((s) => (
                        <SelectItem key={s.value} value={String(s.value)}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lifecycleStatus">Lifecycle Status</Label>
                <Select
                  value={form.lifecycleStatus}
                  onValueChange={(v) => handleChange('lifecycleStatus', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lifecycle status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_LIFECYCLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ownership & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Ownership & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="scopeType">Scope Type</Label>
                <Select value={form.scopeType} onValueChange={(v) => handleChange('scopeType', v)}>
                  <SelectTrigger>
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
                <Label htmlFor="project">
                  Project <span className="text-rose-500">*</span>
                </Label>
                <Select value={form.projectId} onValueChange={(v) => handleChange('projectId', v)}>
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
                <Label htmlFor="zone">Zone</Label>
                <Select
                  value={form.zoneId}
                  onValueChange={(v) => handleChange('zoneId', v)}
                  disabled={!form.projectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No zone</SelectItem>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.code} — {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="locationDetail">Location Detail</Label>
                <Input
                  id="locationDetail"
                  value={form.locationDetail}
                  onChange={(e) => handleChange('locationDetail', e.target.value)}
                  placeholder="e.g. Room 101, Floor 2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={form.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    placeholder="Carrier, Daikin, Mitsubishi..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={form.manufacturer}
                    onChange={(e) => handleChange('manufacturer', e.target.value)}
                    placeholder="Manufacturer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="modelName">Model</Label>
                  <Input
                    id="modelName"
                    value={form.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    placeholder="Model name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={form.serialNumber}
                    onChange={(e) => handleChange('serialNumber', e.target.value)}
                    placeholder="Serial number"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supplierId">Supplier (Main)</Label>
                <Select value={form.supplierId} onValueChange={(v) => handleChange('supplierId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No supplier</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supplierPhone">Supplier Phone</Label>
                <Input
                  id="supplierPhone"
                  value={form.supplierPhone}
                  onChange={(e) => handleChange('supplierPhone', e.target.value)}
                  placeholder="Supplier phone number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Purchase & Warranty */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Purchase & Warranty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="purchaseCost">Purchase Price</Label>
                  <Input
                    id="purchaseCost"
                    type="number"
                    value={form.purchaseCost}
                    onChange={(e) => handleChange('purchaseCost', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => handleChange('purchaseDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="installDate">Install Date</Label>
                  <Input
                    id="installDate"
                    type="date"
                    value={form.installDate}
                    onChange={(e) => handleChange('installDate', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="warrantyExpiry">Warranty End Date</Label>
                  <Input
                    id="warrantyExpiry"
                    type="date"
                    value={form.warrantyExpiry}
                    onChange={(e) => handleChange('warrantyExpiry', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="specifications">Specifications</Label>
                  <Textarea
                    id="specifications"
                    value={form.specifications}
                    onChange={(e) => handleChange('specifications', e.target.value)}
                    placeholder="Technical specifications..."
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Additional notes..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="imageUrl">Asset Image URL</Label>
                <Input
                  id="imageUrl"
                  value={form.imageUrl}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/facility-management/assets' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={createAsset.isPending}
          >
            {createAsset.isPending ? 'Creating...' : 'Create Asset'}
          </Button>
        </div>
      </form>
    </div>
  )
}
