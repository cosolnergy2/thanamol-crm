import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Search,
  ArrowRight,
  User,
  Phone,
  Mail,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/PageHeader'
import { useLeads, useCreateLead, useUpdateLead } from '@/hooks/useLeads'
import { useCreateDeal } from '@/hooks/useDeals'
import { useCustomers } from '@/hooks/useCustomers'
import type { Lead, LeadStatus } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/leads/')({
  component: LeadListPage,
})

const LEAD_STATUS_CLASSES: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-indigo-100 text-indigo-700',
  UNQUALIFIED: 'bg-rose-100 text-rose-700',
  CONVERTED: 'bg-teal-100 text-teal-700',
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  UNQUALIFIED: 'Unqualified',
  CONVERTED: 'Converted',
}

const STAT_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED']

type CreateLeadFormData = {
  title: string
  customerId: string
  source: string
  notes: string
}

function LeadListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null)
  const [createForm, setCreateForm] = useState<CreateLeadFormData>({
    title: '',
    customerId: '',
    source: '',
    notes: '',
  })

  const { data: leadsData, isLoading } = useLeads({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const { data: customersData } = useCustomers({ limit: 200 })

  const createLead = useCreateLead()
  const convertToDealmutation = useCreateDeal()

  const leads = leadsData?.data ?? []
  const totalPages = leadsData?.pagination.totalPages ?? 1
  const customers = customersData?.data ?? []

  function getCustomerName(customerId: string | null): string {
    if (!customerId) return 'N/A'
    const customer = customers.find((c) => c.id === customerId)
    return customer?.name ?? 'N/A'
  }

  function getCustomerContact(customerId: string | null) {
    if (!customerId) return null
    return customers.find((c) => c.id === customerId) ?? null
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.title) {
      toast.error('Title is required')
      return
    }
    try {
      await createLead.mutateAsync({
        title: createForm.title,
        customerId: createForm.customerId || undefined,
        source: createForm.source || undefined,
        notes: createForm.notes || undefined,
      })
      toast.success('Lead created')
      setCreateDialogOpen(false)
      setCreateForm({ title: '', customerId: '', source: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lead')
    }
  }

  async function handleConvertToDeal() {
    if (!convertTarget) return
    try {
      await convertToDealmutation.mutateAsync({
        title: convertTarget.title,
        customerId: convertTarget.customer_id ?? undefined,
        leadId: convertTarget.id,
        stage: 'PROSPECTING',
        value: convertTarget.value ?? undefined,
        assignedTo: convertTarget.assigned_to ?? undefined,
        notes: convertTarget.notes ?? undefined,
      })
      toast.success('Lead converted to Deal')
      setConvertTarget(null)
      navigate({ to: '/deals' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to convert lead')
    }
  }

  const statsLeads = leadsData?.data ?? []

  return (
    <div className="space-y-3">
      <PageHeader
        title="Lead Inbox"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
            <Link to="/deals">
              <Button variant="outline">
                <ArrowRight className="w-4 h-4 mr-2" />
                Pipeline
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {STAT_STATUSES.map((status) => (
          <Card key={status} className="border border-slate-100 bg-white/90">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    {LEAD_STATUS_LABELS[status]}
                  </p>
                  <p className="text-3xl font-extralight text-slate-700 mt-1.5">
                    {statsLeads.filter((l) => l.status === status).length}
                  </p>
                </div>
                <Badge className={`${LEAD_STATUS_CLASSES[status]} text-[9px] h-4 px-1.5 font-extralight`}>
                  {LEAD_STATUS_LABELS[status]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
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
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="QUALIFIED">Qualified</SelectItem>
                <SelectItem value="UNQUALIFIED">Unqualified</SelectItem>
                <SelectItem value="CONVERTED">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light tracking-wider text-slate-700">
            Lead List
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Title
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Source
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Contact
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const customer = getCustomerContact(lead.customer_id)
                  return (
                    <TableRow key={lead.id} className="hover:bg-slate-50/50 border-slate-100">
                      <TableCell className="py-3">
                        <div className="font-light text-slate-800 text-[11px]">{lead.title}</div>
                        {lead.notes && (
                          <div className="text-[10px] text-slate-500 line-clamp-1 font-extralight mt-0.5">
                            {lead.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-extralight">
                          <User className="w-3.5 h-3.5" />
                          {getCustomerName(lead.customer_id)}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          className={`${LEAD_STATUS_CLASSES[lead.status]} text-[9px] h-4 px-1.5 font-extralight`}
                        >
                          {LEAD_STATUS_LABELS[lead.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-[10px] text-slate-500 font-extralight">
                          {lead.source ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1">
                          {customer?.phone && (
                            <a
                              href={`tel:${customer.phone}`}
                              className="text-slate-600 hover:text-indigo-600"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {customer?.email && (
                            <a
                              href={`mailto:${customer.email}`}
                              className="text-slate-600 hover:text-indigo-600"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex gap-1">
                          <Link to="/leads/$leadId" params={{ leadId: lead.id }}>
                            <Button variant="outline" size="sm" className="h-7 text-[10px] font-extralight">
                              View
                            </Button>
                          </Link>
                          {lead.status !== 'CONVERTED' && lead.status !== 'UNQUALIFIED' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setConvertTarget(lead)}
                              className="bg-teal-600 hover:bg-teal-700 h-7 text-[10px] font-extralight"
                            >
                              <ArrowRight className="w-3.5 h-3.5 mr-1" />
                              To Deal
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[11px] text-slate-400 font-extralight">
            Page {page} of {totalPages} — {leadsData?.pagination.total ?? 0} total
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Lead title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={createForm.customerId}
                  onValueChange={(v) => setCreateForm({ ...createForm, customerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={createForm.source}
                  onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })}
                  placeholder="Facebook, Walk-in, Referral..."
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={createLead.isPending}
              >
                {createLead.isPending ? 'Creating...' : 'Create Lead'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!convertTarget} onOpenChange={() => setConvertTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert Lead to Deal</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Convert this lead to a deal in the pipeline?
            </p>
            {convertTarget && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-1 text-sm">
                <div>
                  <strong>Lead:</strong> {convertTarget.title}
                </div>
                <div>
                  <strong>Customer:</strong> {getCustomerName(convertTarget.customer_id)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConvertToDeal}
              disabled={convertToDealmutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {convertToDealmutation.isPending ? 'Converting...' : 'Convert to Deal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
