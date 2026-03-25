import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react'
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
import { useInventoryItems } from '@/hooks/useInventory'
import { useProjects } from '@/hooks/useProjects'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/'
)({
  component: InventoryListPage,
})

function InventoryListPage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const { data: inventoryData, isLoading } = useInventoryItems({
    search: search || undefined,
    projectId: projectId || undefined,
    lowStock: lowStockOnly || undefined,
  })
  const { data: projectsData } = useProjects({ limit: 100 })

  const items = inventoryData?.data ?? []
  const projects = projectsData?.data ?? []

  const totalItems = inventoryData?.pagination.total ?? 0
  const lowStockCount = items.filter(
    (item) => item.reorder_point !== null && item.current_stock <= item.reorder_point
  ).length
  const outOfStockCount = items.filter((item) => item.current_stock === 0).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extralight tracking-[0.2em] md:tracking-[0.3em] text-slate-600 uppercase">
            Inventory Management
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-extralight">
            Spare parts & supplies
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/facility-management/inventory/categories">
            <Button variant="outline" size="sm">
              Categories
            </Button>
          </Link>
          <Link to="/facility-management/inventory/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2" size="sm">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-extralight">Total Items</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{totalItems}</p>
              </div>
              <Package className="w-7 h-7 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-extralight">Low Stock</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{lowStockCount}</p>
              </div>
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-extralight">Out of Stock</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{outOfStockCount}</p>
              </div>
              <TrendingDown className="w-7 h-7 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-extralight">Reorder Alerts</p>
                <Link
                  to="/facility-management/inventory"
                  search={{ lowStock: 'true' }}
                >
                  <p className="text-2xl font-light text-red-600 mt-1 hover:underline cursor-pointer">
                    {lowStockCount}
                  </p>
                </Link>
              </div>
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={lowStockOnly ? 'default' : 'outline'}
              onClick={() => setLowStockOnly((v) => !v)}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              {lowStockOnly ? 'Showing Low Stock' : 'Show Low Stock Only'}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No inventory items found</p>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const isLowStock =
                    item.reorder_point !== null && item.current_stock <= item.reorder_point
                  return (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-slate-50 ${isLowStock ? 'bg-amber-50/50' : ''}`}
                    >
                      <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                      <TableCell>
                        <Link
                          to="/facility-management/inventory/$itemId"
                          params={{ itemId: item.id }}
                          className="font-medium text-sm text-indigo-600 hover:underline"
                        >
                          {item.name}
                        </Link>
                        {item.storage_location && (
                          <p className="text-xs text-slate-500">{item.storage_location}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.category?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-medium text-sm ${
                              isLowStock ? 'text-red-600' : 'text-slate-700'
                            }`}
                          >
                            {item.current_stock}
                          </span>
                          {item.unit_of_measure && (
                            <span className="text-xs text-slate-400">{item.unit_of_measure}</span>
                          )}
                          {isLowStock && (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {item.reorder_point ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.unit_cost != null
                          ? `฿${item.unit_cost.toLocaleString()}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
