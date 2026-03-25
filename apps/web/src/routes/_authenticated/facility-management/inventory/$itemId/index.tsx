import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Package, TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useInventoryItem } from '@/hooks/useInventory'
import type { StockMovementType } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/inventory/$itemId/'
)({
  component: InventoryDetailPage,
})

const MOVEMENT_TYPE_CONFIG: Record<
  StockMovementType,
  { label: string; icon: typeof TrendingUp; className: string }
> = {
  RECEIVED: { label: 'Received', icon: TrendingUp, className: 'bg-emerald-100 text-emerald-700' },
  ISSUED: { label: 'Issued', icon: TrendingDown, className: 'bg-red-100 text-red-700' },
  RETURNED: { label: 'Returned', icon: TrendingUp, className: 'bg-teal-100 text-teal-700' },
  ADJUSTED: { label: 'Adjusted', icon: ArrowRightLeft, className: 'bg-indigo-100 text-indigo-700' },
  TRANSFERRED: { label: 'Transferred', icon: ArrowRightLeft, className: 'bg-amber-100 text-amber-700' },
}

function InventoryDetailPage() {
  const { itemId } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useInventoryItem(itemId)

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
        <Package className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500">Item not found</p>
        <Button variant="outline" onClick={() => navigate({ to: '/facility-management/inventory' })}>
          Back to Inventory
        </Button>
      </div>
    )
  }

  const item = data.item
  const movements = (item.stock_movements ?? []) as Array<{
    id: string
    movement_type: StockMovementType
    quantity: number
    reference_type: string | null
    reference_id: string | null
    notes: string | null
    created_at: string
    performer: { first_name: string; last_name: string } | null
  }>

  const isLowStock = item.reorder_point !== null && item.current_stock <= item.reorder_point

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              {item.name}
            </h1>
            {isLowStock && (
              <Badge className="bg-amber-100 text-amber-700 gap-1">
                <AlertTriangle className="w-3 h-3" />
                Low Stock
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1 font-mono">{item.item_code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 font-extralight">Current Stock</p>
            <p className={`text-3xl font-light mt-1 ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>
              {item.current_stock}
            </p>
            {item.unit_of_measure && (
              <p className="text-xs text-slate-400">{item.unit_of_measure}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 font-extralight">Reorder Point</p>
            <p className="text-3xl font-light text-slate-700 mt-1">
              {item.reorder_point ?? '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 font-extralight">Unit Cost</p>
            <p className="text-3xl font-light text-slate-700 mt-1">
              {item.unit_cost != null ? `฿${item.unit_cost.toLocaleString()}` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 font-extralight">Stock Value</p>
            <p className="text-3xl font-light text-slate-700 mt-1">
              {item.unit_cost != null
                ? `฿${(item.current_stock * item.unit_cost).toLocaleString()}`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Category" value={item.category?.name ?? '—'} />
            <DetailRow label="Project" value={item.project?.name ?? '—'} />
            <DetailRow label="Storage Location" value={item.storage_location ?? '—'} />
            <DetailRow label="Min Stock" value={item.minimum_stock?.toString() ?? '—'} />
            <DetailRow label="Max Stock" value={item.maximum_stock?.toString() ?? '—'} />
            <DetailRow label="Reorder Qty" value={item.reorder_quantity?.toString() ?? '—'} />
            <DetailRow label="Status" value={item.is_active ? 'Active' : 'Inactive'} />
            {item.description && (
              <div>
                <p className="text-xs text-slate-400 font-extralight">Description</p>
                <p className="text-sm text-slate-700 mt-0.5">{item.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/facility-management/inventory/stock-issues/create">
              <Button variant="outline" className="w-full justify-start gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Create Stock Issue
              </Button>
            </Link>
            <Link to="/facility-management/inventory/grn/create">
              <Button variant="outline" className="w-full justify-start gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Receive Goods (GRN)
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Stock Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    No stock movements recorded
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => {
                  const config = MOVEMENT_TYPE_CONFIG[movement.movement_type]
                  const Icon = config.icon
                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${config.className} gap-1`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.movement_type === 'ISSUED' ||
                        movement.movement_type === 'TRANSFERRED' ||
                        movement.movement_type === 'ADJUSTED'
                          ? `-${movement.quantity}`
                          : `+${movement.quantity}`}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {movement.reference_type ? `${movement.reference_type}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {movement.performer
                          ? `${movement.performer.first_name} ${movement.performer.last_name}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {movement.notes ?? '—'}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <p className="text-xs text-slate-400 font-extralight">{label}</p>
      <p className="text-sm text-slate-700 text-right">{value}</p>
    </div>
  )
}
