import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, FileCheck, Clock, Search } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  usePermitsToWork,
  useSubmitPermit,
  useApprovePermit,
  useActivatePermit,
  useClosePermit,
  useRejectPermit,
  useDeletePermitToWork,
} from '@/hooks/usePermitsToWork'
import { useProjects } from '@/hooks/useProjects'
import type { PermitStatus, PermitToWorkWithRelations } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/compliance/permits/'
)({
  component: PermitsListPage,
})

const STATUS_LABELS: Record<PermitStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
}

const STATUS_COLORS: Record<PermitStatus, string> = {
  DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
  SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ACTIVE: 'bg-teal-50 text-teal-700 border-teal-200',
  CLOSED: 'bg-slate-100 text-slate-500 border-slate-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

function PermitActionsMenu({ permit }: { permit: PermitToWorkWithRelations }) {
  const submitMutation = useSubmitPermit(permit.id)
  const approveMutation = useApprovePermit(permit.id)
  const activateMutation = useActivatePermit(permit.id)
  const closeMutation = useClosePermit(permit.id)
  const rejectMutation = useRejectPermit(permit.id)

  const actions = []

  if (permit.status === 'DRAFT') {
    actions.push(
      <DropdownMenuItem
        key="submit"
        onClick={async () => {
          await submitMutation.mutateAsync()
          toast.success('Permit submitted for approval')
        }}
      >
        Submit for Approval
      </DropdownMenuItem>
    )
  }
  if (permit.status === 'SUBMITTED') {
    actions.push(
      <DropdownMenuItem
        key="approve"
        onClick={async () => {
          await approveMutation.mutateAsync()
          toast.success('Permit approved')
        }}
      >
        Approve
      </DropdownMenuItem>,
      <DropdownMenuItem
        key="reject"
        className="text-rose-600"
        onClick={async () => {
          await rejectMutation.mutateAsync(undefined)
          toast.success('Permit rejected')
        }}
      >
        Reject
      </DropdownMenuItem>
    )
  }
  if (permit.status === 'APPROVED') {
    actions.push(
      <DropdownMenuItem
        key="activate"
        onClick={async () => {
          await activateMutation.mutateAsync()
          toast.success('Permit activated')
        }}
      >
        Activate
      </DropdownMenuItem>
    )
  }
  if (permit.status === 'ACTIVE') {
    actions.push(
      <DropdownMenuItem
        key="close"
        onClick={async () => {
          await closeMutation.mutateAsync()
          toast.success('Permit closed')
        }}
      >
        Close Permit
      </DropdownMenuItem>
    )
  }

  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{actions}</DropdownMenuContent>
    </DropdownMenu>
  )
}

function PermitsListPage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const { data: permitsData, isLoading } = usePermitsToWork({
    projectId: projectId || undefined,
    status: (statusFilter || undefined) as PermitStatus | undefined,
    search: search || undefined,
  })
  const permits = permitsData?.data ?? []

  const deleteMutation = useDeletePermitToWork()

  const active = permits.filter((p) => p.status === 'ACTIVE')
  const pending = permits.filter((p) => p.status === 'SUBMITTED')

  async function handleDelete() {
    if (!deletingId) return
    await deleteMutation.mutateAsync(deletingId)
    toast.success('Permit deleted')
    setDeleteDialogOpen(false)
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permit to Work"
        subtitle="ใบอนุญาตทำงาน"
        actions={
          <Link to="/facility-management/compliance/permits/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" />
              New Permit
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Active Permits</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{active.length}</p>
              </div>
              <FileCheck className="w-8 h-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pending Approval</p>
                <p className="text-2xl font-light text-slate-700 mt-1">{pending.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search permits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={projectId || '__all__'} onValueChange={(v) => setProjectId(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permit #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      No permits found
                    </TableCell>
                  </TableRow>
                ) : (
                  permits.map((permit) => (
                    <TableRow key={permit.id}>
                      <TableCell className="font-mono text-sm">{permit.permit_number}</TableCell>
                      <TableCell className="font-medium text-sm max-w-xs truncate">
                        {permit.title}
                      </TableCell>
                      <TableCell>
                        {permit.permit_type && (
                          <Badge variant="outline">{permit.permit_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {permit.contractor_name ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {permit.start_date && permit.end_date
                          ? `${format(new Date(permit.start_date), 'dd/MM/yy')} – ${format(new Date(permit.end_date), 'dd/MM/yy')}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[permit.status as PermitStatus]}
                        >
                          {STATUS_LABELS[permit.status as PermitStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <PermitActionsMenu permit={permit} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Permit</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
