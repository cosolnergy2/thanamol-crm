import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Send, PackageCheck, XCircle, Lock, Pencil, ExternalLink } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  usePurchaseOrder,
  useIssuePurchaseOrder,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
} from '@/hooks/usePurchaseOrders'
import type { POStatus, POItem, POConditions } from '@thanamol/shared'

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

const STATUS_LABEL: Record<POStatus, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  PARTIALLY_RECEIVED: 'Partially Received',
  FULLY_RECEIVED: 'Fully Received',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-right">{value ?? '-'}</span>
    </div>
  )
}

function PODetailPage() {
  const { poId } = Route.useParams()
  const navigate = useNavigate()

  const { data, isLoading } = usePurchaseOrder(poId)
  const issuePO = useIssuePurchaseOrder()
  const receivePO = useReceivePurchaseOrder()
  const cancelPO = useCancelPurchaseOrder()
  const closePO = useClosePurchaseOrder()

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  if (isLoading) {
    return <div className="py-12 text-center text-slate-400">Loading...</div>
  }

  if (!data?.po) {
    return <div className="py-12 text-center text-slate-400">Purchase order not found</div>
  }

  const po = data.po
  const items = po.items as POItem[]
  const conditions = po.conditions as POConditions | null
  const documents = po.documents as string[] | null

  function handleIssue() {
    if (!confirm('Issue this PO to vendor?')) return
    issuePO.mutate(po.id)
  }

  function handleReceive(fullyReceived: boolean) {
    const label = fullyReceived ? 'fully received' : 'partially received'
    if (!confirm(`Mark this PO as ${label}?`)) return
    receivePO.mutate({ id: po.id, fullyReceived })
  }

  function handleClose() {
    if (!confirm('Close this PO?')) return
    closePO.mutate(po.id)
  }

  function openCancelDialog() {
    setCancelReason('')
    setCancelDialogOpen(true)
  }

  function handleCancelConfirm() {
    cancelPO.mutate(
      { id: po.id, reason: cancelReason || undefined },
      { onSuccess: () => setCancelDialogOpen(false) }
    )
  }

  const canEdit = po.status === 'DRAFT'
  const canCancel = !['FULLY_RECEIVED', 'CLOSED', 'CANCELLED'].includes(po.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate({ to: '/facility-management/procurement/orders' })}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
              {po.po_number}
            </h1>
            <Badge className={STATUS_BADGE[po.status]}>{STATUS_LABEL[po.status]}</Badge>
            {po.po_type && (
              <Badge variant="outline" className="text-indigo-700 border-indigo-300">
                {po.po_type}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{po.vendor_name}</p>
          {po.po_date && (
            <p className="text-xs text-slate-400 mt-0.5">
              PO Date: {new Date(po.po_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Workflow actions */}
      <div className="flex gap-2 justify-end flex-wrap">
        {canEdit && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              navigate({
                to: '/facility-management/procurement/orders/$poId/edit',
                params: { poId: po.id },
              })
            }
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
        )}
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
        {po.status === 'FULLY_RECEIVED' && (
          <Button
            className="bg-teal-600 hover:bg-teal-700 gap-2"
            onClick={handleClose}
            disabled={closePO.isPending}
          >
            <Lock className="w-4 h-4" />
            Close PO
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-50 gap-2"
            onClick={openCancelDialog}
            disabled={cancelPO.isPending}
          >
            <XCircle className="w-4 h-4" />
            Cancel PO
          </Button>
        )}
      </div>

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลทั่วไป / General Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <DetailRow label="PO Number" value={<span className="font-mono">{po.po_number}</span>} />
          <DetailRow label="Status" value={<Badge className={STATUS_BADGE[po.status]}>{STATUS_LABEL[po.status]}</Badge>} />
          <DetailRow label="PO Type" value={po.po_type} />
          <DetailRow label="Vendor" value={po.vendor_name} />
          <DetailRow
            label="PR Reference"
            value={
              po.purchase_request ? (
                <Link
                  to="/facility-management/procurement/requests/$prId"
                  params={{ prId: po.purchase_request.id }}
                  className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                  {po.purchase_request.pr_number}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : null
            }
          />
          <DetailRow
            label="Company"
            value={po.company_id ?? null}
          />
          <DetailRow
            label="Site / Project"
            value={po.project?.name ?? po.site_id ?? null}
          />
          <DetailRow
            label="Unit"
            value={po.unit_id ?? null}
          />
          <DetailRow
            label="PO Date"
            value={po.po_date ? new Date(po.po_date).toLocaleDateString() : null}
          />
          <DetailRow
            label="Payment Due Date"
            value={po.payment_due_date ? new Date(po.payment_due_date).toLocaleDateString() : null}
          />
          <DetailRow label="Payment Terms" value={po.payment_terms} />
          <DetailRow label="Delivery Address" value={po.delivery_address} />
          <DetailRow
            label="Delivery Date"
            value={po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : null}
          />
          <DetailRow
            label="Created By"
            value={`${po.creator.first_name} ${po.creator.last_name}`}
          />
          <DetailRow
            label="Created"
            value={new Date(po.created_at).toLocaleDateString()}
          />
        </CardContent>
      </Card>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการสินค้า / Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Buy/Rent</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Specification</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Budget Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="text-slate-400">{index + 1}</TableCell>
                  <TableCell>{item.item_type ?? '-'}</TableCell>
                  <TableCell className="capitalize">{item.buy_or_rent ?? '-'}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell className="text-slate-500 text-xs">{item.specification ?? '-'}</TableCell>
                  <TableCell>{item.supplier ?? '-'}</TableCell>
                  <TableCell>{item.unit_of_measure ?? '-'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono">
                    ฿{item.unit_price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ฿{item.total.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs">{item.budget_code ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="space-y-2 pt-4 border-t mt-4 text-sm max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono">฿{po.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">VAT (7%)</span>
              <span className="font-mono">฿{po.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-medium pt-2 border-t">
              <span>Total</span>
              <span className="font-mono">฿{po.total.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditions */}
      {Boolean(conditions) && (
        <Card>
          <CardHeader>
            <CardTitle>เงื่อนไข / Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <DetailRow
                label="VAT"
                value={conditions?.vat_enabled ? 'Yes (7%)' : 'No'}
              />
              <DetailRow
                label="WHT"
                value={
                  conditions?.wht_enabled
                    ? `Yes (${conditions.wht_rate ?? 3}%)`
                    : 'No'
                }
              />
              <DetailRow
                label="Retention"
                value={
                  conditions?.retention_enabled
                    ? `Yes (${conditions.retention_rate ?? 5}%)`
                    : 'No'
                }
              />
              <DetailRow label="Warranty" value={conditions?.warranty} />
              <DetailRow label="Credit Terms" value={conditions?.credit_terms} />
              <DetailRow label="Timeline" value={conditions?.timeline} />
              <DetailRow label="Late Penalty" value={conditions?.late_penalty} />
              <DetailRow label="Insurance" value={conditions?.insurance} />
            </div>

            {conditions?.payment_installments && conditions.payment_installments.length > 0 && (
              <div>
                <p className="font-medium text-slate-600 mb-2">Payment Installments</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conditions.payment_installments.map((inst, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{inst.label}</TableCell>
                        <TableCell className="text-right font-mono">
                          ฿{inst.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {inst.due_date ? new Date(inst.due_date).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes & Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {po.notes && (
          <Card>
            <CardHeader>
              <CardTitle>หมายเหตุ / Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{po.notes}</p>
            </CardContent>
          </Card>
        )}

        {documents && documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>เอกสาร / Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {url}
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancel with reason dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Are you sure you want to cancel <strong>{po.po_number}</strong>? This action cannot
              be undone.
            </p>
            <div>
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for cancellation"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep PO
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleCancelConfirm}
              disabled={cancelPO.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
