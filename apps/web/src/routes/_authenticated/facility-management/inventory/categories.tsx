import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useInventoryCategories,
  useCreateInventoryCategory,
  useUpdateInventoryCategory,
  useDeleteInventoryCategory,
} from '@/hooks/useInventory'
import type { InventoryCategoryWithChildren } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/categories'
)({
  component: InventoryCategoriesPage,
})

function InventoryCategoriesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<InventoryCategoryWithChildren | null>(null)

  const { data, isLoading } = useInventoryCategories()
  const createCategory = useCreateInventoryCategory()
  const deleteCategory = useDeleteInventoryCategory()

  const categories = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Inventory Categories
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Organize inventory items by category
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/facility-management/inventory">
            <Button variant="outline" size="sm">
              Back to Inventory
            </Button>
          </Link>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2" size="sm">
                <Plus className="w-4 h-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Inventory Category</DialogTitle>
              </DialogHeader>
              <CategoryForm
                categories={categories}
                onSubmit={(data) => {
                  createCategory.mutate(data, {
                    onSuccess: () => setIsCreateOpen(false),
                  })
                }}
                isLoading={createCategory.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Sub-categories</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No categories yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium text-sm">{cat.name}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-500">{cat.code}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {cat.parent?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{cat._count.items}</TableCell>
                    <TableCell className="text-sm">{cat.children.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Dialog
                          open={editingCategory?.id === cat.id}
                          onOpenChange={(open) => !open && setEditingCategory(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingCategory(cat)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Category</DialogTitle>
                            </DialogHeader>
                            <EditCategoryFormWrapper
                              category={cat}
                              categories={categories.filter((c) => c.id !== cat.id)}
                              onClose={() => setEditingCategory(null)}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete category "${cat.name}"? This cannot be undone.`
                              )
                            ) {
                              deleteCategory.mutate(cat.id)
                            }
                          }}
                          disabled={deleteCategory.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

type CategoryFormData = {
  name: string
  code: string
  description?: string
  parentId?: string
}

function CategoryForm({
  categories,
  onSubmit,
  isLoading,
  initialValues,
}: {
  categories: InventoryCategoryWithChildren[]
  onSubmit: (data: CategoryFormData) => void
  isLoading: boolean
  initialValues?: Partial<CategoryFormData>
}) {
  const [form, setForm] = useState<CategoryFormData>({
    name: initialValues?.name ?? '',
    code: initialValues?.code ?? '',
    description: initialValues?.description ?? '',
    parentId: initialValues?.parentId ?? '',
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          ...form,
          description: form.description || undefined,
          parentId: form.parentId || undefined,
        })
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="cat-name">Name *</Label>
        <Input
          id="cat-name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. HVAC Equipment"
        />
      </div>
      <div>
        <Label htmlFor="cat-code">Code *</Label>
        <Input
          id="cat-code"
          required
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          placeholder="e.g. HVAC"
        />
      </div>
      <div>
        <Label htmlFor="cat-desc">Description</Label>
        <Input
          id="cat-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional description"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
          Save
        </Button>
      </div>
    </form>
  )
}

function EditCategoryFormWrapper({
  category,
  categories,
  onClose,
}: {
  category: InventoryCategoryWithChildren
  categories: InventoryCategoryWithChildren[]
  onClose: () => void
}) {
  const updateCategory = useUpdateInventoryCategory(category.id)

  return (
    <CategoryForm
      categories={categories}
      initialValues={{
        name: category.name,
        code: category.code,
        description: category.description ?? '',
        parentId: category.parent_id ?? '',
      }}
      onSubmit={(data) => {
        updateCategory.mutate(data, { onSuccess: onClose })
      }}
      isLoading={updateCategory.isPending}
    />
  )
}
