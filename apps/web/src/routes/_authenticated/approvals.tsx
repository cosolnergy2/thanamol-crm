import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { FileText, FileSignature, Clock, User, Calendar, ArrowRight, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { PermissionGuard } from '@/components/PermissionGuard'
import {
  usePendingQuotations,
  useApproveQuotation,
  useRejectQuotation,
} from '@/hooks/useQuotations'
import {
  usePendingCommercialQuotations,
  useApproveCommercialQuotation,
  useRejectCommercialQuotation,
} from '@/hooks/useCommercialQuotations'
import type { PendingQuotation, PendingCommercialQuotation } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/approvals')({
  component: ApprovalsPage,
})

type RejectDialogState = {
  open: boolean
  type: 'quotation' | 'commercial' | null
  id: string
  reason: string
}

const EMPTY_REJECT_STATE: RejectDialogState = {
  open: false,
  type: null,
  id: '',
  reason: '',
}

function ApprovalsPage() {
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>(EMPTY_REJECT_STATE)

  const { data: quotationsData, isLoading: quotationsLoading } = usePendingQuotations()
  const { data: commercialData, isLoading: commercialLoading } =
    usePendingCommercialQuotations()

  const approveQuotation = useApproveQuotation()
  const rejectQuotation = useRejectQuotation()
  const approveCommercial = useApproveCommercialQuotation()
  const rejectCommercial = useRejectCommercialQuotation()

  const pendingQuotations: PendingQuotation[] = quotationsData?.data ?? []
  const pendingCommercial: PendingCommercialQuotation[] = commercialData?.data ?? []

  async function handleApproveQuotation(id: string) {
    try {
      await approveQuotation.mutateAsync(id)
      toast.success('Quotation approved')
    } catch {
      toast.error('Failed to approve quotation')
    }
  }

  async function handleApproveCommercial(id: string) {
    try {
      await approveCommercial.mutateAsync(id)
      toast.success('Commercial quotation approved')
    } catch {
      toast.error('Failed to approve commercial quotation')
    }
  }

  function openRejectDialog(type: 'quotation' | 'commercial', id: string) {
    setRejectDialog({ open: true, type, id, reason: '' })
  }

  async function handleRejectSubmit() {
    if (!rejectDialog.reason.trim()) {
      toast.error('Rejection reason is required')
      return
    }

    try {
      if (rejectDialog.type === 'quotation') {
        await rejectQuotation.mutateAsync({ id: rejectDialog.id, data: { reason: rejectDialog.reason } })
        toast.success('Quotation rejected')
      } else {
        await rejectCommercial.mutateAsync({ id: rejectDialog.id, data: { reason: rejectDialog.reason } })
        toast.success('Commercial quotation rejected')
      }
      setRejectDialog(EMPTY_REJECT_STATE)
    } catch {
      toast.error('Failed to reject')
    }
  }

  const isRejectPending = rejectQuotation.isPending || rejectCommercial.isPending

  return (
    <div className="space-y-3">
      <PageHeader title="รายการรออนุมัติ" />

      <Tabs defaultValue="quotations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quotations">
            <FileText className="w-4 h-4 mr-2" />
            ใบเสนอราคา
            {!quotationsLoading && (
              <span className="ml-1.5 text-[10px]">({pendingQuotations.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="commercial">
            <FileSignature className="w-4 h-4 mr-2" />
            Commercial Quotations
            {!commercialLoading && (
              <span className="ml-1.5 text-[10px]">({pendingCommercial.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotations" className="space-y-3 pt-3">
          {quotationsLoading ? (
            <QuotationSkeletons />
          ) : pendingQuotations.length === 0 ? (
            <EmptyState icon={<FileText className="w-12 h-12 text-slate-300" />} message="ไม่มีใบเสนอราคารออนุมัติ" />
          ) : (
            pendingQuotations.map((quotation) => (
              <QuotationCard
                key={quotation.id}
                quotation={quotation}
                onApprove={() => handleApproveQuotation(quotation.id)}
                onReject={() => openRejectDialog('quotation', quotation.id)}
                isApproving={approveQuotation.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="commercial" className="space-y-3 pt-3">
          {commercialLoading ? (
            <QuotationSkeletons />
          ) : pendingCommercial.length === 0 ? (
            <EmptyState icon={<FileSignature className="w-12 h-12 text-slate-300" />} message="ไม่มี Commercial Quotation รออนุมัติ" />
          ) : (
            pendingCommercial.map((quotation) => (
              <CommercialQuotationCard
                key={quotation.id}
                quotation={quotation}
                onApprove={() => handleApproveCommercial(quotation.id)}
                onReject={() => openRejectDialog('commercial', quotation.id)}
                isApproving={approveCommercial.isPending}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => !open && setRejectDialog(EMPTY_REJECT_STATE)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธรายการ</DialogTitle>
            <DialogDescription>กรุณาระบุเหตุผลในการปฏิเสธ</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">
              เหตุผล <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              rows={3}
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="ระบุเหตุผลในการปฏิเสธ..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog(EMPTY_REJECT_STATE)}
              disabled={isRejectPending}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={isRejectPending}
            >
              {isRejectPending ? 'กำลังบันทึก...' : 'ปฏิเสธ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type QuotationCardProps = {
  quotation: PendingQuotation
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
}

function QuotationCard({ quotation, onApprove, onReject, isApproving }: QuotationCardProps) {
  return (
    <Card className="hover:shadow-sm transition-shadow border border-slate-100 bg-white/90">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-light text-slate-800 tracking-wider">
                {quotation.quotation_number}
              </h3>
              <Badge className="bg-amber-100 text-amber-700 text-[9px] h-4 px-1.5 font-extralight">
                <Clock className="w-3 h-3 mr-0.5" />
                รออนุมัติ
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 font-extralight">
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{quotation.customer.name}</span>
              </div>
              {quotation.valid_until && (
                <div className="flex items-center gap-1.5 text-slate-600 font-extralight">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  {format(new Date(quotation.valid_until), 'dd MMM yyyy')}
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-[9px] text-slate-400 font-extralight">
                {quotation.project.name} •{' '}
                ฿{quotation.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <PermissionGuard
            permission="manage_contracts"
            fallback={
              <Button variant="outline" size="sm" className="h-8 text-[10px] font-extralight" disabled>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            }
          >
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 h-8 text-[10px] font-extralight"
                onClick={onApprove}
                disabled={isApproving}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                อนุมัติ
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 h-8 text-[10px] font-extralight"
                onClick={onReject}
                disabled={isApproving}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                ปฏิเสธ
              </Button>
            </div>
          </PermissionGuard>
        </div>
      </CardContent>
    </Card>
  )
}

type CommercialQuotationCardProps = {
  quotation: PendingCommercialQuotation
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
}

function CommercialQuotationCard({
  quotation,
  onApprove,
  onReject,
  isApproving,
}: CommercialQuotationCardProps) {
  return (
    <Card className="hover:shadow-sm transition-shadow border border-slate-100 bg-white/90">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-light text-slate-800 tracking-wider">
                {quotation.quotation_number}
              </h3>
              <Badge className="bg-amber-100 text-amber-700 text-[9px] h-4 px-1.5 font-extralight">
                <Clock className="w-3 h-3 mr-0.5" />
                รออนุมัติ
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 font-extralight">
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{quotation.customer.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 font-extralight">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                {format(new Date(quotation.created_at), 'dd MMM yyyy')}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-[9px] text-slate-400 font-extralight">
                {quotation.project.name} •{' '}
                ฿{quotation.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <PermissionGuard
            permission="manage_contracts"
            fallback={
              <Button variant="outline" size="sm" className="h-8 text-[10px] font-extralight" disabled>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            }
          >
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 h-8 text-[10px] font-extralight"
                onClick={onApprove}
                disabled={isApproving}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                อนุมัติ
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 h-8 text-[10px] font-extralight"
                onClick={onReject}
                disabled={isApproving}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                ปฏิเสธ
              </Button>
            </div>
          </PermissionGuard>
        </div>
      </CardContent>
    </Card>
  )
}

type EmptyStateProps = {
  icon: React.ReactNode
  message: string
}

function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <div className="flex flex-col items-center">
          {icon}
          <p className="text-slate-600 text-[11px] font-extralight mt-3">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function QuotationSkeletons() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-4 pb-4">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}
