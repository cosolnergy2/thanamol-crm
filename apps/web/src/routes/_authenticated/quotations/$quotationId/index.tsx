import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowLeft,
  Edit,
  Printer,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  FileText,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import { PermissionGuard } from '@/components/PermissionGuard'
import {
  useQuotation,
  useUpdateQuotation,
  useApproveQuotation,
  useRejectQuotation,
} from '@/hooks/useQuotations'

export const Route = createFileRoute('/_authenticated/quotations/$quotationId/')({
  component: QuotationDetailPage,
})

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SENT: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
}

function QuotationDetailPage() {
  const { quotationId } = Route.useParams()
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading, isError } = useQuotation(quotationId)
  const updateQuotation = useUpdateQuotation()
  const approveQuotation = useApproveQuotation()
  const rejectQuotation = useRejectQuotation()

  const quotation = data?.quotation

  async function handleSubmitForApproval() {
    if (!quotation) return
    try {
      await updateQuotation.mutateAsync({ id: quotationId, data: { status: 'SENT' } })
      toast.success('Quotation submitted for approval')
      setSubmitDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit quotation')
    }
  }

  async function handleApprove() {
    try {
      await approveQuotation.mutateAsync(quotationId)
      toast.success('Quotation approved')
      setApproveDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve quotation')
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    try {
      await rejectQuotation.mutateAsync({
        id: quotationId,
        data: { reason: rejectReason.trim() },
      })
      toast.success('Quotation rejected')
      setRejectDialogOpen(false)
      setRejectReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject quotation')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !quotation) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600">Quotation not found</p>
        <Link to="/quotations">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotations
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={quotation.quotation_number}
        actions={
          <div className="flex gap-2">
            {quotation.status === 'DRAFT' && (
              <>
                <Link to="/quotations/$quotationId/edit" params={{ quotationId }}>
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button
                  onClick={() => setSubmitDialogOpen(true)}
                  disabled={updateQuotation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit for Approval
                </Button>
              </>
            )}
            <PermissionGuard permission="manage_contracts">
              {quotation.status === 'SENT' && (
                <>
                  <Button
                    variant="outline"
                    className="text-rose-600 border-rose-300 hover:bg-rose-50"
                    onClick={() => setRejectDialogOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setApproveDialogOpen(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
            </PermissionGuard>
            <Link to="/quotations/$quotationId/print" params={{ quotationId }}>
              <Button variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </Link>
          </div>
        }
      />

      {quotation.status === 'REJECTED' && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-rose-900">This quotation was rejected</p>
                {quotation.notes && (
                  <p className="text-sm text-rose-700 mt-1">{quotation.notes}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-slate-500">Created</p>
                <p className="font-medium text-slate-900 text-sm">
                  {format(new Date(quotation.created_at), 'd MMM yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-slate-500">Customer</p>
                <p className="font-medium text-slate-900 text-sm">
                  {quotation.customer?.name ?? '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <Badge
                variant="outline"
                className={`mt-1 ${STATUS_COLORS[quotation.status] ?? ''}`}
              >
                {quotation.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-slate-500">Valid Until</p>
              <p className="font-medium text-slate-900 text-sm mt-1">
                {quotation.valid_until
                  ? format(new Date(quotation.valid_until), 'd MMM yyyy')
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Description
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Qty
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Unit Price
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(quotation.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                    No items
                  </TableCell>
                </TableRow>
              ) : (
                quotation.items.map((item, index) => (
                  <TableRow key={index} className="border-slate-100">
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      ฿{item.unit_price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ฿{item.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>฿{quotation.total_amount.toLocaleString()}</span>
              </div>
              {quotation.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount</span>
                  <span>— ฿{quotation.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>VAT 7%</span>
                <span>฿{quotation.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900 border-t pt-2">
                <span>Grand Total</span>
                <span>฿{quotation.grand_total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {quotation.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{quotation.notes}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Approval</DialogTitle>
            <DialogDescription>
              This quotation will be submitted for approval. You cannot edit it until it is
              approved or rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-1 text-sm text-slate-600">
            <p>
              Quotation: <strong>{quotation.quotation_number}</strong>
            </p>
            <p>
              Customer: <strong>{quotation.customer?.name}</strong>
            </p>
            <p>
              Grand Total: <strong>฿{quotation.grand_total.toLocaleString()}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSubmitForApproval}
              disabled={updateQuotation.isPending}
            >
              {updateQuotation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Quotation</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this quotation?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={approveQuotation.isPending}
            >
              {approveQuotation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quotation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this quotation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-sm font-medium text-slate-700">Reason *</label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide rejection reason..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectQuotation.isPending}
            >
              {rejectQuotation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
