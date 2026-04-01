import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ArrowRight,
  FileText,
  ShoppingCart,
  DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  usePendingApprovalRequests,
  useApproveRequest,
  useRejectRequest,
} from '@/hooks/useApprovals'
import type { ApprovalRequest } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/approvals/'
)({
  component: ApprovalCenterPage,
})

const ENTITY_TYPE_LABELS: Record<string, string> = {
  PR: 'Purchase Request',
  PO: 'Purchase Order',
  BUDGET: 'Budget',
}

const ENTITY_TYPE_ICONS: Record<string, React.ElementType> = {
  PR: FileText,
  PO: ShoppingCart,
  BUDGET: DollarSign,
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  PR: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PO: 'bg-amber-50 text-amber-700 border-amber-200',
  BUDGET: 'bg-violet-50 text-violet-700 border-violet-200',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const CURRENT_USER_ID_PLACEHOLDER = 'system'

type ActionDialogState =
  | { type: 'approve'; request: ApprovalRequest }
  | { type: 'reject'; request: ApprovalRequest }
  | null

function ApprovalCenterPage() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [actionDialog, setActionDialog] = useState<ActionDialogState>(null)
  const [notes, setNotes] = useState('')

  const { data, isLoading } = usePendingApprovalRequests({
    entityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
    limit: 50,
  })

  const approveRequest = useApproveRequest()
  const rejectRequest = useRejectRequest()

  const requests = data?.data ?? []
  const total = data?.pagination.total ?? 0

  function openApprove(request: ApprovalRequest) {
    setNotes('')
    setActionDialog({ type: 'approve', request })
  }

  function openReject(request: ApprovalRequest) {
    setNotes('')
    setActionDialog({ type: 'reject', request })
  }

  function closeDialog() {
    setActionDialog(null)
    setNotes('')
  }

  function handleApprove() {
    if (!actionDialog || actionDialog.type !== 'approve') return
    approveRequest.mutate(
      { id: actionDialog.request.id, userId: CURRENT_USER_ID_PLACEHOLDER, notes: notes || undefined },
      { onSuccess: closeDialog }
    )
  }

  function handleReject() {
    if (!actionDialog || actionDialog.type !== 'reject') return
    if (!notes.trim()) return
    rejectRequest.mutate(
      { id: actionDialog.request.id, userId: CURRENT_USER_ID_PLACEHOLDER, reason: notes },
      { onSuccess: closeDialog }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Approval Center
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
          <p className="mt-2 text-xs text-slate-400 font-extralight">
            Pending approvals for PR, PO, and Budget requests
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All types</SelectItem>
              <SelectItem value="PR" className="text-xs">Purchase Requests</SelectItem>
              <SelectItem value="PO" className="text-xs">Purchase Orders</SelectItem>
              <SelectItem value="BUDGET" className="text-xs">Budgets</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={Clock}
          label="Pending Approvals"
          value={total}
          accent="from-amber-500 to-amber-700"
          isLoading={isLoading}
        />
        <SummaryCard
          icon={FileText}
          label="Purchase Requests"
          value={requests.filter((r) => r.entity_type === 'PR').length}
          accent="from-indigo-500 to-indigo-700"
          isLoading={isLoading}
        />
        <SummaryCard
          icon={DollarSign}
          label="Budgets"
          value={requests.filter((r) => r.entity_type === 'BUDGET').length}
          accent="from-violet-500 to-violet-700"
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-extralight text-slate-500 uppercase tracking-widest">
            Pending Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-light">No pending approvals</p>
              <p className="text-xs mt-1 opacity-60">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <ApprovalRequestRow
                  key={request.id}
                  request={request}
                  onApprove={() => openApprove(request)}
                  onReject={() => openReject(request)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={actionDialog !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-light">
              {actionDialog?.type === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
          </DialogHeader>

          {actionDialog && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">
                  Entity: {ENTITY_TYPE_LABELS[actionDialog.request.entity_type] ?? actionDialog.request.entity_type}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: {actionDialog.request.entity_id}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Step: {actionDialog.request.current_step + 1}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  {actionDialog.type === 'approve' ? 'Notes (optional)' : 'Reason (required)'}
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    actionDialog.type === 'approve'
                      ? 'Optional notes...'
                      : 'Reason for rejection...'
                  }
                  className="text-xs min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeDialog} className="text-xs">
              Cancel
            </Button>
            {actionDialog?.type === 'approve' ? (
              <Button
                size="sm"
                className="text-xs bg-teal-600 hover:bg-teal-700"
                onClick={handleApprove}
                disabled={approveRequest.isPending}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Approve
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="text-xs"
                onClick={handleReject}
                disabled={rejectRequest.isPending || !notes.trim()}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type SummaryCardProps = {
  icon: React.ElementType
  label: string
  value: number
  accent: string
  isLoading?: boolean
}

function SummaryCard({ icon: Icon, label, value, accent, isLoading }: SummaryCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`bg-gradient-to-br ${accent} p-4`}>
          <div className="p-2 rounded-lg bg-white/20 inline-block mb-2">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <p className="text-[10px] text-white/80 uppercase tracking-widest font-extralight">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-12 mt-1 bg-white/30" />
          ) : (
            <p className="text-2xl font-light text-white mt-0.5">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

type ApprovalRequestRowProps = {
  request: ApprovalRequest
  onApprove: () => void
  onReject: () => void
}

function ApprovalRequestRow({ request, onApprove, onReject }: ApprovalRequestRowProps) {
  const EntityIcon = ENTITY_TYPE_ICONS[request.entity_type] ?? FileText
  const entityColor = ENTITY_TYPE_COLORS[request.entity_type] ?? 'bg-slate-50 text-slate-700 border-slate-200'
  const statusColor = STATUS_COLORS[request.status] ?? 'bg-slate-50 text-slate-700 border-slate-200'
  const entityLabel = ENTITY_TYPE_LABELS[request.entity_type] ?? request.entity_type

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors">
      <div className="flex-shrink-0 p-2 rounded-lg bg-slate-50">
        <EntityIcon className="w-4 h-4 text-slate-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[9px] h-4 px-1.5 font-extralight ${entityColor}`}>
            {entityLabel}
          </Badge>
          <Badge variant="outline" className={`text-[9px] h-4 px-1.5 font-extralight ${statusColor}`}>
            {request.status}
          </Badge>
          {request.workflow && (
            <span className="text-[10px] text-slate-400 truncate">{request.workflow.name}</span>
          )}
        </div>
        <p className="text-[11px] text-slate-600 mt-0.5 truncate">
          Entity: {request.entity_id} &middot; Step {request.current_step + 1}
        </p>
        {request.requester && (
          <p className="text-[10px] text-slate-400">
            Requested by {request.requester.first_name} {request.requester.last_name}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px] border-teal-200 text-teal-700 hover:bg-teal-50"
          onClick={onApprove}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px] border-rose-200 text-rose-700 hover:bg-rose-50"
          onClick={onReject}
        >
          <XCircle className="w-3 h-3 mr-1" />
          Reject
        </Button>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
      </div>
    </div>
  )
}
