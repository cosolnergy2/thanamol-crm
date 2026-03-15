import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Edit, Trash2, Image, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useHandovers, useDeleteHandover } from '@/hooks/useHandovers'
import type { HandoverStatus, HandoverType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/forms/handover')({
  component: FormHandoverPage,
})

const HANDOVER_STATUS_CLASSES: Record<HandoverStatus, string> = {
  PENDING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

const HANDOVER_TYPE_LABELS: Record<HandoverType, string> = {
  INITIAL: 'Initial',
  FINAL: 'Final',
  PARTIAL: 'Partial',
}

function FormHandoverPage() {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null)

  const { data, isLoading, isError } = useHandovers({ limit: 100 })
  const deleteHandover = useDeleteHandover()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteHandover.mutateAsync(deleteTarget.id)
      toast.success('Handover deleted successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete handover')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handovers = data?.data ?? []

  return (
    <div className="space-y-3">
      <PageHeader
        title="SALE-JOB04-F02: Handover Form"
        actions={
          <Link to="/contracts/handover/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Handover
            </Button>
          </Link>
        }
      />

      <p className="text-slate-500 text-sm font-light -mt-2">
        จัดการใบส่งมอบพื้นที่
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">
              Failed to load handovers. Please refresh and try again.
            </p>
          </CardContent>
        </Card>
      ) : handovers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center py-12">
            <ClipboardList className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600">No handovers yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Create a new handover to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {handovers.map((handover) => (
            <Card
              key={handover.id}
              className="hover:shadow-md transition-shadow border-slate-200"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xs font-light tracking-wider text-slate-700 flex items-center">
                    <ClipboardList className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    {HANDOVER_TYPE_LABELS[handover.handover_type]}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`${HANDOVER_STATUS_CLASSES[handover.status]} text-[9px] h-4 px-1.5 font-extralight`}
                  >
                    {handover.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extralight">
                    Contract
                  </p>
                  <p className="text-xs text-slate-600 font-light truncate">
                    {handover.contract_id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extralight">
                    Date
                  </p>
                  <p className="text-xs text-slate-600 font-light">
                    {new Date(handover.handover_date).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                {handover.received_by && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extralight">
                      Received By
                    </p>
                    <p className="text-xs text-slate-600 font-light">
                      {handover.received_by}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
                  <Link to="/contracts/handover/$id/edit" params={{ id: handover.id }}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link to="/forms/handover-photos">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                    >
                      <Image className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => setDeleteTarget({ id: handover.id })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Handover</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this handover? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteHandover.isPending}
            >
              {deleteHandover.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
