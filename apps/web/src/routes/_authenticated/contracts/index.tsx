import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  FileSignature,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Printer,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useContracts, useDeleteContract } from '@/hooks/useContracts'
import type { ContractStatus, ContractType } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/contracts/')({
  component: ContractListPage,
})

const PAGE_SIZE = 20

const STATUS_COLORS: Record<ContractStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
  TERMINATED: 'bg-rose-100 text-rose-700 border-rose-200',
  CANCELLED: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
  CANCELLED: 'Cancelled',
}

function ContractListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useContracts({
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== 'all' ? (statusFilter as ContractStatus) : undefined,
    type: typeFilter !== 'all' ? (typeFilter as ContractType) : undefined,
  })

  const deleteContract = useDeleteContract()

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteContract.mutateAsync(deleteTarget.id)
      toast.success('Contract deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contract')
    } finally {
      setDeleteTarget(null)
    }
  }

  const contracts = data?.data ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  const filteredContracts = debouncedSearch
    ? contracts.filter(
        (c) =>
          c.contract_number.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : contracts

  const stats = [
    { label: 'Total', value: data?.pagination.total ?? 0, color: 'text-slate-900' },
    {
      label: 'Active',
      value: contracts.filter((c) => c.status === 'ACTIVE').length,
      color: 'text-green-600',
    },
    {
      label: 'Pending Approval',
      value: contracts.filter((c) => c.status === 'PENDING_APPROVAL').length,
      color: 'text-amber-600',
    },
    {
      label: 'Approved',
      value: contracts.filter((c) => c.status === 'APPROVED').length,
      color: 'text-emerald-600',
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="Contracts"
        actions={
          <div className="flex gap-2">
            <Link to="/contracts/expiring">
              <Button variant="outline" size="sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                Expiring
              </Button>
            </Link>
            <Link to="/contracts/create">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                New Contract
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <Card key={index} className="border border-slate-100 bg-white/90">
            <CardContent className="pt-5 pb-5">
              <div className="text-center">
                <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  {stat.label}
                </p>
                <p className={`text-3xl font-extralight mt-1.5 ${stat.color}`}>{stat.value}</p>
              </div>
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
                placeholder="Search contract number..."
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
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SALE">Sale</SelectItem>
                <SelectItem value="LEASE">Lease</SelectItem>
                <SelectItem value="RENTAL">Rental</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Contract No.
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Type
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Start Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  End Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Value
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
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
                    <p className="text-slate-600">Failed to load contracts. Please refresh.</p>
                  </TableCell>
                </TableRow>
              ) : filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <FileSignature className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No contracts found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => (
                  <TableRow
                    key={contract.id}
                    className="hover:bg-slate-50/50 border-slate-100"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <FileSignature className="w-3.5 h-3.5 text-slate-400 mr-2" />
                        <span className="font-light text-slate-800 text-[11px]">
                          {contract.contract_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] text-slate-600 font-extralight">
                        {contract.type}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center text-[10px] text-slate-500 font-extralight">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(contract.start_date), 'd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {contract.end_date ? (
                        <span className="text-[11px] text-slate-600 font-extralight">
                          {format(new Date(contract.end_date), 'd MMM yyyy')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[11px] font-light text-slate-800">
                        ฿{contract.value.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${STATUS_COLORS[contract.status] ?? ''} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {STATUS_LABELS[contract.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1">
                        {contract.status === 'DRAFT' && (
                          <Link
                            to="/contracts/$contractId/edit"
                            params={{ contractId: contract.id }}
                          >
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                        <Link
                          to="/contracts/$contractId"
                          params={{ contractId: contract.id }}
                        >
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link
                          to="/contracts/$contractId/print"
                          params={{ contractId: contract.id }}
                        >
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          </Button>
                        </Link>
                        {contract.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() =>
                              setDeleteTarget({
                                id: contract.id,
                                number: contract.contract_number,
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contract</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.number}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteContract.isPending}
            >
              {deleteContract.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
