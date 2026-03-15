import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Wallet, Search, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { PageHeader } from '@/components/PageHeader'
import { useDeposits, useCreateDeposit, useUpdateDeposit, useDeleteDeposit } from '@/hooks/useDeposits'
import type { DepositStatus, DepositWithRelations } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/deposits')({
  component: DepositsPage,
})

const DEPOSIT_STATUS_COLORS: Record<DepositStatus, string> = {
  HELD: 'bg-amber-100 text-amber-700 border-amber-200',
  APPLIED: 'bg-blue-100 text-blue-700 border-blue-200',
  REFUNDED: 'bg-slate-100 text-slate-700 border-slate-200',
  FORFEITED: 'bg-rose-100 text-rose-700 border-rose-200',
}

const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  HELD: 'Held',
  APPLIED: 'Applied',
  REFUNDED: 'Refunded',
  FORFEITED: 'Forfeited',
}

const createDepositSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  depositDate: z.string().min(1, 'Deposit date is required'),
  notes: z.string().optional(),
})

type CreateDepositFormData = z.infer<typeof createDepositSchema>

const PAGE_SIZE = 20

function DepositsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; amount: number } | null>(null)
  const [statusEditTarget, setStatusEditTarget] = useState<{
    id: string
    currentStatus: DepositStatus
  } | null>(null)

  const { data, isLoading, isError } = useDeposits({
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== 'all' ? (statusFilter as DepositStatus) : undefined,
  })

  const createDeposit = useCreateDeposit()
  const updateDeposit = useUpdateDeposit()
  const deleteDeposit = useDeleteDeposit()

  const form = useForm<CreateDepositFormData>({
    resolver: zodResolver(createDepositSchema),
    defaultValues: {
      contractId: '',
      customerId: '',
      amount: 0,
      depositDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  async function onCreateSubmit(values: CreateDepositFormData) {
    try {
      await createDeposit.mutateAsync({
        contractId: values.contractId,
        customerId: values.customerId,
        amount: values.amount,
        depositDate: values.depositDate,
        notes: values.notes || undefined,
      })
      toast.success('Deposit created')
      setCreateOpen(false)
      form.reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create deposit')
    }
  }

  async function handleStatusChange(id: string, newStatus: DepositStatus) {
    try {
      await updateDeposit.mutateAsync({ id, data: { status: newStatus } })
      toast.success(`Deposit status updated to ${DEPOSIT_STATUS_LABELS[newStatus]}`)
      setStatusEditTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteDeposit.mutateAsync(deleteTarget.id)
      toast.success('Deposit deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete deposit')
    } finally {
      setDeleteTarget(null)
    }
  }

  const deposits = (data?.data ?? []) as DepositWithRelations[]
  const totalPages = data?.pagination.totalPages ?? 1

  const filteredDeposits = search
    ? deposits.filter(
        (d) =>
          d.contract?.contract_number?.toLowerCase().includes(search.toLowerCase()) ||
          d.customer?.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : deposits

  const stats = [
    {
      label: 'Total Held',
      value: `฿${deposits
        .filter((d) => d.status === 'HELD')
        .reduce((sum, d) => sum + d.amount, 0)
        .toLocaleString()}`,
      color: 'text-amber-600',
    },
    {
      label: 'Held',
      value: deposits.filter((d) => d.status === 'HELD').length,
      color: 'text-amber-600',
    },
    {
      label: 'Applied',
      value: deposits.filter((d) => d.status === 'APPLIED').length,
      color: 'text-blue-600',
    },
    {
      label: 'Refunded',
      value: deposits.filter((d) => d.status === 'REFUNDED').length,
      color: 'text-slate-600',
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="Deposits"
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Deposit
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <Card key={index} className="border border-slate-100 bg-white/90">
            <CardContent className="pt-5 pb-5 text-center">
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                {stat.label}
              </p>
              <p className={`text-3xl font-extralight mt-1.5 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search contract, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="HELD">Held</SelectItem>
                <SelectItem value="APPLIED">Applied</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
                <SelectItem value="FORFEITED">Forfeited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Contract
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Amount
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Notes
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-slate-600">Failed to load deposits. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : filteredDeposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No deposits found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeposits.map((deposit) => (
                  <TableRow key={deposit.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="font-light text-[11px] py-3">
                      {deposit.contract?.contract_number ?? deposit.contract_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-[11px] font-light py-3">
                      {deposit.customer?.name ?? deposit.customer_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] font-light text-slate-800">
                        ฿{deposit.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] text-slate-500 font-extralight">
                        {format(new Date(deposit.deposit_date), 'd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <button
                        onClick={() =>
                          setStatusEditTarget({ id: deposit.id, currentStatus: deposit.status as DepositStatus })
                        }
                        className="cursor-pointer"
                      >
                        <Badge
                          variant="outline"
                          className={`${DEPOSIT_STATUS_COLORS[deposit.status as DepositStatus] ?? ''} text-[9px] h-4 px-1.5 font-extralight`}
                        >
                          {DEPOSIT_STATUS_LABELS[deposit.status as DepositStatus]}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] text-slate-500 font-extralight">
                        {deposit.notes ? deposit.notes.slice(0, 40) + (deposit.notes.length > 40 ? '...' : '') : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => setDeleteTarget({ id: deposit.id, amount: deposit.amount })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Deposit</DialogTitle>
            <DialogDescription>Record a security deposit.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contractId">Contract ID *</Label>
              <Input id="contractId" {...form.register('contractId')} />
              {form.formState.errors.contractId && (
                <p className="text-xs text-rose-600">{form.formState.errors.contractId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer ID *</Label>
              <Input id="customerId" {...form.register('customerId')} />
              {form.formState.errors.customerId && (
                <p className="text-xs text-rose-600">{form.formState.errors.customerId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (฿) *</Label>
              <Input id="amount" type="number" step="0.01" {...form.register('amount')} />
              {form.formState.errors.amount && (
                <p className="text-xs text-rose-600">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositDate">Deposit Date *</Label>
              <Input id="depositDate" type="date" {...form.register('depositDate')} />
              {form.formState.errors.depositDate && (
                <p className="text-xs text-rose-600">{form.formState.errors.depositDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...form.register('notes')} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={createDeposit.isPending}
              >
                {createDeposit.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={!!statusEditTarget} onOpenChange={() => setStatusEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Deposit Status</DialogTitle>
            <DialogDescription>
              Change the status of this deposit. Current:{' '}
              <strong>
                {statusEditTarget ? DEPOSIT_STATUS_LABELS[statusEditTarget.currentStatus] : ''}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(['HELD', 'APPLIED', 'REFUNDED', 'FORFEITED'] as DepositStatus[]).map((status) => (
              <Button
                key={status}
                variant={statusEditTarget?.currentStatus === status ? 'default' : 'outline'}
                className={`w-full justify-start ${
                  statusEditTarget?.currentStatus === status ? 'bg-indigo-600 hover:bg-indigo-700' : ''
                }`}
                onClick={() =>
                  statusEditTarget && handleStatusChange(statusEditTarget.id, status)
                }
                disabled={updateDeposit.isPending}
              >
                <Badge
                  variant="outline"
                  className={`${DEPOSIT_STATUS_COLORS[status]} text-[9px] h-4 px-1.5 font-extralight mr-2`}
                >
                  {DEPOSIT_STATUS_LABELS[status]}
                </Badge>
                {status === 'HELD' && 'Keep as held security deposit'}
                {status === 'APPLIED' && 'Apply toward outstanding balance'}
                {status === 'REFUNDED' && 'Refund to tenant'}
                {status === 'FORFEITED' && 'Forfeit deposit'}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusEditTarget(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Deposit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deposit of{' '}
              <strong>฿{deleteTarget?.amount.toLocaleString()}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteDeposit.isPending}
            >
              {deleteDeposit.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
