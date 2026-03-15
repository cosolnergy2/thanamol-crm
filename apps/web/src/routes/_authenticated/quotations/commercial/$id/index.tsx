import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Pencil, Printer, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PermissionGuard } from '@/components/PermissionGuard'
import {
  useCommercialQuotation,
  useApproveCommercialQuotation,
  useRejectCommercialQuotation,
} from '@/hooks/useCommercialQuotations'
import type { QuotationStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/quotations/commercial/$id/')({
  component: ViewCommercialQuotationPage,
})

const STATUS_STYLES: Record<QuotationStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  EXPIRED: 'bg-amber-50 text-amber-700 border-amber-200',
}

const STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return new Intl.NumberFormat('th-TH').format(amount)
}

function ViewCommercialQuotationPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useCommercialQuotation(id)
  const approveMutation = useApproveCommercialQuotation()
  const rejectMutation = useRejectCommercialQuotation()

  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const quotation = data?.quotation

  function handleApprove() {
    approveMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Quotation approved')
        setShowApproveDialog(false)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to approve quotation')
      },
    })
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    rejectMutation.mutate(
      { id, data: { reason: rejectReason.trim() } },
      {
        onSuccess: () => {
          toast.success('Quotation rejected')
          setShowRejectDialog(false)
          setRejectReason('')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to reject quotation')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <p className="text-slate-600 mb-4">Quotation not found</p>
        <Button variant="outline" onClick={() => navigate({ to: '/quotations/commercial' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </Button>
      </div>
    )
  }

  const isSent = quotation.status === 'SENT'
  const items = Array.isArray(quotation.items) ? quotation.items : []

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 mt-1"
            onClick={() => navigate({ to: '/quotations/commercial' })}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
                Quotation
              </h1>
              <Badge
                variant="outline"
                className={STATUS_STYLES[quotation.status as QuotationStatus]}
              >
                {STATUS_LABELS[quotation.status as QuotationStatus] ?? quotation.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">{quotation.quotation_number}</p>
            <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard permission="manage_contracts">
            {isSent && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-teal-300 text-teal-700 hover:bg-teal-50"
                  onClick={() => setShowApproveDialog(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 text-rose-700 hover:bg-rose-50"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </PermissionGuard>
          <Link to="/quotations/commercial/$id/edit" params={{ id }}>
            <Button variant="outline" size="sm">
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Link to="/quotations/commercial/$id/print" params={{ id }}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </Link>
        </div>
      </div>

      {/* Quotation info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light tracking-wider text-slate-700">
            Quotation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-0">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Quotation Number</p>
            <p className="font-bold text-indigo-600 text-lg mt-1">{quotation.quotation_number}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Created</p>
            <p className="font-medium mt-1">{formatDate(quotation.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Last Updated</p>
            <p className="font-medium mt-1">{formatDate(quotation.updated_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Customer & Project */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
              <p className="font-medium mt-1">{quotation.customer?.name ?? '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Phone</p>
                <p className="text-sm mt-1">{quotation.customer?.phone ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                <p className="text-sm mt-1">{quotation.customer?.email ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Project
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Project</p>
              <p className="font-medium mt-1">
                {quotation.project?.code} — {quotation.project?.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Amount</p>
              <p className="text-xl font-bold text-indigo-700 mt-1">
                ฿{formatCurrency(quotation.total_amount)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Line Items
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 text-slate-500 font-medium">Description</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium w-20">Qty</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium w-32">
                      Unit Price
                    </th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-2.5 px-2 text-slate-700">{item.description}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">
                        ฿{formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                        ฿{formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-3 px-2 text-right font-medium text-slate-700">
                      Total
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-indigo-700 text-base">
                      ฿{formatCurrency(quotation.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terms & Conditions */}
      {(quotation.terms || quotation.conditions) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-light tracking-wider text-slate-700">
              Terms &amp; Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {quotation.terms && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Terms</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{quotation.terms}</p>
              </div>
            )}
            {quotation.conditions && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Conditions</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{quotation.conditions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approve confirmation dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark quotation {quotation.quotation_number} as approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Approve'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting quotation {quotation.quotation_number}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-0 pb-2 space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Describe why this quotation is being rejected..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Reject'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
