import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useAsset, useUpdateAsset, useAssetCategories } from '@/hooks/useAssets'
import { useZones } from '@/hooks/useZones'
import { useVendors } from '@/hooks/useVendors'
import type { AssetStatus } from '@thanamol/shared'
import {
  ASSET_SCOPE_TYPES,
  ASSET_CRITICALITIES,
  ASSET_CONDITION_SCORES,
  ASSET_LIFECYCLE_STATUSES,
} from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/assets/$assetId/edit')({
  component: AssetEditPage,
})

const ASSET_STATUSES: Array<{ value: AssetStatus; label: string }> = [
  { value: 'OPERATIONAL', label: 'Operational' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
  { value: 'DISPOSED', label: 'Disposed' },
  { value: 'IN_STORAGE', label: 'In Storage' },
]

function isoDateString(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new Date(value).toISOString().split('T')[0]
  } catch {
    return ''
  }
}

function extractNotes(specifications: Record<string, unknown> | null | undefined): string {
  if (!specifications || typeof specifications !== 'object') return ''
  return (specifications.notes as string) ?? ''
}

function AssetEditPage() {
  const { assetId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useAsset(assetId)
  const updateAsset = useUpdateAsset(assetId)

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'OPERATIONAL' as AssetStatus,
    categoryId: '',
    // Classification
    scopeType: '',
    criticality: '',
    lifecycleStatus: '',
    conditionScore: '',
    // Location
    zoneId: '',
    locationDetail: '',
    // Technical
    brand: '',
    manufacturer: '',
    modelName: '',
    serialNumber: '',
    supplierId: '',
    // Purchase & Warranty
    purchaseCost: '',
    purchaseDate: '',
    installDate: '',
    warrantyExpiry: '',
    // Additional
    specifications: '',
    notes: '',
    imageUrl: '',
  })

  const asset = data?.asset

  const { data: categoriesData } = useAssetCategories({ limit: 100 })
  const categories = categoriesData?.data ?? []

  const { data: zonesData } = useZones({ projectId: asset?.project_id ?? '' })
  const zones = zonesData?.data ?? []

  const { data: vendorsData } = useVendors({ limit: 100 })
  const vendors = vendorsData?.data ?? []

  useEffect(() => {
    if (!asset) return
    setForm({
      name: asset.name,
      description: asset.description ?? '',
      status: asset.status as AssetStatus,
      categoryId: asset.category_id ?? '',
      scopeType: asset.scope_type ?? '',
      criticality: asset.criticality ?? '',
      lifecycleStatus: asset.lifecycle_status ?? '',
      conditionScore: asset.condition_score != null ? String(asset.condition_score) : '',
      zoneId: asset.zone_id ?? '',
      locationDetail: asset.location_detail ?? '',
      brand: asset.brand ?? '',
      manufacturer: asset.manufacturer ?? '',
      modelName: asset.model_name ?? '',
      serialNumber: asset.serial_number ?? '',
      supplierId: asset.supplier_id ?? '',
      purchaseCost: asset.purchase_cost != null ? String(asset.purchase_cost) : '',
      purchaseDate: isoDateString(asset.purchase_date),
      installDate: isoDateString(asset.install_date),
      warrantyExpiry: isoDateString(asset.warranty_expiry),
      specifications: '',
      notes: extractNotes(asset.specifications as Record<string, unknown>),
      imageUrl: Array.isArray(asset.photos) && asset.photos.length > 0 ? asset.photos[0] : '',
    })
  }, [asset])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    const specificationsPayload: Record<string, unknown> = {}
    if (form.specifications.trim()) {
      specificationsPayload.specifications = form.specifications
    }
    if (form.notes.trim()) {
      specificationsPayload.notes = form.notes
    }

    try {
      await updateAsset.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        status: form.status,
        categoryId: form.categoryId && form.categoryId !== '__none__' ? form.categoryId : undefined,
        scopeType: form.scopeType || undefined,
        criticality: form.criticality || undefined,
        lifecycleStatus: form.lifecycleStatus || undefined,
        conditionScore: form.conditionScore ? Number(form.conditionScore) : undefined,
        zoneId: form.zoneId && form.zoneId !== '__none__' ? form.zoneId : undefined,
        locationDetail: form.locationDetail || undefined,
        brand: form.brand || undefined,
        manufacturer: form.manufacturer || undefined,
        modelName: form.modelName || undefined,
        serialNumber: form.serialNumber || undefined,
        supplierId: form.supplierId && form.supplierId !== '__none__' ? form.supplierId : undefined,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        installDate: form.installDate || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        specifications: Object.keys(specificationsPayload).length > 0 ? specificationsPayload : undefined,
        photos: form.imageUrl ? [form.imageUrl] : undefined,
      })
      toast.success('Asset updated')
      navigate({ to: `/facility-management/assets/${assetId}` })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update asset')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!asset) {
    return <p className="text-slate-600">Asset not found</p>
  }

  return (
    <div className="space-y-4">
      <PageHeader title={`Edit: ${asset.name}`} />

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
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => handleChange('categoryId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="criticality">Criticality</Label>
                  <Select
                    value={form.criticality}
                    onValueChange={(v) => handleChange('criticality', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select criticality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
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
                      <SelectItem value="__none__">None</SelectItem>
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
                    <SelectItem value="__none__">None</SelectItem>
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
              <CardTitle className="text-sm font-light text-slate-600">Ownership &amp; Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="scopeType">Scope Type</Label>
                <Select value={form.scopeType} onValueChange={(v) => handleChange('scopeType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {ASSET_SCOPE_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Project</Label>
                <Input value={asset.project.name} disabled className="bg-slate-50" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="zone">Zone</Label>
                <Select value={form.zoneId} onValueChange={(v) => handleChange('zoneId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No zone" />
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
                <Label htmlFor="supplierId">Supplier</Label>
                <Select
                  value={form.supplierId}
                  onValueChange={(v) => handleChange('supplierId', v)}
                >
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
            </CardContent>
          </Card>

          {/* Purchase & Warranty */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Purchase &amp; Warranty</CardTitle>
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
            onClick={() => navigate({ to: `/facility-management/assets/${assetId}` })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={updateAsset.isPending}
          >
            {updateAsset.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
