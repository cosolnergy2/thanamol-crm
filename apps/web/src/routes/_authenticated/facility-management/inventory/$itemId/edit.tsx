import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
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
import { useInventoryItem, useUpdateInventoryItem, useInventoryCategories } from '@/hooks/useInventory'
import { useProjects } from '@/hooks/useProjects'
import { useCompanies } from '@/hooks/useCompanies'
import { useVendors } from '@/hooks/useVendors'
import { UNITS_OF_MEASURE, INVENTORY_ITEM_TYPES } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/$itemId/edit'
)({
  component: InventoryEditPage,
})

const ITEM_STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const EXTRA_INVENTORY_CATEGORIES = ['Officer', 'Other'] as const

function InventoryEditPage() {
  const { itemId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useInventoryItem(itemId)
  const updateItem = useUpdateInventoryItem(itemId)
  const { data: categoriesData } = useInventoryCategories()
  const { data: projectsData } = useProjects({ limit: 100 })
  const { data: companiesData } = useCompanies({ limit: 100 })
  const { data: vendorsData } = useVendors({ limit: 100 })

  const [form, setForm] = useState({
    name: '',
    itemType: '',
    categoryId: '',
    unitOfMeasure: '',
    barcode: '',
    companyId: '',
    projectId: '',
    siteId: '',
    storageLocation: '',
    reorderPoint: '',
    minimumStock: '',
    maximumStock: '',
    reorderQuantity: '',
    unitCost: '',
    vendorId: '',
    vendorItemCode: '',
    leadTimeDays: '',
    backupVendorId: '',
    backupVendorItemCode: '',
    specifications: '',
    description: '',
    photoUrl: '',
    isActive: 'true',
  })

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (data?.item && !initialized) {
      const item = data.item
      const specs = item.specifications as Record<string, string> | null | undefined
      const photos = item.photos as Array<{ url: string }> | null | undefined

      setForm({
        name: item.name ?? '',
        itemType: item.item_type ?? '',
        categoryId: item.category_id ?? '',
        unitOfMeasure: item.unit_of_measure ?? '',
        barcode: item.barcode ?? '',
        companyId: item.company_id ?? '',
        projectId: item.project_id ?? '',
        siteId: item.site_id ?? '',
        storageLocation: item.storage_location ?? '',
        reorderPoint: item.reorder_point?.toString() ?? '',
        minimumStock: item.minimum_stock?.toString() ?? '',
        maximumStock: item.maximum_stock?.toString() ?? '',
        reorderQuantity: item.reorder_quantity?.toString() ?? '',
        unitCost: item.unit_cost?.toString() ?? '',
        vendorId: item.vendor_id ?? '',
        vendorItemCode: specs?.vendorItemCode ?? '',
        leadTimeDays: item.lead_time_days?.toString() ?? '',
        backupVendorId: specs?.backupVendorId ?? '',
        backupVendorItemCode: specs?.backupVendorItemCode ?? '',
        specifications: specs?.notes ?? '',
        description: item.description ?? '',
        photoUrl: photos?.[0]?.url ?? '',
        isActive: item.is_active ? 'true' : 'false',
      })
      setInitialized(true)
    }
  }, [data, initialized])

  const categories = categoriesData?.data ?? []
  const projects = projectsData?.data ?? []
  const companies = companiesData?.data ?? []
  const vendors = vendorsData?.data ?? []

  function buildSpecifications() {
    const base: Record<string, string> = {}
    if (form.vendorItemCode) base.vendorItemCode = form.vendorItemCode
    if (form.backupVendorId && form.backupVendorId !== '__none__') base.backupVendorId = form.backupVendorId
    if (form.backupVendorItemCode) base.backupVendorItemCode = form.backupVendorItemCode
    if (form.specifications) base.notes = form.specifications
    return Object.keys(base).length > 0 ? base : undefined
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const specs = buildSpecifications()
    const photos = form.photoUrl ? [{ url: form.photoUrl }] : undefined

    updateItem.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId && form.categoryId !== '__none__' ? form.categoryId : undefined,
        unitOfMeasure: form.unitOfMeasure || undefined,
        minimumStock: form.minimumStock ? Number(form.minimumStock) : undefined,
        maximumStock: form.maximumStock ? Number(form.maximumStock) : undefined,
        reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        reorderQuantity: form.reorderQuantity ? Number(form.reorderQuantity) : undefined,
        unitCost: form.unitCost ? Number(form.unitCost) : undefined,
        storageLocation: form.storageLocation || undefined,
        projectId: form.projectId && form.projectId !== '__none__' ? form.projectId : undefined,
        isActive: form.isActive === 'true',
        itemType: form.itemType || undefined,
        barcode: form.barcode || undefined,
        companyId: form.companyId && form.companyId !== '__none__' ? form.companyId : undefined,
        siteId: form.siteId || undefined,
        specifications: specs,
        vendorId: form.vendorId && form.vendorId !== '__none__' ? form.vendorId : undefined,
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
        photos,
      },
      {
        onSuccess: () => {
          navigate({
            to: '/facility-management/inventory/$itemId',
            params: { itemId },
          })
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 font-extralight">Loading...</p>
      </div>
    )
  }

  if (!data?.item) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Item not found</p>
        <Button variant="outline" onClick={() => navigate({ to: '/facility-management/inventory' })}>
          Back to Inventory
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            navigate({
              to: '/facility-management/inventory/$itemId',
              params: { itemId },
            })
          }
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Edit Inventory Item
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">{data.item.item_code}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">ข้อมูลพื้นฐาน / Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="itemCode">Item Code</Label>
              <Input
                id="itemCode"
                value={data.item.item_code}
                readOnly
                disabled
                className="bg-slate-50 text-slate-400 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Air Filter 12x24"
              />
            </div>
            <div>
              <Label htmlFor="itemType">Type</Label>
              <Select
                value={form.itemType}
                onValueChange={(v) => setForm({ ...form, itemType: v })}
              >
                <SelectTrigger id="itemType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_ITEM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
              >
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  {EXTRA_INVENTORY_CATEGORIES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
              <Select
                value={form.unitOfMeasure}
                onValueChange={(v) => setForm({ ...form, unitOfMeasure: v })}
              >
                <SelectTrigger id="unitOfMeasure">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS_OF_MEASURE.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="e.g. 8850123456789"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">ความเป็นเจ้าของและที่เก็บ / Ownership & Storage</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyId">Company</Label>
              <Select
                value={form.companyId}
                onValueChange={(v) => setForm({ ...form, companyId: v })}
              >
                <SelectTrigger id="companyId">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No company</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="projectId">Project</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
              >
                <SelectTrigger id="projectId">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="siteId">Site</Label>
              <Input
                id="siteId"
                value={form.siteId}
                onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                placeholder="Site ID or name"
              />
            </div>
            <div>
              <Label htmlFor="storageLocation">Storage Location</Label>
              <Input
                id="storageLocation"
                value={form.storageLocation}
                onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
                placeholder="เช่น ชั้น A-1, โกดัง 3"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Stock และราคา / Stock & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                min="0"
                step="0.01"
                value={form.reorderPoint}
                onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="minimumStock">Min Stock</Label>
              <Input
                id="minimumStock"
                type="number"
                min="0"
                step="0.01"
                value={form.minimumStock}
                onChange={(e) => setForm({ ...form, minimumStock: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="maximumStock">Max Stock</Label>
              <Input
                id="maximumStock"
                type="number"
                min="0"
                step="0.01"
                value={form.maximumStock}
                onChange={(e) => setForm({ ...form, maximumStock: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="reorderQuantity">Recommended Order Qty</Label>
              <Input
                id="reorderQuantity"
                type="number"
                min="0"
                step="0.01"
                value={form.reorderQuantity}
                onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="unitCost">Unit Price (฿)</Label>
              <Input
                id="unitCost"
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Vendor & Lead Time</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vendorId">Primary Vendor</Label>
              <Select
                value={form.vendorId}
                onValueChange={(v) => setForm({ ...form, vendorId: v })}
              >
                <SelectTrigger id="vendorId">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No vendor</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="vendorItemCode">Vendor Item Code</Label>
              <Input
                id="vendorItemCode"
                value={form.vendorItemCode}
                onChange={(e) => setForm({ ...form, vendorItemCode: e.target.value })}
                placeholder="Vendor's part number"
              />
            </div>
            <div>
              <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="0"
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="backupVendorId">Backup Vendor</Label>
              <Select
                value={form.backupVendorId}
                onValueChange={(v) => setForm({ ...form, backupVendorId: v })}
              >
                <SelectTrigger id="backupVendorId">
                  <SelectValue placeholder="Select backup vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No backup vendor</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="backupVendorItemCode">Backup Vendor Item Code</Label>
              <Input
                id="backupVendorItemCode"
                value={form.backupVendorItemCode}
                onChange={(e) => setForm({ ...form, backupVendorItemCode: e.target.value })}
                placeholder="Backup vendor's part number"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">รายละเอียดเพิ่มเติม / Additional</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea
                id="specifications"
                value={form.specifications}
                onChange={(e) => setForm({ ...form, specifications: e.target.value })}
                rows={3}
                placeholder="Technical specifications, dimensions, part details"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Additional notes or remarks"
              />
            </div>
            <div>
              <Label htmlFor="photoUrl">Image URL</Label>
              <Input
                id="photoUrl"
                value={form.photoUrl}
                onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="isActive">Status</Label>
              <Select
                value={form.isActive}
                onValueChange={(v) => setForm({ ...form, isActive: v })}
              >
                <SelectTrigger id="isActive">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({
                to: '/facility-management/inventory/$itemId',
                params: { itemId },
              })
            }
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateItem.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
