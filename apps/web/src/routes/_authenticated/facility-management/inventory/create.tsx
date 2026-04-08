import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
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
import { FileUpload } from '@/components/FileUpload'
import { useCreateInventoryItem, useInventoryCategories } from '@/hooks/useInventory'
import { useProjects } from '@/hooks/useProjects'
import { useCompanies } from '@/hooks/useCompanies'
import { useVendors } from '@/hooks/useVendors'
import { UNITS_OF_MEASURE, INVENTORY_ITEM_TYPES } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/create'
)({
  component: InventoryCreatePage,
})

const ITEM_STATUS_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const EXTRA_INVENTORY_CATEGORIES = ['Officer', 'Other'] as const

function InventoryCreatePage() {
  const navigate = useNavigate()
  const createItem = useCreateInventoryItem()
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
    currentStock: '',
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

  const categories = categoriesData?.data ?? []
  const projects = projectsData?.data ?? []
  const companies = companiesData?.data ?? []
  const vendors = vendorsData?.data ?? []

  function buildSpecifications() {
    const base: Record<string, string> = {}
    if (form.vendorItemCode) base.vendorItemCode = form.vendorItemCode
    if (form.backupVendorId) base.backupVendorId = form.backupVendorId
    if (form.backupVendorItemCode) base.backupVendorItemCode = form.backupVendorItemCode
    if (form.specifications) base.notes = form.specifications
    return Object.keys(base).length > 0 ? base : undefined
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const specs = buildSpecifications()
    const photos = form.photoUrl ? [{ url: form.photoUrl }] : undefined

    createItem.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId && form.categoryId !== '__none__' ? form.categoryId : undefined,
        unitOfMeasure: form.unitOfMeasure || undefined,
        currentStock: form.currentStock ? Number(form.currentStock) : undefined,
        minimumStock: form.minimumStock ? Number(form.minimumStock) : undefined,
        maximumStock: form.maximumStock ? Number(form.maximumStock) : undefined,
        reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        reorderQuantity: form.reorderQuantity ? Number(form.reorderQuantity) : undefined,
        unitCost: form.unitCost ? Number(form.unitCost) : undefined,
        storageLocation: form.storageLocation || undefined,
        projectId: form.projectId && form.projectId !== '__none__' ? form.projectId : undefined,
        itemType: form.itemType || undefined,
        barcode: form.barcode || undefined,
        companyId: form.companyId && form.companyId !== '__none__' ? form.companyId : undefined,
        siteId: form.siteId && form.siteId !== '__none__' ? form.siteId : undefined,
        specifications: specs,
        vendorId: form.vendorId && form.vendorId !== '__none__' ? form.vendorId : undefined,
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
        photos,
      },
      {
        onSuccess: (data) => {
          navigate({
            to: '/facility-management/inventory/$itemId',
            params: { itemId: data.item.id },
          })
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/inventory' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Add Inventory Item
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Register a new spare part, consumable, tool, or equipment
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">ข้อมูลพื้นฐาน / Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="itemCode">Item Code (Auto-generated)</Label>
              <Input
                id="itemCode"
                value="Auto-generated on save"
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
              <Select
                value={form.siteId}
                onValueChange={(v) => setForm({ ...form, siteId: v })}
              >
                <SelectTrigger id="siteId">
                  <SelectValue placeholder="Select site (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No site</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="currentStock">Current Stock</Label>
              <Input
                id="currentStock"
                type="number"
                min="0"
                step="0.001"
                value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                placeholder="0"
              />
            </div>
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
              <FileUpload
                label="Photo"
                accept="image/*"
                value={form.photoUrl || undefined}
                onChange={(url) => setForm({ ...form, photoUrl: url ?? '' })}
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
            onClick={() => navigate({ to: '/facility-management/inventory' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createItem.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Save className="w-4 h-4" />
            Save Item
          </Button>
        </div>
      </form>
    </div>
  )
}
