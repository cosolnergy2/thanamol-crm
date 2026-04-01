import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertTriangle, RefreshCw, ShoppingCart, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { PageHeader } from '@/components/PageHeader'
import { useReorderAlerts, useAutoReorder } from '@/hooks/useInventory'
import { useProjects } from '@/hooks/useProjects'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/reorder-alerts'
)({
  component: ReorderAlertsPage,
})

function ReorderAlertsPage() {
  const [projectId, setProjectId] = useState('')
  const [generatedPR, setGeneratedPR] = useState<{ pr_number: string; itemCount: number } | null>(
    null
  )

  const { data: alertsData, isLoading, refetch } = useReorderAlerts(projectId || undefined)
  const { data: projectsData } = useProjects({ limit: 100 })
  const autoReorderMutation = useAutoReorder()

  const items = alertsData?.data ?? []
  const projects = projectsData?.data ?? []

  function handleGeneratePR() {
    autoReorderMutation.mutate(
      { projectId: projectId || undefined },
      {
        onSuccess: (data) => {
          setGeneratedPR({ pr_number: data.pr.pr_number, itemCount: data.itemCount })
          refetch()
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reorder Alerts"
        subtitle="Items at or below reorder point requiring replenishment"
      />

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={projectId || 'all'} onValueChange={(v) => setProjectId(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleGeneratePR}
          disabled={items.length === 0 || autoReorderMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          size="sm"
        >
          <ShoppingCart className="w-4 h-4" />
          {autoReorderMutation.isPending ? 'Generating...' : `Generate PR (${items.length} items)`}
        </Button>
      </div>

      {generatedPR && (
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <p className="text-sm text-teal-700">
              Purchase Request{' '}
              <span className="font-medium">{generatedPR.pr_number}</span> created with{' '}
              {generatedPR.itemCount} item{generatedPR.itemCount !== 1 ? 's' : ''}.
            </p>
            <button
              className="ml-auto text-teal-600 hover:text-teal-800 text-xs"
              onClick={() => setGeneratedPR(null)}
            >
              Dismiss
            </button>
          </CardContent>
        </Card>
      )}

      {autoReorderMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-red-700">Failed to generate PR. Please try again.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {isLoading ? 'Loading...' : `${items.length} item${items.length !== 1 ? 's' : ''} need reorder`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400 font-light">Loading alerts...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-light">
                All inventory items are sufficiently stocked
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs text-right">Current Stock</TableHead>
                  <TableHead className="text-xs text-right">Reorder Point</TableHead>
                  <TableHead className="text-xs text-right">Reorder Qty</TableHead>
                  <TableHead className="text-xs">Unit</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isOutOfStock = item.current_stock === 0
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono text-slate-500">
                        {item.item_code}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {item.category?.name ?? '-'}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium text-red-600">
                        {item.current_stock}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-500">
                        {item.reorder_point ?? '-'}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-500">
                        {item.reorder_quantity ?? '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {item.unit_of_measure ?? '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
