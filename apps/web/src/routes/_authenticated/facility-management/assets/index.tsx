import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Package, Search, Pencil, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useAssets, useDeleteAsset, useAssetCategories } from '@/hooks/useAssets'
import { useProjects } from '@/hooks/useProjects'
import type { AssetWithRelations, AssetStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/facility-management/assets/')({
  component: AssetListPage,
})

const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under Maintenance',
  OUT_OF_SERVICE: 'Out of Service',
  DISPOSED: 'Disposed',
  IN_STORAGE: 'In Storage',
}

const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  OPERATIONAL: 'bg-teal-50 text-teal-700 border-teal-200',
  UNDER_MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
  OUT_OF_SERVICE: 'bg-rose-50 text-rose-700 border-rose-200',
  DISPOSED: 'bg-slate-50 text-slate-600 border-slate-200',
  IN_STORAGE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

function AssetListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: categoriesData } = useAssetCategories({ limit: 100 })
  const categories = categoriesData?.data ?? []

  const { data: assetsData, isLoading, isError } = useAssets({
    projectId: projectId || undefined,
    categoryId: categoryId || undefined,
    status: status as AssetStatus || undefined,
    search: search || undefined,
  })

  const deleteAsset = useDeleteAsset()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteAsset.mutateAsync(deleteTarget.id)
      toast.success('Asset deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete asset')
    } finally {
      setDeleteTarget(null)
    }
  }

  const assets: AssetWithRelations[] = assetsData?.data ?? []
  const total = assetsData?.pagination.total ?? 0

  return (
    <div className="space-y-3">
      <PageHeader
        title="Assets"
        actions={
          <div className="flex gap-2">
            <Link to="/facility-management/assets/categories">
              <Button variant="outline" size="sm">
                Categories
              </Button>
            </Link>
            <Link to="/facility-management/assets/create">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {Object.entries(ASSET_STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-extralight">
              {total} asset{total !== 1 ? 's' : ''} found
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Asset #
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Name
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Category
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Project
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Serial #
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
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-slate-600">Failed to load assets.</p>
                  </TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No assets found</p>
                    <p className="text-sm text-slate-400 mt-1">Add the first asset to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="font-mono text-xs text-slate-600">
                      {asset.asset_number}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 font-light">{asset.name}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {asset.category?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{asset.project.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${ASSET_STATUS_COLORS[asset.status as AssetStatus] ?? ''}`}
                      >
                        {ASSET_STATUS_LABELS[asset.status as AssetStatus] ?? asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {asset.serial_number ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          onClick={() =>
                            navigate({ to: `/facility-management/assets/${asset.id}` })
                          }
                          aria-label="View asset"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          onClick={() =>
                            navigate({ to: `/facility-management/assets/${asset.id}/edit` })
                          }
                          aria-label="Edit asset"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          onClick={() => setDeleteTarget({ id: asset.id, name: asset.name })}
                          aria-label="Delete asset"
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

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteAsset.isPending}
            >
              {deleteAsset.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
