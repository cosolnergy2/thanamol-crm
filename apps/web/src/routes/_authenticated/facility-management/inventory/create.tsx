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
import { useCreateInventoryItem, useInventoryCategories } from '@/hooks/useInventory'
import { useProjects } from '@/hooks/useProjects'
import { UNITS_OF_MEASURE } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/create'
)({
  component: InventoryCreatePage,
})

function InventoryCreatePage() {
  const navigate = useNavigate()
  const createItem = useCreateInventoryItem()
  const { data: categoriesData } = useInventoryCategories()
  const { data: projectsData } = useProjects({ limit: 100 })

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    unitOfMeasure: '',
    minimumStock: '',
    maximumStock: '',
    reorderPoint: '',
    reorderQuantity: '',
    unitCost: '',
    storageLocation: '',
    projectId: '',
  })

  const categories = categoriesData?.data ?? []
  const projects = projectsData?.data ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createItem.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        unitOfMeasure: form.unitOfMeasure || undefined,
        minimumStock: form.minimumStock ? Number(form.minimumStock) : undefined,
        maximumStock: form.maximumStock ? Number(form.maximumStock) : undefined,
        reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
        reorderQuantity: form.reorderQuantity ? Number(form.reorderQuantity) : undefined,
        unitCost: form.unitCost ? Number(form.unitCost) : undefined,
        storageLocation: form.storageLocation || undefined,
        projectId: form.projectId || undefined,
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
            Register a new spare part or supply
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
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
                <SelectTrigger>
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
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Item specifications and description"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Stock Levels & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="minimumStock">Minimum Stock</Label>
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
              <Label htmlFor="maximumStock">Maximum Stock</Label>
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
              <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
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
              <Label htmlFor="unitCost">Unit Cost (฿)</Label>
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
            <CardTitle className="text-base font-medium">Location & Project</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storageLocation">Storage Location</Label>
              <Input
                id="storageLocation"
                value={form.storageLocation}
                onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
                placeholder="e.g. Shelf A-1, Warehouse B"
              />
            </div>
            <div>
              <Label htmlFor="projectId">Project</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
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
