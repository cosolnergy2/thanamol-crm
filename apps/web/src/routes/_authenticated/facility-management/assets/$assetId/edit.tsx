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
import type { AssetStatus } from '@thanamol/shared'

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

function AssetEditPage() {
  const { assetId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useAsset(assetId)
  const updateAsset = useUpdateAsset(assetId)

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    zoneId: '',
    locationDetail: '',
    manufacturer: '',
    modelName: '',
    serialNumber: '',
    purchaseDate: '',
    purchaseCost: '',
    warrantyExpiry: '',
    status: 'OPERATIONAL' as AssetStatus,
  })

  const asset = data?.asset

  const { data: categoriesData } = useAssetCategories({ limit: 100 })
  const categories = categoriesData?.data ?? []

  const { data: zonesData } = useZones({
    projectId: asset?.project_id ?? '',
  })
  const zones = zonesData?.data ?? []

  useEffect(() => {
    if (asset) {
      setForm({
        name: asset.name,
        description: asset.description ?? '',
        categoryId: asset.category_id ?? '',
        zoneId: asset.zone_id ?? '',
        locationDetail: asset.location_detail ?? '',
        manufacturer: asset.manufacturer ?? '',
        modelName: asset.model_name ?? '',
        serialNumber: asset.serial_number ?? '',
        purchaseDate: asset.purchase_date
          ? new Date(asset.purchase_date).toISOString().split('T')[0]
          : '',
        purchaseCost: asset.purchase_cost != null ? String(asset.purchase_cost) : '',
        warrantyExpiry: asset.warranty_expiry
          ? new Date(asset.warranty_expiry).toISOString().split('T')[0]
          : '',
        status: asset.status as AssetStatus,
      })
    }
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

    try {
      await updateAsset.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        zoneId: form.zoneId || undefined,
        locationDetail: form.locationDetail || undefined,
        manufacturer: form.manufacturer || undefined,
        modelName: form.modelName || undefined,
        serialNumber: form.serialNumber || undefined,
        purchaseDate: form.purchaseDate || undefined,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        status: form.status,
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
        <Skeleton className="h-64 w-full" />
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
                    <SelectItem value="__all__">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <SelectItem value="__all__">No zone</SelectItem>
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
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={form.manufacturer}
                    onChange={(e) => handleChange('manufacturer', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modelName">Model</Label>
                  <Input
                    id="modelName"
                    value={form.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={form.serialNumber}
                  onChange={(e) => handleChange('serialNumber', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">Purchase & Warranty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => handleChange('purchaseDate', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchaseCost">Purchase Cost</Label>
                  <Input
                    id="purchaseCost"
                    type="number"
                    value={form.purchaseCost}
                    onChange={(e) => handleChange('purchaseCost', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                <Input
                  id="warrantyExpiry"
                  type="date"
                  value={form.warrantyExpiry}
                  onChange={(e) => handleChange('warrantyExpiry', e.target.value)}
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
