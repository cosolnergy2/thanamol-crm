import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ClipboardList, Check, X, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { useClientUpdateRequests, useUpdateClientRequest } from '@/hooks/useClients'
import type { ClientUpdateRequest, UpdateRequestStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/clients/portal')({
  component: ClientUpdateRequestsPage,
})

const PAGE_SIZE = 20

const STATUS_LABELS: Record<UpdateRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

function statusBadgeClass(status: UpdateRequestStatus): string {
  if (status === 'APPROVED') return 'bg-teal-50 text-teal-700 border border-teal-200'
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700 border border-rose-200'
  return 'bg-amber-50 text-amber-700 border border-amber-200'
}

function ClientUpdateRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<UpdateRequestStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [detailTarget, setDetailTarget] = useState<ClientUpdateRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ClientUpdateRequest | null>(null)

  const { data, isLoading, isError } = useClientUpdateRequests({
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const updateRequest = useUpdateClientRequest()

  async function handleApprove(request: ClientUpdateRequest) {
    try {
      await updateRequest.mutateAsync({ id: request.id, data: { status: 'APPROVED' } })
      toast.success('Request approved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve request')
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    try {
      await updateRequest.mutateAsync({ id: rejectTarget.id, data: { status: 'REJECTED' } })
      toast.success('Request rejected')
      setRejectTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject request')
    }
  }

  const requests = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="space-y-3">
      <PageHeader title="Client Update Requests" />

      <Card>
        <CardContent className="pt-4">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as UpdateRequestStatus | 'all')
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Client
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Entity
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Submitted
                </TableHead>
                <TableHead className="text-center text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-slate-600">Failed to load requests. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <ClipboardList className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-600">No update requests found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <p className="font-light text-slate-800 text-[11px]">
                        {req.client_user
                          ? `${req.client_user.first_name} ${req.client_user.last_name}`
                          : req.client_user_id}
                      </p>
                      {req.client_user && (
                        <p className="text-[9px] text-slate-400 font-extralight mt-0.5">
                          {req.client_user.email}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[10px] text-slate-500 font-extralight">
                        {req.entity_type}
                      </p>
                      <p className="text-[9px] text-slate-400 font-extralight mt-0.5 truncate max-w-[120px]">
                        {req.entity_id}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-extralight ${statusBadgeClass(req.status)}`}
                      >
                        {STATUS_LABELS[req.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[10px] text-slate-500 font-extralight">
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setDetailTarget(req)}
                          title="View changes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {req.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              onClick={() => handleApprove(req)}
                              disabled={updateRequest.isPending}
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => setRejectTarget(req)}
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[11px] text-slate-400 font-extralight">
            Page {page} of {totalPages} — {data?.pagination.total ?? 0} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={() => setDetailTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Requested Changes</DialogTitle>
            <DialogDescription>
              Review the changes requested by the client.
            </DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-500 space-y-1">
                <p>
                  <span className="font-medium text-slate-700">Entity:</span>{' '}
                  {detailTarget.entity_type} / {detailTarget.entity_id}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Client:</span>{' '}
                  {detailTarget.client_user
                    ? `${detailTarget.client_user.first_name} ${detailTarget.client_user.last_name} (${detailTarget.client_user.email})`
                    : detailTarget.client_user_id}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Status:</span>{' '}
                  {STATUS_LABELS[detailTarget.status]}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-2">
                  Changes
                </p>
                <pre className="text-[10px] text-slate-700 whitespace-pre-wrap break-all font-mono">
                  {JSON.stringify(detailTarget.requested_changes, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirm Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this update request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateRequest.isPending}
            >
              {updateRequest.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
