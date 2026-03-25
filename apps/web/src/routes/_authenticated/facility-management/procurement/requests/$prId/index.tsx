import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, XCircle, ShoppingCart } from 'lucide-react'
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
  usePurchaseRequest,
  useApprovePurchaseRequest,
  useRejectPurchaseRequest,
  useConvertPRtoPO,
} from '@/hooks/usePurchaseRequests'
import { useAuth } from '@/providers/AuthProvider'
import type { PRStatus } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/procurement/requests/$prId/'
)({
  component: PRDetailPage,
})

const STATUS_BADGE: Record<PRStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  CONVERTED: 'bg-indigo-100 text-indigo-700',
}

function PRDetailPage() {
  const { prId } = Route.useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const { data, isLoading } = usePurchaseRequest(prId)
  const approvePR = useApprovePurchaseRequest()
  const rejectPR = useRejectPurchaseRequest()
  const convertPR = useConvertPRtoPO()

  if (isLoading) {
    return <div className="py-12 text-center text-slate-400">Loading...</div>
  }

  if (!data?.pr) {
    return <div className="py-12 text-center text-slate-400">Purchase request not found</div>
  }

  const pr = data.pr
  const items = pr.items as Array<{
    item_name: string
    quantity: number
    unit_of_measure?: string
    estimated_unit_price?: number
    total?: number
  }>

  function handleApprove() {
    if (!confirm('Approve this purchase request?')) return
    approvePR.mutate({ id: pr.id, approvedBy: currentUser?.id })
  }

  function handleReject() {
    const reason = prompt('Reason for rejection:')
    if (reason === null) return
    rejectPR.mutate({ id: pr.id, reason })
  }

  function handleConvert() {
    const vendorName = prompt('Vendor name (can be updated later):', 'TBD')
    if (vendorName === null) return
    convertPR.mutate(
      { id: pr.id, vendorName },
      {
        onSuccess: (result) => {
          const po = result.po as { id: string }
          navigate({
            to: '/facility-management/procurement/orders/$poId',
            params: { poId: po.id },
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
          onClick={() => navigate({ to: '/facility-management/procurement' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            {pr.pr_number}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{pr.title}</p>
        </div>
        <Badge className={STATUS_BADGE[pr.status]}>{pr.status}</Badge>
      </div>

      <div className="flex gap-2 justify-end">
        {pr.status === 'SUBMITTED' && (
          <>
            <Button
              variant="outline"
              className="text-green-700 border-green-300 hover:bg-green-50 gap-2"
              onClick={handleApprove}
              disabled={approvePR.isPending}
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              className="text-red-700 border-red-300 hover:bg-red-50 gap-2"
              onClick={handleReject}
              disabled={rejectPR.isPending}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
          </>
        )}
        {pr.status === 'APPROVED' && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            onClick={handleConvert}
            disabled={convertPR.isPending}
          >
            <ShoppingCart className="w-4 h-4" />
            Convert to PO
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
              <span className="text-slate-500">PR Number</span>
              <span className="font-mono">{pr.pr_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <Badge className={STATUS_BADGE[pr.status]}>{pr.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Priority</span>
              <span>{pr.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Requested By</span>
              <span>
                {pr.requester.first_name} {pr.requester.last_name}
              </span>
            </div>
            {pr.approver && (
              <div className="flex justify-between">
                <span className="text-slate-500">Approved By</span>
                <span>
                  {pr.approver.first_name} {pr.approver.last_name}
                </span>
              </div>
            )}
            {pr.project && (
              <div className="flex justify-between">
                <span className="text-slate-500">Project</span>
                <span>{pr.project.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span>{new Date(pr.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Items</span>
              <span>{items.length}</span>
            </div>
            <div className="flex justify-between text-lg font-medium pt-2 border-t">
              <span>Estimated Total</span>
              <span className="font-mono">฿{(pr.estimated_total ?? 0).toLocaleString()}</span>
            </div>
            {pr.notes && (
              <div className="pt-2">
                <p className="text-slate-500 mb-1">Notes</p>
                <p className="text-slate-700">{pr.notes}</p>
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
                <TableHead className="text-right">Est. Unit Price</TableHead>
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
                    ฿{(item.estimated_unit_price ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ฿{((item.quantity ?? 0) * (item.estimated_unit_price ?? 0)).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pr.vendor_quotations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Quotations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Selected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pr.vendor_quotations.map((vq) => (
                  <TableRow key={vq.id}>
                    <TableCell>{vq.quotation_number ?? '-'}</TableCell>
                    <TableCell>{vq.vendor_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      ฿{vq.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {vq.is_selected ? (
                        <Badge className="bg-green-100 text-green-700">Selected</Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {pr.purchase_orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pr.purchase_orders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono">{po.po_number}</TableCell>
                    <TableCell>{po.status}</TableCell>
                    <TableCell className="text-right font-mono">
                      ฿{po.total.toLocaleString()}
                    </TableCell>
                    <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Link
                        to="/facility-management/procurement/orders/$poId"
                        params={{ poId: po.id }}
                      >
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
