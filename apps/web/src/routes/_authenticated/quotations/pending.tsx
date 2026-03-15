import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { FileText, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/PageHeader'
import { PermissionGuard } from '@/components/PermissionGuard'
import { usePendingQuotations, useApproveQuotation, useRejectQuotation } from '@/hooks/useQuotations'
import type { QuotationWithRelations } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/quotations/pending')({
  component: PendingApprovalPage,
})

function PendingApprovalPage() {
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithRelations | null>(null)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = usePendingQuotations()
  const approveQuotation = useApproveQuotation()
  const rejectQuotation = useRejectQuotation()

  const pendingQuotations = data?.data ?? []

  function openApproval(quotation: QuotationWithRelations) {
    setSelectedQuotation(quotation)
    setApprovalDialogOpen(true)
  }

  function openReject(quotation: QuotationWithRelations) {
    setSelectedQuotation(quotation)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  async function handleApprove() {
    if (!selectedQuotation) return
    try {
      await approveQuotation.mutateAsync(selectedQuotation.id)
      toast.success('Quotation approved')
      setApprovalDialogOpen(false)
      setSelectedQuotation(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve quotation')
    }
  }

  async function handleReject() {
    if (!selectedQuotation || !rejectReason.trim()) return
    try {
      await rejectQuotation.mutateAsync({
        id: selectedQuotation.id,
        data: { reason: rejectReason.trim() },
      })
      toast.success('Quotation rejected')
      setRejectDialogOpen(false)
      setSelectedQuotation(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject quotation')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pending Approval" />

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">Loading...</CardContent>
        </Card>
      ) : pendingQuotations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-900">No pending quotations</p>
            <p className="text-sm text-slate-600 mt-2">All quotations have been processed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingQuotations.map((quotation) => (
            <Card key={quotation.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="border-b bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-indigo-600" />
                    <div>
                      <CardTitle className="text-lg">{quotation.quotation_number}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {quotation.customer?.name ?? '—'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending Approval
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-slate-500">Date</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">
                      {format(new Date(quotation.created_at), 'd MMM yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Valid Until</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">
                      {quotation.valid_until
                        ? format(new Date(quotation.valid_until), 'd MMM yyyy')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Project</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">
                      {quotation.project?.name ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Grand Total</p>
                    <p className="text-lg font-bold text-indigo-600 mt-1">
                      ฿{quotation.grand_total.toLocaleString()}
                    </p>
                  </div>
                </div>

                {quotation.notes && (
                  <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <p className="text-sm font-medium text-indigo-900 mb-1">Notes:</p>
                    <p className="text-sm text-indigo-700">{quotation.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3">
                  <Link
                    to="/quotations/$quotationId"
                    params={{ quotationId: quotation.id }}
                  >
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      View Detail
                    </Button>
                  </Link>
                  <PermissionGuard permission="manage_contracts">
                    <Button
                      variant="outline"
                      className="text-rose-600 border-rose-300 hover:bg-rose-50"
                      onClick={() => openReject(quotation)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => openApproval(quotation)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </PermissionGuard>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Quotation</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this quotation?
            </DialogDescription>
          </DialogHeader>
          {selectedQuotation && (
            <div className="py-2">
              <p className="text-sm text-slate-600">
                Quotation: <strong>{selectedQuotation.quotation_number}</strong>
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Customer: <strong>{selectedQuotation.customer?.name}</strong>
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Grand Total: <strong>฿{selectedQuotation.grand_total.toLocaleString()}</strong>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialogOpen(false)
                setSelectedQuotation(null)
              }}
            >
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
          {selectedQuotation && (
            <div className="py-2 space-y-4">
              <p className="text-sm text-slate-600">
                Quotation: <strong>{selectedQuotation.quotation_number}</strong>
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Reason *</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide rejection reason..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectReason('')
                setSelectedQuotation(null)
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
