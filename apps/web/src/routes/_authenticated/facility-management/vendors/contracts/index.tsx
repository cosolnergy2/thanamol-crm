import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Plus, Search, FileText, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useVendorContracts,
  useCreateVendorContract,
  useDeleteVendorContract,
  useActivateVendorContract,
  useTerminateVendorContract,
} from '@/hooks/useVendorContracts'
import { useVendors } from '@/hooks/useVendors'
import { useProjects } from '@/hooks/useProjects'
import type { VendorContractStatus, CreateVendorContractRequest } from '@thanamol/shared'

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
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </Button>
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

      <CreateContractDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        vendors={vendorsData?.data ?? []}
      />
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
        {contract.contract_number}
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

function CreateContractDialog({
  open,
  onClose,
  vendors,
}: {
  open: boolean
  onClose: () => void
  vendors: { id: string; name: string }[]
}) {
  const createContract = useCreateVendorContract()
  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.data ?? []

  const [vendorId, setVendorId] = useState('')
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [value, setValue] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [projectId, setProjectId] = useState('')

  const resetForm = () => {
    setVendorId('')
    setTitle('')
    setScope('')
    setStartDate('')
    setEndDate('')
    setValue('')
    setPaymentTerms('')
    setProjectId('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: CreateVendorContractRequest = {
      vendorId,
      title,
      scope: scope || undefined,
      startDate,
      endDate,
      value: value ? Number(value) : undefined,
      paymentTerms: paymentTerms || undefined,
      projectId: projectId || undefined,
    }
    createContract.mutate(payload, {
      onSuccess: () => {
        resetForm()
        onClose()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-light">New Vendor Contract</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Vendor *</Label>
            <Select value={vendorId || '__all__'} onValueChange={(v) => setVendorId(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contract Title *</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contract title"
            />
          </div>
          <div>
            <Label>Scope</Label>
            <Textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={2}
              placeholder="Scope of work"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date *</Label>
              <Input
                required
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contract Value (THB)</Label>
              <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30"
              />
            </div>
          </div>
          <div>
            <Label>Project</Label>
            <Select value={projectId || '__all__'} onValueChange={(v) => setProjectId(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createContract.isPending || !vendorId || !title}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <FileText className="w-4 h-4" />
              Create Contract
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
