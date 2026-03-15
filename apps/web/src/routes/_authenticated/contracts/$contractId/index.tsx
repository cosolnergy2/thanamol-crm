import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  FileText,
  Printer,
  Edit,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  useContractById,
  useApproveContract,
  useRejectContract,
  useUpdateContract,
} from '@/hooks/useContracts'

export const Route = createFileRoute('/_authenticated/contracts/$contractId/')({
  component: ContractDetailPage,
})

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-100 text-blue-700 border-blue-200',
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
  TERMINATED: 'bg-rose-100 text-rose-700 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Sale',
  LEASE: 'Lease',
  RENTAL: 'Rental',
}

function ContractDetailPage() {
  const { contractId } = Route.useParams()
  const navigate = useNavigate()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')

  const { data, isLoading, isError } = useContractById(contractId)
  const contract = data?.contract

  const approveContract = useApproveContract()
  const rejectContract = useRejectContract()
  const updateContract = useUpdateContract()

  async function handleSubmitForApproval() {
    try {
      await updateContract.mutateAsync({ id: contractId, data: { status: 'PENDING_APPROVAL' } })
      toast.success('Contract submitted for approval')
      setSubmitOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit contract')
    }
  }

  async function handleApprove() {
    try {
      await approveContract.mutateAsync(contractId)
      toast.success('Contract approved')
      setApproveOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve contract')
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setRejectError('Rejection reason is required')
      return
    }
    setRejectError('')
    try {
      await rejectContract.mutateAsync({ id: contractId, data: { reason: rejectReason } })
      toast.success('Contract rejected')
      setRejectOpen(false)
      setRejectReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject contract')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (isError || !contract) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Contract not found.</p>
        <Link to="/contracts">
          <Button variant="outline" className="mt-4">
            Back to Contracts
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-5xl">
      <PageHeader
        title={contract.contract_number}
        actions={
          <div className="flex gap-2">
            {contract.status === 'DRAFT' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubmitOpen(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit for Approval
                </Button>
                <Link to="/contracts/$contractId/edit" params={{ contractId }}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </>
            )}
            {contract.status === 'PENDING_APPROVAL' && (
              <PermissionGuard permission="manage_contracts">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setApproveOpen(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </PermissionGuard>
            )}
            <Link to="/contracts/$contractId/print" params={{ contractId }}>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </Link>
            <Link to="/contracts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Start Date
            </p>
            <div className="flex items-center text-sm font-light text-slate-700">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              {format(new Date(contract.start_date), 'd MMM yyyy')}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              End Date
            </p>
            <div className="flex items-center text-sm font-light text-slate-700">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              {contract.end_date ? format(new Date(contract.end_date), 'd MMM yyyy') : '—'}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Status
            </p>
            <Badge
              variant="outline"
              className={`${STATUS_COLORS[contract.status] ?? ''} text-[10px] font-light`}
            >
              {contract.status.replace('_', ' ')}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border border-slate-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase mb-1">
              Type
            </p>
            <span className="text-sm font-light text-slate-700">
              {TYPE_LABELS[contract.type] ?? contract.type}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-light tracking-wider text-slate-700">
            <FileText className="w-4 h-4 mr-2 text-indigo-600" />
            Contract Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Customer</Label>
              <p className="text-sm font-light text-slate-800 mt-1">
                {contract.customer?.name ?? '—'}
              </p>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Project</Label>
              <p className="text-sm font-light text-slate-800 mt-1">
                {contract.project?.name ?? '—'}
              </p>
            </div>
            {contract.unit && (
              <div>
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Unit</Label>
                <p className="text-sm font-light text-slate-800 mt-1">
                  {contract.unit.unit_number}
                  {contract.unit.floor ? ` — Floor ${contract.unit.floor}` : ''}
                </p>
              </div>
            )}
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Contract Value</Label>
              <p className="text-sm font-light text-slate-800 mt-1">
                ฿{contract.value?.toLocaleString() ?? '—'}
              </p>
            </div>
            {contract.monthly_rent && (
              <div>
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Monthly Rent</Label>
                <p className="text-sm font-light text-slate-800 mt-1">
                  ฿{contract.monthly_rent.toLocaleString()}
                </p>
              </div>
            )}
            {contract.deposit_amount && (
              <div>
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Deposit</Label>
                <p className="text-sm font-light text-slate-800 mt-1">
                  ฿{contract.deposit_amount.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {contract.terms && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Terms &amp; Conditions</Label>
              <p className="text-sm font-light text-slate-700 mt-1 whitespace-pre-wrap">{contract.terms}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Created By</Label>
              <p className="font-light text-slate-700 mt-1">
                {contract.creator
                  ? `${contract.creator.first_name} ${contract.creator.last_name}`
                  : '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {format(new Date(contract.created_at), 'd MMM yyyy HH:mm')}
              </p>
            </div>
            {contract.approver && (
              <div>
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
                  {contract.status === 'APPROVED' || contract.status === 'ACTIVE' ? 'Approved By' : 'Reviewed By'}
                </Label>
                <p className="font-light text-slate-700 mt-1">
                  {contract.approver.first_name} {contract.approver.last_name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit for Approval</DialogTitle>
            <DialogDescription>
              Submit <strong>{contract.contract_number}</strong> for manager approval?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSubmitForApproval}
              disabled={updateContract.isPending}
            >
              {updateContract.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Contract</DialogTitle>
            <DialogDescription>
              Approve <strong>{contract.contract_number}</strong>? This will activate the contract.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={approveContract.isPending}
            >
              {approveContract.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Contract</DialogTitle>
            <DialogDescription>
              Reject <strong>{contract.contract_number}</strong>? Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              rows={3}
              className={rejectError ? 'border-rose-500' : ''}
            />
            {rejectError && (
              <p className="text-[11px] text-rose-600 mt-1">{rejectError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectContract.isPending}
            >
              {rejectContract.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
