import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  useAssetCategories,
  useCreateAssetCategory,
  useUpdateAssetCategory,
  useDeleteAssetCategory,
} from '@/hooks/useAssets'
import type { AssetCategory } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/assets/categories')({
  component: AssetCategoriesPage,
})

type CategoryFormState = {
  name: string
  code: string
  description: string
}

const EMPTY_FORM: CategoryFormState = { name: '', code: '', description: '' }

function AssetCategoriesPage() {
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<AssetCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM)

  const { data: categoriesData, isLoading } = useAssetCategories({ limit: 100 })
  const categories = categoriesData?.data ?? []

  const createCategory = useCreateAssetCategory()
  const updateCategory = useUpdateAssetCategory(editTarget?.id ?? '')
  const deleteCategory = useDeleteAssetCategory()

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(cat: AssetCategory) {
    setEditTarget(cat)
    setForm({ name: cat.name, code: cat.code, description: cat.description ?? '' })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and Code are required')
      return
    }

    try {
      if (editTarget) {
        await updateCategory.mutateAsync({
          name: form.name,
          code: form.code,
          description: form.description || undefined,
        })
        toast.success('Category updated')
      } else {
        await createCategory.mutateAsync({
          name: form.name,
          code: form.code,
          description: form.description || undefined,
        })
        toast.success('Category created')
      }
      closeForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save category')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteCategory.mutateAsync(deleteTarget.id)
      toast.success('Category deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setDeleteTarget(null)
    }
  }

  const isPending = createCategory.isPending || updateCategory.isPending

  return (
    <div className="space-y-3">
      <PageHeader
        title="Asset Categories"
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Code
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Name
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Description
                </TableHead>
                <TableHead className="text-center text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No categories yet</p>
                    <p className="text-sm text-slate-400 mt-1">Create the first category</p>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="font-mono text-xs text-slate-600">{cat.code}</TableCell>
                    <TableCell className="text-sm text-slate-700 font-light">{cat.name}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {cat.description ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          onClick={() => openEdit(cat)}
                          aria-label="Edit category"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                          aria-label="Delete category"
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

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Category' : 'Create Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. HVAC Equipment"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-code">
                Code <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="cat-code"
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. HVAC"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={isPending}
              >
                {isPending ? 'Saving...' : editTarget ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
