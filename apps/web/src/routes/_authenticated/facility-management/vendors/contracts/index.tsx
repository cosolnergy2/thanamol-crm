import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Plus, Search, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  useVendorContracts,
  useDeleteVendorContract,
  useActivateVendorContract,
  useTerminateVendorContract,
} from '@/hooks/useVendorContracts'
import { useVendors } from '@/hooks/useVendors'
import type { VendorContractStatus } from '@thanamol/shared'

const searchSchema = z.object({
  vendorId: z.string().optional(),
  status: z.string().optional(),
})

export const Route = createFileRoute(
  '/_authenticated/facility-management/vendors/contracts/'
)({
  validateSearch: searchSchema,
  component: VendorContractsListPage,
})

const STATUS_COLORS: Record<VendorContractStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  TERMINATED: 'bg-red-100 text-red-700',
}

function VendorContractsListPage() {
  const { vendorId: initialVendorId, status: initialStatus } = Route.useSearch()
  const [search, setSearch] = useState('')
  const [vendorId, setVendorId] = useState(initialVendorId ?? 'all')
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? 'all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useVendorContracts({
    page,
    limit: 20,
    vendorId: vendorId !== 'all' ? vendorId : undefined,
    status: statusFilter !== 'all' ? (statusFilter as VendorContractStatus) : 'all',
    search: search || undefined,
  })

  const { data: vendorsData } = useVendors({ limit: 100 })
  const deleteContract = useDeleteVendorContract()

  const contracts = data?.data ?? []
  const pagination = data?.pagination

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete contract "${title}"?`)) return
    deleteContract.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
            Vendor Contracts
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-extralight">
            Manage contracts with vendors
          </p>
        </div>
        <Link to="/facility-management/vendors/contracts/create">
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            New Contract
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search contracts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={vendorId}
              onValueChange={(v) => {
                setVendorId(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {(vendorsData?.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No contracts found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <ContractRow
                    key={c.id}
                    contract={c}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-500">{pagination.total} contracts</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-500 self-center">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ContractRow({
  contract,
  onDelete,
}: {
  contract: {
    id: string
    contract_number: string
    title: string
    status: string
    start_date: string
    end_date: string
    value?: number | null
    vendor: { id: string; name: string }
  }
  onDelete: (id: string, title: string) => void
}) {
  const activate = useActivateVendorContract(contract.id)
  const terminate = useTerminateVendorContract(contract.id)

  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-slate-500">
        <Link
          to="/facility-management/vendors/contracts/$contractId"
          params={{ contractId: contract.id }}
          className="hover:text-indigo-600 hover:underline"
        >
          {contract.contract_number}
        </Link>
      </TableCell>
      <TableCell className="font-medium">{contract.title}</TableCell>
      <TableCell>
        <Link
          to="/facility-management/vendors/$vendorId"
          params={{ vendorId: contract.vendor.id }}
          className="text-indigo-600 hover:underline text-sm"
        >
          {contract.vendor.name}
        </Link>
      </TableCell>
      <TableCell className="text-xs text-slate-500">
        {new Date(contract.start_date).toLocaleDateString()} —{' '}
        {new Date(contract.end_date).toLocaleDateString()}
      </TableCell>
      <TableCell>
        {contract.value ? (
          <span className="text-sm">{contract.value.toLocaleString()}</span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge
          className={`text-xs font-normal ${STATUS_COLORS[contract.status as VendorContractStatus]}`}
        >
          {contract.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {contract.status === 'DRAFT' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-600"
              onClick={() => activate.mutate()}
              title="Activate"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
          )}
          {contract.status === 'ACTIVE' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={() => terminate.mutate()}
              title="Terminate"
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}
          <Link
            to="/facility-management/vendors/contracts/$contractId/edit"
            params={{ contractId: contract.id }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-700"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700"
            onClick={() => onDelete(contract.id, contract.title)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
