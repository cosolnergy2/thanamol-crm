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
import type { AssetStatus } from '@thanamol/shared'

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

function AssetCreatePage() {
  const navigate = useNavigate()
  const createAsset = useCreateAsset()

  const [form, setForm] = useState({
    name: '',
    description: '',
    projectId: '',
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

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: categoriesData } = useAssetCategories({ limit: 100 })
  const categories = categoriesData?.data ?? []

  const { data: zonesData } = useZones({
    projectId: form.projectId,
  })
  const zones = zonesData?.data ?? []

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
        locationDetail: form.locationDetail || undefined,
        manufacturer: form.manufacturer || undefined,
        modelName: form.modelName || undefined,
        serialNumber: form.serialNumber || undefined,
        purchaseDate: form.purchaseDate || undefined,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        status: form.status,
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
                  placeholder="e.g. Room 101, Floor 2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-600">
                Technical Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={form.manufacturer}
                    onChange={(e) => handleChange('manufacturer', e.target.value)}
                    placeholder="Manufacturer"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modelName">Model</Label>
                  <Input
                    id="modelName"
                    value={form.modelName}
                    onChange={(e) => handleChange('modelName', e.target.value)}
                    placeholder="Model name"
                  />
                </div>
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
                    placeholder="0.00"
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
