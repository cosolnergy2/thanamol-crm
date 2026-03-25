import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Send, PackageCheck, XCircle } from 'lucide-react'
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
import {
  usePurchaseOrder,
  useIssuePurchaseOrder,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
} from '@/hooks/usePurchaseOrders'
import type { POStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/procurement/orders/$poId/'
)({
  component: PODetailPage,
})

const STATUS_BADGE: Record<POStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  FULLY_RECEIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  CLOSED: 'bg-teal-100 text-teal-700',
}

function PODetailPage() {
  const { poId } = Route.useParams()
  const navigate = useNavigate()

  const { data, isLoading } = usePurchaseOrder(poId)
  const issuePO = useIssuePurchaseOrder()
  const receivePO = useReceivePurchaseOrder()
  const cancelPO = useCancelPurchaseOrder()

  if (isLoading) {
    return <div className="py-12 text-center text-slate-400">Loading...</div>
  }

  if (!data?.po) {
    return <div className="py-12 text-center text-slate-400">Purchase order not found</div>
  }

  const po = data.po
  const items = po.items as Array<{
    item_name: string
    quantity: number
    unit_of_measure?: string
    unit_price: number
    total: number
  }>

  function handleIssue() {
    if (!confirm('Issue this PO to vendor?')) return
    issuePO.mutate(po.id)
  }

  function handleReceive(fullyReceived: boolean) {
    const label = fullyReceived ? 'fully received' : 'partially received'
    if (!confirm(`Mark this PO as ${label}?`)) return
    receivePO.mutate({ id: po.id, fullyReceived })
  }

  function handleCancel() {
    if (!confirm('Cancel this PO?')) return
    cancelPO.mutate(po.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/procurement/orders' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            {po.po_number}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{po.vendor_name}</p>
        </div>
        <Badge className={STATUS_BADGE[po.status]}>{po.status}</Badge>
      </div>

      <div className="flex gap-2 justify-end">
        {po.status === 'DRAFT' && (
          <Button
            variant="outline"
            className="text-blue-700 border-blue-300 hover:bg-blue-50 gap-2"
            onClick={handleIssue}
            disabled={issuePO.isPending}
          >
            <Send className="w-4 h-4" />
            Issue PO
          </Button>
        )}
        {['ISSUED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleReceive(false)}
              disabled={receivePO.isPending}
            >
              <PackageCheck className="w-4 h-4" />
              Partially Received
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={() => handleReceive(true)}
              disabled={receivePO.isPending}
            >
              <PackageCheck className="w-4 h-4" />
              Fully Received
            </Button>
          </>
        )}
        {!['FULLY_RECEIVED', 'CLOSED', 'CANCELLED'].includes(po.status) && (
          <Button
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-50 gap-2"
            onClick={handleCancel}
            disabled={cancelPO.isPending}
          >
            <XCircle className="w-4 h-4" />
            Cancel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">PO Number</span>
              <span className="font-mono">{po.po_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <Badge className={STATUS_BADGE[po.status]}>{po.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vendor</span>
              <span>{po.vendor_name}</span>
            </div>
            {po.purchase_request && (
              <div className="flex justify-between">
                <span className="text-slate-500">PR Reference</span>
                <Link
                  to="/facility-management/procurement/requests/$prId"
                  params={{ prId: po.purchase_request.id }}
                  className="text-indigo-600 hover:underline"
                >
                  {po.purchase_request.pr_number}
                </Link>
              </div>
            )}
            {po.project && (
              <div className="flex justify-between">
                <span className="text-slate-500">Project</span>
                <span>{po.project.name}</span>
              </div>
            )}
            {po.delivery_date && (
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Date</span>
                <span>{new Date(po.delivery_date).toLocaleDateString()}</span>
              </div>
            )}
            {po.payment_terms && (
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Terms</span>
                <span>{po.payment_terms}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Created By</span>
              <span>
                {po.creator.first_name} {po.creator.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span>{new Date(po.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono">฿{po.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">VAT (7%)</span>
              <span className="font-mono">฿{po.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-medium pt-2 border-t">
              <span>Total</span>
              <span className="font-mono">฿{po.total.toLocaleString()}</span>
            </div>
            {po.notes && (
              <div className="pt-2">
                <p className="text-slate-500 mb-1">Notes</p>
                <p className="text-slate-700">{po.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-slate-400">{index + 1}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>{item.unit_of_measure ?? '-'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono">
                    ฿{item.unit_price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ฿{item.total.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
