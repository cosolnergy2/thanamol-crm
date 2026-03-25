import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Plus,
  ShoppingCart,
  Clock,
  Truck,
  Search,
  Eye,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  usePurchaseOrders,
  useDeletePurchaseOrder,
  useIssuePurchaseOrder,
} from '@/hooks/usePurchaseOrders'
import type { POStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/procurement/orders/'
)({
  component: POListPage,
})

const STATUS_TABS: Array<{ label: string; value: POStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Issued', value: 'ISSUED' },
  { label: 'Partial', value: 'PARTIALLY_RECEIVED' },
  { label: 'Received', value: 'FULLY_RECEIVED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const STATUS_BADGE: Record<POStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  FULLY_RECEIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  CLOSED: 'bg-teal-100 text-teal-700',
}

function POListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<POStatus | 'all'>('all')

  const { data, isLoading } = usePurchaseOrders({
    search: search || undefined,
    status: activeTab === 'all' ? undefined : activeTab,
    limit: 50,
  })

  const deletePO = useDeletePurchaseOrder()
  const issuePO = useIssuePurchaseOrder()

  const orders = data?.data ?? []
  const total = data?.pagination.total ?? 0

  const issuedCount = orders.filter((p) => p.status === 'ISSUED').length
  const partialCount = orders.filter((p) => p.status === 'PARTIALLY_RECEIVED').length
  const totalValue = orders.reduce((sum, p) => sum + p.total, 0)

  function handleDelete(id: string, poNumber: string) {
    if (!confirm(`Delete PO ${poNumber}?`)) return
    deletePO.mutate(id)
  }

  function handleIssue(id: string) {
    if (!confirm('Issue this PO?')) return
    issuePO.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">ใบสั่งซื้อ — {total} total</p>
        </div>
        <Link to="/facility-management/procurement/orders/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            New PO
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Issued</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{issuedCount}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Partially Received</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{partialCount}</p>
              </div>
              <Truck className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Value</p>
                <p className="text-xl font-light text-slate-700 mt-1">
                  ฿{totalValue.toLocaleString()}
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search PO number or vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-1 border-b">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No purchase orders found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PR Ref</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
                    <TableCell>{po.vendor_name}</TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {po.purchase_request?.pr_number ?? '-'}
                    </TableCell>
                    <TableCell>
                      {po.delivery_date
                        ? new Date(po.delivery_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ฿{po.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[po.status]}>{po.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            navigate({
                              to: '/facility-management/procurement/orders/$poId',
                              params: { poId: po.id },
                            })
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {po.status === 'DRAFT' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleIssue(po.id)}
                              disabled={issuePO.isPending}
                              title="Issue PO"
                            >
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                              onClick={() => handleDelete(po.id, po.po_number)}
                              disabled={deletePO.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
